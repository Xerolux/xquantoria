<?php

namespace App\Services;

use App\Mail\AccountLockedMail;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AccountLockoutService
{
    /**
     * Maximum allowed failed login attempts before lockout
     */
    protected int $maxAttempts = 5;

    /**
     * Lockout duration in minutes
     */
    protected int $lockoutMinutes = 30;

    /**
     * Time window in minutes to count failed attempts
     */
    protected int $attemptsWindow = 15;

    public function __construct()
    {
        $this->maxAttempts = config('auth.lockout.max_attempts', 5);
        $this->lockoutMinutes = config('auth.lockout.duration_minutes', 30);
        $this->attemptsWindow = config('auth.lockout.attempts_window', 15);
    }

    /**
     * Record a failed login attempt
     *
     * @param User $user
     * @param string $ip
     * @return bool Returns true if account is now locked
     */
    public function recordFailedAttempt(User $user, string $ip): bool
    {
        // Reset counter if last attempt was outside the time window
        if ($user->last_failed_login_at &&
            $user->last_failed_login_at < now()->subMinutes($this->attemptsWindow)) {
            $user->failed_login_attempts = 0;
        }

        $user->increment('failed_login_attempts');
        $user->update([
            'last_failed_login_at' => now(),
            'last_failed_login_ip' => $ip
        ]);

        // Check if we should lock the account
        if ($user->failed_login_attempts >= $this->maxAttempts) {
            $this->lockAccount($user);

            Log::warning('Account locked due to failed login attempts', [
                'user_id' => $user->id,
                'email' => $user->email,
                'attempts' => $user->failed_login_attempts,
                'ip' => $ip,
                'locked_until' => $user->locked_until
            ]);

            // Send notification email
            try {
                Mail::to($user)->send(new AccountLockedMail($user, $ip, now()->toDateTimeString()));
            } catch (\Exception $e) {
                Log::error('Failed to send account locked email: ' . $e->getMessage());
            }

            return true;
        }

        Log::info('Failed login attempt recorded', [
            'user_id' => $user->id,
            'email' => $user->email,
            'attempts' => $user->failed_login_attempts,
            'remaining' => $this->maxAttempts - $user->failed_login_attempts,
            'ip' => $ip
        ]);

        return false;
    }

    /**
     * Lock the account
     *
     * @param User $user
     * @return void
     */
    protected function lockAccount(User $user): void
    {
        $user->update([
            'locked_until' => now()->addMinutes($this->lockoutMinutes)
        ]);
    }

    /**
     * Check if account is currently locked
     *
     * @param User $user
     * @return bool
     */
    public function isLocked(User $user): bool
    {
        if (!$user->locked_until) {
            return false;
        }

        // Check if lockout period has expired
        if ($user->locked_until < now()) {
            $this->unlockAccount($user);
            return false;
        }

        return true;
    }

    /**
     * Unlock the account and reset failed attempts
     *
     * @param User $user
     * @return void
     */
    public function unlockAccount(User $user): void
    {
        $user->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'last_failed_login_at' => null,
            'last_failed_login_ip' => null
        ]);

        Log::info('Account unlocked', [
            'user_id' => $user->id,
            'email' => $user->email
        ]);
    }

    /**
     * Reset failed attempts after successful login
     *
     * @param User $user
     * @return void
     */
    public function resetFailedAttempts(User $user): void
    {
        if ($user->failed_login_attempts > 0) {
            $user->update([
                'failed_login_attempts' => 0,
                'last_failed_login_at' => null,
                'last_failed_login_ip' => null
            ]);
        }
    }

    /**
     * Get remaining attempts before lockout
     *
     * @param User $user
     * @return int
     */
    public function getRemainingAttempts(User $user): int
    {
        return max(0, $this->maxAttempts - $user->failed_login_attempts);
    }

    /**
     * Get lockout time remaining in minutes
     *
     * @param User $user
     * @return int|null
     */
    public function getLockoutTimeRemaining(User $user): ?int
    {
        if (!$this->isLocked($user)) {
            return null;
        }

        return (int) ceil($user->locked_until->diffInMinutes(now()));
    }
}
