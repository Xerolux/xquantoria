<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use App\Models\Post;
use App\Models\User;
use App\Models\Comment;
use App\Models\Newsletter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use App\Mail\WeeklyReportMail;

class SendWeeklyReport extends Command
{
    protected $signature = 'report:weekly
        {--email= : Send to specific email}
        {--format=html : Report format (html, text)}';

    protected $description = 'Send weekly activity report to administrators';

    public function handle(): int
    {
        $this->info('Generating weekly report...');

        $data = $this->collectData();

        $email = $this->option('email') ?? config('admin.report_email');

        if (!$email) {
            $admins = User::whereIn('role', ['admin', 'super_admin'])->pluck('email');
        } else {
            $admins = collect([$email]);
        }

        foreach ($admins as $adminEmail) {
            try {
                Mail::to($adminEmail)->send(new WeeklyReportMail($data));
                $this->line("Report sent to {$adminEmail}");
            } catch (\Exception $e) {
                $this->error("Failed to send to {$adminEmail}: {$e->getMessage()}");
            }
        }

        $this->info('Weekly report sent successfully!');

        return Command::SUCCESS;
    }

    protected function collectData(): array
    {
        $startOfWeek = now()->startOfWeek();
        $endOfWeek = now()->endOfWeek();

        $posts = Post::whereBetween('created_at', [$startOfWeek, $endOfWeek])->count();
        $publishedPosts = Post::where('status', 'published')
            ->whereBetween('published_at', [$startOfWeek, $endOfWeek])
            ->count();
        $scheduledPosts = Post::where('status', 'scheduled')
            ->whereBetween('published_at', [$startOfWeek, $endOfWeek])
            ->count();

        $comments = Comment::whereBetween('created_at', [$startOfWeek, $endOfWeek])->count();
        $approvedComments = Comment::where('status', 'approved')
            ->whereBetween('updated_at', [$startOfWeek, $endOfWeek])
            ->count();
        $spamComments = Comment::where('status', 'spam')
            ->whereBetween('updated_at', [$startOfWeek, $endOfWeek])
            ->count();

        $newUsers = User::whereBetween('created_at', [$startOfWeek, $endOfWeek])->count();

        $newsletterSubscribers = 0;
        if (class_exists(Newsletter::class)) {
            $newsletterSubscribers = Newsletter::where('status', 'active')
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->count();
        }

        $mostViewedPosts = Post::where('status', 'published')
            ->orderBy('view_count', 'desc')
            ->limit(5)
            ->get(['id', 'title', 'view_count']);

        $activitySummary = $this->getActivitySummary($startOfWeek, $endOfWeek);

        return [
            'period' => [
                'start' => $startOfWeek->format('Y-m-d'),
                'end' => $endOfWeek->format('Y-m-d'),
            ],
            'posts' => [
                'total' => $posts,
                'published' => $publishedPosts,
                'scheduled' => $scheduledPosts,
            ],
            'comments' => [
                'total' => $comments,
                'approved' => $approvedComments,
                'spam' => $spamComments,
            ],
            'users' => [
                'new' => $newUsers,
            ],
            'newsletter' => [
                'new_subscribers' => $newsletterSubscribers,
            ],
            'most_viewed_posts' => $mostViewedPosts,
            'activity_summary' => $activitySummary,
        ];
    }

    protected function getActivitySummary($start, $end): array
    {
        return ActivityLog::whereBetween('created_at', [$start, $end])
            ->selectRaw('action, COUNT(*) as count')
            ->groupBy('action')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get()
            ->toArray();
    }
}
