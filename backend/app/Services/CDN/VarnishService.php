<?php

namespace App\Services\CDN;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VarnishService
{
    protected string $varnishHost;
    protected int $varnishPort;
    protected string $varnishSecret;
    protected string $banMethod;

    public function __construct()
    {
        $this->varnishHost = config('cdn.varnish.host', '127.0.0.1');
        $this->varnishPort = config('cdn.varnish.port', 6081);
        $this->varnishSecret = config('cdn.varnish.secret', '');
        $this->banMethod = config('cdn.varnish.ban_method', 'purge');
    }

    public function isConfigured(): bool
    {
        return !empty($this->varnishHost);
    }

    protected function sendBan(string $url, array $headers = []): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        try {
            $curlHeaders = [];
            foreach ($headers as $key => $value) {
                $curlHeaders[] = "{$key}: {$value}";
            }

            $curlHeaders[] = "{$this->banMethod}: {$url}";
            $curlHeaders[] = "Host: " . parse_url($url, PHP_URL_HOST);

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => "http://{$this->varnishHost}:{$this->varnishPort}/",
                CURLOPT_CUSTOMREQUEST => $this->banMethod,
                CURLOPT_HTTPHEADER => $curlHeaders,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5,
                CURLOPT_CONNECTTIMEOUT => 2,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return $httpCode === 200 || $httpCode === 204;
        } catch (\Exception $e) {
            Log::error('Varnish ban failed', ['error' => $e->getMessage(), 'url' => $url]);
            return false;
        }
    }

    public function purgeUrl(string $url): bool
    {
        return $this->sendBan($url);
    }

    public function purgeAll(): bool
    {
        return $this->sendBan(config('app.url'), ['X-Cache-Purge' => 'all']);
    }

    public function purgePath(string $path): bool
    {
        $url = config('app.url') . $path;
        return $this->sendBan($url, ['X-Cache-Purge' => 'path']);
    }

    public function purgeByRegex(string $pattern): bool
    {
        return $this->sendBan(config('app.url'), [
            'X-Cache-Purge' => 'regex',
            'X-Cache-Regex' => $pattern,
        ]);
    }

    public function purgeByTag(string $tag): bool
    {
        return $this->sendBan(config('app.url'), [
            'X-Cache-Purge' => 'tag',
            'X-Cache-Tag' => $tag,
        ]);
    }

    public function purgeByContentType(string $type): bool
    {
        return $this->purgeByRegex("obj.http.Content-Type ~ {$type}");
    }

    public function purgeHomepage(): bool
    {
        return $this->purgePath('/');
    }

    public function purgePost(int $postId): bool
    {
        $patterns = [
            "/posts/{$postId}",
            "/posts/{$postId}/*",
            "/api/v1/posts/{$postId}",
        ];

        foreach ($patterns as $pattern) {
            $this->purgePath($pattern);
        }

        return true;
    }

    public function purgePage(int $pageId): bool
    {
        $patterns = [
            "/pages/{$pageId}",
            "/pages/{$pageId}/*",
            "/api/v1/pages/{$pageId}",
        ];

        foreach ($patterns as $pattern) {
            $this->purgePath($pattern);
        }

        return true;
    }

    public function purgeCategory(int $categoryId): bool
    {
        $patterns = [
            "/category/{$categoryId}",
            "/category/{$categoryId}/*",
            "/api/v1/categories/{$categoryId}",
        ];

        foreach ($patterns as $pattern) {
            $this->purgePath($pattern);
        }

        return true;
    }

    public function purgeTag(int $tagId): bool
    {
        $patterns = [
            "/tag/{$tagId}",
            "/tag/{$tagId}/*",
            "/api/v1/tags/{$tagId}",
        ];

        foreach ($patterns as $pattern) {
            $this->purgePath($pattern);
        }

        return true;
    }

    public function purgeMedia(): bool
    {
        return $this->purgeByRegex('\.(jpg|jpeg|png|gif|webp|svg|ico|mp4|webm)$');
    }

    public function purgeApi(): bool
    {
        return $this->purgePath('/api/');
    }

    public function purgeStatic(): bool
    {
        $patterns = [
            '/css/',
            '/js/',
            '/fonts/',
            '/images/',
        ];

        foreach ($patterns as $pattern) {
            $this->purgePath($pattern);
        }

        return true;
    }

    public function getStats(): array
    {
        try {
            $response = Http::timeout(5)->get("http://{$this->varnishHost}:6085/stats");

            if (!$response->successful()) {
                return ['error' => 'Unable to fetch Varnish stats'];
            }

            return $response->json();
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function getHealth(): array
    {
        $start = microtime(true);

        try {
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => "http://{$this->varnishHost}:{$this->varnishPort}/",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_HEADER => true,
                CURLOPT_NOBODY => true,
            ]);

            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $latency = round((microtime(true) - $start) * 1000, 2);

            return [
                'status' => $httpCode > 0 ? 'healthy' : 'unhealthy',
                'latency' => $latency . 'ms',
                'http_code' => $httpCode,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }
    }
}
