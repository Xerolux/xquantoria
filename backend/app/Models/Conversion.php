<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Conversion extends Model
{
    protected $fillable = [
        'type',
        'post_id',
        'user_id',
        'session_id',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * The post associated with this conversion.
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * The user who converted.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for specific conversion type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope for specific session.
     */
    public function scopeForSession($query, string $sessionId)
    {
        return $query->where('session_id', $sessionId);
    }

    /**
     * Scope for date range.
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Get conversion type options.
     */
    public static function getTypes(): array
    {
        return [
            'newsletter_signup' => 'Newsletter Signup',
            'download' => 'Download',
            'comment' => 'Comment',
            'contact_form' => 'Contact Form Submission',
            'registration' => 'User Registration',
        ];
    }
}
