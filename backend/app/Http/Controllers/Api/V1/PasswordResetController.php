<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class PasswordResetController extends Controller
{
    /**
     * Request password reset
     */
    public function requestReset(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Don't reveal if email exists
            return response()->json([
                'message' => 'If an account with that email exists, a password reset link has been sent.'
            ]);
        }

        // Delete old tokens
        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        // Create new token
        $token = Str::random(64);

        DB::table('password_reset_tokens')->insert([
            'email' => $request->email,
            'token' => Hash::make($token),
            'created_at' => now()
        ]);

        // TODO: Send email with reset link
        // Mail::to($user)->send(new PasswordResetMail($token));

        return response()->json([
            'message' => 'If an account with that email exists, a password reset link has been sent.',
            'token' => $token // REMOVE IN PRODUCTION: Only for testing
        ]);
    }

    /**
     * Reset password
     */
    public function reset(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => [
                'required',
                'confirmed',
                Password::min(12)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    ->uncompromised(),
            ]
        ]);

        // Find token
        $tokenRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$tokenRecord) {
            return response()->json([
                'message' => 'Invalid or expired password reset token'
            ], 422);
        }

        // Check if token is valid (not expired - 1 hour)
        if (now()->diffInHours($tokenRecord->created_at) > 1) {
            DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->delete();

            return response()->json([
                'message' => 'Password reset token has expired'
            ], 422);
        }

        // Verify token
        if (!Hash::check($request->token, $tokenRecord->token)) {
            return response()->json([
                'message' => 'Invalid password reset token'
            ], 422);
        }

        // Update password
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        // Delete token
        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        return response()->json([
            'message' => 'Password has been reset successfully'
        ]);
    }
}
