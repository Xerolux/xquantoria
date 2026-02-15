<?php

namespace App\Console\Commands;

use App\Mail\SystemHealthAlertMail;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use App\Notifications\SystemHealthNotification;

class SystemHealthCheck extends Command
{
    protected $signature = 'system:health-check
        {--alert : Send alerts on failure}
        {--threshold=90 : Disk usage threshold percentage}
        {--email=* : Additional email recipients}
        {--slack : Send Slack notification}
        {--webhook : Send webhook notification}';

    protected $description = 'Run system health checks with notifications';

    protected array $issues = [];
    protected array $warnings = [];
    protected array $stats = [];
    protected float $startTime;

    public function handle(): int
    {
        $this->startTime = microtime(true);
        $this->info('Running system health checks...');
        $this->newLine();

        $this->checkDatabase();
        $this->checkCache();
        $this->checkStorage();
        $this->checkQueues();
        $this->checkScheduledTasks();
        $this->checkDiskUsage();
        $this->checkMemoryUsage();
        $this->checkPhpExtensions();
        $this->checkSecurity();

        $duration = round(microtime(true) - $this->startTime, 2);
        $this->newLine();
        $this->info("Health check completed in {$duration}s");

        if (!empty($this->issues) || !empty($this->warnings)) {
            $this->displaySummary();

            if ($this->option('alert')) {
                $this->sendAlerts();
            }

            return !empty($this->issues) ? Command::FAILURE : Command::SUCCESS;
        }

        $this->info('✓ All health checks passed!');
        $this->storeHealthMetrics();

        return Command::SUCCESS;
    }

    protected function checkDatabase(): void
    {
        $this->line('Checking database...');

        try {
            $start = microtime(true);
            DB::connection()->getPdo();
            $latency = round((microtime(true) - $start) * 1000, 2);

            $tables = DB::select("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE()");
            $tableCount = $tables[0]->count ?? 0;

            $size = DB::select("SELECT SUM(data_length + index_length) as size FROM information_schema.tables WHERE table_schema = DATABASE()");
            $dbSize = $this->formatBytes($size[0]->size ?? 0);

            $this->stats['database'] = [
                'latency' => $latency,
                'tables' => $tableCount,
                'size' => $dbSize,
            ];

            $this->line("  ✓ Connection OK ({$latency}ms)");
            $this->line("    Tables: {$tableCount}, Size: {$dbSize}");

            if ($latency > 500) {
                $this->warnings[] = "Database latency is high ({$latency}ms)";
            }
        } catch (\Exception $e) {
            $this->issues[] = "Database connection failed: {$e->getMessage()}";
            $this->error('  ✗ Database: FAILED');
        }
    }

    protected function checkCache(): void
    {
        $this->line('Checking cache...');

        try {
            $start = microtime(true);
            $testKey = 'health_check_' . time();
            Cache::put($testKey, 'test', 60);
            $value = Cache::get($testKey);
            Cache::forget($testKey);
            $latency = round((microtime(true) - $start) * 1000, 2);

            if ($value === 'test') {
                $driver = config('cache.default');
                $this->stats['cache'] = [
                    'driver' => $driver,
                    'latency' => $latency,
                ];
                $this->line("  ✓ Cache OK ({$driver}, {$latency}ms)");
            } else {
                $this->issues[] = 'Cache read/write failed';
                $this->error('  ✗ Cache: FAILED');
            }
        } catch (\Exception $e) {
            $this->issues[] = "Cache error: {$e->getMessage()}";
            $this->error('  ✗ Cache: FAILED');
        }
    }

    protected function checkStorage(): void
    {
        $this->line('Checking storage...');

        try {
            $start = microtime(true);
            Storage::disk('local')->put('health_check.txt', 'test');
            $exists = Storage::disk('local')->exists('health_check.txt');
            Storage::disk('local')->delete('health_check.txt');
            $latency = round((microtime(true) - $start) * 1000, 2);

            if ($exists) {
                $this->stats['storage'] = ['latency' => $latency];
                $this->line("  ✓ Storage OK ({$latency}ms)");
            } else {
                $this->issues[] = 'Storage write failed';
                $this->error('  ✗ Storage: FAILED');
            }
        } catch (\Exception $e) {
            $this->issues[] = "Storage error: {$e->getMessage()}";
            $this->error('  ✗ Storage: FAILED');
        }
    }

