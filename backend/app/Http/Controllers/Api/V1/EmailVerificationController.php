<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\EmailVerificationMail;
use App\Mail\WelcomeMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class EmailVerificationController extends Controller
{
    /**
     * Send verification email
     */
    public function sendVerificationEmail(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email already verified'
            ], 400);
        }

        // Delete old tokens
        DB::table('email_verification_tokens')
            ->where('email', $user->email)
            ->delete();

        // Create new token
        $token = Str::random(64);

        DB::table('email_verification_tokens')->insert([
            'email' => $user->email,
            'token' => Hash::make($token),
            'created_at' => now()
        ]);

        // Generate verification URL
        $verificationUrl = config('app.frontend_url') . '/verify-email?token=' . $token . '&email=' . urlencode($user->email);

        // Send email
        Mail::to($user)->send(new EmailVerificationMail($verificationUrl, $user->name));

        return response()->json([
            'message' => 'Verification email sent successfully'
        ]);
    }

    /**
     * Verify email with token
     */
    public function verify(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string'
        ]);

        // Find token
        $tokenRecord = DB::table('email_verification_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$tokenRecord) {
            return response()->json([
                'message' => 'Invalid or expired verification token'
            ], 422);
        }

        // Check if token is valid (not expired - 24 hours)
        if (now()->diffInHours($tokenRecord->created_at) > 24) {
            DB::table('email_verification_tokens')
                ->where('email', $request->email)
                ->delete();

            return response()->json([
                'message' => 'Verification token has expired. Please request a new one.'
            ], 422);
        }

        // Verify token
        if (!Hash::check($request->token, $tokenRecord->token)) {
            return response()->json([
                'message' => 'Invalid verification token'
            ], 422);
        }

        // Find user and mark email as verified
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email already verified'
            ], 400);
        }

        // Mark email as verified
        $user->markEmailAsVerified();

        // Delete token
        DB::table('email_verification_tokens')
            ->where('email', $request->email)
            ->delete();

        // Send welcome email
        try {
            Mail::to($user)->send(new WelcomeMail($user));
        } catch (\Throwable $e) {
            // Log error but don't fail the verification
            \Illuminate\Support\Facades\Log::error('Failed to send welcome email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Email verified successfully'
        ]);
    }

    /**
     * Check verification status
     */
    public function status(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'verified' => $user->hasVerifiedEmail(),
            'email' => $user->email,
            'verified_at' => $user->email_verified_at
        ]);
    }
}
