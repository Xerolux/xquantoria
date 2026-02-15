<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ElasticsearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ElasticsearchController extends Controller
{
    protected ElasticsearchService $elasticsearch;

    public function __construct(ElasticsearchService $elasticsearch)
    {
        $this->elasticsearch = $elasticsearch;
    }

    public function search(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'q' => 'required|string|min:2|max:200',
            'index' => 'nullable|string|in:posts,products,media,users,all',
            'size' => 'nullable|integer|min:1|max:100',
            'from' => 'nullable|integer|min:0',
            'filters' => 'nullable|array',
            'sort' => 'nullable|array',
            'highlight' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = $request->input('q');
        $index = $request->input('index', 'all');
        $size = $request->input('size', 20);
        $from = $request->input('from', 0);
        $filters = $request->input('filters', []);
        $sort = $request->input('sort', []);
        $highlight = $request->input('highlight', true);

        try {
            if ($index === 'all') {
                $results = $this->searchAll($query, $size, $from, $filters, $highlight);
            } else {
                $results = $this->searchIndex($index, $query, $size, $from, $filters, $sort, $highlight);
            }

            return response()->json([
                'success' => true,
                'query' => $query,
                'data' => $results,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Search failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    protected function searchAll(string $query, int $size, int $from, array $filters, bool $highlight): array
    {
        $indices = ['posts', 'products', 'media', 'users'];
        $results = [];

        foreach ($indices as $index) {
            try {
                $indexResults = $this->searchIndex($index, $query, min($size, 10), 0, $filters, [], $highlight);
                if (!empty($indexResults['results'])) {
                    $results[$index] = $indexResults;
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        return $results;
    }

    protected function searchIndex(string $index, string $query, int $size, int $from, array $filters, array $sort, bool $highlight): array
    {
        $searchQuery = $this->buildSearchQuery($index, $query, $filters);

        $options = [
            'size' => $size,
            'from' => $from,
        ];

        if (!empty($sort)) {
            $options['sort'] = $sort;
        }

        if ($highlight) {
            $options['highlight'] = $this->getHighlightConfig($index);
        }

        return $this->elasticsearch->search($index, $searchQuery, $options);
    }

    protected function buildSearchQuery(string $index, string $query, array $filters): array
    {
        $searchFields = $this->getSearchFields($index);

        $must = [
            ElasticsearchService::buildMultiMatchQuery($query, $searchFields, [
                'fuzziness' => 'AUTO',
                'prefix_length' => 2,
            ]),
        ];

        $filter = [];

        foreach ($filters as $field => $value) {
            if (is_array($value)) {
                $filter[] = ElasticsearchService::buildTermsQuery($field, $value);
            } else {
                $filter[] = ElasticsearchService::buildTermQuery($field, $value);
            }
        }

        if ($index === 'posts') {
            $filter[] = ElasticsearchService::buildTermQuery('status', 'published');
        }

        if ($index === 'products') {
            $filter[] = ElasticsearchService::buildTermQuery('is_active', true);
        }

        return ElasticsearchService::buildBoolQuery($must, [], [], $filter);
    }

    protected function getSearchFields(string $index): array
    {
        return match ($index) {
            'posts' => ['title^3', 'content^1', 'excerpt^2', 'categories^2', 'tags^2', 'author_name^1'],
            'products' => ['name^3', 'description^1', 'category_name^2', 'tags^1'],
            'media' => ['filename^2', 'alt_text^2', 'caption^1'],
            'users' => ['name^2', 'email^1', 'bio^1'],
            default => ['*'],
        };
    }

    protected function getHighlightConfig(string $index): array
    {
        $fields = match ($index) {
            'posts' => ['title' => new \stdClass(), 'content' => new \stdClass(), 'excerpt' => new \stdClass()],
            'products' => ['name' => new \stdClass(), 'description' => new \stdClass()],
            'media' => ['filename' => new \stdClass(), 'alt_text' => new \stdClass()],
            'users' => ['name' => new \stdClass(), 'bio' => new \stdClass()],
            default => [],
        };

        return [
            'fields' => $fields,
            'pre_tags' => ['<mark>'],
            'post_tags' => ['</mark>'],
            'fragment_size' => 150,
            'number_of_fragments' => 3,
        ];
    }

    public function suggest(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'q' => 'required|string|min:1|max:100',
            'index' => 'nullable|string|in:posts,products,users',
            'size' => 'nullable|integer|min:1|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = $request->input('q');
        $index = $request->input('index', 'posts');
        $size = $request->input('size', 5);

        try {
            $suggestions = $this->elasticsearch->suggest($index, 'suggest', $query, $size);

            return response()->json([
                'success' => true,
                'suggestions' => $suggestions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => true,
                'suggestions' => [],
            ]);
        }
    }

    public function indexDocument(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'index' => 'required|string|in:posts,products,media,users',
            'id' => 'required',
            'data' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->elasticsearch->index(
                $request->input('index'),
                $request->input('id'),
                $request->input('data')
            );

            return response()->json([
                'success' => true,
                'message' => 'Document indexed successfully',
                'result' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to index document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function bulkIndex(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'index' => 'required|string|in:posts,products,media,users',
            'documents' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->elasticsearch->bulkIndex(
                $request->input('index'),
                $request->input('documents')
            );

            return response()->json([
                'success' => true,
                'message' => 'Documents indexed successfully',
                'result' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to bulk index documents',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function deleteDocument(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'index' => 'required|string|in:posts,products,media,users',
            'id' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $deleted = $this->elasticsearch->delete(
                $request->input('index'),
                $request->input('id')
            );

            return response()->json([
                'success' => $deleted,
                'message' => $deleted ? 'Document deleted' : 'Document not found',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function syncIndex(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'index' => 'required|string|in:posts,products,media,users',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $index = $request->input('index');

        try {
            $count = match ($index) {
                'posts' => $this->syncPosts(),
                'products' => $this->syncProducts(),
                'media' => $this->syncMedia(),
                'users' => $this->syncUsers(),
                default => 0,
            };

            return response()->json([
                'success' => true,
                'message' => "Synced {$count} documents to {$index}",
                'count' => $count,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to sync index',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    protected function syncPosts(): int
    {
        $posts = \App\Models\Post::with(['author', 'categories', 'tags'])
            ->where('status', 'published')
            ->get();

        $documents = [];
        foreach ($posts as $post) {
            $documents[$post->id] = [
                'title' => $post->title,
                'content' => strip_tags($post->content),
                'excerpt' => $post->excerpt,
                'slug' => $post->slug,
                'status' => $post->status,
                'author_id' => $post->author_id,
                'author_name' => $post->author?->name,
                'categories' => $post->categories->pluck('name')->toArray(),
                'tags' => $post->tags->pluck('name')->toArray(),
                'language' => $post->language,
                'featured' => $post->featured,
                'view_count' => $post->view_count,
                'published_at' => $post->published_at?->toIso8601String(),
                'created_at' => $post->created_at->toIso8601String(),
                'updated_at' => $post->updated_at->toIso8601String(),
                'suggest' => ['input' => [$post->title], 'weight' => $post->view_count ?? 1],
            ];
        }

        $this->elasticsearch->bulkIndex('posts', $documents);
        return count($documents);
    }

    protected function syncProducts(): int
    {
        $products = \App\Models\ShopProduct::with(['category', 'tags'])
            ->where('is_active', true)
            ->get();

        $documents = [];
        foreach ($products as $product) {
            $documents[$product->id] = [
                'name' => $product->name,
                'description' => strip_tags($product->description),
                'sku' => $product->sku,
                'price' => (float) $product->price,
                'sale_price' => $product->sale_price ? (float) $product->sale_price : null,
                'category_id' => $product->category_id,
                'category_name' => $product->category?->name,
                'tags' => $product->tags->pluck('name')->toArray(),
                'in_stock' => $product->stock > 0,
                'is_active' => $product->is_active,
                'is_digital' => $product->is_digital,
                'rating' => $product->reviews_avg_rating ?? 0,
                'created_at' => $product->created_at->toIso8601String(),
                'suggest' => ['input' => [$product->name]],
            ];
        }

        $this->elasticsearch->bulkIndex('products', $documents);
        return count($documents);
    }

    protected function syncMedia(): int
    {
        $media = \App\Models\Media::all();

        $documents = [];
        foreach ($media as $item) {
            $documents[$item->id] = [
                'filename' => $item->filename,
                'alt_text' => $item->alt_text,
                'caption' => $item->caption,
                'mime_type' => $item->mime_type,
                'type' => $item->type,
                'size' => $item->size,
                'width' => $item->width,
                'height' => $item->height,
                'uploaded_by' => $item->uploaded_by,
                'created_at' => $item->created_at->toIso8601String(),
            ];
        }

        $this->elasticsearch->bulkIndex('media', $documents);
        return count($documents);
    }

    protected function syncUsers(): int
    {
        $users = \App\Models\User::where('is_active', true)->get();

        $documents = [];
        foreach ($users as $user) {
            $documents[$user->id] = [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'bio' => $user->bio,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at->toIso8601String(),
                'suggest' => ['input' => [$user->name]],
            ];
        }

        $this->elasticsearch->bulkIndex('users', $documents);
        return count($documents);
    }

    public function status(): JsonResponse
    {
        try {
            $health = $this->elasticsearch->health();
            $stats = $this->elasticsearch->stats();

            return response()->json([
                'success' => true,
                'health' => $health,
                'stats' => $stats,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Elasticsearch not available',
                'error' => $e->getMessage(),
            ], 503);
        }
    }

    public function createIndices(): JsonResponse
    {
        try {
            $indices = config('elasticsearch.indices', []);
            $created = [];

            foreach ($indices as $name => $config) {
                if (!$this->elasticsearch->indexExists($name)) {
                    $this->elasticsearch->createIndex(
                        $name,
                        $config['mappings'] ?? [],
                        $config['settings'] ?? []
                    );
                    $created[] = $name;
                }
            }

            return response()->json([
                'success' => true,
                'message' => count($created) . ' indices created',
                'indices' => $created,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create indices',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function deleteIndices(): JsonResponse
    {
        try {
            $indices = array_keys(config('elasticsearch.indices', []));
            $deleted = [];

            foreach ($indices as $name) {
                if ($this->elasticsearch->indexExists($name)) {
                    $this->elasticsearch->deleteIndex($name);
                    $deleted[] = $name;
                }
            }

            return response()->json([
                'success' => true,
                'message' => count($deleted) . ' indices deleted',
                'indices' => $deleted,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete indices',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
