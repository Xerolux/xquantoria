<?php

namespace App\Services\Performance;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PerformanceService
{
    protected array $slowQueryLog = [];
    protected float $slowQueryThreshold;

    public function __construct()
    {
        $this->slowQueryThreshold = config('performance.slow_query_threshold', 1000);
    }

    public function optimizeQuery(string $query, array $bindings = []): void
    {
        $startTime = microtime(true);
        
        DB::listen(function ($event) use ($startTime) {
            $executionTime = (microtime(true) - $startTime) * 1000;
            
            if ($executionTime > $this->slowQueryThreshold) {
                $this->logSlowQuery($event->sql, $event->bindings, $executionTime);
            }
        });
    }

    protected function logSlowQuery(string $sql, array $bindings, float $time): void
    {
        $this->slowQueryLog[] = [
            'sql' => $sql,
            'bindings' => $bindings,
            'time' => $time,
            'timestamp' => now()->toIso8601String(),
        ];

        Log::channel('slow-queries')->warning('Slow query detected', [
            'sql' => $sql,
            'bindings' => $bindings,
            'time_ms' => round($time, 2),
        ]);
    }

    public function getSlowQueries(): array
    {
        return $this->slowQueryLog;
    }

    public function cacheQuery(string $key, callable $callback, int $ttl = 3600): mixed
    {
        return Cache::remember($key, $ttl, $callback);
    }

    public function cacheTagged(string $tag, string $key, callable $callback, int $ttl = 3600): mixed
    {
        return Cache::tags([$tag])->remember($key, $ttl, $callback);
    }

    public function flushTag(string $tag): bool
    {
        return Cache::tags([$tag])->flush();
    }

    public function warmCache(): array
    {
        $results = [];

        $results['settings'] = $this->warmSettingsCache();
        $results['categories'] = $this->warmCategoriesCache();
        $results['tags'] = $this->warmTagsCache();
        $results['menu_pages'] = $this->warmMenuPagesCache();

        return $results;
    }

    protected function warmSettingsCache(): bool
    {
        try {
            $settings = DB::table('settings')->get()->keyBy('key');
            Cache::put('settings:all', $settings, now()->addDay());
            return true;
        } catch (\Exception $e) {
            Log::error('Failed to warm settings cache', ['error' => $e->getMessage()]);
            return false;
        }
    }

    protected function warmCategoriesCache(): bool
    {
        try {
            $categories = DB::table('categories')
                ->select(['id', 'name', 'slug', 'parent_id'])
                ->orderBy('name')
                ->get();
            
            Cache::put('categories:tree', $categories, now()->addHour());
            return true;
        } catch (\Exception $e) {
            Log::error('Failed to warm categories cache', ['error' => $e->getMessage()]);
            return false;
        }
    }

    protected function warmTagsCache(): bool
    {
        try {
            $tags = DB::table('tags')
                ->select(['id', 'name', 'slug'])
                ->orderBy('usage_count', 'desc')
                ->limit(100)
                ->get();
            
            Cache::put('tags:popular', $tags, now()->addHour());
            return true;
        } catch (\Exception $e) {
            Log::error('Failed to warm tags cache', ['error' => $e->getMessage()]);
            return false;
        }
    }

