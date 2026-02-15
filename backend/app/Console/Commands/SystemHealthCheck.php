<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class SystemHealthCheck extends Command
{
    protected $signature = 'system:health-check
        {--alert : Send alerts on failure}
        {--threshold=90 : Disk usage threshold percentage}';

    protected $description = 'Run system health checks';

    protected array $issues = [];

    public function handle(): int
    {
        $this->info('Running system health checks...');

        $this->checkDatabase();
        $this->checkCache();
        $this->checkStorage();
        $this->checkQueues();
        $this->checkScheduledTasks();
        $this->checkDiskUsage();

        if (!empty($this->issues)) {
            $this->warn('Issues found:');
            foreach ($this->issues as $issue) {
                $this->line(" - {$issue}");
            }

            if ($this->option('alert')) {
                $this->sendAlert();
            }

            return Command::FAILURE;
        }

        $this->info('All health checks passed!');

        return Command::SUCCESS;
    }

    protected function checkDatabase(): void
    {
        try {
            DB::connection()->getPdo();
            $this->line('✓ Database connection: OK');

            $tables = DB::select("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE()");
            $tableCount = $tables[0]->count ?? 0;
            $this->line("  Tables: {$tableCount}");
        } catch (\Exception $e) {
            $this->issues[] = "Database connection failed: {$e->getMessage()}";
            $this->error('✗ Database connection: FAILED');
        }
    }

    protected function checkCache(): void
    {
        try {
            $testKey = 'health_check_' . time();
            Cache::put($testKey, 'test', 60);
            $value = Cache::get($testKey);
            Cache::forget($testKey);

            if ($value === 'test') {
                $this->line('✓ Cache: OK');
            } else {
                $this->issues[] = 'Cache read/write failed';
                $this->error('✗ Cache: FAILED');
            }
        } catch (\Exception $e) {
            $this->issues[] = "Cache error: {$e->getMessage()}";
            $this->error('✗ Cache: FAILED');
        }
    }

    protected function checkStorage(): void
    {
        try {
            Storage::disk('local')->put('health_check.txt', 'test');
            $exists = Storage::disk('local')->exists('health_check.txt');
            Storage::disk('local')->delete('health_check.txt');

            if ($exists) {
                $this->line('✓ Storage: OK');
            } else {
                $this->issues[] = 'Storage write failed';
                $this->error('✗ Storage: FAILED');
            }
        } catch (\Exception $e) {
            $this->issues[] = "Storage error: {$e->getMessage()}";
            $this->error('✗ Storage: FAILED');
        }
    }

    protected function checkQueues(): void
    {
        try {
            $failed = DB::table('failed_jobs')->count();
            $pending = DB::table('jobs')->count();

            $this->line("✓ Queue: OK (Pending: {$pending}, Failed: {$failed})");

            if ($failed > 100) {
                $this->issues[] = "High number of failed jobs: {$failed}";
            }
        } catch (\Exception $e) {
            $this->issues[] = "Queue check failed: {$e->getMessage()}";
            $this->error('✗ Queue: FAILED');
        }
    }

    protected function checkScheduledTasks(): void
    {
        $lastRun = Cache::get('scheduler_last_run');

        if ($lastRun) {
            $minutesAgo = now()->diffInMinutes($lastRun);
            $this->line("✓ Scheduler: Last run {$minutesAgo} minutes ago");

            if ($minutesAgo > 60) {
                $this->issues[] = "Scheduler hasn't run in {$minutesAgo} minutes";
            }
        } else {
            $this->line('✓ Scheduler: No recorded runs');
        }
    }

    protected function checkDiskUsage(): void
    {
        $threshold = (int) $this->option('threshold');

        $storagePath = Storage::disk('local')->path('');
        $free = disk_free_space($storagePath);
        $total = disk_total_space($storagePath);
        $used = $total - $free;
        $percentage = round(($used / $total) * 100, 1);

        $this->line("✓ Disk Usage: {$percentage}%");

        if ($percentage > $threshold) {
            $this->issues[] = "Disk usage ({$percentage}%) exceeds threshold ({$threshold}%)";
            $this->warn("  Warning: Disk usage exceeds {$threshold}%");
        }

        $this->line("  Free: " . $this->formatBytes($free));
        $this->line("  Used: " . $this->formatBytes($used));
        $this->line("  Total: " . $this->formatBytes($total));
    }

    protected function sendAlert(): void
    {
        $email = config('admin.alert_email');

        if (!$email) {
            return;
        }

        // Could send email here
        $this->info("Alert would be sent to {$email}");
    }

    protected function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = 0;

        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }
}
