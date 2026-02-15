<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Redirect extends Model
{
    protected $fillable = [
        'from_url',
        'to_url',
        'status_code',
        'is_active',
        'hits',
        'last_hit_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'status_code' => 'integer',
        'hits' => 'integer',
        'last_hit_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopePermanent($query)
    {
        return $query->where('status_code', 301);
    }

    public function scopeTemporary($query)
    {
        return $query->where('status_code', 302);
    }

    public function scopePopular($query, int $limit = 10)
    {
        return $query->orderBy('hits', 'desc')->limit($limit);
    }

    public function incrementHit(): void
    {
        $this->increment('hits');
        $this->last_hit_at = now();
        $this->save();
    }

    public static function findByUrl(string $url): ?self
    {
        return static::active()
            ->where('from_url', $url)
            ->first();
    }

    public static function getStatusCodes(): array
    {
        return [
            301 => '301 - Permanent',
            302 => '302 - Temporary',
            307 => '307 - Temporary (Preserve Method)',
            308 => '308 - Permanent (Preserve Method)',
        ];
    }

    public function isPermanent(): bool
    {
        return in_array($this->status_code, [301, 308]);
    }
}