    protected function warmMenuPagesCache(): bool
    {
        try {
            $pages = DB::table('pages')
                ->where('show_in_menu', true)
                ->where('status', 'published')
                ->orderBy('menu_order')
                ->get(['id', 'title', 'slug']);
            
            Cache::put('pages:menu', $pages, now()->addHour());
            return true;
        } catch (\Exception $e) {
            Log::error('Failed to warm menu pages cache', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function getDatabaseStats(): array
    {
        $connection = config('database.default');
        
        if ($connection === 'pgsql') {
            return $this->getPgSqlStats();
        } elseif ($connection === 'mysql') {
            return $this->getMySqlStats();
        }

        return [];
    }

    protected function getPgSqlStats(): array
    {
        try {
            $stats = DB::select("
                SELECT 
                    (SELECT count(*) FROM pg_stat_activity) as connections,
                    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries,
                    (SELECT pg_database_size(current_database())) as database_size
            ");

            return [
                'connections' => $stats[0]->connections ?? 0,
                'active_queries' => $stats[0]->active_queries ?? 0,
                'database_size' => $stats[0]->database_size ?? 0,
            ];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    protected function getMySqlStats(): array
    {
        try {
            $status = DB::select("SHOW STATUS LIKE 'Threads%'");
            $statusMap = collect($status)->pluck('Value', 'Variable_name');

            return [
                'connections' => $statusMap['Threads_connected'] ?? 0,
                'running' => $statusMap['Threads_running'] ?? 0,
            ];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function getCacheStats(): array
    {
        $redis = app('redis')->connection();
        
        try {
            $info = $redis->info();
            
            return [
                'connected_clients' => $info['connected_clients'] ?? 0,
                'used_memory' => $info['used_memory_human'] ?? 'N/A',
                'keys' => $redis->dbSize(),
                'hits' => $info['keyspace_hits'] ?? 0,
                'misses' => $info['keyspace_misses'] ?? 0,
                'hit_rate' => $this->calculateHitRate(
                    $info['keyspace_hits'] ?? 0,
                    $info['keyspace_misses'] ?? 0
                ),
            ];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    protected function calculateHitRate(int $hits, int $misses): float
    {
        $total = $hits + $misses;
        return $total > 0 ? round(($hits / $total) * 100, 2) : 0;
    }

    public function optimizeTables(): array
    {
        $connection = config('database.default');
        $tables = $this->getTables();
        $results = [];

        foreach ($tables as $table) {
            try {
                if ($connection === 'mysql') {
                    DB::statement("OPTIMIZE TABLE {$table}");
                } elseif ($connection === 'pgsql') {
                    DB::statement("VACUUM ANALYZE {$table}");
                }
                $results[$table] = 'optimized';
            } catch (\Exception $e) {
                $results[$table] = 'failed: ' . $e->getMessage();
            }
        }

        return $results;
    }

    protected function getTables(): array
    {
        $connection = config('database.default');
        $database = config('database.connections.' . $connection . '.database');

        if ($connection === 'mysql') {
            return array_column(DB::select("SHOW TABLES FROM `{$database}`"), "Tables_in_{$database}");
        } elseif ($connection === 'pgsql') {
            return array_column(DB::select("
                SELECT tablename FROM pg_tables WHERE schemaname = 'public'
            "), 'tablename');
        }

        return [];
    }

    public function getOpCacheStats(): array
    {
        if (!function_exists('opcache_get_status')) {
            return ['enabled' => false];
        }

        $status = opcache_get_status(false);

        return [
            'enabled' => $status['opcache_enabled'] ?? false,
            'memory_used' => $status['memory_usage']['used_memory'] ?? 0,
            'memory_free' => $status['memory_usage']['free_memory'] ?? 0,
            'hit_rate' => $status['opcache_statistics']['opcache_hit_rate'] ?? 0,
            'cached_scripts' => $status['opcache_statistics']['num_cached_scripts'] ?? 0,
        ];
    }

    public function clearAllCaches(): array
    {
        $results = [];

        $results['application'] = Cache::flush();
        
        if (function_exists('opcache_reset')) {
            $results['opcache'] = opcache_reset();
        }

        try {
            \Artisan::call('config:clear');
            $results['config'] = true;
        } catch (\Exception $e) {
            $results['config'] = false;
        }

        try {
            \Artisan::call('route:clear');
            $results['routes'] = true;
        } catch (\Exception $e) {
            $results['routes'] = false;
        }

        try {
            \Artisan::call('view:clear');
            $results['views'] = true;
        } catch (\Exception $e) {
            $results['views'] = false;
        }

        return $results;
    }
}
