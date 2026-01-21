<?php

namespace App\Services;

use App\Models\Backup;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class BackupService
{
    protected string $backupPath;
    protected string $databaseName;

    public function __construct()
    {
        $this->backupPath = storage_path('app/backups');
        $this->databaseName = config('database.connections.mysql.database');
    }

    /**
     * Create a new backup
     */
    public function create(array $options = []): Backup
    {
        $backup = Backup::create([
            'name' => $options['name'] ?? 'Backup ' . now()->format('Y-m-d H:i:s'),
            'type' => $options['type'] ?? 'full',
            'status' => 'creating',
            'disk' => $options['disk'] ?? 'local',
            'path' => 'temp', // Will be updated after creation
            'description' => $options['description'] ?? null,
            'options' => $options,
            'created_by' => auth()->id(),
        ]);

        try {
            $filename = Backup::generateFilename($backup->type);
            $tempPath = storage_path("app/temp/{$filename}");

            // Create ZIP archive
            $zip = new ZipArchive();
            if ($zip->open($tempPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new \Exception('Could not create ZIP archive');
            }

            $itemsCount = 0;

            // Add database dump
            if ($this->shouldIncludeDatabase($options)) {
                $sqlDump = $this->dumpDatabase();
                $zip->addFromString("database.sql", $sqlDump);
                $itemsCount++;
            }

            // Add files
            if ($this->shouldIncludeFiles($options)) {
                $files = $this->getFilesToBackup($options['exclude_files'] ?? []);
                foreach ($files as $file) {
                    if (File::exists($file)) {
                        $relativePath = str_replace(base_path() . '/', '', $file);
                        $zip->addFile($file, $relativePath);
                        $itemsCount++;
                    }
                }
            }

            // Add metadata
            $zip->addFromString('backup-metadata.json', json_encode([
                'created_at' => now()->toIso8601String(),
                'type' => $backup->type,
                'database' => $this->databaseName,
                'laravel_version' => app()->version(),
                'options' => $options,
            ], JSON_PRETTY_PRINT));
            $itemsCount++;

            $zip->close();

            // Store the backup file
            $storagePath = "backups/{$filename}";
            Storage::disk($backup->disk)->put($storagePath, file_get_contents($tempPath));

            // Delete temp file
            File::delete($tempPath);

            // Get file size
            $fileSize = Storage::disk($backup->disk)->size($storagePath);

            // Update backup record
            $backup->update([
                'path' => $storagePath,
                'file_size' => $fileSize,
                'items_count' => $itemsCount,
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            return $backup->fresh();
        } catch (\Exception $e) {
            $backup->markAsFailed($e->getMessage());
            throw $e;
        }
    }

    /**
     * Restore from backup
     */
    public function restore(Backup $backup, array $options = []): array
    {
        $results = [
            'database' => false,
            'files' => false,
            'errors' => [],
        ];

        try {
            // Download backup file
            $tempPath = storage_path("app/temp/restore-" . Str::random(8) . ".zip");
            file_put_contents($tempPath, $backup->getContent());

            $zip = new ZipArchive();
            if ($zip->open($tempPath) !== true) {
                throw new \Exception('Could not open backup file');
            }

            // Restore database
            if ($this->shouldIncludeDatabase($backup->options) && ($options['restore_database'] ?? true)) {
                $sqlDump = $zip->getFromName("database.sql");
                if ($sqlDump) {
                    $this->restoreDatabase($sqlDump);
                    $results['database'] = true;
                }
            }

            // Restore files
            if ($this->shouldIncludeFiles($backup->options) && ($options['restore_files'] ?? true)) {
                $this->restoreFiles($zip);
                $results['files'] = true;
            }

            $zip->close();
            File::delete($tempPath);

            return $results;
        } catch (\Exception $e) {
            $results['errors'][] = $e->getMessage();
            return $results;
        }
    }

    /**
     * Delete backup
     */
    public function delete(Backup $backup): bool
    {
        if ($backup->exists()) {
            $backup->deleteFile();
        }

        return $backup->delete();
    }

    /**
     * Dump database to SQL
     */
    protected function dumpDatabase(): string
    {
        $dsn = config('database.connections.mysql');
        $database = $dsn['database'];

        $command = "mysqldump --user={$dsn['username']} --password={$dsn['password']} --host={$dsn['host']} --port={$dsn['port']} {$database}";

        // Use --single-transaction for InnoDB
        $command .= " --single-transaction --quick --lock-tables=false";

        $output = shell_exec($command);

        if ($output === null) {
            throw new \Exception('Database dump failed');
        }

        return $output;
    }

    /**
     * Restore database from SQL dump
     */
    protected function restoreDatabase(string $sqlDump): void
    {
        $dsn = config('database.connections.mysql');
        $database = $dsn['database'];

        $command = "mysql --user={$dsn['username']} --password={$dsn['password']} --host={$dsn['host']} --port={$dsn['port']} {$database}";

        $process = proc_open($command, [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ], $pipes);

        if (is_resource($process)) {
            fwrite($pipes[0], $sqlDump);
            fclose($pipes[0]);

            $output = stream_get_contents($pipes[1]);
            fclose($pipes[1]);

            $error = stream_get_contents($pipes[2]);
            fclose($pipes[2]);

            $exitCode = proc_close($process);

            if ($exitCode !== 0) {
                throw new \Exception("Database restore failed: {$error}");
            }
        }
    }

    /**
     * Get files to backup
     */
    protected function getFilesToBackup(array $exclude = []): array
    {
        $basePath = base_path();
        $files = [];

        $directories = [
            $basePath . '/app',
            $basePath . '/config',
            $basePath . '/database',
            $basePath . '/public',
            $basePath . '/resources',
            $basePath . '/routes',
        ];

        // Always exclude sensitive files
        $exclude[] = $basePath . '/.env';
        $exclude[] = $basePath . '/.env.*';
        $exclude[] = $basePath . '/node_modules';
        $exclude[] = $basePath . '/vendor';
        $exclude[] = $basePath . '/storage/framework/cache';
        $exclude[] = $basePath . '/storage/framework/sessions';
        $exclude[] = $basePath . '/storage/framework/views';
        $exclude[] = $basePath . '/storage/logs';
        $exclude[] = $basePath . '/storage/debugbar';

        foreach ($directories as $directory) {
            if (is_dir($directory)) {
                $iterator = new \RecursiveIteratorIterator(
                    new \RecursiveDirectoryIterator($directory),
                    \RecursiveIteratorIterator::SELF_FIRST
                );

                foreach ($iterator as $file) {
                    if ($file->isFile()) {
                        $filePath = $file->getPathname();

                        // Check exclusions
                        $excluded = false;
                        foreach ($exclude as $pattern) {
                            if (Str::startsWith($filePath, $pattern) ||
                                str_contains($filePath, $pattern)) {
                                $excluded = true;
                                break;
                            }
                        }

                        if (!$excluded) {
                            $files[] = $filePath;
                        }
                    }
                }
            }
        }

        return $files;
    }

    /**
     * Restore files from ZIP
     */
    protected function restoreFiles(ZipArchive $zip): void
    {
        $basePath = base_path();

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $filename = $zip->getNameIndex($i);

            // Skip metadata and system files
            if ($filename === 'backup-metadata.json' ||
                str_starts_with($filename, '.env')) {
                continue;
            }

            $filePath = $basePath . '/' . $filename;
            $directory = dirname($filePath);

            // Create directory if it doesn't exist
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }

            // Extract file
            file_put_contents($filePath, $zip->getFromIndex($i));
        }
    }

    /**
     * Check if database should be included
     */
    protected function shouldIncludeDatabase(array $options): bool
    {
        return $options['include_database'] ?? true;
    }

    /**
     * Check if files should be included
     */
    protected function shouldIncludeFiles(array $options): bool
    {
        return $options['include_files'] ?? true;
    }

    /**
     * Get total disk usage
     */
    public function getDiskUsage(): array
    {
        $backupPath = storage_path('app/backups');
        $totalSize = 0;
        $fileCount = 0;

        if (is_dir($backupPath)) {
            foreach (glob("{$backupPath}/*.zip") as $file) {
                $totalSize += filesize($file);
                $fileCount++;
            }
        }

        return [
            'total_size' => $totalSize,
            'file_count' => $fileCount,
            'human_size' => $this->formatBytes($totalSize),
        ];
    }

    /**
     * Format bytes to human readable
     */
    protected function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    /**
     * Clean old backups
     */
    public function cleanOldBackups(int $keep = 5): int
    {
        $backups = Backup::completed()
            ->orderBy('created_at', 'desc')
            ->get();

        $deletedCount = 0;

        foreach ($backups->slice($keep) as $backup) {
            $this->delete($backup);
            $deletedCount++;
        }

        return $deletedCount;
    }
}
