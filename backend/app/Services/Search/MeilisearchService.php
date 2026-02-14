<?php

namespace App\Services\Search;

use App\Models\Post;
use App\Models\ShopProduct;
use App\Models\StaticPage;
use App\Models\Media;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Collection;

class MeilisearchService
{
    private string $host;
    private string $key;
    private string $indexPrefix;

    public function __construct()
    {
        $this->host = config('meilisearch.host', 'http://127.0.0.1:7700');
        $this->key = config('meilisearch.key', '');
        $this->indexPrefix = config('meilisearch.index_prefix', 'cms_');
    }

    public function search(string $query, array $options = []): array
    {
        $index = $options['index'] ?? 'posts';
        $limit = $options['limit'] ?? 20;
        $offset = $options['offset'] ?? 0;
        $filters = $options['filters'] ?? [];
        $sort = $options['sort'] ?? null;

        $searchParams = [
            'q' => $query,
            'limit' => $limit,
            'offset' => $offset,
        ];

        if (!empty($filters)) {
            $searchParams['filter'] = $this->buildFilters($filters);
        }

        if ($sort) {
            $searchParams['sort'] = [$sort];
        }

        $response = Http::withHeaders($this->getHeaders())
            ->post("{$this->host}/indexes/{$this->indexPrefix}{$index}/search", $searchParams);

        if (!$response->successful()) {
            return [
                'hits' => [],
                'total' => 0,
                'error' => $response->body(),
            ];
        }

        return $response->json();
    }

    public function indexDocument(string $index, array $document): bool
    {
        $response = Http::withHeaders($this->getHeaders())
            ->post("{$this->host}/indexes/{$this->indexPrefix}{$index}/documents", [$document]);

        return $response->successful();
    }

    public function indexDocuments(string $index, array $documents): bool
    {
        $response = Http::withHeaders($this->getHeaders())
            ->post("{$this->host}/indexes/{$this->indexPrefix}{$index}/documents", $documents);

        return $response->successful();
    }

    public function deleteDocument(string $index, int $documentId): bool
    {
        $response = Http::withHeaders($this->getHeaders())
            ->delete("{$this->host}/indexes/{$this->indexPrefix}{$index}/documents/{$documentId}");

        return $response->successful();
    }

    public function deleteIndex(string $index): bool
    {
        $response = Http::withHeaders($this->getHeaders())
            ->delete("{$this->host}/indexes/{$this->indexPrefix}{$index}");

        return $response->successful();
    }

    public function createIndex(string $index, string $primaryKey = 'id'): bool
    {
        $response = Http::withHeaders($this->getHeaders())
            ->post("{$this->host}/indexes", [
                'uid' => $this->indexPrefix . $index,
                'primaryKey' => $primaryKey,
            ]);

        return $response->successful();
    }

    public function updateSettings(string $index, array $settings): bool
    {
        $response = Http::withHeaders($this->getHeaders())
            ->patch("{$this->host}/indexes/{$this->indexPrefix}{$index}/settings", $settings);

        return $response->successful();
    }

    public function syncPosts(): int
    {
        $posts = Post::with(['categories', 'tags'])
            ->where('status', 'published')
            ->get();

        $documents = $posts->map(function ($post) {
            return [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'content' => strip_tags($post->content),
                'excerpt' => $post->excerpt,
                'meta_title' => $post->meta_title,
                'meta_description' => $post->meta_description,
                'category_id' => $post->categories->first()?->id,
                'author_id' => $post->user_id,
                'status' => $post->status,
                'language' => $post->language,
                'published_at' => $post->published_at?->timestamp,
                'created_at' => $post->created_at->timestamp,
            ];
        })->toArray();

        $this->indexDocuments('posts', $documents);

        return count($documents);
    }

    public function syncProducts(): int
    {
        $products = ShopProduct::with('category')
            ->where('is_active', true)
            ->get();

        $documents = $products->map(function ($product) {
            return [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'sku' => $product->sku,
                'description' => strip_tags($product->description ?? ''),
                'short_description' => $product->short_description,
                'price' => (float) $product->getCurrentPrice(),
                'category_id' => $product->category_id,
                'is_active' => $product->is_active,
                'is_featured' => $product->is_featured,
                'created_at' => $product->created_at->timestamp,
            ];
        })->toArray();

        $this->indexDocuments('products', $documents);

        return count($documents);
    }

    public function syncAll(): array
    {
        $results = [
            'posts' => $this->syncPosts(),
            'products' => $this->syncProducts(),
        ];

        return $results;
    }

    public function getStats(): array
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get("{$this->host}/stats");

        if (!$response->successful()) {
            return [];
        }

        return $response->json();
    }

    public function health(): bool
    {
        try {
            $response = Http::withHeaders($this->getHeaders())
                ->get("{$this->host}/health");

            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    private function getHeaders(): array
    {
        $headers = [
            'Content-Type' => 'application/json',
        ];

        if ($this->key) {
            $headers['Authorization'] = "Bearer {$this->key}";
        }

        return $headers;
    }

    private function buildFilters(array $filters): string
    {
        $filterParts = [];

        foreach ($filters as $key => $value) {
            if (is_array($value)) {
                $filterParts[] = "{$key} IN [" . implode(', ', $value) . "]";
            } elseif (is_bool($value)) {
                $filterParts[] = "{$key} = " . ($value ? 'true' : 'false');
            } elseif (is_numeric($value)) {
                $filterParts[] = "{$key} = {$value}";
            } else {
                $filterParts[] = "{$key} = \"{$value}\"";
            }
        }

        return implode(' AND ', $filterParts);
    }
}
