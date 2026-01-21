<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PageAnalytics extends Model
{
    protected $fillable = [
        'url',
        'post_id',
        'session_id',
        'user_id',
        'ip_address',
        'user_agent',
        'referrer',
        'entry_page',
        'exit_page',
        'time_on_page',
    ];

    protected $casts = [
        'entry_page' => 'boolean',
        'exit_page' => 'boolean',
        'created_at' => 'datetime',
    ];

    /**
     * The post associated with this page view.
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * The user who viewed this page.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for entries.
     */
    public function scopeEntries($query)
    {
        return $query->where('entry_page', true);
    }

    /**
     * Scope for exits.
     */
    public function scopeExits($query)
    {
        return $query->where('exit_page', true);
    }

    /**
     * Scope for specific session.
     */
    public function scopeForSession($query, string $sessionId)
    {
        return $query->where('session_id', $sessionId);
    }

    /**
     * Scope for specific post.
     */
    public function scopeForPost($query, int $postId)
    {
        return $query->where('post_id', $postId);
    }

    /**
     * Scope for date range.
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }
}