    protected function checkQueues(): void
    {
        $this->line('Checking queues...');

        try {
            $failed = DB::table('failed_jobs')->count();
            $pending = DB::table('jobs')->count();

            $this->stats['queue'] = [
                'pending' => $pending,
                'failed' => $failed,
            ];

            $status = $failed > 50 ? '⚠' : '✓';
            $this->line("  {$status} Queue (Pending: {$pending}, Failed: {$failed})");

            if ($failed > 100) {
                $this->issues[] = "High number of failed jobs: {$failed}";
            } elseif ($failed > 50) {
                $this->warnings[] = "Elevated failed jobs: {$failed}";
            }
        } catch (\Exception $e) {
            $this->issues[] = "Queue check failed: {$e->getMessage()}";
            $this->error('  ✗ Queue: FAILED');
        }
    }

    protected function checkScheduledTasks(): void
    {
        $this->line('Checking scheduler...');

        $lastRun = Cache::get('scheduler_last_run');

        if ($lastRun) {
            $minutesAgo = now()->diffInMinutes($lastRun);
            $this->stats['scheduler'] = [
                'last_run' => $lastRun->toISOString(),
                'minutes_ago' => $minutesAgo,
            ];

            if ($minutesAgo > 60) {
                $this->issues[] = "Scheduler hasn't run in {$minutesAgo} minutes";
                $this->error("  ✗ Scheduler last run {$minutesAgo} minutes ago");
            } elseif ($minutesAgo > 10) {
                $this->warnings[] = "Scheduler last run {$minutesAgo} minutes ago";
                $this->warn("  ⚠ Scheduler last run {$minutesAgo} minutes ago");
            } else {
                $this->line("  ✓ Scheduler OK (last run {$minutesAgo} min ago)");
            }
        } else {
            $this->warnings[] = 'No recorded scheduler runs';
            $this->warn('  ⚠ No recorded scheduler runs');
        }
    }

    protected function checkDiskUsage(): void
    {
        $this->line('Checking disk usage...');

        $threshold = (int) $this->option('threshold');

        try {
            $storagePath = Storage::disk('local')->path('');
            $free = disk_free_space($storagePath);
            $total = disk_total_space($storagePath);
            $used = $total - $free;
            $percentage = round(($used / $total) * 100, 1);

            $this->stats['disk'] = [
                'percentage' => $percentage,
                'free' => $this->formatBytes($free),
                'used' => $this->formatBytes($used),
                'total' => $this->formatBytes($total),
            ];

            if ($percentage > $threshold) {
                $this->issues[] = "Disk usage ({$percentage}%) exceeds threshold ({$threshold}%)";
                $this->error("  ✗ Disk: {$percentage}% used (exceeds {$threshold}%)");
            } elseif ($percentage > $threshold - 10) {
                $this->warnings[] = "Disk usage at {$percentage}%";
                $this->warn("  ⚠ Disk: {$percentage}% used");
            } else {
                $this->line("  ✓ Disk: {$percentage}% used");
            }

            $this->line("    Free: {$this->formatBytes($free)}, Used: {$this->formatBytes($used)}");
        } catch (\Exception $e) {
            $this->warnings[] = "Could not check disk usage: {$e->getMessage()}";
        }
    }

    protected function checkMemoryUsage(): void
    {
        $this->line('Checking memory...');

        $usedMemory = memory_get_usage(true);
        $peakMemory = memory_get_peak_usage(true);
        $limit = ini_get('memory_limit');

        $this->stats['memory'] = [
            'used' => $this->formatBytes($usedMemory),
            'peak' => $this->formatBytes($peakMemory),
            'limit' => $limit,
        ];

        $this->line("  ✓ Memory: Used {$this->formatBytes($usedMemory)}, Peak {$this->formatBytes($peakMemory)}, Limit {$limit}");
    }

    protected function checkPhpExtensions(): void
    {
        $this->line('Checking PHP extensions...');

        $required = ['pdo', 'pdo_mysql', 'openssl', 'mbstring', 'tokenizer', 'xml', 'ctype', 'json', 'bcmath'];
        $missing = [];

        foreach ($required as $ext) {
            if (!extension_loaded($ext)) {
                $missing[] = $ext;
            }
        }

        if (!empty($missing)) {
            $this->issues[] = 'Missing PHP extensions: ' . implode(', ', $missing);
            $this->error('  ✗ Missing extensions: ' . implode(', ', $missing));
        } else {
            $this->line('  ✓ All required PHP extensions loaded');
        }

        $this->stats['php'] = [
            'version' => PHP_VERSION,
            'extensions' => count(get_loaded_extensions()),
        ];
    }

