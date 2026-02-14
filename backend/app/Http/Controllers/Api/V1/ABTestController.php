<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ABTest;
use App\Models\ABTestImpression;
use App\Models\ABTestConversion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ABTestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ABTest::with(['creator'])
            ->orderBy('created_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $tests = $query->paginate($request->per_page ?? 15);

        $tests->getCollection()->transform(function ($test) {
            $test->stats = $this->calculateTestStats($test);
            return $test;
        });

        return response()->json($tests);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:ab_tests,name',
            'description' => 'nullable|string',
            'target_type' => 'required|string',
            'target_id' => 'nullable|integer',
            'variants' => 'required|array|min:2',
            'variants.*.name' => 'required|string',
            'variants.*.content' => 'required',
            'variants.*.weight' => 'required|integer|min:1|max:100',
            'traffic_allocation' => 'nullable|integer|min:1|max:100',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after:starts_at',
        ]);

        $totalWeight = collect($request->variants)->sum('weight');
        if ($totalWeight !== 100) {
            return response()->json([
                'success' => false,
                'message' => 'Variant weights must sum to 100',
            ], 422);
        }

        $test = ABTest::create([
            'name' => $request->name,
            'description' => $request->description,
            'status' => 'draft',
            'target_type' => $request->target_type,
            'target_id' => $request->target_id,
            'variants' => $request->variants,
            'traffic_allocation' => $request->traffic_allocation ?? 50,
            'starts_at' => $request->starts_at,
            'ends_at' => $request->ends_at,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'test' => $test,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $test = ABTest::with(['creator'])->findOrFail($id);
        $test->stats = $this->calculateTestStats($test);
        $test->detailed_stats = $this->calculateDetailedStats($test);

        return response()->json($test);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $test = ABTest::findOrFail($id);

        if ($test->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Can only update tests in draft status',
            ], 422);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255|unique:ab_tests,name,' . $id,
            'description' => 'nullable|string',
            'variants' => 'sometimes|array|min:2',
            'traffic_allocation' => 'nullable|integer|min:1|max:100',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after:starts_at',
        ]);

        $test->update($request->only([
            'name', 'description', 'variants', 'traffic_allocation', 'starts_at', 'ends_at'
        ]));

        return response()->json([
            'success' => true,
            'test' => $test,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $test = ABTest::findOrFail($id);

        if ($test->status === 'running') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete a running test',
            ], 422);
        }

        $test->delete();

        return response()->json([
            'success' => true,
            'message' => 'Test deleted',
        ]);
    }

    public function start(int $id): JsonResponse
    {
        $test = ABTest::findOrFail($id);

        if ($test->status !== 'draft' && $test->status !== 'paused') {
            return response()->json([
                'success' => false,
                'message' => 'Test must be in draft or paused status to start',
            ], 422);
        }

        $test->update([
            'status' => 'running',
            'starts_at' => $test->starts_at ?? now(),
        ]);

        return response()->json([
            'success' => true,
            'test' => $test,
        ]);
    }

    public function pause(int $id): JsonResponse
    {
        $test = ABTest::findOrFail($id);

        if ($test->status !== 'running') {
            return response()->json([
                'success' => false,
                'message' => 'Test must be running to pause',
            ], 422);
        }

        $test->update(['status' => 'paused']);

        return response()->json([
            'success' => true,
            'test' => $test,
        ]);
    }

    public function complete(int $id, Request $request): JsonResponse
    {
        $test = ABTest::findOrFail($id);

        if ($test->status !== 'running' && $test->status !== 'paused') {
            return response()->json([
                'success' => false,
                'message' => 'Test must be running or paused to complete',
            ], 422);
        }

        $request->validate([
            'winning_variant' => 'nullable|string',
        ]);

        $test->update([
            'status' => 'completed',
            'ends_at' => now(),
            'winning_variant' => $request->winning_variant,
        ]);

        return response()->json([
            'success' => true,
            'test' => $test,
        ]);
    }

    public function getVariant(Request $request, string $testName): JsonResponse
    {
        $sessionId = $request->session_id ?? session()->getId();

        $test = ABTest::where('name', $testName)
            ->where('status', 'running')
            ->firstOrFail();

        $existingImpression = ABTestImpression::where('ab_test_id', $test->id)
            ->where('session_id', $sessionId)
            ->first();

        if ($existingImpression) {
            return response()->json([
                'variant' => $existingImpression->variant,
                'content' => collect($test->variants)->firstWhere('name', $existingImpression->variant)['content'] ?? null,
                'is_returning' => true,
            ]);
        }

        if (rand(1, 100) > $test->traffic_allocation) {
            return response()->json([
                'variant' => null,
                'content' => null,
                'excluded' => true,
            ]);
        }

        $variant = $this->selectVariant($test->variants);

        ABTestImpression::create([
            'ab_test_id' => $test->id,
            'variant' => $variant['name'],
            'session_id' => $sessionId,
            'user_id' => $request->user()?->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'variant' => $variant['name'],
            'content' => $variant['content'],
            'is_returning' => false,
        ]);
    }

    public function trackConversion(Request $request, string $testName): JsonResponse
    {
        $request->validate([
            'variant' => 'required|string',
            'conversion_type' => 'nullable|string',
            'value' => 'nullable|numeric',
        ]);

        $sessionId = $request->session_id ?? session()->getId();

        $test = ABTest::where('name', $testName)->firstOrFail();

        $impression = ABTestImpression::where('ab_test_id', $test->id)
            ->where('session_id', $sessionId)
            ->where('variant', $request->variant)
            ->first();

        if (!$impression) {
            return response()->json([
                'success' => false,
                'message' => 'No impression found for this session',
            ], 404);
        }

        $existingConversion = ABTestConversion::where('impression_id', $impression->id)
            ->where('conversion_type', $request->conversion_type ?? 'click')
            ->first();

        if ($existingConversion) {
            return response()->json([
                'success' => true,
                'message' => 'Conversion already tracked',
            ]);
        }

        ABTestConversion::create([
            'ab_test_id' => $test->id,
            'impression_id' => $impression->id,
            'variant' => $request->variant,
            'conversion_type' => $request->conversion_type ?? 'click',
            'value' => $request->value,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Conversion tracked',
        ]);
    }

    public function getResults(int $id): JsonResponse
    {
        $test = ABTest::findOrFail($id);

        return response()->json([
            'test' => $test,
            'stats' => $this->calculateDetailedStats($test),
            'statistical_significance' => $this->calculateSignificance($test),
        ]);
    }

    protected function selectVariant(array $variants): array
    {
        $rand = rand(1, 100);
        $cumulative = 0;

        foreach ($variants as $variant) {
            $cumulative += $variant['weight'];
            if ($rand <= $cumulative) {
                return $variant;
            }
        }

        return $variants[0];
    }

    protected function calculateTestStats(ABTest $test): array
    {
        $impressions = ABTestImpression::where('ab_test_id', $test->id)->count();
        $conversions = ABTestConversion::where('ab_test_id', $test->id)->count();

        return [
            'total_impressions' => $impressions,
            'total_conversions' => $conversions,
            'conversion_rate' => $impressions > 0 ? round(($conversions / $impressions) * 100, 2) : 0,
        ];
    }

    protected function calculateDetailedStats(ABTest $test): array
    {
        $variants = collect($test->variants)->map(function ($variant) use ($test) {
            $impressions = ABTestImpression::where('ab_test_id', $test->id)
                ->where('variant', $variant['name'])
                ->count();

            $conversions = ABTestConversion::where('ab_test_id', $test->id)
                ->where('variant', $variant['name'])
                ->count();

            $totalValue = ABTestConversion::where('ab_test_id', $test->id)
                ->where('variant', $variant['name'])
                ->sum('value');

            return [
                'name' => $variant['name'],
                'weight' => $variant['weight'],
                'impressions' => $impressions,
                'conversions' => $conversions,
                'conversion_rate' => $impressions > 0 ? round(($conversions / $impressions) * 100, 2) : 0,
                'total_value' => round($totalValue, 2),
                'avg_value' => $conversions > 0 ? round($totalValue / $conversions, 2) : 0,
            ];
        });

        return $variants->toArray();
    }

    protected function calculateSignificance(ABTest $test): array
    {
        $stats = $this->calculateDetailedStats($test);
        
        if (count($stats) < 2) {
            return ['significant' => false, 'confidence' => 0, 'message' => 'Not enough data'];
        }

        $control = $stats[0];
        $bestVariant = collect($stats)->skip(1)->sortByDesc('conversion_rate')->first();

        if ($control['impressions'] < 100 || $bestVariant['impressions'] < 100) {
            return ['significant' => false, 'confidence' => 0, 'message' => 'Need more impressions'];
        }

        $p1 = $control['conversion_rate'] / 100;
        $p2 = $bestVariant['conversion_rate'] / 100;
        $n1 = $control['impressions'];
        $n2 = $bestVariant['impressions'];

        $pooled = (($p1 * $n1) + ($p2 * $n2)) / ($n1 + $n2);
        $se = sqrt($pooled * (1 - $pooled) * (1/$n1 + 1/$n2));
        
        if ($se == 0) {
            return ['significant' => false, 'confidence' => 0, 'message' => 'Cannot calculate'];
        }

        $z = abs($p2 - $p1) / $se;
        $confidence = round($this->normalCdf($z) * 2 * 100, 2);

        return [
            'significant' => $confidence >= 95,
            'confidence' => min($confidence, 100),
            'z_score' => round($z, 4),
            'winning_variant' => $p2 > $p1 ? $bestVariant['name'] : $control['name'],
            'improvement' => $p1 > 0 ? round((($p2 - $p1) / $p1) * 100, 2) : 0,
        ];
    }

    protected function normalCdf(float $x): float
    {
        $a1 =  0.254829592;
        $a2 = -0.284496736;
        $a3 =  1.421413741;
        $a4 = -1.453152027;
        $a5 =  1.061405429;
        $p  =  0.3275911;

        $sign = $x < 0 ? -1 : 1;
        $x = abs($x) / sqrt(2);

        $t = 1.0 / (1.0 + $p * $x);
        $y = 1.0 - ((((($a5 * $t + $a4) * $t + $a3) * $t + $a2) * $t + $a1) * $t * exp(-$x * $x));

        return 0.5 * (1.0 + $sign * $y);
    }
}
