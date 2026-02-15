<?php

namespace App\Services;

use App\Models\BlockedIp;
use App\Models\FailedLoginAttempt;
use App\Models\SecurityEvent;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SecurityService
{
    protected int $maxFailedAttempts = 5;
    protected int $blockDurationMinutes = 60;
    protected int $failedAttemptsWindowMinutes = 60;

    public function __construct()
    {
        $this->maxFailedAttempts = config('security.max_failed_attempts', 5);
        $this->blockDurationMinutes = config('security.block_duration_minutes', 60);
        $this->failedAttemptsWindowMinutes = config('security.failed_attempts_window_minutes', 60);
    }

    public function recordFailedLogin(string $ip, ?string $email, string $reason = 'invalid_credentials'): FailedLoginAttempt
    {
        $attempt = FailedLoginAttempt::log($ip, $email, $reason);

        $this->checkAndBlockIp($ip);

        SecurityEvent::log(
            'login_failed',
            $ip,
            "Failed login attempt for email: {$email}",
            ['email' => $email, 'reason' => $reason],
            null,
            'warning'
        );

        return $attempt;
    }

    public function recordSuccessfulLogin(string $ip, int $userId): void
    {
        SecurityEvent::log(
            'login_success',
            $ip,
            'Successful login',
            [],
            $userId,
            'info'
        );
    }

    public function checkAndBlockIp(string $ip): bool
    {
        if ($this->isIpBlocked($ip)) {
            return true;
        }

        $failedCount = FailedLoginAttempt::countForIp($ip, $this->failedAttemptsWindowMinutes);

        if ($failedCount >= $this->maxFailedAttempts) {
            $this->blockIp($ip, "Brute force detected: {$failedCount} failed attempts");

            SecurityEvent::log(
                'brute_force',
                $ip,
                "IP blocked for brute force: {$failedCount} failed attempts in {$this->failedAttemptsWindowMinutes} minutes",
                ['failed_attempts' => $failedCount],
                null,
                'critical'
            );

            return true;
        }

        return false;
    }

    public function blockIp(
        string $ip,
        string $reason,
        int $durationMinutes = null,
        string $blockType = 'automatic',
        ?int $blockedBy = null
    ): BlockedIp {
        $durationMinutes = $durationMinutes ?? $this->blockDurationMinutes;

        return BlockedIp::block($ip, $reason, $durationMinutes, $blockType, $blockedBy);
    }

    public function unblockIp(string $ip): bool
    {
        SecurityEvent::log(
            'ip_unblocked',
            request()->ip(),
            "IP unblocked: {$ip}",
            ['unblocked_ip' => $ip],
            auth()->id(),
            'info'
        );

        return BlockedIp::unblockIp($ip);
    }

    public function isIpBlocked(string $ip): bool
    {
        return BlockedIp::isBlocked($ip);
    }

    public function getRemainingAttempts(string $ip): int
    {
        $failedCount = FailedLoginAttempt::countForIp($ip, $this->failedAttemptsWindowMinutes);

        return max(0, $this->maxFailedAttempts - $failedCount);
    }

    public function getBlockedIp(string $ip): ?BlockedIp
    {
        return BlockedIp::where('ip_address', $ip)
            ->active()
            ->first();
    }

    public function getSecurityStats(): array
    {
        return [
            'total_events' => SecurityEvent::count(),
            'unresolved_events' => SecurityEvent::unresolved()->count(),
            'critical_events' => SecurityEvent::unresolved()->critical()->count(),
            'high_priority_events' => SecurityEvent::unresolved()->highPriority()->count(),
            'blocked_ips' => BlockedIp::active()->count(),
            'failed_logins_today' => FailedLoginAttempt::whereDate('created_at', today())->count(),
            'failed_logins_last_hour' => FailedLoginAttempt::lastHour()->count(),
            'successful_logins_today' => SecurityEvent::ofType('login_success')
                ->whereDate('created_at', today())
                ->count(),
            'events_by_type' => $this->getEventsByType(),
            'events_by_severity' => $this->getEventsBySeverity(),
            'top_blocked_ips' => $this->getTopBlockedIps(),
            'recent_failed_logins' => FailedLoginAttempt::with('user')
                ->orderByDesc('created_at')
                ->limit(10)
                ->get(),
        ];
    }

    protected function getEventsByType(): array
    {
        return SecurityEvent::select('event_type', DB::raw('count(*) as count'))
            ->whereDate('created_at', '>=', now()->subDays(30))
            ->groupBy('event_type')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->keyBy('event_type')
            ->map->count
            ->toArray();
    }

    protected function getEventsBySeverity(): array
    {
        return SecurityEvent::select('severity', DB::raw('count(*) as count'))
            ->whereDate('created_at', '>=', now()->subDays(30))
            ->groupBy('severity')
            ->get()
            ->keyBy('severity')
            ->map->count
            ->toArray();
    }

    protected function getTopBlockedIps(): array
    {
        return BlockedIp::select('ip_address', DB::raw('count(*) as block_count'))
            ->groupBy('ip_address')
            ->orderByDesc('block_count')
            ->limit(10)
            ->get()
            ->toArray();
    }

    public function getFailedLoginsChart(int $days = 30): array
    {
        $data = FailedLoginAttempt::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('count(*) as count')
        )
            ->whereDate('created_at', '>=', now()->subDays($days))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return $data->map(fn ($item) => [
            'date' => $item->date,
            'count' => $item->count,
        ])->toArray();
    }

    public function getSecurityEventsChart(int $days = 30): array
    {
        $data = SecurityEvent::select(
            DB::raw('DATE(created_at) as date'),
            'severity',
            DB::raw('count(*) as count')
        )
            ->whereDate('created_at', '>=', now()->subDays($days))
            ->groupBy('date', 'severity')
            ->orderBy('date')
            ->get();

        return $data->groupBy('date')->map(fn ($items) => [
            'date' => $items->first()->date,
            'by_severity' => $items->keyBy('severity')->map->count->toArray(),
            'total' => $items->sum('count'),
        ])->values()->toArray();
    }

    public function resolveEvent(int $eventId, int $resolvedBy): bool
    {
        $event = SecurityEvent::find($eventId);

        if (!$event) {
            return false;
        }

        $event->resolve($resolvedBy);

        return true;
    }

    public function resolveAllEvents(string $severity = null): int
    {
        $query = SecurityEvent::unresolved();

        if ($severity) {
            $query->ofSeverity($severity);
        }

        $count = $query->count();
        $query->update([
            'is_resolved' => true,
            'resolved_at' => now(),
            'resolved_by' => auth()->id(),
        ]);

        return $count;
    }

    public function cleanOldRecords(int $days = 90): array
    {
        $eventsDeleted = SecurityEvent::where('created_at', '<', now()->subDays($days))
            ->where('is_resolved', true)
            ->delete();

        $attemptsDeleted = FailedLoginAttempt::cleanOld($days);

        $expiredUnblocked = BlockedIp::expired()->update(['unblock_at' => now()]);

        return [
            'events_deleted' => $eventsDeleted,
            'attempts_deleted' => $attemptsDeleted,
            'expired_unblocked' => $expiredUnblocked,
        ];
    }

    public function getTwoFactorStats(): array
    {
        $totalUsers = User::count();
        $usersWith2FA = User::whereNotNull('two_factor_secret')->count();

        return [
            'total_users' => $totalUsers,
            'users_with_2fa' => $usersWith2FA,
            'users_without_2fa' => $totalUsers - $usersWith2FA,
            'percentage_enabled' => $totalUsers > 0 ? round(($usersWith2FA / $totalUsers) * 100, 1) : 0,
            'recently_enabled' => SecurityEvent::ofType('2fa_enabled')
                ->whereDate('created_at', '>=', now()->subDays(30))
                ->count(),
            'failed_verifications' => SecurityEvent::ofType('2fa_failed')
                ->whereDate('created_at', '>=', now()->subDays(30))
                ->count(),
        ];
    }

    public function getWafStats(): array
    {
        return [
            'total_blocked' => SecurityEvent::ofType('waf_blocked')
                ->whereDate('created_at', '>=', now()->subDays(30))
                ->count(),
            'sql_injection_attempts' => SecurityEvent::ofType('sql_injection')
                ->whereDate('created_at', '>=', now()->subDays(30))
                ->count(),
            'xss_attempts' => SecurityEvent::ofType('xss_attack')
                ->whereDate('created_at', '>=', now()->subDays(30))
                ->count(),
            'csrf_attempts' => SecurityEvent::ofType('csrf_attack')
                ->whereDate('created_at', '>=', now()->subDays(30))
                ->count(),
            'file_upload_blocked' => SecurityEvent::ofType('file_upload_blocked')
                ->whereDate('created_at', '>=', now()->subDays(30))
                ->count(),
            'by_attack_type' => SecurityEvent::whereIn('event_type', [
                'sql_injection', 'xss_attack', 'csrf_attack', 'file_upload_blocked', 'waf_blocked'
            ])
                ->whereDate('created_at', '>=', now()->subDays(30))
                ->select('event_type', DB::raw('count(*) as count'))
                ->groupBy('event_type')
                ->get()
                ->keyBy('event_type')
                ->map->count
                ->toArray(),
        ];
    }

    public function getSecurityRecommendations(): array
    {
        $recommendations = [];

        $usersWithout2FA = User::whereNull('two_factor_secret')->count();
        if ($usersWithout2FA > 0) {
            $recommendations[] = [
                'type' => '2fa',
                'severity' => 'medium',
                'message' => "{$usersWithout2FA} users have not enabled 2FA",
                'action' => 'Consider requiring 2FA for all admin users',
            ];
        }

        $failedLoginsToday = FailedLoginAttempt::whereDate('created_at', today())->count();
        if ($failedLoginsToday > 100) {
            $recommendations[] = [
                'type' => 'brute_force',
                'severity' => 'high',
                'message' => "High number of failed login attempts today ({$failedLoginsToday})",
                'action' => 'Review security logs and consider stricter rate limiting',
            ];
        }

        $activeBlockedIps = BlockedIp::active()->count();
        if ($activeBlockedIps > 50) {
            $recommendations[] = [
                'type' => 'blocked_ips',
                'severity' => 'info',
                'message' => "{$activeBlockedIps} IP addresses are currently blocked",
                'action' => 'Review blocked IPs and clean up expired blocks',
            ];
        }

        $unresolvedCritical = SecurityEvent::unresolved()->critical()->count();
        if ($unresolvedCritical > 0) {
            $recommendations[] = [
                'type' => 'critical_events',
                'severity' => 'critical',
                'message' => "{$unresolvedCritical} unresolved critical security events",
                'action' => 'Review and resolve critical security events immediately',
            ];
        }

        return $recommendations;
    }
}
