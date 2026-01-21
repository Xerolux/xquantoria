<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'content',
        'excerpt',
        'featured_image_id',
        'author_id',
        'status',
        'is_hidden',
        'published_at',
        'view_count',
        'meta_title',
        'meta_description',
        'meta_robots',
        'language',
        'translation_of_id',
        'submitted_for_review_at',
        'approved_at',
        'approved_by',
        'reviewer_feedback',
        'changes_requested_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'submitted_for_review_at' => 'datetime',
        'approved_at' => 'datetime',
        'changes_requested_at' => 'datetime',
        'view_count' => 'integer',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function featuredImage()
    {
        return $this->belongsTo(Media::class, 'featured_image_id');
    }

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'post_categories');
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'post_tags');
    }

    public function downloads()
    {
        return $this->belongsToMany(Download::class, 'post_downloads');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function revisions()
    {
        return $this->hasMany(PostRevision::class)->orderBy('created_at', 'desc');
    }

    public function latestRevision()
    {
        return $this->hasOne(PostRevision::class)->latestOfMany();
    }

    public function socialShares()
    {
        return $this->hasMany(SocialShare::class);
    }

    public function pageAnalytics()
    {
        return $this->hasMany(PageAnalytics::class);
    }

    public function conversions()
    {
        return $this->hasMany(Conversion::class);
    }

    public function assignments()
    {
        return $this->hasMany(PostAssignment::class);
    }

    public function assignees()
    {
        return $this->belongsToMany(User::class, 'post_assignments')->withPivot('role', 'assigned_at');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function translationParent()
    {
        return $this->belongsTo(Post::class, 'translation_of_id');
    }

    public function translations()
    {
        return $this->hasMany(Post::class, 'translation_of_id');
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    public function scopeHidden($query)
    {
        return $query->where('is_hidden', true);
    }

    public function scopeVisible($query)
    {
        return $query->where('is_hidden', false)->whereIn('status', ['published']);
    }

    public function getIsScheduledAttribute(): bool
    {
        return $this->status === 'scheduled' && $this->published_at && $this->published_at->isFuture();
    }

    public function getIsPublishedAttribute(): bool
    {
        return $this->status === 'published' || ($this->status === 'scheduled' && $this->published_at && $this->published_at->isPast());
    }

    public function getIsHiddenAttribute(): bool
    {
        return (bool) $this->is_hidden;
    }

    /**
     * Get the full URL for this post.
     */
    public function getFullUrl(): string
    {
        $localePrefix = $this->language && $this->language !== config('app.locale')
            ? '/' . $this->language
            : '';

        return url($localePrefix . '/blog/' . $this->slug);
    }
}
