<?php

namespace App\Services\Plugin;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class PluginMarketplace
{
    protected string $apiUrl;
    protected int $cacheTtl = 3600;

    public function __construct()
    {
        $this->apiUrl = config('cms.marketplace_url', 'https://marketplace.example.com/api/v1');
    }

    public function search(array $filters = []): array
    {
        $cacheKey = 'marketplace.search.' . md5(json_encode($filters));

        return Cache::remember($cacheKey, $this->cacheTtl, function () use ($filters) {
            $response = Http::timeout(30)->get("{$this->apiUrl}/plugins", $filters);

            if (!$response->successful()) {
                return ['data' => [], 'meta' => ['total' => 0]];
            }

            return $response->json();
        });
    }

    public function getPlugin(string $id): ?array
    {
        return Cache::remember("marketplace.plugin.{$id}", $this->cacheTtl, function () use ($id) {
            $response = Http::timeout(30)->get("{$this->apiUrl}/plugins/{$id}");

            if (!$response->successful()) {
                return null;
            }

            return $response->json();
        });
    }

    public function getCategories(): array
    {
        return Cache::remember('marketplace.categories', $this->cacheTtl, function () {
            $response = Http::timeout(30)->get("{$this->apiUrl}/categories");

            if (!$response->successful()) {
                return [];
            }

            return $response->json();
        });
    }

    public function getFeatured(): array
    {
        return Cache::remember('marketplace.featured', $this->cacheTtl, function () {
            $response = Http::timeout(30)->get("{$this->apiUrl}/plugins/featured");

            if (!$response->successful()) {
                return [];
            }

            return $response->json();
        });
    }

    public function getPopular(int $limit = 10): array
    {
        return Cache::remember("marketplace.popular.{$limit}", $this->cacheTtl, function () use ($limit) {
            $response = Http::timeout(30)->get("{$this->apiUrl}/plugins/popular", ['limit' => $limit]);

            if (!$response->successful()) {
                return [];
            }

            return $response->json();
        });
    }

    public function getNewReleases(int $limit = 10): array
    {
        return Cache::remember("marketplace.new.{$limit}", $this->cacheTtl, function () use ($limit) {
            $response = Http::timeout(30)->get("{$this->apiUrl}/plugins/new", ['limit' => $limit]);

            if (!$response->successful()) {
                return [];
            }

            return $response->json();
        });
    }

    public function checkForUpdates(): array
    {
        $response = Http::timeout(30)->post("{$this->apiUrl}/plugins/check-updates");

        if (!$response->successful()) {
            return [];
        }

        return $response->json();
    }

    public function submitReview(string $pluginId, array $review): bool
    {
        $response = Http::timeout(30)->post("{$this->apiUrl}/plugins/{$pluginId}/reviews", $review);

        Cache::forget("marketplace.plugin.{$pluginId}");

        return $response->successful();
    }

    public function getReviews(string $pluginId, int $page = 1): array
    {
        return Cache::remember("marketplace.reviews.{$pluginId}.{$page}", $this->cacheTtl, function () use ($pluginId, $page) {
            $response = Http::timeout(30)->get("{$this->apiUrl}/plugins/{$pluginId}/reviews", ['page' => $page]);

            if (!$response->successful()) {
                return ['data' => [], 'meta' => ['total' => 0]];
            }

            return $response->json();
        });
    }

    public function clearCache(): void
    {
        Cache::forget('marketplace.search');
        Cache::forget('marketplace.categories');
        Cache::forget('marketplace.featured');
        Cache::forget('marketplace.popular');
        Cache::forget('marketplace.new');
    }
}
