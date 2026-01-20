<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            //
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Don't apply Sanctum stateful middleware globally
        // Routes that need session-based auth will use 'auth:sanctum' directly

        $middleware->redirectGuestsTo(function () {
            // For API, return null to let Sanctum handle 401 responses
            return null;
        });

        $middleware->redirectUsersTo(function () {
            return '/dashboard';
        });

        // Register middleware aliases
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            '2fa' => \App\Http\Middleware\Require2FA::class,
            'super_admin_ip' => \App\Http\Middleware\CheckSuperAdminIP::class,
        ]);

        // Apply security headers globally to API routes
        $middleware->appendToGroup('api', [
            \App\Http\Middleware\SecurityHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Return JSON 401 for API routes instead of redirecting
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($e instanceof \Illuminate\Auth\AuthenticationException && $request->is('api/*')) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }
        });
    })->create();
