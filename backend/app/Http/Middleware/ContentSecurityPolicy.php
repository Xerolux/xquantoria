<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ContentSecurityPolicy
{
    protected array $policies = [];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($this->shouldApplyCSP($request)) {
            $this->buildPolicies();
            $response->headers->set('Content-Security-Policy', $this->compilePolicies());
        }

        return $response;
    }

    protected function shouldApplyCSP(Request $request): bool
    {
        if (app()->environment('local') && !config('security.csp.local_enabled', false)) {
            return false;
        }

        if ($request->is('api/*') && !config('security.csp.api_enabled', false)) {
            return false;
        }

        return config('security.csp.enabled', true);
    }

    protected function buildPolicies(): void
    {
        $this->policies = [
            'default-src' => ["'self'"],
            'script-src' => $this->getScriptSources(),
            'style-src' => $this->getStyleSources(),
            'img-src' => $this->getImageSources(),
            'font-src' => $this->getFontSources(),
            'connect-src' => $this->getConnectSources(),
            'media-src' => ["'self'", 'blob:'],
            'object-src' => ["'none'"],
            'frame-src' => $this->getFrameSources(),
            'frame-ancestors' => ["'self'"],
            'form-action' => ["'self'"],
            'base-uri' => ["'self'"],
            'upgrade-insecure-requests' => [],
        ];

        if (config('security.csp.report_only', false)) {
            $this->policies['report-uri'] = [config('security.csp.report_uri', '/csp-report')];
        }
    }

    protected function getScriptSources(): array
    {
        $sources = ["'self'"];

        if (config('security.csp.allow_inline_scripts', false)) {
            $sources[] = "'unsafe-inline'";
        }

        if (config('security.csp.allow_eval', false)) {
            $sources[] = "'unsafe-eval'";
        }

        $domains = config('security.csp.script_domains', []);
        foreach ($domains as $domain) {
            $sources[] = $domain;
        }

        $sources[] = 'https://cdn.jsdelivr.net';
        $sources[] = 'https://unpkg.com';

        if (app()->environment('local')) {
            $sources[] = "'unsafe-inline'";
        }

        return $sources;
    }

    protected function getStyleSources(): array
    {
        $sources = ["'self'"];

        if (config('security.csp.allow_inline_styles', true)) {
            $sources[] = "'unsafe-inline'";
        }

        $domains = config('security.csp.style_domains', []);
        foreach ($domains as $domain) {
            $sources[] = $domain;
        }

        $sources[] = 'https://fonts.googleapis.com';
        $sources[] = 'https://cdn.jsdelivr.net';

        return $sources;
    }

    protected function getImageSources(): array
    {
        $sources = ["'self'", 'data:', 'blob:'];

        $domains = config('security.csp.image_domains', []);
        foreach ($domains as $domain) {
            $sources[] = $domain;
        }

        $sources[] = 'https://*.cloudinary.com';
        $sources[] = 'https://*.imgix.net';

        return $sources;
    }

    protected function getFontSources(): array
    {
        $sources = ["'self'", 'data:'];

        $domains = config('security.csp.font_domains', []);
        foreach ($domains as $domain) {
            $sources[] = $domain;
        }

        $sources[] = 'https://fonts.gstatic.com';
        $sources[] = 'https://fonts.googleapis.com';

        return $sources;
    }

    protected function getConnectSources(): array
    {
        $sources = ["'self'"];

        $domains = config('security.csp.connect_domains', []);
        foreach ($domains as $domain) {
            $sources[] = $domain;
        }

        $sources[] = 'https://api.stripe.com';
        $sources[] = 'https://api.paypal.com';
        $sources[] = config('app.url');

        if (app()->environment('local')) {
            $sources[] = 'http://localhost:*';
            $sources[] = 'ws://localhost:*';
        }

        return $sources;
    }

    protected function getFrameSources(): array
    {
        $sources = ["'self'"];

        $domains = config('security.csp.frame_domains', []);
        foreach ($domains as $domain) {
            $sources[] = $domain;
        }

        $sources[] = 'https://js.stripe.com';
        $sources[] = 'https://www.paypal.com';
        $sources[] = 'https://*.youtube.com';
        $sources[] = 'https://*.vimeo.com';

        return $sources;
    }

    protected function compilePolicies(): string
    {
        $compiled = [];

        foreach ($this->policies as $directive => $values) {
            if (empty($values)) {
                $compiled[] = $directive;
            } else {
                $compiled[] = $directive . ' ' . implode(' ', $values);
            }
        }

        return implode('; ', $compiled);
    }
}
