<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_type',
        'ip_address',
        'user_agent',
        'user_id',
        'url',
        'method',
        'payload',
        'headers',
        'severity',
        'description',
        'metadata',
        'is_resolved',
        'resolved_at',
        'resolved_by',
    ];

    protected $casts = [
        'payload' => 'array',
        'headers' => 'array',
        'metadata' => 'array',
        'is_resolved' => 'boolean',
        'resolved_at' => 'datetime',
    ];

    const EVENT_TYPES = [
        'login_failed' => 'Failed Login Attempt',
        'login_success' => 'Successful Login',
        'logout' => 'User Logout',
        'password_reset' => 'Password Reset Request',
        'account_locked' => 'Account Locked',
        'account_unlocked' => 'Account Unlocked',
        'ip_blocked' => 'IP Address Blocked',
        'ip_unblocked' => 'IP Address Unblocked',
        'suspicious_activity' => 'Suspicious Activity Detected',
        'brute_force' => 'Brute Force Attack Detected',
        'sql_injection' => 'SQL Injection Attempt',
        'xss_attack' => 'XSS Attack Attempt',
        'csrf_attack' => 'CSRF Attack Attempt',
        'rate_limit_exceeded' => 'Rate Limit Exceeded',
        'unauthorized_access' => 'Unauthorized Access Attempt',
        'permission_denied' => 'Permission Denied',
        'file_upload_blocked' => 'Malicious File Upload Blocked',
        'waf_blocked' => 'WAF Blocked Request',
        '2fa_enabled' => '2FA Enabled',
        '2fa_disabled' => '2FA Disabled',
        '2fa_failed' => '2FA Verification Failed',
        'session_hijacking' => 'Session Hijacking Attempt',
        'api_key_abuse' => 'API Key Abuse Detected',
    ];

    const SEVERITY_LEVELS = [
        'low' => 'Low',
        'info' => 'Information',
        'warning' => 'Warning',
        'high' => 'High',
        'critical' => 'Critical',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('event_type', $type);
    }

    public function scopeOfSeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    public function scopeUnresolved($query)
    {
        return $query->where('is_resolved', false);
    }

    public function scopeResolved($query)
    {
        return $query->where('is_resolved', true);
    }

    public function scopeFromIp($query, string $ip)
    {
        return $query->where('ip_address', $ip);
    }

    public function scopeRecent($query, int $hours = 24)
    {
        return $query->where('created_at', '>=', now()->subHours($hours));
    }

    public function scopeCritical($query)
    {
        return $query->where('severity', 'critical');
    }

    public function scopeHighPriority($query)
    {
        return $query->whereIn('severity', ['high', 'critical']);
    }

    public function resolve(int $userId): void
    {
        $this->update([
            'is_resolved' => true,
            'resolved_at' => now(),
            'resolved_by' => $userId,
        ]);
    }

    public function getEventTypeNameAttribute(): string
    {
        return self::EVENT_TYPES[$this->event_type] ?? $this->event_type;
    }

    public function getSeverityColorAttribute(): string
    {
        return match ($this->severity) {
            'critical' => 'red',
            'high' => 'orange',
            'warning' => 'yellow',
            'info' => 'blue',
            default => 'gray',
        };
    }

    public static function log(
        string $eventType,
        string $ipAddress,
        ?string $description = null,
        array $metadata = [],
        ?int $userId = null,
        string $severity = 'info'
    ): self {
        return self::create([
            'event_type' => $eventType,
            'ip_address' => $ipAddress,
            'user_agent' => request()->userAgent(),
            'user_id' => $userId ?? auth()->id(),
            'url' => request()->fullUrl(),
            'method' => request()->method(),
            'severity' => $severity,
            'description' => $description,
            'metadata' => $metadata,
            'headers' => collect(request()->headers->all())->except(['cookie', 'authorization'])->all(),
        ]);
    }
}
