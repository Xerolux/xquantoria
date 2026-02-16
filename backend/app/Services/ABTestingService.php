<?php

namespace App\Services;

use App\Models\ABTest;
use App\Models\ABTestImpression;
use App\Models\ABTestConversion;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ABTestingService
{
    protected int $cacheTtl = 300;

    public function createTest(array $data): ABTest
    {
        $test = ABTest::create([
            'name' => $data['name'],
            'slug' => $data['slug'] ?? Str::slug($data['name']),
            'description' => $data['description'] ?? null,
            'status' => 'draft',
            'variants' => $data['variants'],
            'traffic_allocation' => $data['traffic_allocation'] ?? 100,
            'target_metric' => $data['target_metric'] ?? 'conversion',
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
            'configuration' => $data['configuration'] ?? [],
        ]);

        Log::info("A/B Test created: {$test->name}");

        return $test;
    }

    public function startTest(int $testId): ABTest
    {
        $test = ABTest::findOrFail($testId);
        $test->update([
            'status' => 'running',
            'start_date' => $test->start_date ?? now(),
        ]);

        Cache::forget("ab_test:{$test->slug}");
        Log::info("A/B Test started: {$test->name}");

        return $test;
    }

    public function pauseTest(int $testId): ABTest
    {
        $test = ABTest::findOrFail($testId);
        $test->update(['status' => 'paused']);

        Cache::forget("ab_test:{$test->slug}");
        Log::info("A/B Test paused: {$test->name}");

        return $test;
    }

    public function completeTest(int $testId, string $winningVariant = null): ABTest
    {
        $test = ABTest::findOrFail($testId);
        $test->update([
            'status' => 'completed',
            'end_date' => now(),
            'winning_variant' => $winningVariant,
        ]);

        Cache::forget("ab_test:{$test->slug}");
        Log::info("A/B Test completed: {$test->name}");

        return $test;
    }

    public function getVariant(string $testSlug, string $userId = null): array
    {
        $test = $this->getActiveTest($testSlug);

        if (!$test) {
            return ['variant' => 'control', 'test_id' => null];
        }

        $userId = $userId ?? session()->getId();
        $cacheKey = "ab_variant:{$test->id}:{$userId}";

        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        if (rand(1, 100) > $test->traffic_allocation) {
            return ['variant' => 'excluded', 'test_id' => $test->id];
        }

        $variant = $this->assignVariant($test);

        $result = [
            'variant' => $variant,
            'test_id' => $test->id,
            'test_name' => $test->name,
        ];

        Cache::put($cacheKey, $result, now()->addDays(30));

        $this->recordImpression($test->id, $variant, $userId);

        return $result;
    }

    protected function assignVariant(ABTest $test): string
    {
        $variants = $test->variants;
        $totalWeight = collect($variants)->sum('weight', 1);
        
        $random = rand(1, $totalWeight);
        $cumulative = 0;

        foreach ($variants as $variant) {
            $cumulative += $variant['weight'] ?? 1;
            if ($random <= $cumulative) {
                return $variant['name'];
            }
        }

        return 'control';
    }

    public function recordImpression(int $testId, string $variant, string $userId): void
    {
        ABTestImpression::create([
            'ab_test_id' => $testId,
            'variant' => $variant,
            'user_id' => $userId,
            'session_id' => session()->getId(),
            'user_agent' => request()->userAgent(),
            'ip_address' => request()->ip(),
        ]);
    }

    public function recordConversion(string $testSlug, string $userId = null, array $metadata = []): ?ABTestConversion
    {
        $userId = $userId ?? session()->getId();
        $cacheKey = "ab_variant:{$testSlug}:{$userId}";
        $variantData = Cache::get($cacheKey);

        if (!$variantData || !$variantData['test_id']) {
            return null;
        }

        $conversion = ABTestConversion::create([
            'ab_test_id' => $variantData['test_id'],
            'variant' => $variantData['variant'],
            'user_id' => $userId,
            'session_id' => session()->getId(),
            'conversion_type' => $metadata['type'] ?? 'default',
            'value' => $metadata['value'] ?? 1,
            'metadata' => $metadata,
        ]);

        Cache::forget("ab_test:stats:{$variantData['test_id']}");

        return $conversion;
    }

    public function getStatistics(int $testId): array
    {
        $cacheKey = "ab_test:stats:{$testId}";
        
        return Cache::remember($cacheKey, $this->cacheTtl, function () use ($testId) {
            $test = ABTest::findOrFail($testId);
            
            $variants = collect($test->variants)->map(function ($variant) use ($test) {
                $name = $variant['name'];
                
                $impressions = ABTestImpression::where('ab_test_id', $test->id)
                    ->where('variant', $name)
                    ->count();
                
                $conversions = ABTestConversion::where('ab_test_id', $test->id)
                    ->where('variant', $name)
                    ->count();
                
                $conversionRate = $impressions > 0 
                    ? round(($conversions / $impressions) * 100, 2) 
                    : 0;
                
                $totalValue = ABTestConversion::where('ab_test_id', $test->id)
                    ->where('variant', $name)
                    ->sum('value');

                return [
                    'name' => $name,
                    'impressions' => $impressions,
                    'conversions' => $conversions,
                    'conversion_rate' => $conversionRate,
                    'total_value' => $totalValue,
                ];
            });

            $statisticalSignificance = $this->calculateStatisticalSignificance($variants);

            return [
                'test' => $test,
                'variants' => $variants,
                'total_impressions' => $variants->sum('impressions'),
                'total_conversions' => $variants->sum('conversions'),
                'statistical_significance' => $statisticalSignificance,
                'winner' => $statisticalSignificance['confidence'] >= 95 
                    ? $this->determineWinner($variants) 
                    : null,
            ];
        });
    }

    protected function calculateStatisticalSignificance($variants): array
    {
        if ($variants->count() < 2) {
            return ['confidence' => 0, 'p_value' => 1];
        }

        $control = $variants->first();
        $controlRate = $control['conversion_rate'];
        $controlN = $control['impressions'];
        $controlX = $control['conversions'];

        $variant = $variants->skip(1)->first();
        $variantRate = $variant['conversion_rate'];
        $variantN = $variant['impressions'];
        $variantX = $variant['conversions'];

        if ($controlN < 30 || $variantN < 30) {
            return ['confidence' => 0, 'p_value' => 1, 'message' => 'Not enough data'];
        }

        $pooled = (($controlX + $variantX) / ($controlN + $variantN));
        $se = sqrt($pooled * (1 - $pooled) * (1/$controlN + 1/$variantN));
        
        if ($se == 0) {
            return ['confidence' => 0, 'p_value' => 1];
        }

        $z = abs($variantRate - $controlRate) / ($se * 100);
        $pValue = 2 * (1 - $this->normalCDF($z));
        $confidence = (1 - $pValue) * 100;

        return [
            'confidence' => round($confidence, 2),
            'p_value' => round($pValue, 4),
            'z_score' => round($z, 4),
        ];
    }

    protected function normalCDF(float $x): float
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
        $y = 1.0 - ((($a5 * $t + $a4) * $t + $a3) * $t + $a2) * $t + $a1) * $t * exp(-$x * $x);

        return 0.5 * (1.0 + $sign * $y);
    }

    protected function determineWinner($variants): ?string
    {
        return $variants->sortByDesc('conversion_rate')->first()['name'] ?? null;
    }

    protected function getActiveTest(string $slug): ?ABTest
    {
        return Cache::remember("ab_test:{$slug}", $this->cacheTtl, function () use ($slug) {
            return ABTest::where('slug', $slug)
                ->where('status', 'running')
                ->first();
        });
    }

    public function getAllTests(): array
    {
        return ABTest::withCount(['impressions', 'conversions'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();
    }

    public function deleteTest(int $testId): bool
    {
        $test = ABTest::findOrFail($testId);
        
        ABTestImpression::where('ab_test_id', $testId)->delete();
        ABTestConversion::where('ab_test_id', $testId)->delete();
        
        Cache::forget("ab_test:{$test->slug}");
        Cache::forget("ab_test:stats:{$testId}");
        
        return $test->delete();
    }
}
