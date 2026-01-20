<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Check if user is authenticated
        if (!$request->user()) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'You must be logged in to access this resource'
            ], 401);
        }

        $user = $request->user();

        // Check if user has one of the required roles
        if (!in_array($user->role, $roles)) {
            return response()->json([
                'error' => 'Insufficient permissions',
                'message' => 'You do not have permission to access this resource',
                'required_role' => count($roles) > 1 ? $roles : $roles[0],
                'your_role' => $user->role
            ], 403);
        }

        return $next($request);
    }
}
