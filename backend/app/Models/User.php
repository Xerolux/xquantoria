<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'display_name',
        'avatar_url',
        'bio',
        'is_active',
        'last_login_at',
        'preferred_locale',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'two_factor_confirmed_at' => 'datetime',
        'is_active' => 'boolean',
        'password' => 'hashed',
    ];

    protected $appends = [
        'has_two_factor_enabled',
    ];

    public function posts()
    {
        return $this->hasMany(Post::class, 'author_id');
    }

    public function media()
    {
        return $this->hasMany(Media::class, 'uploaded_by');
    }

    public function downloads()
    {
        return $this->hasMany(Download::class, 'uploaded_by');
    }

    public function assignedPosts()
    {
        return $this->belongsToMany(Post::class, 'post_assignments')->withPivot('role', 'assigned_at');
    }

    public function approvedPosts()
    {
        return $this->hasMany(Post::class, 'approved_by');
    }

    public function pageAnalytics()
    {
        return $this->hasMany(PageAnalytics::class);
    }

    public function conversions()
    {
        return $this->hasMany(Conversion::class);
    }

    public function hasRole($role)
    {
        return $this->role === $role;
    }

    /**
     * Check if user has enabled two-factor authentication
     */
    public function getHasTwoFactorEnabledAttribute(): bool
    {
        return !is_null($this->two_factor_secret) &&
               !is_null($this->two_factor_confirmed_at);
    }

    /**
     * Generate two-factor authentication secret
     */
    public function generateTwoFactorSecret(): string
    {
        return \Illuminate\Support\Str::random(32);
    }

    /**
     * Generate recovery codes
     */
    public function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = $this->generateRecoveryCode();
        }
        return $codes;
    }

    /**
     * Generate a single recovery code
     */
    protected function generateRecoveryCode(): string
    {
        return \Illuminate\Support\Str::random(10) . '-' . \Illuminate\Support\Str::random(10);
    }

    /**
     * Enable two-factor authentication
     */
    public function enableTwoFactorAuthentication(string $secret, array $recoveryCodes): void
    {
        $this->update([
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode($recoveryCodes)),
            'two_factor_confirmed_at' => now(),
        ]);
    }

    /**
     * Disable two-factor authentication
     */
    public function disableTwoFactorAuthentication(): void
    {
        $this->update([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);
    }

    /**
     * Get decrypted two-factor secret
     */
    public function getTwoFactorSecretAttribute(?string $value): ?string
    {
        return $value ? decrypt($value) : null;
    }

    /**
     * Get decrypted recovery codes
     */
    public function getRecoveryCodesAttribute(): array
    {
        if (!$this->two_factor_recovery_codes) {
            return [];
        }

        return json_decode(decrypt($this->two_factor_recovery_codes), true);
    }

    /**
     * Verify two-factor authentication code
     */
    public function verifyTwoFactorCode(string $code): bool
    {
        // Check if it's a recovery code
        $recoveryCodes = $this->recovery_codes;
        $codeIndex = array_search($code, $recoveryCodes);

        if ($codeIndex !== false) {
            // Remove used recovery code
            unset($recoveryCodes[$codeIndex]);
            $this->update([
                'two_factor_recovery_codes' => encrypt(json_encode(array_values($recoveryCodes))),
            ]);
            return true;
        }

        // Verify TOTP code
        return $this->verifyTotpCode($code);
    }

    /**
     * Verify TOTP code using Google Authenticator compatible algorithm
     */
    protected function verifyTotpCode(string $code): bool
    {
        $secret = $this->two_factor_secret;
        if (!$secret) {
            return false;
        }

        // Get current time window (30 seconds)
        $timeWindow = 30;
        $currentTime = floor(time() / $timeWindow);

        // Check current, previous, and next time windows (for clock drift)
        for ($i = -1; $i <= 1; $i++) {
            $time = ($currentTime + $i) * $timeWindow;
            $expectedCode = $this->generateTotpCode($secret, $time);

            if (hash_equals($expectedCode, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate TOTP code
     */
    protected function generateTotpCode(string $secret, int $time): string
    {
        $time = pack('N', $time);
        $time = str_pad($time, 8, "\0", STR_PAD_LEFT);

        $secret = base32_decode($secret);
        $hash = hash_hmac('sha1', $time, $secret, true);

        $offset = ord($hash[strlen($hash) - 1]) & 0x0F;
        $truncatedHash = substr($hash, $offset, 4);

        $code = unpack('N', $truncatedHash)[1];
        $code = $code & 0x7FFFFFFF;
        $code = $code % 1000000;

        return str_pad($code, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get QR code URL for Google Authenticator
     */
    public function getTwoFactorQrCodeUrl(): string
    {
        $secret = $this->two_factor_secret;
        $email = urlencode($this->email);
        $issuer = urlencode(config('app.name', 'Blog CMS'));

        return "otpauth://totp/{$issuer}:{$email}?secret={$secret}&issuer={$issuer}";
    }

    /**
     * Get Twitter username for social media integration
     */
    public function getTwitterUsernameAttribute(): ?string
    {
        // This could be stored in a settings table or bio field
        // For now, return null or parse from bio
        return null;
    }
}

/**
 * Base32 decode helper
 */
if (!function_exists('base32_decode')) {
    function base32_decode($secret)
    {
        if (empty($secret)) {
            return '';
        }

        $base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $base32charsFlipped = array_flip($base32chars);

        $secret = strtoupper($secret);
        $secret = preg_replace('/[^A-Z2-7]/', '', $secret);

        $secretLen = strlen($secret);
        $secret .= str_repeat('=', (8 - ($secretLen % 8)) % 8);

        $binary = '';
        for ($i = 0; $i < strlen($secret); $i += 8) {
            $chunk = substr($secret, $i, 8);
            $binaryChunk = '';

            for ($j = 0; $j < 8; $j++) {
                $char = $chunk[$j];
                if ($char === '=') {
                    $binaryChunk .= str_repeat('0', 5);
                } else {
                    $binaryChunk .= sprintf('%05b', $base32charsFlipped[$char]);
                }
            }

            $binary .= $binaryChunk;
        }

        $secret = '';
        for ($i = 0; $i < strlen($binary); $i += 8) {
            $byte = substr($binary, $i, 8);
            $secret .= chr(bindec($byte));
        }

        return $secret;
    }
}
