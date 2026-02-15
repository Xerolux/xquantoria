<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class ApiRateLimiter
{
    protected RateLimiter $limiter;

    protected array $limits = [
        'api' => 60,
        'auth' => 5,
        'upload' => 10,
        'search' => 30,
        'webhook' => 100,
    ];

    protected array $decayMinutes = [
        'api' => 1,
        'auth' => 15,
        'upload' => 1,
        'search' => 1,
        'webhook' => 1,
    ];

    public function __construct(RateLimiter $limiter)
    {
        $this->limiter = $limiter;
    }

    public function handle(Request $request, Closure $next, string $type = 'api'): Response
    {
        $key = $this->resolveRequestSignature($request, $type);
        $maxAttempts = $this->limits[$type] ?? 60;
        $decayMinutes = $this->decayMinutes[$type] ?? 1;

        if ($this->limiter->tooManyAttempts($key, $maxAttempts)) {
            return $this->buildResponse($key, $maxAttempts);
        }

        $this->limiter->hit($key, $decayMinutes * 60);

        $response = $next($request);

        $response->headers->set('X-RateLimit-Limit', $maxAttempts);
        $response->headers->set('X-RateLimit-Remaining', $maxAttempts - $this->limiter->attempts($key));
        $response->headers->set('X-RateLimit-Reset', $this->limiter->availableIn($key));

        return $response;
    }

    protected function resolveRequestSignature(Request $request, string $type): string
    {
        $user = $request->user();
        $identifier = $user ? $user->id : $request->ip();

        return sha1($type . '|' . $identifier);
    }

    protected function buildResponse(string $key, int $maxAttempts): Response
    {
        $retryAfter = $this->limiter->availableIn($key);

        return response()->json([
            'success' => false,
            'message' => 'Too many requests. Please try again later.',
            'retry_after' => $retryAfter,
        ], 429)->withHeaders([
            'Retry-After' => $retryAfter,
            'X-RateLimit-Limit' => $maxAttempts,
            'X-RateLimit-Remaining' => 0,
            'X-RateLimit-Reset' => $retryAfter,
        ]);
    }

    public function getUsageStats(Request $request, string $type = 'api'): array
    {
        $key = $this->resolveRequestSignature($request, $type);
        $maxAttempts = $this->limits[$type] ?? 60;
        $attempts = $this->limiter->attempts($key);

        return [
            'limit' => $maxAttempts,
            'used' => $attempts,
            'remaining' => max(0, $maxAttempts - $attempts),
            'reset_at' => now()->addSeconds($this->limiter->availableIn($key)),
        ];
    }

    public function clearRateLimit(Request $request, string $type = 'api'): void
    {
        $key = $this->resolveRequestSignature($request, $type);
        $this->limiter->clear($key);
    }
}
