<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Search\MeilisearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    private MeilisearchService $search;

    public function __construct(MeilisearchService $search)
    {
        $this->search = $search;
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2',
            'index' => 'string|in:posts,pages,products,media',
            'limit' => 'integer|min:1|max:100',
            'offset' => 'integer|min:0',
        ]);

        $results = $this->search->search($request->q, [
            'index' => $request->get('index', 'posts'),
            'limit' => $request->get('limit', 20),
            'offset' => $request->get('offset', 0),
            'filters' => $request->get('filters', []),
            'sort' => $request->get('sort'),
        ]);

        return response()->json($results);
    }

    public function globalSearch(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2',
            'limit' => 'integer|min:1|max:10',
        ]);

        $query = $request->q;
        $limit = $request->get('limit', 5);

        $results = [
            'posts' => $this->search->search($query, ['index' => 'posts', 'limit' => $limit]),
            'products' => $this->search->search($query, ['index' => 'products', 'limit' => $limit]),
        ];

        return response()->json($results);
    }

    public function sync(Request $request): JsonResponse
    {
        $index = $request->get('index');

        if ($index === 'posts') {
            $count = $this->search->syncPosts();
            return response()->json(['message' => "Synced {$count} posts"]);
        }

        if ($index === 'products') {
            $count = $this->search->syncProducts();
            return response()->json(['message' => "Synced {$count} products"]);
        }

        $results = $this->search->syncAll();
        return response()->json([
            'message' => 'Sync completed',
            'results' => $results,
        ]);
    }

    public function stats(): JsonResponse
    {
        $stats = $this->search->getStats();
        $health = $this->search->health();

        return response()->json([
            'healthy' => $health,
            'stats' => $stats,
        ]);
    }

    public function health(): JsonResponse
    {
        $healthy = $this->search->health();

        return response()->json([
            'status' => $healthy ? 'ok' : 'error',
        ], $healthy ? 200 : 503);
    }
}
