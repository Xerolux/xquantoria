<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlockedIp extends Model
{
    use HasFactory;

    protected $table = 'blocked_ips';

    protected $fillable = [
        'ip_address',
        'reason',
        'block_type',
        'failed_attempts',
        'blocked_at',
        'unblock_at',
        'is_permanent',
        'blocked_by',
        'metadata',
    ];

    protected $casts = [
        'blocked_at' => 'datetime',
        'unblock_at' => 'datetime',
        'is_permanent' => 'boolean',
        'metadata' => 'array',
    ];

    const BLOCK_TYPES = [
        'temporary' => 'Temporary Block',
        'automatic' => 'Automatic Block (Brute Force)',
        'manual' => 'Manual Block (Admin)',
        'permanent' => 'Permanent Block',
    ];

    public function blocker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_by');
    }

    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->where('is_permanent', true)
                ->orWhereNull('unblock_at')
                ->orWhere('unblock_at', '>', now());
        });
    }

    public function scopeExpired($query)
    {
        return $query->where('is_permanent', false)
            ->whereNotNull('unblock_at')
            ->where('unblock_at', '<=', now());
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('block_type', $type);
    }

    public function scopePermanent($query)
    {
        return $query->where('is_permanent', true);
    }

    public function scopeTemporary($query)
    {
        return $query->where('is_permanent', false);
    }

    public function isActive(): bool
    {
        if ($this->is_permanent) {
            return true;
        }

        return $this->unblock_at && $this->unblock_at->isFuture();
    }

    public function isExpired(): bool
    {
        if ($this->is_permanent) {
            return false;
        }

        return $this->unblock_at && $this->unblock_at->isPast();
    }

    public function unblock(): void
    {
        $this->update([
            'unblock_at' => now(),
            'is_permanent' => false,
        ]);
    }

    public function makePermanent(): void
    {
        $this->update([
            'is_permanent' => true,
            'unblock_at' => null,
        ]);
    }

    public function getTimeRemainingAttribute(): ?string
    {
        if ($this->is_permanent || !$this->unblock_at) {
            return null;
        }

        if ($this->isExpired()) {
            return 'Expired';
        }

        return $this->unblock_at->diffForHumans();
    }

    public function getBlockTypeNameAttribute(): string
    {
        return self::BLOCK_TYPES[$this->block_type] ?? $this->block_type;
    }

    public static function isBlocked(string $ip): bool
    {
        return self::where('ip_address', $ip)
            ->active()
            ->exists();
    }

    public static function block(
        string $ip,
        string $reason,
        int $durationMinutes = 60,
        string $blockType = 'temporary',
        ?int $blockedBy = null,
        array $metadata = []
    ): self {
        return self::create([
            'ip_address' => $ip,
            'reason' => $reason,
            'block_type' => $blockType,
            'blocked_at' => now(),
            'unblock_at' => now()->addMinutes($durationMinutes),
            'is_permanent' => $durationMinutes === 0,
            'blocked_by' => $blockedBy,
            'metadata' => $metadata,
        ]);
    }

    public static function unblockIp(string $ip): bool
    {
        return self::where('ip_address', $ip)
            ->active()
            ->update(['unblock_at' => now()]);
    }
}