    protected function checkSecurity(): void
    {
        $this->line('Checking security...');

        $issues = [];

        if (app()->environment('production')) {
            if (config('app.debug')) {
                $issues[] = 'Debug mode is enabled in production';
            }
            if (config('app.key') === 'SomeRandomString') {
                $issues[] = 'Default APP_KEY detected';
            }
        }

        if (!empty($issues)) {
            foreach ($issues as $issue) {
                $this->warnings[] = "Security: {$issue}";
            }
            $this->warn('  ⚠ Security warnings: ' . count($issues));
        } else {
            $this->line('  ✓ Security checks passed');
        }
    }

    protected function displaySummary(): void
    {
        $this->newLine();
        $this->line(str_repeat('-', 50));

        if (!empty($this->issues)) {
            $this->error('ISSUES (' . count($this->issues) . '):');
            foreach ($this->issues as $issue) {
                $this->error("  • {$issue}");
            }
        }

        if (!empty($this->warnings)) {
            $this->warn('WARNINGS (' . count($this->warnings) . '):');
            foreach ($this->warnings as $warning) {
                $this->warn("  • {$warning}");
            }
        }

        $this->line(str_repeat('-', 50));
    }

    protected function sendAlerts(): void
    {
        $this->newLine();
        $this->info('Sending alerts...');

        $this->sendEmailAlerts();
        $this->sendSlackAlert();
        $this->sendWebhookAlert();
        $this->storeHealthMetrics();
    }

    protected function sendEmailAlerts(): void
    {
        $recipients = $this->option('email');
        $adminEmail = config('admin.alert_email');

        if ($adminEmail) {
            $recipients[] = $adminEmail;
        }

        $superAdmins = User::where('role', 'super_admin')->where('email_notifications', true)->pluck('email');
        $recipients = array_merge($recipients, $superAdmins->toArray());
        $recipients = array_unique(array_filter($recipients));

        if (empty($recipients)) {
            return;
        }

        $data = [
            'issues' => $this->issues,
            'warnings' => $this->warnings,
            'stats' => $this->stats,
            'timestamp' => now()->toISOString(),
        ];

        foreach ($recipients as $email) {
            try {
                Mail::to($email)->send(new SystemHealthAlertMail($data));
                $this->line("  ✓ Alert sent to {$email}");
            } catch (\Exception $e) {
                $this->error("  ✗ Failed to send to {$email}: {$e->getMessage()}");
            }
        }
    }

    protected function sendSlackAlert(): void
    {
        if (!$this->option('slack')) {
            return;
        }

        $webhookUrl = config('services.slack.webhook_url');

        if (!$webhookUrl) {
            return;
        }

        $payload = [
            'text' => '⚠ System Health Alert',
            'attachments' => [[
                'color' => !empty($this->issues) ? 'danger' : 'warning',
                'fields' => [
                    [
                        'title' => 'Issues',
                        'value' => count($this->issues),
                        'short' => true,
                    ],
                    [
                        'title' => 'Warnings',
                        'value' => count($this->warnings),
                        'short' => true,
                    ],
                ],
                'footer' => config('app.name'),
                'ts' => time(),
            ]],
        ];

        try {
            Http::post($webhookUrl, $payload);
            $this->line('  ✓ Slack notification sent');
        } catch (\Exception $e) {
            $this->error("  ✗ Slack failed: {$e->getMessage()}");
        }
    }

    protected function sendWebhookAlert(): void
    {
        if (!$this->option('webhook')) {
            return;
        }

        $webhookUrl = config('services.health_webhook.url');

        if (!$webhookUrl) {
            return;
        }

        $payload = [
            'event' => 'system_health_alert',
            'issues' => $this->issues,
            'warnings' => $this->warnings,
            'stats' => $this->stats,
            'timestamp' => now()->toISOString(),
            'server' => gethostname(),
        ];

        try {
            $secret = config('services.health_webhook.secret');
            $headers = [];

            if ($secret) {
                $signature = hash_hmac('sha256', json_encode($payload), $secret);
                $headers['X-Signature'] = $signature;
            }

            Http::withHeaders($headers)->post($webhookUrl, $payload);
            $this->line('  ✓ Webhook notification sent');
        } catch (\Exception $e) {
            $this->error("  ✗ Webhook failed: {$e->getMessage()}");
        }
    }

    protected function storeHealthMetrics(): void
    {
        $metrics = [
            'timestamp' => now()->toISOString(),
            'issues_count' => count($this->issues),
            'warnings_count' => count($this->warnings),
            'stats' => $this->stats,
        ];

        Cache::put('system:health:last_check', $metrics, now()->addDay());

        $history = Cache::get('system:health:history', []);
        $history[] = $metrics;
        $history = array_slice($history, -100);
        Cache::put('system:health:history', $history, now()->addWeek());
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
