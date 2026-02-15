<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BlockedIp;
use App\Models\FailedLoginAttempt;
use App\Models\SecurityEvent;
use App\Services\SecurityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityController extends Controller
{
    protected SecurityService $securityService;

    public function __construct(SecurityService $securityService)
    {
        $this->securityService = $securityService;
    }

    public function dashboard(): JsonResponse
    {
        $stats = $this->securityService->getSecurityStats();
        $twoFactorStats = $this->securityService->getTwoFactorStats();
        $wafStats = $this->securityService->getWafStats();
        $recommendations = $this->securityService->getSecurityRecommendations();
        $failedLoginsChart = $this->securityService->getFailedLoginsChart(30);
        $eventsChart = $this->securityService->getSecurityEventsChart(30);

        return response()->json([
            'stats' => $stats,
            'two_factor' => $twoFactorStats,
            'waf' => $wafStats,
            'recommendations' => $recommendations,
            'charts' => [
                'failed_logins' => $failedLoginsChart,
                'events' => $eventsChart,
            ],
        ]);
    }

    public function events(Request $request): JsonResponse
    {
        $query = SecurityEvent::with(['user:id,name,email', 'resolver:id,name,email']);

        if ($request->has('event_type')) {
            $query->ofType($request->event_type);
        }

        if ($request->has('severity')) {
            $query->ofSeverity($request->severity);
        }

        if ($request->has('ip_address')) {
            $query->fromIp($request->ip_address);
        }

        if ($request->has('unresolved_only') && $request->unresolved_only) {
            $query->unresolved();
        }

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $events = $query->orderByDesc('created_at')
            ->paginate($request->per_page ?? 50);

        return response()->json($events);
    }

    public function event(int $id): JsonResponse
    {
        $event = SecurityEvent::with(['user', 'resolver'])->findOrFail($id);

        return response()->json($event);
    }

    public function resolveEvent(int $id): JsonResponse
    {
        $resolved = $this->securityService->resolveEvent($id, auth()->id());

        if (!$resolved) {
            return response()->json(['message' => 'Event not found'], 404);
        }

        return response()->json(['message' => 'Event resolved successfully']);
    }

    public function resolveAllEvents(Request $request): JsonResponse
    {
        $severity = $request->severity ?? null;
        $count = $this->securityService->resolveAllEvents($severity);

        return response()->json([
            'message' => "Resolved {$count} security events",
            'count' => $count,
        ]);
    }

    public function blockedIps(Request $request): JsonResponse
    {
        $query = BlockedIp::with('blocker:id,name,email');

        if ($request->has('active_only') && $request->active_only) {
            $query->active();
        }

        if ($request->has('ip_address')) {
            $query->where('ip_address', 'like', "%{$request->ip_address}%");
        }

        if ($request->has('block_type')) {
            $query->ofType($request->block_type);
        }

        $ips = $query->orderByDesc('blocked_at')
            ->paginate($request->per_page ?? 50);

        return response()->json($ips);
    }

    public function blockIp(Request $request): JsonResponse
    {
        $request->validate([
            'ip_address' => 'required|ip',
            'reason' => 'required|string|max:255',
            'duration_minutes' => 'nullable|integer|min:0',
            'is_permanent' => 'nullable|boolean',
        ]);

        if ($this->securityService->isIpBlocked($request->ip_address)) {
            return response()->json(['message' => 'IP is already blocked'], 400);
        }

        $duration = $request->is_permanent ? 0 : ($request->duration_minutes ?? 60);
        $blockType = $request->is_permanent ? 'permanent' : 'manual';

        $blocked = $this->securityService->blockIp(
            $request->ip_address,
            $request->reason,
            $duration,
            $blockType,
            auth()->id()
        );

        return response()->json([
            'message' => 'IP blocked successfully',
            'block' => $blocked,
        ], 201);
    }

    public function unblockIp(string $ip): JsonResponse
    {
        $unblocked = $this->securityService->unblockIp($ip);

        if (!$unblocked) {
            return response()->json(['message' => 'IP was not blocked or already unblocked'], 400);
        }

        return response()->json(['message' => 'IP unblocked successfully']);
    }

    public function deleteBlockedIp(int $id): JsonResponse
    {
        $block = BlockedIp::findOrFail($id);
        $block->delete();

        return response()->json(['message' => 'Block record deleted']);
    }

    public function failedLogins(Request $request): JsonResponse
    {
        $query = FailedLoginAttempt::query();

        if ($request->has('ip_address')) {
            $query->fromIp($request->ip_address);
        }

        if ($request->has('email')) {
            $query->forEmail($request->email);
        }

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $attempts = $query->orderByDesc('created_at')
            ->paginate($request->per_page ?? 50);

        return response()->json($attempts);
    }

    public function checkIp(string $ip): JsonResponse
    {
        $isBlocked = $this->securityService->isIpBlocked($ip);
        $block = $isBlocked ? $this->securityService->getBlockedIp($ip) : null;
        $remainingAttempts = $this->securityService->getRemainingAttempts($ip);
        $failedCount = FailedLoginAttempt::countForIp($ip, 60);

        return response()->json([
            'ip' => $ip,
            'is_blocked' => $isBlocked,
            'block' => $block,
            'remaining_attempts' => $remainingAttempts,
            'failed_attempts_last_hour' => $failedCount,
        ]);
    }

    public function stats(): JsonResponse
    {
        return response()->json($this->securityService->getSecurityStats());
    }

    public function twoFactorStats(): JsonResponse
    {
        return response()->json($this->securityService->getTwoFactorStats());
    }

    public function wafStats(): JsonResponse
    {
        return response()->json($this->securityService->getWafStats());
    }

    public function recommendations(): JsonResponse
    {
        return response()->json($this->securityService->getSecurityRecommendations());
    }

    public function cleanOldRecords(Request $request): JsonResponse
    {
        $days = $request->days ?? 90;
        $result = $this->securityService->cleanOldRecords($days);

        return response()->json([
            'message' => 'Old security records cleaned',
            'result' => $result,
        ]);
    }

    public function exportEvents(Request $request): JsonResponse
    {
        $query = SecurityEvent::with(['user:id,name,email']);

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        if ($request->has('severity')) {
            $query->ofSeverity($request->severity);
        }

        $events = $query->orderByDesc('created_at')->limit(10000)->get();

        return response()->json([
            'events' => $events,
            'count' => $events->count(),
            'exported_at' => now()->toIso8601String(),
        ]);
    }

    public function eventTypes(): JsonResponse
    {
        return response()->json([
            'types' => SecurityEvent::EVENT_TYPES,
            'severities' => SecurityEvent::SEVERITY_LEVELS,
        ]);
    }

    public function blockTypes(): JsonResponse
    {
        return response()->json([
            'block_types' => BlockedIp::BLOCK_TYPES,
        ]);
    }

    public function failureReasons(): JsonResponse
    {
        return response()->json([
            'reasons' => FailedLoginAttempt::FAILURE_REASONS,
        ]);
    }

    public function activeSessions(): JsonResponse
    {
        $sessions = \DB::table('sessions')
            ->whereNotNull('user_id')
            ->orderByDesc('last_activity')
            ->get()
            ->map(function ($session) {
                return [
                    'id' => $session->id,
                    'user_id' => $session->user_id,
                    'ip_address' => $session->ip_address,
                    'user_agent' => $session->user_agent,
                    'last_activity' => \Carbon\Carbon::createFromTimestamp($session->last_activity)->toIso8601String(),
                    'is_current' => $session->id === request()->session()->getId(),
                ];
            });

        return response()->json([
            'sessions' => $sessions,
            'total' => $sessions->count(),
        ]);
    }

    public function terminateSession(string $sessionId): JsonResponse
    {
        \DB::table('sessions')
            ->where('id', $sessionId)
            ->where('id', '!=', request()->session()->getId())
            ->delete();

        return response()->json(['message' => 'Session terminated']);
    }

    public function terminateAllSessions(): JsonResponse
    {
        $currentSessionId = request()->session()->getId();

        $count = \DB::table('sessions')
            ->whereNotNull('user_id')
            ->where('id', '!=', $currentSessionId)
            ->delete();

        return response()->json([
            'message' => "Terminated {$count} sessions",
            'count' => $count,
        ]);
    }
}
