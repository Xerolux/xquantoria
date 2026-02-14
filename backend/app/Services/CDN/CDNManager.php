<?php

namespace App\Services\CDN;

use App\Services\CDN\CloudflareService;
use App\Services\CDN\VarnishService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CDNManager
{
    protected CloudflareService $cloudflare;
    protected VarnishService $varnish;
    protected string $defaultProvider;

    public function __construct(
        CloudflareService $cloudflare,
        VarnishService $varnish
    ) {
        $this->cloudflare = $cloudflare;
        $this->varnish = $varnish;
        $this->defaultProvider = config('cdn.default', 'auto');
    }

    public function purgeAll(): array
    {
        $results = [];

        if ($this->shouldUse('cloudflare')) {
            $results['cloudflare'] = $this->cloudflare->purgeCache();
        }

        if ($this->shouldUse('varnish')) {
            $results['varnish'] = [
                'success' => $this->varnish->purgeAll(),
            ];
        }

        Cache::flush();

        Log::info('CDN: Full cache purge executed', ['results' => $results]);

        return $results;
    }

    public function purgeUrl(string $url): array
    {
        $results = [];

        if ($this->shouldUse('cloudflare')) {
            $results['cloudflare'] = $this->cloudflare->purgeCache([$url]);
        }

        if ($this->shouldUse('varnish')) {
            $results['varnish'] = [
                'success' => $this->varnish->purgeUrl($url),
            ];
        }

        return $results;
    }

    public function purgePost(int $postId): array
    {
        $results = [];

        if ($this->shouldUse('cloudflare')) {
            $results['cloudflare'] = $this->cloudflare->purgePost($postId);
        }

        if ($this->shouldUse('varnish')) {
            $results['varnish'] = [
                'success' => $this->varnish->purgePost($postId),
            ];
        }

        Cache::forget("post:{$postId}");
        Cache::forget("post:{$postId}:related");

        return $results;
    }

    public function purgePage(int $pageId): array
    {
        $results = [];

        if ($this->shouldUse('cloudflare')) {
            $results['cloudflare'] = $this->cloudflare->purgePage($pageId);
        }

        if ($this->shouldUse('varnish')) {
            $results['varnish'] = [
                'success' => $this->varnish->purgePage($pageId),
            ];
        }

        Cache::forget("page:{$pageId}");

        return $results;
    }

    public function purgeCategory(int $categoryId): array
    {
        $results = [];

        if ($this->shouldUse('varnish')) {
            $results['varnish'] = [
                'success' => $this->varnish->purgeCategory($categoryId),
            ];
        }

        Cache::forget("category:{$categoryId}");
        Cache::forget("category:{$categoryId}:posts");

        return $results;
    }

    public function purgeTag(int $tagId): array
    {
        $results = [];

        if ($this->shouldUse('varnish')) {
            $results['varnish'] = [
                'success' => $this->varnish->purgeTag($tagId),
            ];
        }

        Cache::forget("tag:{$tagId}");
        Cache::forget("tag:{$tagId}:posts");

        return $results;
    }

    public function purgeMedia(int $mediaId): array
    {
        $results = [];

        if ($this->shouldUse('cloudflare')) {
            $results['cloudflare'] = $this->cloudflare->purgeMedia($mediaId);
        }

        return $results;
    }

    public function purgeHomepage(): array
    {
        $results = [];

        if ($this->shouldUse('cloudflare')) {
            $results['cloudflare'] = $this->cloudflare->purgeHomepage();
        }

        if ($this->shouldUse('varnish')) {
            $results['varnish'] = [
                'success' => $this->varnish->purgeHomepage(),
            ];
        }

        Cache::forget('homepage');

        return $results;
    }

    public function purgeSitemap(): array
    {
        $results = [];

        if ($this->shouldUse('cloudflare')) {
            $results['cloudflare'] = $this->cloudflare->purgeSitemap();
        }

        return $results;
    }

    public function purgeApi(): array
    {
        $results = [];

        if ($this->shouldUse('varnish')) {
            $results['varnish'] = [
                'success' => $this->varnish->purgeApi(),
            ];
        }

        return $results;
    }

    public function purgeStatic(): array
    {
        $results = [];

        if ($this->shouldUse('varnish')) {
            $results['varnish'] = [
                'success' => $this->varnish->purgeStatic(),
            ];
        }

        return $results;
    }

    public function purgeByTags(array $tags): array
    {
        $results = [];

        if ($this->shouldUse('cloudflare')) {
            $results['cloudflare'] = $this->cloudflare->purgeCacheByTags($tags);
        }

        return $results;
    }

    public function purgeByPattern(string $pattern): array
    {
        $results = [];

        if ($this->shouldUse('varnish')) {
            $results['varnish'] = [
                'success' => $this->varnish->purgeByRegex($pattern),
            ];
        }

        return $results;
    }

    public function warmupCache(array $urls = []): array
    {
        $defaultUrls = [
            '/',
            '/posts',
            '/pages',
            '/categories',
            '/tags',
        ];

        $urls = array_merge($defaultUrls, $urls);
        $results = [];

        foreach ($urls as $url) {
            $fullUrl = url($url);
            $start = microtime(true);

            try {
                $ch = curl_init();
                curl_setopt_array($ch, [
                    CURLOPT_URL => $fullUrl,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_TIMEOUT => 30,
                    CURLOPT_USERAGENT => 'CMS-Cache-Warmup/1.0',
                ]);

                curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                $results[$url] = [
                    'status' => $httpCode === 200 ? 'success' : 'failed',
                    'http_code' => $httpCode,
                    'time' => round((microtime(true) - $start) * 1000, 2) . 'ms',
                ];
            } catch (\Exception $e) {
                $results[$url] = [
                    'status' => 'error',
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    public function getStats(): array
    {
        return [
            'cloudflare' => $this->cloudflare->isConfigured() ? $this->cloudflare->getStats() : ['configured' => false],
            'varnish' => $this->varnish->isConfigured() ? $this->varnish->getStats() : ['configured' => false],
            'local_cache' => [
                'driver' => config('cache.default'),
                'stats' => $this->getLocalCacheStats(),
            ],
        ];
    }

    public function getHealth(): array
    {
        return [
            'cloudflare' => $this->cloudflare->isConfigured() ? 'configured' : 'not_configured',
            'varnish' => $this->varnish->isConfigured()
                ? $this->varnish->getHealth()
                : ['status' => 'not_configured'],
        ];
    }

    protected function shouldUse(string $provider): bool
    {
        if ($this->defaultProvider === 'auto') {
            return match ($provider) {
                'cloudflare' => $this->cloudflare->isConfigured(),
                'varnish' => $this->varnish->isConfigured(),
                default => false,
            };
        }

        return $this->defaultProvider === $provider || $this->defaultProvider === 'all';
    }

    protected function getLocalCacheStats(): array
    {
        $driver = config('cache.default');

        if ($driver === 'redis') {
            try {
                $redis = app('redis')->connection();
                $info = $redis->info();

                return [
                    'connected' => true,
                    'used_memory' => $info['used_memory_human'] ?? 'unknown',
                    'connected_clients' => $info['connected_clients'] ?? 0,
                    'total_commands' => $info['total_commands_processed'] ?? 0,
                    'keyspace_hits' => $info['keyspace_hits'] ?? 0,
                    'keyspace_misses' => $info['keyspace_misses'] ?? 0,
                ];
            } catch (\Exception $e) {
                return ['connected' => false, 'error' => $e->getMessage()];
            }
        }

        return ['driver' => $driver];
    }

    public function getProvider(): string
    {
        if ($this->cloudflare->isConfigured()) {
            return 'cloudflare';
        }

        if ($this->varnish->isConfigured()) {
            return 'varnish';
        }

        return 'local';
    }

    public function enableDevelopmentMode(): array
    {
        $results = [];

        if ($this->shouldUse('cloudflare')) {
            $results['cloudflare'] = $this->cloudflare->enableDevelopmentMode();
        }

        return $results;
    }

    public function disableDevelopmentMode(): array
    {
        $results = [];

        if ($this->shouldUse('cloudflare')) {
            $results['cloudflare'] = $this->cloudflare->disableDevelopmentMode();
        }

        return $results;
    }
}
