<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\EmailVerificationMail;
use App\Models\User;
use App\Services\AccountLockoutService;
use App\Services\SessionManagementService;
use App\Services\RememberTokenService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    protected AccountLockoutService $lockoutService;
    protected SessionManagementService $sessionService;
    protected RememberTokenService $rememberTokenService;

    public function __construct(
        AccountLockoutService $lockoutService,
        SessionManagementService $sessionService,
        RememberTokenService $rememberTokenService
    ) {
        $this->lockoutService = $lockoutService;
        $this->sessionService = $sessionService;
        $this->rememberTokenService = $rememberTokenService;
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => [
                'required',
                'confirmed',
                Password::min(12)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    ->uncompromised(),
            ],
        ]);

        // Create user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'subscriber', // Default role
        ]);

        // Create verification token
        $token = Str::random(64);

        DB::table('email_verification_tokens')->insert([
            'email' => $user->email,
            'token' => Hash::make($token),
            'created_at' => now()
        ]);

        // Generate verification URL
        $verificationUrl = config('app.frontend_url') . '/verify-email?token=' . $token . '&email=' . urlencode($user->email);

        // Send verification email
        Mail::to($user)->send(new EmailVerificationMail($verificationUrl, $user->name));

        // Create auth token
        $tokenResult = $user->createToken('auth_token');
        $authToken = $tokenResult->plainTextToken;

        // Create session record
        $this->sessionService->createSession($user, $tokenResult->accessToken->id, $request->input('device_name'));

        return response()->json([
            'message' => 'Registration successful. Please check your email to verify your account.',
            'user' => $user,
            'token' => $authToken,
            'email_verified' => false
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'remember' => 'boolean',
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

        // Create auth token with extended expiration if remember is checked
        $tokenName = $request->boolean('remember', false) ? 'remember_token' : 'auth_token';
        $tokenResult = $user->createToken($tokenName, ['*'], now()->addMonths(
            $request->boolean('remember', false) ? 6 : 1
        ));
        $token = $tokenResult->plainTextToken;

        // Create session record
        $this->sessionService->createSession($user, $tokenResult->accessToken->id, $request->input('device_name'));

        // Create remember token if requested
        $rememberToken = null;
        if ($request->boolean('remember', false)) {
            $rememberToken = $this->rememberTokenService->createRememberToken($user, $request->input('device_name'));
        }

        return response()->json([
            'user' => $user,
            'token' => $token,
            'remember_token' => $rememberToken,
            'requires_2fa' => $user->has_two_factor_enabled
        ]);
    }

    public function me()
    {
        $user = Auth::user();
        return response()->json($user);
    }

    public function refresh(Request $request)
    {
        $user = Auth::user();
        $oldTokenId = $user->currentAccessToken()->id;

        // Delete old token and session
        $user->currentAccessToken()->delete();
        $this->sessionService->revokeSession($oldTokenId);

        // Create new token and session
        $tokenResult = $user->createToken('auth_token');
        $token = $tokenResult->plainTextToken;
        $this->sessionService->createSession($user, $tokenResult->accessToken->id, $request->input('device_name'));

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout()
    {
        $tokenId = Auth::user()->currentAccessToken()->id;

        // Delete token and session
        Auth::user()->currentAccessToken()->delete();
        $this->sessionService->revokeSession($tokenId);

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * Login with remember token
     */
    public function loginWithRememberToken(Request $request)
    {
        $validated = $request->validate([
            'remember_token' => 'required|string',
        ]);

        $user = $this->rememberTokenService->validateRememberToken($validated['remember_token']);

        if (!$user) {
            return response()->json([
                'message' => 'Invalid or expired remember token'
            ], 401);
        }

        // Check if account is active
        if (!$user->is_active) {
            return response()->json(['message' => 'Account is inactive'], 403);
        }

        $user->update(['last_login_at' => now()]);

        // Create new auth token
        $tokenResult = $user->createToken('remember_token', ['*'], now()->addMonths(6));
        $token = $tokenResult->plainTextToken;

        // Create session record
        $this->sessionService->createSession($user, $tokenResult->accessToken->id, $request->input('device_name'));

        return response()->json([
            'user' => $user,
            'token' => $token,
            'requires_2fa' => $user->has_two_factor_enabled
        ]);
    }
}
