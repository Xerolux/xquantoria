<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialShare extends Model
{
    protected $fillable = [
        'post_id',
        'platform',
        'url',
        'share_count',
        'shared_at',
    ];

    protected $casts = [
        'shared_at' => 'datetime',
    ];

    /**
     * The post that was shared.
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * Scope for specific platform.
     */
    public function scopeForPlatform($query, string $platform)
    {
        return $query->where('platform', $platform);
    }

    /**
     * Scope for shares after a specific date.
     */
    public function scopeAfter($query, $date)
    {
        return $query->where('shared_at', '>=', $date);
    }
}
