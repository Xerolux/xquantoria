<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Require2FA
{
    /**
     * Handle an incoming request.
     *
     * Enforces 2FA verification for users who have 2FA enabled.
     * Sessions expire after 30 minutes of inactivity.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Skip if no user (handled by auth middleware)
        if (!$user) {
            return $next($request);
        }

        // Skip if user doesn't have 2FA enabled
        if (!$user->two_factor_secret) {
            return $next($request);
        }

        // Check if 2FA was verified in this session
        $verifiedAt = session('2fa_verified_at');
        $userId = session('2fa_user_id');

        // Require 2FA verification if:
        // 1. Not verified yet
        // 2. Verified for different user
        // 3. Session expired (30 minutes)
        if (!$verifiedAt ||
            $userId !== $user->id ||
            $verifiedAt < now()->subMinutes(30)) {

            return response()->json([
                'error' => '2FA verification required',
                'message' => 'You must complete two-factor authentication to access this resource',
                'requires_2fa' => true,
                'user_id' => $user->id
            ], 403);
        }

        // Refresh session timestamp on successful verification
        session(['2fa_verified_at' => now()]);

        return $next($request);
    }
}
