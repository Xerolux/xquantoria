<?php

namespace App\Services;

use App\Models\Post;
use App\Models\PostRevision;
use Illuminate\Support\Facades\DB;

class PostRevisionService
{
    /**
     * Create a new revision for a post.
     */
    public function createRevision(Post $post, int $userId, bool $isAutoSave = false, string $reason = null): PostRevision
    {
        // Capture the current post state
        $content = [
            'title' => $post->title,
            'content' => $post->content,
            'excerpt' => $post->excerpt,
            'meta_title' => $post->meta_title,
            'meta_description' => $post->meta_description,
            'featured_image_id' => $post->featured_image_id,
            'status' => $post->status,
        ];

        // Get current time with millisecond precision
        $now = now();
        $milliseconds = (int) ($now->format('u') / 1000);

        return PostRevision::create([
            'post_id' => $post->id,
            'user_id' => $userId,
            'content' => $content,
            'title' => $post->title,
            'status' => $post->status,
            'revision_reason' => $reason ?: ($isAutoSave ? 'Auto-save' : 'Manual save'),
            'is_auto_save' => $isAutoSave,
            'edited_at' => $now,
            'edited_at_ms' => $milliseconds,
        ]);
    }

    /**
     * Create an auto-save revision (debounced).
     */
    public function createAutoSave(Post $post, int $userId): PostRevision
    {
        // Delete existing auto-saves for this post (keep only the latest)
        PostRevision::where('post_id', $post->id)
            ->where('is_auto_save', true)
            ->where('created_at', '<', now()->subMinutes(5))
            ->delete();

        return $this->createRevision($post, $userId, true);
    }

    /**
     * Restore a post from a revision.
     */
    public function restoreFromRevision(PostRevision $revision, int $userId): Post
    {
        $post = $revision->post;

        // Store old content for potential undo
        $oldContent = $post->toArray();

        // Update post with revision content
        $post->update([
            'title' => $revision->content['title'] ?? $post->title,
            'content' => $revision->content['content'] ?? $post->content,
            'excerpt' => $revision->content['excerpt'] ?? $post->excerpt,
            'meta_title' => $revision->content['meta_title'] ?? $post->meta_title,
            'meta_description' => $revision->content['meta_description'] ?? $post->meta_description,
            'featured_image_id' => $revision->content['featured_image_id'] ?? $post->featured_image_id,
            'status' => $revision->content['status'] ?? $post->status,
        ]);

        // Create a new revision for the restore action
        $this->createRevision($post, $userId, false, "Restored from revision #{$revision->id}");

        return $post->fresh();
    }

    /**
     * Get all revisions for a post (excluding auto-saves by default).
     */
    public function getRevisions(Post $post, bool $includeAutoSaves = false)
    {
        $query = $post->revisions()->with('user');

        if (!$includeAutoSaves) {
            $query->manualOnly();
        }

        return $query->get();
    }

    /**
     * Compare two revisions and return the differences.
     */
    public function compareRevisions(PostRevision $from, PostRevision $to): array
    {
        return [
            'from' => [
                'id' => $from->id,
                'created_at' => $from->created_at,
                'user' => $from->user->name ?? $from->user->email,
                'content' => $from->content,
                'is_auto_save' => $from->is_auto_save,
            ],
            'to' => [
                'id' => $to->id,
                'created_at' => $to->created_at,
                'user' => $to->user->name ?? $to->user->email,
                'content' => $to->content,
                'is_auto_save' => $to->is_auto_save,
            ],
            'diff' => $to->diffFrom($from),
        ];
    }

    /**
     * Check for conflicts (if someone else edited the post).
     */
    public function checkConflict(Post $post, ?int $lastKnownRevisionId = null): array
    {
        if (!$lastKnownRevisionId) {
            return ['has_conflict' => false];
        }

        $lastKnownRevision = PostRevision::find($lastKnownRevisionId);

        if (!$lastKnownRevision) {
            return ['has_conflict' => false];
        }

        // Check if there are newer revisions by other users
        $newerRevisions = PostRevision::where('post_id', $post->id)
            ->where('id', '>', $lastKnownRevisionId)
            ->where('user_id', '!=', auth()->id())
            ->count();

        return [
            'has_conflict' => $newerRevisions > 0,
            'newer_revisions_count' => $newerRevisions,
        ];
    }

    /**
     * Clean up old auto-saves (keep only last 10 per post).
     */
    public function cleanupOldAutoSaves(): int
    {
        // Get all auto-saves older than 24 hours
        $oldAutoSaves = PostRevision::autoSaves()
            ->where('created_at', '<', now()->subDay())
            ->get();

        $deleted = 0;

        foreach ($oldAutoSaves->groupBy('post_id') as $postId => $revisions) {
            // Keep only the last 10
            $toDelete = $revisions->sortByDesc('created_at')->slice(10);
            $deleted += $toDelete->pluck('id')->count();

            // Delete in chunks
            PostRevision::whereIn('id', $toDelete->pluck('id'))->delete();
        }

        return $deleted;
    }

    /**
     * Get revision statistics for a post.
     */
    public function getRevisionStats(Post $post): array
    {
        $revisions = $post->revisions();

        return [
            'total_revisions' => $revisions->count(),
            'manual_revisions' => $revisions->manualOnly()->count(),
            'auto_saves' => $revisions->autoSaves()->count(),
            'latest_revision' => $post->latestRevision,
            'contributors' => $revisions->with('user')->get()
                ->pluck('user.name')
                ->unique()
                ->values(),
        ];
    }
}
