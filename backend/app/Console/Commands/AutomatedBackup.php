<?php

namespace App\Console\Commands;

use App\Models\Backup;
use App\Services\BackupService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use App\Mail\BackupCompletedMail;
use App\Mail\BackupFailedMail;

class AutomatedBackup extends Command
{
    protected $signature = 'backup:automated
        {--type=full : Backup type (full, database, files)}
        {--notify : Send email notification}
        {--keep=10 : Number of backups to keep}';

    protected $description = 'Run automated backup with optional notifications';

    protected BackupService $backupService;

    public function __construct(BackupService $backupService)
    {
        parent::__construct();
        $this->backupService = $backupService;
    }

    public function handle(): int
    {
        $type = $this->option('type');
        $notify = $this->option('notify');
        $keep = (int) $this->option('keep');

        $this->info("Starting {$type} backup...");

        try {
            $backup = $this->backupService->create([
                'type' => $type,
                'name' => "Automated {$type} backup - " . now()->format('Y-m-d H:i'),
            ]);

            $this->info("Backup created: {$backup->name}");
            $this->info("Size: " . $this->formatBytes($backup->size));

            $this->cleanOldBackups($keep);

            if ($notify) {
                $this->sendNotification($backup, true);
            }

            $this->info('Backup completed successfully.');

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Backup failed: {$e->getMessage()}");

            if ($notify) {
                $this->sendNotification(null, false, $e->getMessage());
            }

            return Command::FAILURE;
        }
    }

    protected function cleanOldBackups(int $keep): void
    {
        $deleted = Backup::orderBy('created_at', 'desc')
            ->skip($keep)
            ->take(PHP_INT_MAX)
            ->get();

        foreach ($deleted as $backup) {
            $this->backupService->delete($backup->id);
            $this->line("Deleted old backup: {$backup->name}");
        }

        if ($deleted->count() > 0) {
            $this->info("Cleaned {$deleted->count()} old backups.");
        }
    }

    protected function sendNotification(?Backup $backup, bool $success, string $error = null): void
    {
        $email = config('backup.notification_email');

        if (!$email) {
            return;
        }

        try {
            if ($success && $backup) {
                Mail::to($email)->send(new BackupCompletedMail($backup));
            } else {
                Mail::to($email)->send(new BackupFailedMail($error));
            }
        } catch (\Exception $e) {
            $this->error("Failed to send notification: {$e->getMessage()}");
        }
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
