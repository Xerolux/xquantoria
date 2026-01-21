<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class RememberTokenService
{
    /**
     * Create a remember token for the user
     */
    public function createRememberToken(User $user, string $deviceName = null): string
    {
        $token = Str::random(64);
        $hashedToken = hash('sha256', $token);

        // Store in database
        DB::table('remember_tokens')->insert([
            'id' => Str::uuid(),
            'user_id' => $user->id,
            'token' => $hashedToken,
            'device_name' => $deviceName ?? 'Unknown Device',
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
            'expires_at' => now()->addYears(1), // Remember tokens last 1 year
        ]);

        return $token;
    }

    /**
     * Validate a remember token and return the user
     */
    public function validateRememberToken(string $token): ?User
    {
        $hashedToken = hash('sha256', $token);

        $record = DB::table('remember_tokens')
            ->where('token', $hashedToken)
            ->where('expires_at', '>', now())
            ->first();

        if (!$record) {
            return null;
        }

        return User::find($record->user_id);
    }

    /**
     * Delete a specific remember token
     */
    public function deleteRememberToken(string $token): bool
    {
        $hashedToken = hash('sha256', $token);

        return DB::table('remember_tokens')
            ->where('token', $hashedToken)
            ->delete() > 0;
    }

    /**
     * Delete all remember tokens for a user
     */
    public function deleteAllRememberTokens(User $user): int
    {
        return DB::table('remember_tokens')
            ->where('user_id', $user->id)
            ->delete();
    }

    /**
     * Clean up expired remember tokens
     */
    public function cleanupExpiredTokens(): int
    {
        return DB::table('remember_tokens')
            ->where('expires_at', '<', now())
            ->delete();
    }
}
