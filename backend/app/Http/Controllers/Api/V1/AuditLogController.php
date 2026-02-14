<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Carbon\Carbon;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::with(['user'])
            ->orderBy('created_at', 'desc');

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        if ($request->has('model_type')) {
            $query->where('model_type', $request->model_type);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhereHas('user', fn($uq) => $uq->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        $logs = $query->paginate($request->per_page ?? 50);

        return response()->json($logs);
    }

    public function show(int $id): JsonResponse
    {
        $log = ActivityLog::with(['user'])->findOrFail($id);

        return response()->json($log);
    }

    public function exportCsv(Request $request): JsonResponse
    {
        $query = ActivityLog::with(['user'])
            ->orderBy('created_at', 'desc');

        $this->applyFilters($query, $request);

        $logs = $query->limit(10000)->get();

        $filename = 'audit_log_' . Carbon::now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');

            fputcsv($file, [
                'ID',
                'Timestamp',
                'User',
                'Email',
                'Action',
                'Model Type',
                'Model ID',
                'Description',
                'IP Address',
                'User Agent',
            ]);

            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->id,
                    $log->created_at->toIso8601String(),
                    $log->user?->name ?? 'System',
                    $log->user?->email ?? '-',
                    $log->action,
                    $log->model_type,
                    $log->model_id,
                    $log->description,
                    $log->ip_address,
                    $log->user_agent,
                ]);
            }

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    public function exportPdf(Request $request)
    {
        $query = ActivityLog::with(['user'])
            ->orderBy('created_at', 'desc');

        $this->applyFilters($query, $request);

        $logs = $query->limit(1000)->get();

        $data = [
            'logs' => $logs,
            'generated_at' => Carbon::now()->format('d.m.Y H:i'),
            'filters' => $request->only(['user_id', 'action', 'model_type', 'date_from', 'date_to']),
        ];

        $pdf = \Pdf::loadView('exports.audit-log-pdf', $data);

        return $pdf->download('audit_log_' . Carbon::now()->format('Y-m-d_His') . '.pdf');
    }

    public function getActions(): JsonResponse
    {
        $actions = ActivityLog::distinct('action')
            ->pluck('action')
            ->sort()
            ->values();

        return response()->json($actions);
    }

    public function getModelTypes(): JsonResponse
    {
        $types = ActivityLog::distinct('model_type')
            ->pluck('model_type')
            ->sort()
            ->values();

        return response()->json($types);
    }

    public function getStats(Request $request): JsonResponse
    {
        $query = ActivityLog::query();

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        } else {
            $query->whereDate('created_at', '>=', Carbon::now()->subDays(30));
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $stats = [
            'total' => $query->count(),
            'by_action' => (clone $query)->selectRaw('action, COUNT(*) as count')
                ->groupBy('action')
                ->orderByDesc('count')
                ->get()
                ->keyBy('action')
                ->map(fn($item) => $item->count),
            'by_user' => (clone $query)->selectRaw('user_id, COUNT(*) as count')
                ->whereNotNull('user_id')
                ->groupBy('user_id')
                ->orderByDesc('count')
                ->with('user')
                ->limit(10)
                ->get(),
            'by_day' => (clone $query)->selectRaw('DATE(created_at) as date, COUNT(*) as count')
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->keyBy('date')
                ->map(fn($item) => $item->count),
            'unique_users' => (clone $query)->distinct('user_id')->count('user_id'),
            'unique_ips' => (clone $query)->distinct('ip_address')->count('ip_address'),
        ];

        return response()->json($stats);
    }

    public function cleanOld(Request $request): JsonResponse
    {
        $request->validate([
            'days' => 'required|integer|min:30|max:365',
        ]);

        $cutoffDate = Carbon::now()->subDays($request->days);

        $deleted = ActivityLog::where('created_at', '<', $cutoffDate)->delete();

        return response()->json([
            'success' => true,
            'deleted_count' => $deleted,
            'cutoff_date' => $cutoffDate->toDateString(),
        ]);
    }

    protected function applyFilters($query, Request $request): void
    {
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        if ($request->has('model_type')) {
            $query->where('model_type', $request->model_type);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
    }
}
