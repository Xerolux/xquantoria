<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TwoFactorAuthController extends Controller
{
    /**
     * Get current 2FA status
     */
    public function status()
    {
        $user = Auth::user();

        return response()->json([
            'enabled' => $user->has_two_factor_enabled,
            'confirmed_at' => $user->two_factor_confirmed_at,
            'qr_code_url' => $user->has_two_factor_enabled ? null : $user->getTwoFactorQrCodeUrl(),
            'recovery_codes_remaining' => count($user->recovery_codes),
        ]);
    }

    /**
     * Generate 2FA secret and show QR code
     */
    public function setup()
    {
        $user = Auth::user();

        if ($user->has_two_factor_enabled) {
            return response()->json([
                'message' => 'Two-factor authentication is already enabled',
            ], 400);
        }

        // Generate secret
        $secret = $user->generateTwoFactorSecret();

        // Store temporarily in session (not in DB yet)
        session(['2fa.secret' => $secret]);

        // Generate recovery codes
        $recoveryCodes = $user->generateRecoveryCodes();

        return response()->json([
            'secret' => $secret,
            'qr_code_url' => $user->getTwoFactorQrCodeUrl(),
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Confirm and enable 2FA
     */
    public function confirm(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = Auth::user();

        if ($user->has_two_factor_enabled) {
            return response()->json([
                'message' => 'Two-factor authentication is already enabled',
            ], 400);
        }

        $secret = session('2fa.secret');

        if (!$secret) {
            return response()->json([
                'message' => 'Two-factor authentication setup has expired. Please try again.',
            ], 400);
        }

        // Verify the code
        $tempSecret = $secret;
        $timeWindow = 30;
        $currentTime = floor(time() / $timeWindow);

        $isValid = false;
        for ($i = -1; $i <= 1; $i++) {
            $time = ($currentTime + $i) * $timeWindow;
            $expectedCode = $this->generateTotpCode($tempSecret, $time);

            if (hash_equals($expectedCode, $request->code)) {
                $isValid = true;
                break;
            }
        }

        if (!$isValid) {
            return response()->json([
                'message' => 'Invalid verification code',
            ], 422);
        }

        // Generate recovery codes
        $recoveryCodes = $user->generateRecoveryCodes();

        // Enable 2FA
        $user->enableTwoFactorAuthentication($secret, $recoveryCodes);

        // Clear session
        session()->forget('2fa.secret');

        return response()->json([
            'message' => 'Two-factor authentication enabled successfully',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Verify 2FA code during login
     */
    public function verify(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $user = Auth::user();

        if (!$user->has_two_factor_enabled) {
            return response()->json([
                'message' => 'Two-factor authentication is not enabled',
            ], 400);
        }

        if ($user->verifyTwoFactorCode($request->code)) {
            // Mark session as 2FA confirmed with timestamp and user ID
            session([
                '2fa.confirmed' => true,
                '2fa_verified_at' => now(),
                '2fa_user_id' => $user->id
            ]);

            return response()->json([
                'message' => 'Two-factor authentication verified successfully',
                'verified_at' => now()->toIso8601String(),
            ]);
        }

        return response()->json([
            'message' => 'Invalid verification code',
        ], 422);
    }

    /**
     * Disable 2FA
     */
    public function disable(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
            'code' => 'nullable|string',
        ]);

        $user = Auth::user();

        // Verify password
        if (!\Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid password',
            ], 422);
        }

        // If 2FA is enabled, verify code
        if ($user->has_two_factor_enabled && $request->code) {
            if (!$user->verifyTwoFactorCode($request->code)) {
                return response()->json([
                    'message' => 'Invalid verification code',
                ], 422);
            }
        }

        $user->disableTwoFactorAuthentication();

        return response()->json([
            'message' => 'Two-factor authentication disabled successfully',
        ]);
    }

    /**
     * Get recovery codes
     */
    public function recoveryCodes()
    {
        $user = Auth::user();

        if (!$user->has_two_factor_enabled) {
            return response()->json([
                'message' => 'Two-factor authentication is not enabled',
            ], 400);
        }

        return response()->json([
            'recovery_codes' => $user->recovery_codes,
        ]);
    }

    /**
     * Generate new recovery codes
     */
    public function regenerateRecoveryCodes(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = Auth::user();

        // Verify password
        if (!\Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid password',
            ], 422);
        }

        if (!$user->has_two_factor_enabled) {
            return response()->json([
                'message' => 'Two-factor authentication is not enabled',
            ], 400);
        }

        // Generate new recovery codes
        $recoveryCodes = $user->generateRecoveryCodes();

        $user->update([
            'two_factor_recovery_codes' => encrypt(json_encode($recoveryCodes)),
        ]);

        return response()->json([
            'message' => 'Recovery codes regenerated successfully',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Generate TOTP code (helper method)
     */
    protected function generateTotpCode(string $secret, int $time): string
    {
        $time = pack('N', $time);
        $time = str_pad($time, 8, "\0", STR_PAD_LEFT);

        // Base32 decode
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

        // Generate HMAC
        $hash = hash_hmac('sha1', $time, $secret, true);

        $offset = ord($hash[strlen($hash) - 1]) & 0x0F;
        $truncatedHash = substr($hash, $offset, 4);

        $code = unpack('N', $truncatedHash)[1];
        $code = $code & 0x7FFFFFFF;
        $code = $code % 1000000;

        return str_pad($code, 6, '0', STR_PAD_LEFT);
    }
}
