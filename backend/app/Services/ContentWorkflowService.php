<?php

namespace App\Services;

use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ContentWorkflowService
{
    /**
     * Assign a post to an author/reviewer.
     */
    public function assignPost(Post $post, int $userId, string $role): void
    {
        DB::table('post_assignments')->updateOrInsert(
            [
                'post_id' => $post->id,
                'user_id' => $userId,
            ],
            [
                'role' => $role, // author, reviewer, editor
                'assigned_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    /**
     * Submit post for review.
     */
    public function submitForReview(Post $post, int $submitterId): void
    {
        $post->update([
            'status' => 'pending_review',
            'submitted_for_review_at' => now(),
        ]);

        // Create activity log
        DB::table('activity_logs')->insert([
            'user_id' => $submitterId,
            'action' => 'submitted_for_review',
            'model_type' => 'Post',
            'model_id' => $post->id,
            'description' => "Post '{$post->title}' submitted for review",
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);
    }

    /**
     * Approve a post (for publishing).
     */
    public function approvePost(Post $post, int $reviewerId, ?string $feedback = null): void
    {
        $post->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $reviewerId,
            'reviewer_feedback' => $feedback,
        ]);

        DB::table('activity_logs')->insert([
            'user_id' => $reviewerId,
            'action' => 'approved',
            'model_type' => 'Post',
            'model_id' => $post->id,
            'description' => "Post '{$post->title}' approved for publishing",
            'metadata' => json_encode(['feedback' => $feedback]),
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);
    }

    /**
     * Request changes to a post.
     */
    public function requestChanges(Post $post, int $reviewerId, string $feedback): void
    {
        $post->update([
            'status' => 'changes_requested',
            'reviewer_feedback' => $feedback,
            'changes_requested_at' => now(),
        ]);

        DB::table('activity_logs')->insert([
            'user_id' => $reviewerId,
            'action' => 'changes_requested',
            'model_type' => 'Post',
            'model_id' => $post->id,
            'description' => "Changes requested for '{$post->title}'",
            'metadata' => json_encode(['feedback' => $feedback]),
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);
    }

    /**
     * Get editorial calendar data.
     */
    public function getEditorialCalendar(int $year, int $month): array
    {
        $startDate = now()->setYear($year)->setMonth($month)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $posts = Post::whereIn('status', ['draft', 'pending_review', 'approved', 'scheduled'])
            ->whereBetween('published_at', [$startDate, $endDate])
            ->orWhere(function ($q) use ($startDate, $endDate) {
                $q->whereNull('published_at')
                  ->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->with(['author:id,name', 'categories:id,name', 'assignees'])
            ->get()
            ->map(function ($post) {
                return [
                    'id' => $post->id,
                    'title' => $post->title,
                    'status' => $post->status,
                    'type' => 'post',
                    'author' => $post->author->name ?? null,
                    'categories' => $post->categories->pluck('name'),
                    'assignees' => $post->assignees->pluck('name'),
                    'date' => $post->published_at?->format('Y-m-d') ?? $post->created_at->format('Y-m-d'),
                    'time' => $post->published_at?->format('H:i') ?? null,
                ];
            });

        return [
            'year' => $year,
            'month' => $month,
            'events' => $posts,
        ];
    }

    /**
     * Calculate SEO score for a post.
     */
    public function calculateSEOScore(Post $post): array
    {
        $score = 0;
        $issues = [];
        $warnings = [];
        $passes = [];

        // Title check
        if (empty($post->title)) {
            $issues[] = 'Post title is missing';
        } elseif (strlen($post->title) < 30) {
            $warnings[] = 'Post title is too short (minimum 30 characters)';
        } elseif (strlen($post->title) > 60) {
            $warnings[] = 'Post title is too long (maximum 60 characters for optimal SEO)';
        } else {
            $score += 15;
            $passes[] = 'Post title length is good';
        }

        // Meta description check
        if (empty($post->meta_description)) {
            $issues[] = 'Meta description is missing';
        } elseif (strlen($post->meta_description) < 120) {
            $warnings[] = 'Meta description is too short (minimum 120 characters)';
        } elseif (strlen($post->meta_description) > 160) {
            $warnings[] = 'Meta description is too long (maximum 160 characters)';
        } else {
            $score += 20;
            $passes[] = 'Meta description length is good';
        }

        // Content length check
        $wordCount = str_word_count(strip_tags($post->content));
        if ($wordCount < 300) {
            $issues[] = 'Content is too short (minimum 300 words)';
        } elseif ($wordCount < 1000) {
            $warnings[] = 'Content could be longer (recommended 1000+ words)';
        } else {
            $score += 20;
            $passes[] = 'Content length is good';
        }

        // Featured image check
        if (!$post->featured_image_id) {
            $issues[] = 'No featured image set';
        } else {
            $score += 15;
            $passes[] = 'Featured image is set';
        }

        // Excerpt check
        if (empty($post->excerpt)) {
            $warnings[] = 'No excerpt set (recommended for better presentation)';
        } else {
            $score += 10;
            $passes[] = 'Excerpt is set';
        }

        // Categories check
        if ($post->categories->count() === 0) {
            $issues[] = 'No categories assigned';
        } else {
            $score += 10;
            $passes[] = 'Categories are assigned';
        }

        // Tags check
        if ($post->tags->count() === 0) {
            $warnings[] = 'No tags assigned (recommended for better SEO)';
        } else {
            $score += 10;
            $passes[] = 'Tags are assigned';
        }

        return [
            'score' => $score,
            'grade' => $this->getSEOGrade($score),
            'issues' => $issues,
            'warnings' => $warnings,
            'passes' => $passes,
        ];
    }

    /**
     * Get SEO grade based on score.
     */
    protected function getSEOGrade(int $score): string
    {
        if ($score >= 90) return 'A';
        if ($score >= 80) return 'B';
        if ($score >= 70) return 'C';
        if ($score >= 60) return 'D';
        return 'F';
    }

    /**
     * Get workflow statistics.
     */
    public function getWorkflowStats(): array
    {
        return [
            'pending_review' => Post::where('status', 'pending_review')->count(),
            'approved' => Post::where('status', 'approved')->count(),
            'changes_requested' => Post::where('status', 'changes_requested')->count(),
            'draft' => Post::where('status', 'draft')->count(),
        ];
    }
}
