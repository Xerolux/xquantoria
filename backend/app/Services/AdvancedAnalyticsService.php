<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class AdvancedAnalyticsService
{
    /**
     * Track page view with detailed analytics.
     */
    public function trackPageView(array $data): void
    {
        DB::table('page_analytics')->insert([
            'url' => $data['url'],
            'post_id' => $data['post_id'] ?? null,
            'session_id' => $data['session_id'],
            'user_id' => $data['user_id'] ?? null,
            'ip_address' => $data['ip_address'],
            'user_agent' => $data['user_agent'],
            'referrer' => $data['referrer'] ?? null,
            'entry_page' => $data['entry_page'] ?? false,
            'exit_page' => $data['exit_page'] ?? false,
            'time_on_page' => $data['time_on_page'] ?? null,
            'created_at' => now(),
        ]);
    }

    /**
     * Get bounce rate for a period.
     */
    public function getBounceRate(string $period = '7 days'): float
    {
        $totalSessions = DB::table('page_analytics')
            ->where('created_at', '>=', now()->sub($period))
            ->distinct('session_id')
            ->count('session_id');

        $bouncedSessions = DB::table('page_analytics')
            ->where('created_at', '>=', now()->sub($period))
            ->where('entry_page', true)
            ->distinct('session_id')
            ->havingRaw('COUNT(*) = 1')
            ->count();

        if ($totalSessions === 0) {
            return 0.0;
        }

        return round(($bouncedSessions / $totalSessions) * 100, 2);
    }

    /**
     * Get average time on page.
     */
    public function getAverageTimeOnPage(string $period = '7 days'): int
    {
        return (int) DB::table('page_analytics')
            ->where('created_at', '>=', now()->sub($period))
            ->whereNotNull('time_on_page')
            ->avg('time_on_page') ?? 0;
    }

    /**
     * Get top referrers.
     */
    public function getTopReferrers(string $period = '7 days', int $limit = 10): array
    {
        return DB::table('page_analytics')
            ->where('created_at', '>=', now()->sub($period))
            ->whereNotNull('referrer')
            ->selectRaw('referrer, COUNT(*) as count')
            ->groupBy('referrer')
            ->orderBy('count', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Get user flow (pages visited in sequence).
     */
    public function getUserFlow(string $period = '7 days'): array
    {
        $flows = DB::table('page_analytics')
            ->where('created_at', '>=', now()->sub($period))
            ->orderBy('created_at')
            ->get()
            ->groupBy('session_id')
            ->map(function ($sessions) {
                return [
                    'pages' => $sessions->pluck('url')->toArray(),
                    'count' => $sessions->count(),
                ];
            })
            ->sortByDesc('count')
            ->take(100)
            ->values()
            ->toArray();

        return $flows;
    }

    /**
     * Get conversion tracking data.
     */
    public function getConversionStats(string $period = '7 days'): array
    {
        return [
            'total_visitors' => DB::table('page_analytics')
                ->where('created_at', '>=', now()->sub($period))
                ->distinct('session_id')
                ->count('session_id'),

            'conversions' => DB::table('conversions')
                ->where('created_at', '>=', now()->sub($period))
                ->count(),

            'conversion_rate' => DB::table('conversions')
                ->where('created_at', '>=', now()->sub($period))
                ->count() / max(1, DB::table('page_analytics')
                    ->where('created_at', '>=', now()->sub($period))
                    ->distinct('session_id')
                    ->count('session_id')) * 100,
        ];
    }

    /**
     * Get real-time analytics (last 5 minutes).
     */
    public function getRealTimeStats(): array
    {
        $fiveMinutesAgo = now()->subMinutes(5);

        return [
            'active_users' => DB::table('page_analytics')
                ->where('created_at', '>=', $fiveMinutesAgo)
                ->distinct('session_id')
                ->count('session_id'),

            'page_views' => DB::table('page_analytics')
                ->where('created_at', '>=', $fiveMinutesAgo)
                ->count(),

            'top_pages' => DB::table('page_analytics')
                ->where('created_at', '>=', $fiveMinutesAgo)
                ->selectRaw('url, COUNT(*) as views')
                ->groupBy('url')
                ->orderBy('views', 'desc')
                ->limit(10)
                ->get()
                ->toArray(),
        ];
    }

    /**
     * Get comprehensive analytics dashboard data.
     */
    public function getDashboardData(string $period = '7 days'): array
    {
        return [
            'overview' => [
                'page_views' => DB::table('page_analytics')
                    ->where('created_at', '>=', now()->sub($period))
                    ->count(),
                'unique_visitors' => DB::table('page_analytics')
                    ->where('created_at', '>=', now()->sub($period))
                    ->distinct('session_id')
                    ->count('session_id'),
                'bounce_rate' => $this->getBounceRate($period),
                'avg_time_on_page' => $this->getAverageTimeOnPage($period),
            ],
            'referrers' => $this->getTopReferrers($period, 10),
            'user_flow' => $this->getUserFlow($period),
            'conversions' => $this->getConversionStats($period),
            'real_time' => $this->getRealTimeStats(),
        ];
    }

    /**
     * Clean up old analytics data.
     */
    public function cleanupOldData(int $daysToKeep = 90): int
    {
        return DB::table('page_analytics')
            ->where('created_at', '<', now()->subDays($daysToKeep))
            ->delete();
    }
}
