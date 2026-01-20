<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class CheckSuperAdminIP
{
    /**
     * Handle an incoming request
     *
     * Checks if super_admin user is accessing from whitelisted IP
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Only apply to super_admin users
        if ($user && $user->role === 'super_admin') {
            // Check if IP whitelist is enabled
            if (config('auth.super_admin_ip_whitelist_enabled', false)) {
                $currentIp = $request->ip();

                // Check if IP is whitelisted
                $isWhitelisted = DB::table('super_admin_ip_whitelist')
                    ->where('ip_address', $currentIp)
                    ->where('is_active', true)
                    ->exists();

                if (!$isWhitelisted) {
                    return response()->json([
                        'error' => 'Access Denied',
                        'message' => 'Super admin access from this IP address is not allowed',
                        'ip' => $currentIp
                    ], 403);
                }
            }
        }

        return $next($request);
    }
}
