<?php

namespace App\Services\CDN;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CloudflareService
{
    protected string $apiUrl = 'https://api.cloudflare.com/client/v4';
    protected ?string $apiToken;
    protected ?string $zoneId;
    protected int $cacheTtl = 300;

    public function __construct()
    {
        $this->apiToken = config('cdn.cloudflare.api_token');
        $this->zoneId = config('cdn.cloudflare.zone_id');
    }

    public function isConfigured(): bool
    {
        return !empty($this->apiToken) && !empty($this->zoneId);
    }

    protected function request(string $method, string $endpoint, array $data = []): array
    {
        if (!$this->isConfigured()) {
            return ['success' => false, 'error' => 'Cloudflare not configured'];
        }

        try {
            $response = Http::timeout(30)
                ->withToken($this->apiToken)
                ->$method("{$this->apiUrl}{$endpoint}", $data);

            if (!$response->successful()) {
                Log::error('Cloudflare API error', [
                    'endpoint' => $endpoint,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return ['success' => false, 'error' => $response->body()];
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Cloudflare API exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function purgeCache(array $files = []): array
    {
        $data = empty($files)
            ? ['purge_everything' => true]
            : ['files' => $files];

        return $this->request('post', "/zones/{$this->zoneId}/purge_cache", $data);
    }

    public function purgeCacheByTags(array $tags): array
    {
        return $this->request('post', "/zones/{$this->zoneId}/purge_cache", [
            'tags' => $tags,
        ]);
    }

    public function purgeCacheByHosts(array $hosts): array
    {
        return $this->request('post', "/zones/{$this->zoneId}/purge_cache", [
            'hosts' => $hosts,
        ]);
    }

    public function purgeCacheByPrefixes(array $prefixes): array
    {
        return $this->request('post', "/zones/{$this->zoneId}/purge_cache", [
            'prefixes' => $prefixes,
        ]);
    }

    public function getAnalytics(array $params = []): array
    {
        $defaultParams = [
            'since' => now()->subDays(7)->toIso8601String(),
            'until' => now()->toIso8601String(),
            'continuous' => true,
        ];

        $params = array_merge($defaultParams, $params);

        $query = http_build_query($params);

        return $this->request('get', "/zones/{$this->zoneId}/analytics/dashboard?{$query}");
    }

    public function getZoneDetails(): array
    {
        return $this->request('get', "/zones/{$this->zoneId}");
    }

    public function getCacheSettings(): array
    {
        return $this->request('get', "/zones/{$this->zoneId}/settings/cache_level");
    }

    public function updateCacheSettings(array $settings): array
    {
        $results = [];

        foreach ($settings as $setting => $value) {
            $results[$setting] = $this->request('patch', "/zones/{$this->zoneId}/settings/{$setting}", [
                'value' => $value,
            ]);
        }

        return $results;
    }

    public function getPageRules(): array
    {
        return $this->request('get', "/zones/{$this->zoneId}/pagerules");
    }

    public function createPageRule(array $rule): array
    {
        return $this->request('post', "/zones/{$this->zoneId}/pagerules", [
            'targets' => $rule['targets'] ?? [],
            'actions' => $rule['actions'] ?? [],
            'priority' => $rule['priority'] ?? 1,
            'status' => $rule['status'] ?? 'active',
        ]);
    }

    public function deletePageRule(string $ruleId): array
    {
        return $this->request('delete', "/zones/{$this->zoneId}/pagerules/{$ruleId}");
    }

    public function enableDevelopmentMode(): array
    {
        return $this->request('patch', "/zones/{$this->zoneId}/settings/development_mode", [
            'value' => 'on',
        ]);
    }

    public function disableDevelopmentMode(): array
    {
        return $this->request('patch', "/zones/{$this->zoneId}/settings/development_mode", [
            'value' => 'off',
        ]);
    }

    public function getDevelopmentModeStatus(): array
    {
        return $this->request('get', "/zones/{$this->zoneId}/settings/development_mode");
    }

    public function createWorkerRoute(string $pattern, string $script): array
    {
        return $this->request('post', "/zones/{$this->zoneId}/workers/routes", [
            'pattern' => $pattern,
            'script' => $script,
        ]);
    }

    public function getWorkers(): array
    {
        return $this->request('get', "/zones/{$this->zoneId}/workers/scripts");
    }

    public function getFirewallRules(): array
    {
        return $this->request('get', "/zones/{$this->zoneId}/firewall/rules");
    }

    public function getWafOverrides(): array
    {
        return $this->request('get', "/zones/{$this->zoneId}/firewall/waf/overrides");
    }

    public function createFirewallRule(array $rule): array
    {
        return $this->request('post', "/zones/{$this->zoneId}/firewall/rules", $rule);
    }

    public function getDnsRecords(): array
    {
        return $this->request('get', "/zones/{$this->zoneId}/dns_records");
    }

    public function createDnsRecord(string $type, string $name, string $content, int $ttl = 1, bool $proxied = true): array
    {
        return $this->request('post', "/zones/{$this->zoneId}/dns_records", [
            'type' => $type,
            'name' => $name,
            'content' => $content,
            'ttl' => $ttl,
            'proxied' => $proxied,
        ]);
    }

    public function updateDnsRecord(string $recordId, array $data): array
    {
        return $this->request('put', "/zones/{$this->zoneId}/dns_records/{$recordId}", $data);
    }

    public function deleteDnsRecord(string $recordId): array
    {
        return $this->request('delete', "/zones/{$this->zoneId}/dns_records/{$recordId}");
    }

    public function getSSLSettings(): array
    {
        return $this->request('get', "/zones/{$this->zoneId}/settings/ssl");
    }

    public function setSSLMode(string $mode): array
    {
        return $this->request('patch', "/zones/{$this->zoneId}/settings/ssl", [
            'value' => $mode,
        ]);
    }

    public function purgePost(int $postId): array
    {
        $urls = [
            url("/posts/{$postId}"),
            url("/api/v1/posts/{$postId}"),
        ];

        return $this->purgeCache($urls);
    }

    public function purgePage(int $pageId): array
    {
        $urls = [
            url("/pages/{$pageId}"),
            url("/api/v1/pages/{$pageId}"),
        ];

        return $this->purgeCache($urls);
    }

    public function purgeMedia(int $mediaId): array
    {
        return $this->purgeCacheByTags(["media-{$mediaId}"]);
    }

    public function purgeHomepage(): array
    {
        return $this->purgeCache([
            url('/'),
            url('/api/v1/posts'),
        ]);
    }

    public function purgeSitemap(): array
    {
        return $this->purgeCache([
            url('/sitemap.xml'),
            url('/sitemap-posts.xml'),
            url('/sitemap-pages.xml'),
            url('/sitemap-categories.xml'),
            url('/sitemap-tags.xml'),
        ]);
    }

    public function getStats(): array
    {
        $cacheKey = 'cloudflare:stats';
        return Cache::remember($cacheKey, $this->cacheTtl, function () {
            $analytics = $this->getAnalytics();
            $zone = $this->getZoneDetails();

            return [
                'configured' => $this->isConfigured(),
                'zone' => $zone['result']['name'] ?? null,
                'status' => $zone['result']['status'] ?? null,
                'analytics' => [
                    'requests' => [
                        'all' => $analytics['result']['totals']['requests']['all'] ?? 0,
                        'cached' => $analytics['result']['totals']['requests']['cached'] ?? 0,
                        'uncached' => $analytics['result']['totals']['requests']['uncached'] ?? 0,
                    ],
                    'bandwidth' => [
                        'all' => $analytics['result']['totals']['bandwidth']['all'] ?? 0,
                        'cached' => $analytics['result']['totals']['bandwidth']['cached'] ?? 0,
                        'uncached' => $analytics['result']['totals']['bandwidth']['uncached'] ?? 0,
                    ],
                    'threats' => $analytics['result']['totals']['threats']['all'] ?? 0,
                    'pageviews' => $analytics['result']['totals']['pageviews']['all'] ?? 0,
                ],
            ];
        });
    }
}
