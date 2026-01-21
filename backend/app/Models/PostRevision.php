<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostRevision extends Model
{
    protected $fillable = [
        'post_id',
        'user_id',
        'content',
        'title',
        'status',
        'revision_reason',
        'is_auto_save',
        'edited_at',
        'edited_at_ms',
    ];

    protected $casts = [
        'content' => 'array',
        'is_auto_save' => 'boolean',
        'edited_at' => 'datetime',
    ];

    /**
     * Get the post that owns the revision.
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * Get the user who created the revision.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to exclude auto-saves.
     */
    public function scopeManualOnly($query)
    {
        return $query->where('is_auto_save', false);
    }

    /**
     * Scope to get only auto-saves.
     */
    public function scopeAutoSaves($query)
    {
        return $query->where('is_auto_save', true);
    }

    /**
     * Get a formatted diff between this revision and another.
     */
    public function diffFrom(PostRevision $other): array
    {
        $thisContent = $this->content;
        $otherContent = $other->content;

        return [
            'title' => $this->calculateDiff($otherContent['title'] ?? '', $thisContent['title'] ?? ''),
            'content' => $this->calculateDiff($otherContent['content'] ?? '', $thisContent['content'] ?? ''),
            'excerpt' => $this->calculateDiff($otherContent['excerpt'] ?? '', $thisContent['excerpt'] ?? ''),
            'meta_title' => $this->calculateDiff($otherContent['meta_title'] ?? '', $thisContent['meta_title'] ?? ''),
            'meta_description' => $this->calculateDiff($otherContent['meta_description'] ?? '', $thisContent['meta_description'] ?? ''),
        ];
    }

    /**
     * Calculate a simple diff between two strings.
     */
    protected function calculateDiff(string $old, string $new): array
    {
        return [
            'old' => $old,
            'new' => $new,
            'changed' => $old !== $new,
        ];
    }

    /**
     * Get the preview text for the revision.
     */
    public function getPreviewAttribute(): string
    {
        $content = $this->content['content'] ?? '';
        $excerpt = $this->content['excerpt'] ?? '';

        if (!empty($excerpt)) {
            return $excerpt;
        }

        // Strip HTML and get first 200 characters
        $plainText = strip_tags($content);
        if (strlen($plainText) > 200) {
            return substr($plainText, 0, 200) . '...';
        }

        return $plainText;
    }

    /**
     * Check if this revision is different from the current post.
     */
    public function isDifferentFromCurrent(): bool
    {
        $currentPost = $this->post;

        if (!$currentPost) {
            return true;
        }

        $currentContent = [
            'title' => $currentPost->title,
            'content' => $currentPost->content,
            'excerpt' => $currentPost->excerpt,
            'meta_title' => $currentPost->meta_title,
            'meta_description' => $currentPost->meta_description,
        ];

        return $this->content !== $currentContent;
    }
}
