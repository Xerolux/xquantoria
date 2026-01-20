<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AccountLockoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    protected AccountLockoutService $lockoutService;

    public function __construct(AccountLockoutService $lockoutService)
    {
        $this->lockoutService = $lockoutService;
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Check if account is locked
        if ($user && $this->lockoutService->isLocked($user)) {
            $minutesRemaining = $this->lockoutService->getLockoutTimeRemaining($user);

            return response()->json([
                'message' => 'Account is temporarily locked due to too many failed login attempts',
                'locked_until' => $user->locked_until->toIso8601String(),
                'minutes_remaining' => $minutesRemaining
            ], 429);
        }

        // Verify credentials
        if (!$user || !Hash::check($validated['password'], $user->password)) {
            // Record failed attempt if user exists
            if ($user) {
                $isLocked = $this->lockoutService->recordFailedAttempt($user, $request->ip());

                if ($isLocked) {
                    $minutesRemaining = $this->lockoutService->getLockoutTimeRemaining($user);

                    return response()->json([
                        'message' => 'Account locked due to too many failed login attempts',
                        'locked_until' => $user->locked_until->toIso8601String(),
                        'minutes_remaining' => $minutesRemaining
                    ], 429);
                }

                $remaining = $this->lockoutService->getRemainingAttempts($user);

                return response()->json([
                    'message' => 'Invalid credentials',
                    'attempts_remaining' => $remaining
                ], 401);
            }

            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // Check if account is active
        if (!$user->is_active) {
            return response()->json(['message' => 'Account is inactive'], 403);
        }

        // Reset failed attempts on successful login
        $this->lockoutService->resetFailedAttempts($user);

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'requires_2fa' => $user->has_two_factor_enabled
        ]);
    }

    public function me()
    {
        $user = Auth::user();
        return response()->json($user);
    }

    public function refresh()
    {
        $user = Auth::user();
        $user->currentAccessToken()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout()
    {
        Auth::user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }
}
