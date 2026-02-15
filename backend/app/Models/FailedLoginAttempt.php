<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FailedLoginAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'ip_address',
        'email',
        'user_agent',
        'failure_reason',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    const FAILURE_REASONS = [
        'invalid_credentials' => 'Invalid email or password',
        'user_not_found' => 'User not found',
        'account_locked' => 'Account is locked',
        'account_inactive' => 'Account is inactive',
        '2fa_required' => '2FA verification required',
        '2fa_failed' => '2FA verification failed',
        'too_many_attempts' => 'Too many login attempts',
        'ip_blocked' => 'IP address is blocked',
    ];

    public function scopeFromIp($query, string $ip)
    {
        return $query->where('ip_address', $ip);
    }

    public function scopeForEmail($query, string $email)
    {
        return $query->where('email', $email);
    }

    public function scopeRecent($query, int $minutes = 60)
    {
        return $query->where('created_at', '>=', now()->subMinutes($minutes));
    }

    public function scopeLastHour($query)
    {
        return $query->where('created_at', '>=', now()->subHour());
    }

    public function scopeLastDay($query)
    {
        return $query->where('created_at', '>=', now()->subDay());
    }

    public static function countForIp(string $ip, int $minutes = 60): int
    {
        return self::fromIp($ip)
            ->recent($minutes)
            ->count();
    }

    public static function countForEmail(string $email, int $minutes = 60): int
    {
        return self::forEmail($email)
            ->recent($minutes)
            ->count();
    }

    public static function log(
        string $ip,
        ?string $email,
        string $reason,
        array $metadata = []
    ): self {
        return self::create([
            'ip_address' => $ip,
            'email' => $email,
            'user_agent' => request()->userAgent(),
            'failure_reason' => $reason,
            'metadata' => $metadata,
        ]);
    }

    public static function cleanOld(int $days = 30): int
    {
        return self::where('created_at', '<', now()->subDays($days))->delete();
    }
}
