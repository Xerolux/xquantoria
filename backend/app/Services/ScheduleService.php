<?php

namespace App\Services;

use App\Jobs\PublishScheduledPost;
use App\Models\Post;
use App\Models\Page;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ScheduleService
{
    /**
     * Publish a scheduled post.
     */
    public function publishScheduledPost(Post $post): Post
    {
        DB::beginTransaction();

        try {
            // Update post status to published
            $post->update([
                'status' => 'published',
                'published_at' => now(),
            ]);

            // Log activity
            DB::table('activity_logs')->insert([
                'user_id' => $post->author_id,
                'action' => 'published',
                'model_type' => 'Post',
                'model_id' => $post->id,
                'description' => "Scheduled post '{$post->title}' was automatically published",
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'System Scheduler',
                'created_at' => now(),
            ]);

            DB::commit();

            return $post->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to publish scheduled post {$post->id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Publish a scheduled page.
     */
    public function publishScheduledPage(Page $page): Page
    {
        DB::beginTransaction();

        try {
            $page->update([
                'status' => 'published',
                'published_at' => now(),
            ]);

            // Log activity
            DB::table('activity_logs')->insert([
                'user_id' => $page->author_id ?? 1,
                'action' => 'published',
                'model_type' => 'Page',
                'model_id' => $page->id,
                'description' => "Scheduled page '{$page->title}' was automatically published",
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'System Scheduler',
                'created_at' => now(),
            ]);

            DB::commit();

            return $page->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to publish scheduled page {$page->id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Schedule a post for publishing.
     */
    public function schedulePost(Post $post, \DateTime $publishAt): void
    {
        if ($publishAt <= now()) {
            throw new \InvalidArgumentException('Publish date must be in the future');
        }

        $post->update([
            'status' => 'scheduled',
            'published_at' => $publishAt,
        ]);

        // Dispatch job for the exact publish time
        PublishScheduledPost::dispatch($post->id)
            ->delay($publishAt);
    }

    /**
     * Reschedule a post.
     */
    public function reschedulePost(Post $post, \DateTime $newPublishAt): void
    {
        // Delete existing pending jobs
        $this->deletePendingJobsForPost($post->id);

        // Schedule new job
        $this->schedulePost($post, $newPublishAt);
    }

    /**
     * Cancel scheduled publishing.
     */
    public function cancelScheduledPost(Post $post): void
    {
        // Delete pending jobs
        $this->deletePendingJobsForPost($post->id);

        // Update status back to draft
        $post->update([
            'status' => 'draft',
            'published_at' => null,
        ]);
    }

    /**
     * Get all scheduled content.
     */
    public function getScheduledContent(): array
    {
        $scheduledPosts = Post::where('status', 'scheduled')
            ->with(['author:id,name', 'categories:id,name', 'tags:id,name'])
            ->orderBy('published_at', 'asc')
            ->get();

        $scheduledPages = Page::where('status', 'scheduled')
            ->orderBy('published_at', 'asc')
            ->get();

        return [
            'posts' => $scheduledPosts,
            'pages' => $scheduledPages,
            'total' => $scheduledPosts->count() + $scheduledPages->count(),
        ];
    }

    /**
     * Get upcoming scheduled content statistics.
     */
    public function getScheduledStats(): array
    {
        $now = now();
        $tomorrow = now()->addDay();
        $nextWeek = now()->addWeek();

        $scheduledPosts = Post::where('status', 'scheduled');

        return [
            'total_scheduled' => $scheduledPosts->count(),
            'publishing_today' => $scheduledPosts->where('published_at', '<=', $tomorrow)->count(),
            'publishing_this_week' => $scheduledPosts->where('published_at', '<=', $nextWeek)->count(),
            'overdue' => $scheduledPosts->where('published_at', '<', $now)->count(),
            'upcoming' => $scheduledPosts->where('published_at', '>', $now)
                ->orderBy('published_at', 'asc')
                ->limit(5)
                ->get(),
        ];
    }

    /**
     * Check for overdue scheduled posts and publish them.
     * This is called by the Laravel scheduler every minute.
     */
    public function checkAndPublishOverduePosts(): int
    {
        $overdueCount = 0;

        Post::where('status', 'scheduled')
            ->where('published_at', '<=', now())
            ->chunk(100, function ($posts) use (&$overdueCount) {
                foreach ($posts as $post) {
                    try {
                        $this->publishScheduledPost($post);
                        $overdueCount++;
                    } catch (\Exception $e) {
                        Log::error("Failed to publish overdue post {$post->id}: " . $e->getMessage());
                    }
                }
            });

        Page::where('status', 'scheduled')
            ->where('published_at', '<=', now())
            ->chunk(100, function ($pages) use (&$overdueCount) {
                foreach ($pages as $page) {
                    try {
                        $this->publishScheduledPage($page);
                        $overdueCount++;
                    } catch (\Exception $e) {
                        Log::error("Failed to publish overdue page {$page->id}: " . $e->getMessage());
                    }
                }
            });

        return $overdueCount;
    }

    /**
     * Delete pending jobs for a specific post.
     */
    protected function deletePendingJobsForPost(int $postId): void
    {
        // Get the job ID from the jobs table
        $jobs = DB::table('jobs')
            ->where('queue', 'publishing')
            ->whereJsonContains('payload', [
                "displayName" => "App\\Jobs\\PublishScheduledPost",
            ])
            ->get();

        foreach ($jobs as $job) {
            $payload = json_decode($job->payload, true);
            if (isset($payload['data']['command'])) {
                $command = unserialize($payload['data']['command']);
                if (property_exists($command, 'postId') && $command->postId === $postId) {
                    DB::table('jobs')->where('id', $job->id)->delete();
                }
            }
        }
    }

    /**
     * Get scheduled content for a calendar view (by month).
     */
    public function getCalendarSchedule(int $year, int $month): array
    {
        $startDate = now()->setYear($year)->setMonth($month)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $posts = Post::where('status', 'scheduled')
            ->whereBetween('published_at', [$startDate, $endDate])
            ->select('id', 'title', 'published_at', 'status')
            ->get()
            ->map(function ($post) {
                return [
                    'id' => $post->id,
                    'title' => $post->title,
                    'date' => $post->published_at->toDateString(),
                    'time' => $post->published_at->format('H:i'),
                    'type' => 'post',
                ];
            });

        $pages = Page::where('status', 'scheduled')
            ->whereBetween('published_at', [$startDate, $endDate])
            ->select('id', 'title', 'published_at', 'status')
            ->get()
            ->map(function ($page) {
                return [
                    'id' => $page->id,
                    'title' => $page->title,
                    'date' => $page->published_at->toDateString(),
                    'time' => $page->published_at->format('H:i'),
                    'type' => 'page',
                ];
            });

        return [
            'year' => $year,
            'month' => $month,
            'events' => $posts->concat($pages)->sortBy('date')->values(),
        ];
    }
}
