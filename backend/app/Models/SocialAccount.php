<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialAccount extends Model
{
    protected $fillable = [
        'user_id',
        'provider',
        'provider_id',
        'name',
        'email',
        'avatar',
        'nickname',
        'token',
        'refresh_token',
        'expires_at',
        'raw',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'raw' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function getProviderLabel(): string
    {
        return match ($this->provider) {
            'google' => 'Google',
            'github' => 'GitHub',
            'facebook' => 'Facebook',
            'twitter' => 'Twitter',
            'linkedin' => 'LinkedIn',
            'apple' => 'Apple',
            default => ucfirst($this->provider),
        };
    }
}
