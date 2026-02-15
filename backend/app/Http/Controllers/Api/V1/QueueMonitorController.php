<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Queue\Worker;
use Illuminate\Queue\Listener;

class QueueMonitorController extends Controller
{
    public function index(Request $request)
    {
        $queues = config('queue.connections.redis.queue', 'default');
        $queues = is_array($queues) ? $queues : [$queues];

        $stats = [
            'queues' => [],
            'workers' => [],
            'failed_jobs' => [],
            'summary' => [
                'total_pending' => 0,
                'total_failed' => 0,
                'total_processed_today' => 0,
            ],
        ];

        foreach ($queues as $queue) {
            $pending = $this->getQueueSize($queue);
            $delayed = $this->getDelayedSize($queue);
            $reserved = $this->getReservedSize($queue);

            $stats['queues'][] = [
                'name' => $queue,
                'pending' => $pending,
                'delayed' => $delayed,
                'reserved' => $reserved,
                'total' => $pending + $delayed + $reserved,
            ];

            $stats['summary']['total_pending'] += $pending;
        }

        $stats['failed_jobs'] = $this->getFailedJobs();
        $stats['summary']['total_failed'] = count($stats['failed_jobs']);
        $stats['summary']['total_processed_today'] = $this->getProcessedToday();

        $stats['workers'] = $this->getActiveWorkers();

        return response()->json($stats);
    }

    public function show(Request $request, $queue)
    {
        $jobs = $this->getQueueJobs($queue);
        $delayed = $this->getDelayedJobs($queue);
        $reserved = $this->getReservedJobs($queue);

        return response()->json([
            'queue' => $queue,
            'pending' => $jobs,
            'delayed' => $delayed,
            'reserved' => $reserved,
            'stats' => [
                'pending_count' => count($jobs),
                'delayed_count' => count($delayed),
                'reserved_count' => count($reserved),
            ],
        ]);
    }

    public function retry(Request $request, $id)
    {
        $job = DB::table('failed_jobs')->where('id', $id)->first();

        if (!$job) {
            return response()->json(['message' => 'Failed job not found'], 404);
        }

        $payload = json_decode($job->payload, true);
        $jobClass = $payload['job'] ?? null;

        if ($jobClass && class_exists($jobClass)) {
            $command = unserialize($payload['data']['command']);
            dispatch($command);
        }

        DB::table('failed_jobs')->where('id', $id)->delete();

        return response()->json(['message' => 'Job retry initiated']);
    }

    public function forget(Request $request, $id)
    {
        $deleted = DB::table('failed_jobs')->where('id', $id)->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Failed job not found'], 404);
        }

        return response()->json(['message' => 'Failed job deleted']);
    }

    public function flush(Request $request)
    {
        DB::table('failed_jobs')->truncate();

        return response()->json(['message' => 'All failed jobs cleared']);
    }

    public function clear(Request $request, $queue)
    {
        $redis = Redis::connection();
        $prefix = config('database.redis.options.prefix', '');

        $redis->del($prefix . 'queues:' . $queue);
        $redis->del($prefix . 'queues:' . $queue . ':delayed');
        $redis->del($prefix . 'queues:' . $queue . ':reserved');

        return response()->json(['message' => "Queue {$queue} cleared"]);
    }

    public function pause(Request $request, $queue)
    {
        $redis = Redis::connection();
        $prefix = config('database.redis.options.prefix', '');

        $redis->set($prefix . 'queues:' . $queue . ':paused', 1);

        return response()->json(['message' => "Queue {$queue} paused"]);
    }

    public function resume(Request $request, $queue)
    {
        $redis = Redis::connection();
        $prefix = config('database.redis.options.prefix', '');

        $redis->del($prefix . 'queues:' . $queue . ':paused');

        return response()->json(['message' => "Queue {$queue} resumed"]);
    }

    private function getQueueSize($queue)
    {
        try {
            $redis = Redis::connection();
            $prefix = config('database.redis.options.prefix', '');
            return $redis->llen($prefix . 'queues:' . $queue) ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getDelayedSize($queue)
    {
        try {
            $redis = Redis::connection();
            $prefix = config('database.redis.options.prefix', '');
            return $redis->zcard($prefix . 'queues:' . $queue . ':delayed') ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getReservedSize($queue)
    {
        try {
            $redis = Redis::connection();
            $prefix = config('database.redis.options.prefix', '');
            return $redis->zcard($prefix . 'queues:' . $queue . ':reserved') ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getQueueJobs($queue, $limit = 100)
    {
        try {
            $redis = Redis::connection();
            $prefix = config('database.redis.options.prefix', '');
            $jobs = $redis->lrange($prefix . 'queues:' . $queue, 0, $limit - 1);

            return array_map(function ($job) {
                return $this->parseJob($job);
            }, $jobs ?? []);
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getDelayedJobs($queue, $limit = 100)
    {
        try {
            $redis = Redis::connection();
            $prefix = config('database.redis.options.prefix', '');
            $jobs = $redis->zrange($prefix . 'queues:' . $queue . ':delayed', 0, $limit - 1);

            return array_map(function ($job) {
                return $this->parseJob($job);
            }, $jobs ?? []);
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getReservedJobs($queue, $limit = 100)
    {
        try {
            $redis = Redis::connection();
            $prefix = config('database.redis.options.prefix', '');
            $jobs = $redis->zrange($prefix . 'queues:' . $queue . ':reserved', 0, $limit - 1);

            return array_map(function ($job) {
                return $this->parseJob($job);
            }, $jobs ?? []);
        } catch (\Exception $e) {
            return [];
        }
    }

    private function parseJob($rawJob)
    {
        try {
            $data = json_decode($rawJob, true);
            $command = isset($data['data']['command']) ? unserialize($data['data']['command']) : null;

            return [
                'id' => $data['id'] ?? null,
                'job' => $data['job'] ?? 'Unknown',
                'queue' => $data['queue'] ?? 'default',
                'attempts' => $data['attempts'] ?? 0,
                'command_class' => $command ? get_class($command) : null,
                'created_at' => $data['created_at'] ?? null,
            ];
        } catch (\Exception $e) {
            return [
                'raw' => $rawJob,
                'error' => 'Failed to parse job',
            ];
        }
    }

    private function getFailedJobs()
    {
        return DB::table('failed_jobs')
            ->orderBy('failed_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($job) {
                $payload = json_decode($job->payload, true);
                return [
                    'id' => $job->id,
                    'connection' => $job->connection,
                    'queue' => $job->queue,
                    'job' => $payload['job'] ?? 'Unknown',
                    'exception' => substr($job->exception, 0, 500),
                    'failed_at' => $job->failed_at,
                ];
            })
            ->toArray();
    }

    private function getProcessedToday()
    {
        try {
            $redis = Redis::connection();
            $prefix = config('database.redis.options.prefix', '');
            $key = $prefix . 'queue:processed:' . date('Y-m-d');
            return (int) $redis->get($key) ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getActiveWorkers()
    {
        $workers = [];
        $pids = [];

        if (PHP_OS_FAMILY === 'Linux') {
            exec("ps aux | grep 'queue:work' | grep -v grep", $output);
            foreach ($output ?? [] as $line) {
                if (preg_match('/(\d+).*queue:work.*--queue=([^\s]+)/', $line, $matches)) {
                    $workers[] = [
                        'pid' => $matches[1],
                        'queue' => $matches[2],
                        'status' => 'running',
                    ];
                }
            }
        }

        return $workers;
    }
}
