<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Redirect;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class RedirectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Redirect::with('creator:id,name,email');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('from_url', 'like', "%{$search}%")
                    ->orWhere('to_url', 'like', "%{$search}%");
            });
        }

        if ($request->has('status_code')) {
            $query->where('status_code', $request->get('status_code'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $redirects = $query->paginate($request->get('per_page', 50));

        return response()->json($redirects);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_url' => 'required|string|max:500|unique:redirects,from_url',
            'to_url' => 'required|string|max:500',
            'status_code' => 'integer|in:301,302,307,308',
            'is_active' => 'boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        if (!str_starts_with($validated['from_url'], '/')) {
            $validated['from_url'] = '/' . $validated['from_url'];
        }

        $validated['created_by'] = $request->user()->id;
        $validated['status_code'] = $validated['status_code'] ?? 301;

        $redirect = Redirect::create($validated);

        return response()->json([
            'message' => 'Redirect created successfully',
            'data' => $redirect->load('creator'),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $redirect = Redirect::with('creator')->findOrFail($id);

        return response()->json([
            'data' => $redirect,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $redirect = Redirect::findOrFail($id);

        $validated = $request->validate([
            'from_url' => 'sometimes|string|max:500|unique:redirects,from_url,' . $id,
            'to_url' => 'sometimes|string|max:500',
            'status_code' => 'sometimes|integer|in:301,302,307,308',
            'is_active' => 'sometimes|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        if (isset($validated['from_url']) && !str_starts_with($validated['from_url'], '/')) {
            $validated['from_url'] = '/' . $validated['from_url'];
        }

        $redirect->update($validated);

        return response()->json([
            'message' => 'Redirect updated successfully',
            'data' => $redirect->load('creator'),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $redirect = Redirect::findOrFail($id);
        $redirect->delete();

        return response()->json([
            'message' => 'Redirect deleted successfully',
        ]);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'redirects' => 'required|array',
            'redirects.*.from_url' => 'required|string|max:500',
            'redirects.*.to_url' => 'required|string|max:500',
            'redirects.*.status_code' => 'integer|in:301,302,307,308',
            'redirects.*.notes' => 'nullable|string|max:1000',
        ]);

        $created = [];
        $skipped = [];

        foreach ($validated['redirects'] as $redirectData) {
            $fromUrl = $redirectData['from_url'];
            if (!str_starts_with($fromUrl, '/')) {
                $fromUrl = '/' . $fromUrl;
            }

            if (Redirect::where('from_url', $fromUrl)->exists()) {
                $skipped[] = $fromUrl;
                continue;
            }

            $created[] = Redirect::create([
                'from_url' => $fromUrl,
                'to_url' => $redirectData['to_url'],
                'status_code' => $redirectData['status_code'] ?? 301,
                'notes' => $redirectData['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => 'Bulk import completed',
            'created_count' => count($created),
            'skipped_count' => count($skipped),
            'skipped_urls' => $skipped,
        ]);
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:redirects,id',
        ]);

        $deleted = Redirect::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'message' => 'Redirects deleted successfully',
            'deleted_count' => $deleted,
        ]);
    }

    public function stats(): JsonResponse
    {
        $stats = [
            'total' => Redirect::count(),
            'active' => Redirect::active()->count(),
            'inactive' => Redirect::where('is_active', false)->count(),
            'permanent' => Redirect::permanent()->count(),
            'temporary' => Redirect::temporary()->count(),
            'total_hits' => Redirect::sum('hits'),
            'top_redirects' => Redirect::with('creator:id,name')
                ->popular(10)
                ->get(['id', 'from_url', 'to_url', 'hits']),
            'recently_hit' => Redirect::whereNotNull('last_hit_at')
                ->orderBy('last_hit_at', 'desc')
                ->limit(10)
                ->get(['id', 'from_url', 'to_url', 'hits', 'last_hit_at']),
        ];

        return response()->json($stats);
    }

    public function toggle(int $id): JsonResponse
    {
        $redirect = Redirect::findOrFail($id);
        $redirect->is_active = !$redirect->is_active;
        $redirect->save();

        return response()->json([
            'message' => 'Redirect toggled successfully',
            'data' => $redirect,
        ]);
    }

    public function resetHits(int $id): JsonResponse
    {
        $redirect = Redirect::findOrFail($id);
        $redirect->hits = 0;
        $redirect->last_hit_at = null;
        $redirect->save();

        return response()->json([
            'message' => 'Hits reset successfully',
            'data' => $redirect,
        ]);
    }

    public function export(): JsonResponse
    {
        $redirects = Redirect::all(['from_url', 'to_url', 'status_code', 'is_active', 'notes']);

        return response()->json([
            'data' => $redirects,
            'count' => $redirects->count(),
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'redirects' => 'required|array',
            'redirects.*.from_url' => 'required|string',
            'redirects.*.to_url' => 'required|string',
            'redirects.*.status_code' => 'nullable|integer|in:301,302,307,308',
            'redirects.*.notes' => 'nullable|string',
        ]);

        return $this->bulkStore($request);
    }
}
