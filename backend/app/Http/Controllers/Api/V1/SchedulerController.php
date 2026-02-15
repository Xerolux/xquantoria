<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

class SchedulerController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'status' => $this->getSchedulerStatus(),
            'tasks' => $this->getScheduledTasks(),
            'last_run' => $this->getLastRun(),
            'next_run' => $this->getNextRun(),
            'history' => $this->getExecutionHistory(),
            'stats' => $this->getStats(),
        ]);
    }

    public function run(Request $request)
    {
        $force = $request->input('force', false);

        if ($force) {
            Process::run('php ' . base_path('artisan') . ' schedule:run --force');
        } else {
            Process::run('php ' . base_path('artisan') . ' schedule:run');
        }

        return response()->json(['message' => 'Scheduler run initiated']);
    }

    public function runTask(Request $request, $task)
    {
        $command = $this->getCommandForTask($task);

        if (!$command) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        Process::run('php ' . base_path('artisan') . ' ' . $command);

        return response()->json(['message' => "Task {$task} executed"]);
    }

    public function enable(Request $request)
    {
        Cache::put('scheduler:enabled', true, now()->addYears(1));

        return response()->json(['message' => 'Scheduler enabled']);
    }

    public function disable(Request $request)
    {
        Cache::put('scheduler:enabled', false, now()->addYears(1));

        return response()->json(['message' => 'Scheduler disabled']);
    }

    public function clearHistory(Request $request)
    {
        Cache::forget('scheduler:history');

        return response()->json(['message' => 'Scheduler history cleared']);
    }

    private function getSchedulerStatus()
    {
        $enabled = Cache::get('scheduler:enabled', true);
        $lastRun = Cache::get('scheduler:last_run');
        $cronConfigured = $this->isCronConfigured();

        return [
            'enabled' => $enabled,
            'cron_configured' => $cronConfigured,
            'running' => $this->isSchedulerRunning(),
            'health' => $this->checkSchedulerHealth(),
        ];
    }

    private function getScheduledTasks()
    {
        $tasks = [
            [
                'id' => 'backup_automated',
                'name' => 'Automated Backup',
                'command' => 'backup:automated',
                'expression' => config('cms.schedule.backup', '0 2 * * *'),
                'description' => 'Creates automated system backups',
                'next_run' => $this->getNextRunForExpression(config('cms.schedule.backup', '0 2 * * *')),
                'enabled' => true,
            ],
            [
                'id' => 'sitemap_generate',
                'name' => 'Generate Sitemap',
                'command' => 'sitemap:generate',
                'expression' => config('cms.schedule.sitemap', '0 0 * * *'),
                'description' => 'Generates XML sitemap for SEO',
                'next_run' => $this->getNextRunForExpression(config('cms.schedule.sitemap', '0 0 * * *')),
                'enabled' => true,
            ],
            [
                'id' => 'weekly_report',
                'name' => 'Weekly Report',
                'command' => 'report:weekly',
                'expression' => config('cms.schedule.weekly_report', '0 9 * * 1'),
                'description' => 'Sends weekly summary reports',
                'next_run' => $this->getNextRunForExpression(config('cms.schedule.weekly_report', '0 9 * * 1')),
                'enabled' => true,
            ],
            [
                'id' => 'health_check',
                'name' => 'System Health Check',
                'command' => 'system:health-check',
                'expression' => config('cms.schedule.health_check', '*/5 * * * *'),
                'description' => 'Monitors system health status',
                'next_run' => $this->getNextRunForExpression(config('cms.schedule.health_check', '*/5 * * * *')),
                'enabled' => true,
            ],
            [
                'id' => 'cleanup_logs',
                'name' => 'Cleanup Old Logs',
                'command' => 'logs:cleanup',
                'expression' => '0 3 * * *',
                'description' => 'Removes logs older than retention period',
                'next_run' => $this->getNextRunForExpression('0 3 * * *'),
                'enabled' => true,
            ],
            [
                'id' => 'cleanup_tokens',
                'name' => 'Cleanup Expired Tokens',
                'command' => 'tokens:cleanup',
                'expression' => '0 */6 * * *',
                'description' => 'Removes expired download tokens',
                'next_run' => $this->getNextRunForExpression('0 */6 * * *'),
                'enabled' => true,
            ],
        ];

        return $tasks;
    }

    private function getLastRun()
    {
        return Cache::get('scheduler:last_run');
    }

    private function getNextRun()
    {
        $tasks = $this->getScheduledTasks();
        $nextRuns = array_filter(array_column($tasks, 'next_run'));
        
        if (empty($nextRuns)) {
            return null;
        }

        sort($nextRuns);
        return $nextRuns[0];
    }

    private function getExecutionHistory()
    {
        return Cache::get('scheduler:history', []);
    }

    private function getStats()
    {
        $history = Cache::get('scheduler:history', []);
        $today = date('Y-m-d');

        $todayExecutions = array_filter($history, function ($item) use ($today) {
            return strpos($item['time'] ?? '', $today) === 0;
        });

        $successfulToday = array_filter($todayExecutions, function ($item) {
            return ($item['status'] ?? '') === 'success';
        });

        $failedToday = array_filter($todayExecutions, function ($item) {
            return ($item['status'] ?? '') === 'failed';
        });

        return [
            'total_today' => count($todayExecutions),
            'successful_today' => count($successfulToday),
            'failed_today' => count($failedToday),
            'success_rate' => count($todayExecutions) > 0 
                ? round(count($successfulToday) / count($todayExecutions) * 100, 1) 
                : 0,
        ];
    }

    private function getNextRunForExpression($expression)
    {
        try {
            $cron = \Cron\CronExpression::factory($expression);
            return $cron->getNextRunDate()->format('Y-m-d H:i:s');
        } catch (\Exception $e) {
            return null;
        }
    }

    private function isCronConfigured()
    {
        if (PHP_OS_FAMILY !== 'Linux') {
            return true;
        }

        exec('crontab -l 2>/dev/null', $output);
        $crontab = implode("\n", $output);

        return strpos($crontab, 'schedule:run') !== false;
    }

    private function isSchedulerRunning()
    {
        if (PHP_OS_FAMILY !== 'Linux') {
            return false;
        }

        exec("ps aux | grep 'schedule:run' | grep -v grep", $output);
        return count($output) > 0;
    }

    private function checkSchedulerHealth()
    {
        $lastRun = Cache::get('scheduler:last_run');
        
        if (!$lastRun) {
            return 'warning';
        }

        $lastRunTime = strtotime($lastRun);
        $minutesSinceLastRun = (time() - $lastRunTime) / 60;

        if ($minutesSinceLastRun > 60) {
            return 'error';
        }

        if ($minutesSinceLastRun > 30) {
            return 'warning';
        }

        return 'healthy';
    }

    private function getCommandForTask($taskId)
    {
        $tasks = $this->getScheduledTasks();
        foreach ($tasks as $task) {
            if ($task['id'] === $taskId) {
                return $task['command'];
            }
        }
        return null;
    }
}
