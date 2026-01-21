<?php

namespace App\Http\Middleware;

use App\Services\LanguageService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    protected LanguageService $languageService;

    public function __construct(LanguageService $languageService)
    {
        $this->languageService = $languageService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Priority:
        // 1. URL prefix (/en/..., /de/...)
        // 2. Session
        // 3. User preference
        // 4. Browser header
        // 5. Default

        $locale = null;

        // 1. Check URL prefix
        $path = $request->path();
        $segments = explode('/', $path);
        $possibleLocale = $segments[0] ?? null;

        if ($possibleLocale && $this->languageService->isSupported($possibleLocale)) {
            $locale = $possibleLocale;
        }

        // 2. Check session
        if (!$locale && session()->has('locale')) {
            $locale = session('locale');
        }

        // 3. Check authenticated user preference
        if (!$locale && auth()->check() && auth()->user()->language) {
            $locale = auth()->user()->language;
        }

        // 4. Check browser header
        if (!$locale) {
            $locale = $this->languageService->detectLocaleFromBrowser();
        }

        // 5. Fall back to default
        if (!$locale || !$this->languageService->isSupported($locale)) {
            $locale = $this->languageService->getDefaultLocale();
        }

        // Set the locale
        $this->languageService->setLocale($locale);

        return $next($request);
    }
}
