<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Backup;
use App\Services\BackupService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class BackupController extends Controller
{
    protected BackupService $backupService;

    public function __construct(BackupService $backupService)
    {
        $this->backupService = $backupService;
    }

    /**
     * Get all backups
     */
    public function index(Request $request)
    {
        Gate::authorize('backups.viewAny');

        $query = Backup::with('creator:id,name,email')
            ->orderBy('created_at', 'desc');

        // Filter by type
        if ($request->has('type')) {
            $query->ofType($request->type);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $backups = $query->paginate(20);

        return response()->json($backups);
    }

    /**
     * Get specific backup
     */
    public function show($id)
    {
        Gate::authorize('backups.view');

        $backup = Backup::with('creator:id,name,email')->findOrFail($id);

        return response()->json($backup);
    }

    /**
     * Create a new backup
     */
    public function store(Request $request)
    {
        Gate::authorize('backups.create');

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'type' => 'required|in:full,database,files',
            'description' => 'nullable|string',
            'disk' => 'nullable|string',
            'include_database' => 'nullable|boolean',
            'include_files' => 'nullable|boolean',
            'exclude_files' => 'nullable|array',
            'exclude_files.*' => 'string',
        ]);

        try {
            $backup = $this->backupService->create($validated);

            return response()->json([
                'message' => 'Backup created successfully',
                'backup' => $backup,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Backup failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download backup file
     */
    public function download($id)
    {
        Gate::authorize('backups.download');

        $backup = Backup::findOrFail($id);

        if (!$backup->exists()) {
            return response()->json([
                'message' => 'Backup file not found',
            ], 404);
        }

        $content = $backup->getContent();

        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, basename($backup->path));
    }

    /**
     * Restore from backup
     */
    public function restore(Request $request, $id)
    {
        Gate::authorize('backups.restore');

        $validated = $request->validate([
            'restore_database' => 'nullable|boolean',
            'restore_files' => 'nullable|boolean',
            'confirm' => 'required|accepted',
        ]);

        $backup = Backup::findOrFail($id);

        if ($backup->status !== 'completed') {
            return response()->json([
                'message' => 'Cannot restore from incomplete backup',
            ], 400);
        }

        try {
            $results = $this->backupService->restore($backup, $validated);

            return response()->json([
                'message' => 'Backup restored successfully',
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Restore failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete backup
     */
    public function destroy($id)
    {
        Gate::authorize('backups.delete');

        $backup = Backup::findOrFail($id);

        try {
            $this->backupService->delete($backup);

            return response()->json([
                'message' => 'Backup deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete backup',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get backup statistics
     */
    public function stats()
    {
        Gate::authorize('backups.viewStats');

        $totalBackups = Backup::count();
        $completedBackups = Backup::completed()->count();
        $failedBackups = Backup::failed()->count();
        $totalSize = Backup::completed()->sum('file_size');
        $diskUsage = $this->backupService->getDiskUsage();

        $latestBackup = Backup::completed()
            ->orderBy('created_at', 'desc')
            ->first();

        return response()->json([
            'total_backups' => $totalBackups,
            'completed_backups' => $completedBackups,
            'failed_backups' => $failedBackups,
            'total_size' => $totalSize,
            'disk_usage' => $diskUsage,
            'latest_backup' => $latestBackup?->created_at,
        ]);
    }
}
