<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        $posts = $this->getPostStats();
        $products = $this->getProductStats();
        $users = $this->getUserStats();
        $orders = $this->getOrderStats();
        $comments = $this->getCommentStats();
        $newsletter = $this->getNewsletterStats();
        $recentActivity = $this->getRecentActivity($user);
        $popularContent = $this->getPopularContent();

        return response()->json([
            'posts' => $posts,
            'products' => $products,
            'users' => $users,
            'orders' => $orders,
            'comments' => $comments,
            'newsletter' => $newsletter,
            'recentActivity' => $recentActivity,
            'popularContent' => $popularContent,
        ]);
    }

    protected function getPostStats(): array
    {
        $total = DB::table('posts')->count();
        $published = DB::table('posts')->where('status', 'published')->count();
        $draft = DB::table('posts')->where('status', 'draft')->count();
        $scheduled = DB::table('posts')->where('status', 'scheduled')->count();
        $thisMonth = DB::table('posts')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
        $lastMonth = DB::table('posts')
            ->whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->count();

        $change = $lastMonth > 0 ? round((($thisMonth - $lastMonth) / $lastMonth) * 100, 1) : ($thisMonth > 0 ? 100 : 0);

        return [
            'total' => $total,
            'published' => $published,
            'draft' => $draft,
            'scheduled' => $scheduled,
            'thisMonth' => $thisMonth,
            'change' => $change,
        ];
    }

    protected function getProductStats(): array
    {
        if (!DB::getSchemaBuilder()->hasTable('shop_products')) {
            return ['total' => 0, 'active' => 0, 'lowStock' => 0, 'thisMonth' => 0, 'change' => 0];
        }

        $total = DB::table('shop_products')->count();
        $active = DB::table('shop_products')->where('is_active', true)->count();
        $lowStock = DB::table('shop_products')->where('stock', '<', 10)->where('is_active', true)->count();
        $thisMonth = DB::table('shop_products')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
        $lastMonth = DB::table('shop_products')
            ->whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->count();

        $change = $lastMonth > 0 ? round((($thisMonth - $lastMonth) / $lastMonth) * 100, 1) : ($thisMonth > 0 ? 100 : 0);

        return [
            'total' => $total,
            'active' => $active,
            'lowStock' => $lowStock,
            'thisMonth' => $thisMonth,
            'change' => $change,
        ];
    }

    protected function getUserStats(): array
    {
        $total = DB::table('users')->count();
        $active = DB::table('users')->where('is_active', true)->count();
        $newThisMonth = DB::table('users')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
        $lastMonth = DB::table('users')
            ->whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->count();

        $change = $lastMonth > 0 ? round((($newThisMonth - $lastMonth) / $lastMonth) * 100, 1) : ($newThisMonth > 0 ? 100 : 0);

        return [
            'total' => $total,
            'active' => $active,
            'newThisMonth' => $newThisMonth,
            'change' => $change,
        ];
    }

    protected function getOrderStats(): array
    {
        if (!DB::getSchemaBuilder()->hasTable('shop_orders')) {
            return ['total' => 0, 'pending' => 0, 'completed' => 0, 'revenue' => 0, 'revenueChange' => 0];
        }

        $total = DB::table('shop_orders')->count();
        $pending = DB::table('shop_orders')->where('status', 'pending')->count();
        $completed = DB::table('shop_orders')->where('status', 'completed')->count();
        
        $revenue = (float) DB::table('shop_orders')
            ->whereIn('status', ['completed', 'paid'])
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('total');
        
        $lastMonthRevenue = (float) DB::table('shop_orders')
            ->whereIn('status', ['completed', 'paid'])
            ->whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->sum('total');

        $revenueChange = $lastMonthRevenue > 0 ? round((($revenue - $lastMonthRevenue) / $lastMonthRevenue) * 100, 1) : ($revenue > 0 ? 100 : 0);

        return [
            'total' => $total,
            'pending' => $pending,
            'completed' => $completed,
            'revenue' => $revenue,
            'revenueChange' => $revenueChange,
        ];
    }

    protected function getCommentStats(): array
    {
        if (!DB::getSchemaBuilder()->hasTable('comments')) {
            return ['total' => 0, 'pending' => 0, 'approved' => 0, 'spam' => 0];
        }

        return [
            'total' => DB::table('comments')->count(),
            'pending' => DB::table('comments')->where('status', 'pending')->count(),
            'approved' => DB::table('comments')->where('status', 'approved')->count(),
            'spam' => DB::table('comments')->where('status', 'spam')->count(),
        ];
    }

    protected function getNewsletterStats(): array
    {
        if (!DB::getSchemaBuilder()->hasTable('newsletter_subscribers')) {
            return ['total' => 0, 'active' => 0, 'thisMonth' => 0];
        }

        return [
            'total' => DB::table('newsletter_subscribers')->count(),
            'active' => DB::table('newsletter_subscribers')->where('status', 'active')->count(),
            'thisMonth' => DB::table('newsletter_subscribers')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
        ];
    }

    protected function getRecentActivity($user): array
    {
        if (!DB::getSchemaBuilder()->hasTable('activity_logs')) {
            return [];
        }

        return DB::table('activity_logs')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get(['id', 'action as type', 'description', 'created_at'])
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'type' => $item->type ?? 'action',
                    'description' => $item->description,
                    'created_at' => $item->created_at,
                ];
            })
            ->toArray();
    }

    protected function getPopularContent(): array
    {
        return DB::table('posts')
            ->where('status', 'published')
            ->orderBy('view_count', 'desc')
            ->limit(5)
            ->get(['id', 'title', 'view_count as views'])
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'title' => $item->title,
                    'views' => $item->views ?? 0,
                    'type' => 'post',
                ];
            })
            ->toArray();
    }
}
