<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

class PerformanceController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'overview' => $this->getOverview(),
            'database' => $this->getDatabaseStats(),
            'cache' => $this->getCacheStats(),
            'queue' => $this->getQueueStats(),
            'php' => $this->getPhpStats(),
            'requests' => $this->getRequestStats(),
            'slow_queries' => $this->getSlowQueries(),
            'recommendations' => $this->getRecommendations(),
        ]);
    }

    public function database(Request $request)
    {
        return response()->json([
            'stats' => $this->getDatabaseStats(),
            'tables' => $this->getTableStats(),
            'indexes' => $this->getIndexStats(),
            'connections' => $this->getConnectionStats(),
        ]);
    }

    public function cache(Request $request)
    {
        return response()->json([
            'stats' => $this->getCacheStats(),
            'keys' => $this->getCacheKeys(),
            'memory' => $this->getCacheMemory(),
        ]);
    }

    public function clearCache(Request $request)
    {
        $type = $request->input('type', 'all');

        switch ($type) {
            case 'application':
                Cache::flush();
                break;
            case 'config':
                Process::run('php ' . base_path('artisan') . ' config:clear');
                break;
            case 'route':
                Process::run('php ' . base_path('artisan') . ' route:clear');
                break;
            case 'view':
                Process::run('php ' . base_path('artisan') . ' view:clear');
                break;
            case 'all':
            default:
                Cache::flush();
                Process::run('php ' . base_path('artisan') . ' config:clear');
                Process::run('php ' . base_path('artisan') . ' route:clear');
                Process::run('php ' . base_path('artisan') . ' view:clear');
                break;
        }

        return response()->json(['message' => ucfirst($type) . ' cache cleared']);
    }

    public function optimize(Request $request)
    {
        Process::run('php ' . base_path('artisan') . ' config:cache');
        Process::run('php ' . base_path('artisan') . ' route:cache');
        Process::run('php ' . base_path('artisan') . ' view:cache');

        return response()->json(['message' => 'Application optimized']);
    }

    public function opcache(Request $request)
    {
        if (!function_exists('opcache_get_status')) {
            return response()->json([
                'enabled' => false,
                'message' => 'OPcache is not installed',
            ]);
        }

        $status = opcache_get_status(false);

        return response()->json([
            'enabled' => $status !== false,
            'memory_usage' => $status['memory_usage'] ?? null,
            'opcache_statistics' => $status['opcache_statistics'] ?? null,
            'jit' => $status['jit'] ?? null,
        ]);
    }

    public function resetOpcache(Request $request)
    {
        if (!function_exists('opcache_reset')) {
            return response()->json(['message' => 'OPcache is not available'], 400);
        }

        opcache_reset();

        return response()->json(['message' => 'OPcache reset successfully']);
    }

    private function getOverview()
    {
        $dbSize = $this->getDatabaseSize();
        $cacheHitRate = $this->getCacheHitRate();
        $queueSize = $this->getTotalQueueSize();
        $avgResponseTime = $this->getAverageResponseTime();

        return [
            'database_size' => $dbSize,
            'cache_hit_rate' => $cacheHitRate,
            'queue_size' => $queueSize,
            'avg_response_time' => $avgResponseTime,
            'memory_usage' => $this->getMemoryUsage(),
            'cpu_usage' => $this->getCpuUsage(),
            'disk_usage' => $this->getDiskUsage(),
            'uptime' => $this->getUptime(),
        ];
    }

    private function getDatabaseStats()
    {
        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");

        $stats = [
            'driver' => $driver,
            'size' => $this->getDatabaseSize(),
            'tables_count' => 0,
            'connections' => 0,
            'queries_per_second' => 0,
        ];

        if ($driver === 'pgsql') {
            $stats['tables_count'] = DB::select("SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'")[0]->count ?? 0;
            $stats['connections'] = DB::select("SELECT count(*) as count FROM pg_stat_activity")[0]->count ?? 0;
        } elseif ($driver === 'mysql') {
            $stats['tables_count'] = DB::select("SELECT count(*) as count FROM information_schema.tables WHERE table_schema = DATABASE()")[0]->count ?? 0;
            $stats['connections'] = DB::select("SHOW STATUS LIKE 'Threads_connected'")[0]->Value ?? 0;
        }

        return $stats;
    }

    private function getCacheStats()
    {
        $driver = config('cache.default');

        $stats = [
            'driver' => $driver,
            'hit_rate' => $this->getCacheHitRate(),
            'keys' => 0,
            'memory' => 0,
        ];

        if ($driver === 'redis') {
            try {
                $redis = Redis::connection();
                $info = $redis->info();
                $stats['keys'] = $info['db0']['keys'] ?? 0;
                $stats['memory'] = $this->parseBytes($info['used_memory'] ?? 0);
            } catch (\Exception $e) {
            }
        }

        return $stats;
    }

    private function getQueueStats()
    {
        return [
            'pending' => $this->getTotalQueueSize(),
            'failed' => DB::table('failed_jobs')->count(),
            'workers' => $this->getWorkerCount(),
        ];
    }

    private function getPhpStats()
    {
        return [
            'version' => PHP_VERSION,
            'memory_limit' => ini_get('memory_limit'),
            'memory_usage' => $this->formatBytes(memory_get_usage(true)),
            'memory_peak' => $this->formatBytes(memory_get_peak_usage(true)),
            'max_execution_time' => ini_get('max_execution_time'),
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size'),
            'opcache_enabled' => function_exists('opcache_get_status') && opcache_get_status(false) !== false,
        ];
    }

    private function getRequestStats()
    {
        return Cache::get('performance:request_stats', [
            'total' => 0,
            'avg_time' => 0,
            'max_time' => 0,
            'by_endpoint' => [],
        ]);
    }

    private function getSlowQueries()
    {
        return Cache::get('performance:slow_queries', []);
    }

    private function getTableStats()
    {
        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");
        $tables = [];

        if ($driver === 'pgsql') {
            $result = DB::select("
                SELECT 
                    table_name,
                    pg_size_pretty(pg_total_relation_size(table_name::text)) as size,
                    pg_total_relation_size(table_name::text) as bytes
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY bytes DESC
            ");
        } elseif ($driver === 'mysql') {
            $result = DB::select("
                SELECT 
                    table_name,
                    ROUND((data_length + index_length) / 1024 / 1024, 2) as size,
                    (data_length + index_length) as bytes
                FROM information_schema.tables 
                WHERE table_schema = DATABASE()
                ORDER BY bytes DESC
            ");
        }

        foreach ($result ?? [] as $row) {
            $tables[] = [
                'name' => $row->table_name ?? $row->TABLE_NAME ?? 'unknown',
                'size' => $row->size,
                'bytes' => $row->bytes,
            ];
        }

        return $tables;
    }

    private function getIndexStats()
    {
        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");
        $indexes = [];

        if ($driver === 'pgsql') {
            $result = DB::select("
                SELECT 
                    indexname as name,
                    tablename as table_name
                FROM pg_indexes 
                WHERE schemaname = 'public'
            ");
        } elseif ($driver === 'mysql') {
            $result = DB::select("
                SELECT 
                    INDEX_NAME as name,
                    TABLE_NAME as table_name
                FROM information_schema.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE()
                GROUP BY INDEX_NAME, TABLE_NAME
            ");
        }

        foreach ($result ?? [] as $row) {
            $indexes[] = [
                'name' => $row->name ?? $row->NAME ?? 'unknown',
                'table' => $row->table_name ?? $row->TABLE_NAME ?? 'unknown',
            ];
        }

        return $indexes;
    }

    private function getConnectionStats()
    {
        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");

        if ($driver === 'pgsql') {
            return DB::select("SELECT * FROM pg_stat_activity");
        } elseif ($driver === 'mysql') {
            return DB::select("SHOW PROCESSLIST");
        }

        return [];
    }

    private function getCacheKeys()
    {
        $driver = config('cache.default');

        if ($driver === 'redis') {
            try {
                $redis = Redis::connection();
                $prefix = config('database.redis.options.prefix', '');
                $keys = $redis->keys($prefix . '*');
                return array_slice($keys, 0, 100);
            } catch (\Exception $e) {
                return [];
            }
        }

        return [];
    }

    private function getCacheMemory()
    {
        $driver = config('cache.default');

        if ($driver === 'redis') {
            try {
                $redis = Redis::connection();
                $info = $redis->info();
                return [
                    'used' => $this->formatBytes($info['used_memory'] ?? 0),
                    'peak' => $this->formatBytes($info['used_memory_peak'] ?? 0),
                    'total' => $this->formatBytes($info['total_system_memory'] ?? 0),
                ];
            } catch (\Exception $e) {
                return [];
            }
        }

        return [];
    }

    private function getRecommendations()
    {
        $recommendations = [];

        $cacheHitRate = $this->getCacheHitRate();
        if ($cacheHitRate < 80) {
            $recommendations[] = [
                'type' => 'cache',
                'severity' => 'warning',
                'message' => 'Cache hit rate is low (' . $cacheHitRate . '%). Consider warming up the cache.',
            ];
        }

        $dbSize = $this->getDatabaseSize();
        if ($dbSize > 500) {
            $recommendations[] = [
                'type' => 'database',
                'severity' => 'info',
                'message' => 'Database size exceeds 500MB. Consider archiving old data.',
            ];
        }

        $failedJobs = DB::table('failed_jobs')->count();
        if ($failedJobs > 10) {
            $recommendations[] = [
                'type' => 'queue',
                'severity' => 'warning',
                'message' => "There are {$failedJobs} failed jobs. Review and retry them.",
            ];
        }

        $memoryUsage = memory_get_usage(true) / $this->parseBytes(ini_get('memory_limit'));
        if ($memoryUsage > 0.8) {
            $recommendations[] = [
                'type' => 'memory',
                'severity' => 'critical',
                'message' => 'Memory usage is above 80%. Consider increasing memory_limit.',
            ];
        }

        return $recommendations;
    }

    private function getDatabaseSize()
    {
        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");
        $database = config("database.connections.{$connection}.database");

        if ($driver === 'pgsql') {
            $result = DB::select("SELECT pg_database_size(?) as size", [$database]);
            return $this->formatBytes($result[0]->size ?? 0);
        } elseif ($driver === 'mysql') {
            $result = DB::select("
                SELECT SUM(data_length + index_length) as size 
                FROM information_schema.tables 
                WHERE table_schema = ?
            ", [$database]);
            return $this->formatBytes($result[0]->size ?? 0);
        }

        return 'Unknown';
    }

    private function getCacheHitRate()
    {
        $driver = config('cache.default');

        if ($driver === 'redis') {
            try {
                $redis = Redis::connection();
                $info = $redis->info();
                $hits = $info['keyspace_hits'] ?? 0;
                $misses = $info['keyspace_misses'] ?? 0;
                $total = $hits + $misses;
                return $total > 0 ? round($hits / $total * 100, 1) : 0;
            } catch (\Exception $e) {
                return 0;
            }
        }

        return 0;
    }

    private function getTotalQueueSize()
    {
        try {
            $redis = Redis::connection();
            $prefix = config('database.redis.options.prefix', '');
            return $redis->llen($prefix . 'queues:default') ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getAverageResponseTime()
    {
        $stats = Cache::get('performance:request_stats', ['avg_time' => 0]);
        return $stats['avg_time'];
    }

    private function getMemoryUsage()
    {
        $used = memory_get_usage(true);
        $limit = $this->parseBytes(ini_get('memory_limit'));

        return [
            'used' => $this->formatBytes($used),
            'limit' => ini_get('memory_limit'),
            'percent' => $limit > 0 ? round($used / $limit * 100, 1) : 0,
        ];
    }

    private function getCpuUsage()
    {
        if (PHP_OS_FAMILY === 'Linux') {
            $load = sys_getloadavg();
            return [
                '1min' => $load[0] ?? 0,
                '5min' => $load[1] ?? 0,
                '15min' => $load[2] ?? 0,
            ];
        }

        return null;
    }

    private function getDiskUsage()
    {
        $path = base_path();
        $total = disk_total_space($path);
        $free = disk_free_space($path);
        $used = $total - $free;

        return [
            'total' => $this->formatBytes($total),
            'used' => $this->formatBytes($used),
            'free' => $this->formatBytes($free),
            'percent' => round($used / $total * 100, 1),
        ];
    }

    private function getUptime()
    {
        if (PHP_OS_FAMILY === 'Linux' && file_exists('/proc/uptime')) {
            $uptime = file_get_contents('/proc/uptime');
            $seconds = (float) explode(' ', $uptime)[0];
            return [
                'seconds' => $seconds,
                'formatted' => $this->formatUptime($seconds),
            ];
        }

        return null;
    }

    private function getWorkerCount()
    {
        if (PHP_OS_FAMILY === 'Linux') {
            exec("ps aux | grep 'queue:work' | grep -v grep | wc -l", $output);
            return (int) ($output[0] ?? 0);
        }

        return 0;
    }

    private function formatBytes($bytes)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }

    private function parseBytes($value)
    {
        $unit = strtolower(substr($value, -1));
        $value = (float) $value;

        switch ($unit) {
            case 'g': $value *= 1024;
            case 'm': $value *= 1024;
            case 'k': $value *= 1024;
        }

        return $value;
    }

    private function formatUptime($seconds)
    {
        $days = floor($seconds / 86400);
        $hours = floor(($seconds % 86400) / 3600);
        $minutes = floor(($seconds % 3600) / 60);

        $parts = [];
        if ($days > 0) $parts[] = $days . 'd';
        if ($hours > 0) $parts[] = $hours . 'h';
        if ($minutes > 0) $parts[] = $minutes . 'm';

        return implode(' ', $parts);
    }
}
