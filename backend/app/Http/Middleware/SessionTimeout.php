<?php

namespace App\Http\Middleware;

use App\Services\SessionManagementService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SessionTimeout
{
    protected SessionManagementService $sessionService;

    public function __construct(SessionManagementService $sessionService)
    {
        $this->sessionService = $sessionService;
    }

    /**
     * Handle an incoming request and check for session timeout.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->currentAccessToken()) {
            $tokenId = $user->currentAccessToken()->id;

            // Get session from database
            $session = \App\Models\UserSession::where('token_id', $tokenId)->first();

            if ($session) {
                $timeout = config('session.lifetime', 30); // minutes
                $lastActivity = $session->last_activity_at;
                $minutesSinceActivity = now()->diffInMinutes($lastActivity);

                // Check if session has timed out
                if ($minutesSinceActivity > $timeout) {
                    // Revoke the session
                    $this->sessionService->revokeSession($tokenId);

                    return response()->json([
                        'error' => 'session_expired',
                        'message' => 'Your session has expired due to inactivity. Please login again.',
                        'timeout_minutes' => $timeout,
                    ], 401);
                }

                // Update last activity
                $this->sessionService->updateSessionActivity($tokenId);
            }
        }

        return $next($request);
    }
}
