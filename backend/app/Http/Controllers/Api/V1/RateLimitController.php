<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class RateLimitController extends Controller
{
    public function dashboard(): JsonResponse
    {
        return response()->json([
            'stats' => $this->getRateLimitStats(),
            'limits' => $this->getConfiguredLimits(),
            'top_ips' => $this->getTopRequestingIps(),
            'rate_limited' => $this->getRateLimitedRequests(),
            'hourly_chart' => $this->getHourlyRequestChart(),
        ]);
    }

    public function stats(): JsonResponse
    {
        return response()->json($this->getRateLimitStats());
    }

    public function limits(): JsonResponse
    {
        return response()->json($this->getConfiguredLimits());
    }

    public function topIps(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 20);
        return response()->json($this->getTopRequestingIps($limit));
    }

    public function rateLimited(Request $request): JsonResponse
    {
        $hours = $request->get('hours', 24);
        return response()->json($this->getRateLimitedRequests($hours));
    }

    public function clearForIp(string $ip): JsonResponse
    {
        $prefixes = ['api', 'auth', 'upload', 'search', 'webhook'];

        $cleared = 0;
        foreach ($prefixes as $prefix) {
            $key = "rate_limit:{$prefix}:{$ip}";
            if (Cache::has($key)) {
                Cache::forget($key);
                $cleared++;
            }
        }

        return response()->json([
            'message' => "Cleared {$cleared} rate limit entries for {$ip}",
            'ip' => $ip,
            'cleared' => $cleared,
        ]);
    }

    public function clearAll(): JsonResponse
    {
        $pattern = 'rate_limit:*';
        $keys = [];

        try {
            if (config('cache.default') === 'redis') {
                $keys = Redis::keys($pattern);
                foreach ($keys as $key) {
                    Redis::del($key);
                }
            }
        } catch (\Exception $e) {
        }

        return response()->json([
            'message' => 'All rate limits cleared',
            'keys_cleared' => count($keys),
        ]);
    }

    public function getIpStatus(string $ip): JsonResponse
    {
        $prefixes = ['api', 'auth', 'upload', 'search', 'webhook'];
        $status = [];

        foreach ($prefixes as $prefix) {
            $key = "rate_limit:{$prefix}:{$ip}";
            $attempts = Cache::get($key, 0);
            $limit = config("throttle.{$prefix}", 60);
            $limit = is_string($limit) ? explode(',', $limit)[0] : $limit;

            $status[$prefix] = [
                'attempts' => $attempts,
                'limit' => (int) $limit,
                'remaining' => max(0, (int) $limit - $attempts),
                'percentage_used' => $limit > 0 ? round(($attempts / $limit) * 100, 1) : 0,
                'is_limited' => $attempts >= $limit,
            ];
        }

        return response()->json([
            'ip' => $ip,
            'status' => $status,
            'is_blocked' => collect($status)->contains('is_limited', true),
        ]);
    }

    public function setCustomLimit(Request $request): JsonResponse
    {
        $request->validate([
            'ip' => 'required|ip',
            'limit_type' => 'required|string|in:api,auth,upload,search,webhook',
            'custom_limit' => 'required|integer|min:1|max:10000',
            'reason' => 'nullable|string|max:255',
        ]);

        $key = "rate_limit_custom:{$request->limit_type}:{$request->ip}";
        Cache::put($key, [
            'limit' => $request->custom_limit,
            'reason' => $request->reason,
            'set_by' => auth()->id(),
            'set_at' => now()->toIso8601String(),
        ], now()->addDays(30));

        return response()->json([
            'message' => 'Custom rate limit set',
            'ip' => $request->ip,
            'limit_type' => $request->limit_type,
            'custom_limit' => $request->custom_limit,
        ]);
    }

    public function removeCustomLimit(string $ip, string $type): JsonResponse
    {
        $key = "rate_limit_custom:{$type}:{$ip}";
        $deleted = Cache::forget($key);

        return response()->json([
            'message' => $deleted ? 'Custom limit removed' : 'No custom limit found',
            'ip' => $ip,
            'type' => $type,
        ]);
    }

    public function getCustomLimits(): JsonResponse
    {
        $customLimits = [];

        try {
            if (config('cache.default') === 'redis') {
                $keys = Redis::keys('rate_limit_custom:*');
                foreach ($keys as $key) {
                    $value = Redis::get($key);
                    if ($value) {
                        $customLimits[] = json_decode($value, true);
                    }
                }
            }
        } catch (\Exception $e) {
        }

        return response()->json([
            'custom_limits' => $customLimits,
            'count' => count($customLimits),
        ]);
    }

    protected function getRateLimitStats(): array
    {
        $stats = [
            'total_requests_last_hour' => 0,
            'total_requests_last_24h' => 0,
            'rate_limited_last_hour' => 0,
            'rate_limited_last_24h' => 0,
            'unique_ips_last_hour' => 0,
            'unique_ips_last_24h' => 0,
        ];

        try {
            if (config('cache.default') === 'redis') {
                $keys = Redis::keys('rate_limit:*');
                $stats['active_rate_limit_keys'] = count($keys);
            }
        } catch (\Exception $e) {
            $stats['active_rate_limit_keys'] = 0;
        }

        return $stats;
    }

    protected function getConfiguredLimits(): array
    {
        return [
            'api' => [
                'limit' => config('throttle.api', 100),
                'window' => '1 minute',
                'description' => 'Standard API requests',
            ],
            'auth' => [
                'limit' => config('throttle.login', '5,1'),
                'window' => '1 minute',
                'description' => 'Authentication endpoints (login, register)',
            ],
            'upload' => [
                'limit' => config('throttle.upload', '20,1'),
                'window' => '1 minute',
                'description' => 'File uploads',
            ],
            'public' => [
                'limit' => config('throttle.public', '60,1'),
                'window' => '1 minute',
                'description' => 'Public API endpoints',
            ],
            'burst' => [
                'limit' => config('throttle.burst', '10,1'),
                'window' => '1 second',
                'description' => 'Burst protection',
            ],
        ];
    }

    protected function getTopRequestingIps(int $limit = 20): array
    {
        $topIps = [];

        try {
            if (config('cache.default') === 'redis') {
                $keys = Redis::keys('rate_limit:*');
                $ipCounts = [];

                foreach ($keys as $key) {
                    if (preg_match('/rate_limit:([^:]+):(.+)/', $key, $matches)) {
                        $type = $matches[1];
                        $ip = $matches[2];
                        $attempts = (int) Redis::get($key);

                        if (!isset($ipCounts[$ip])) {
                            $ipCounts[$ip] = ['ip' => $ip, 'total_requests' => 0, 'by_type' => []];
                        }
                        $ipCounts[$ip]['total_requests'] += $attempts;
                        $ipCounts[$ip]['by_type'][$type] = $attempts;
                    }
                }

                $topIps = collect($ipCounts)
                    ->sortByDesc('total_requests')
                    ->take($limit)
                    ->values()
                    ->toArray();
            }
        } catch (\Exception $e) {
        }

        return $topIps;
    }

    protected function getRateLimitedRequests(int $hours = 24): array
    {
        return [
            'total_limited' => 0,
            'by_endpoint' => [],
            'by_ip' => [],
            'period_hours' => $hours,
        ];
    }

    protected function getHourlyRequestChart(): array
    {
        $chart = [];
        for ($i = 23; $i >= 0; $i--) {
            $hour = now()->subHours($i)->format('Y-m-d H:00');
            $chart[] = [
                'hour' => $hour,
                'requests' => 0,
                'limited' => 0,
            ];
        }

        return $chart;
    }
}
