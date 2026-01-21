<?php

namespace App\Services;

use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Session;

class LanguageService
{
    protected array $supportedLocales = ['de', 'en'];
    protected string $defaultLocale = 'de';

    /**
     * Get all supported locales.
     */
    public function getSupportedLocales(): array
    {
        return $this->supportedLocales;
    }

    /**
     * Get the default locale.
     */
    public function getDefaultLocale(): string
    {
        return $this->defaultLocale;
    }

    /**
     * Get the current locale.
     */
    public function getCurrentLocale(): string
    {
        return App::getLocale();
    }

    /**
     * Set the application locale.
     */
    public function setLocale(string $locale): void
    {
        if ($this->isSupported($locale)) {
            App::setLocale($locale);
            Session::put('locale', $locale);
        }
    }

    /**
     * Detect the user's preferred locale from browser header.
     */
    public function detectLocaleFromBrowser(): ?string
    {
        $browserLocale = request()->getPreferredLanguage($this->supportedLocales);

        return $browserLocale ?: null;
    }

    /**
     * Get locale information (name, flag, etc.).
     */
    public function getLocaleInfo(string $locale): array
    {
        $locales = [
            'de' => [
                'name' => 'Deutsch',
                'native_name' => 'Deutsch',
                'flag' => '🇩🇪',
                'code' => 'de',
                'region' => 'Europe',
            ],
            'en' => [
                'name' => 'English',
                'native_name' => 'English',
                'flag' => '🇬🇧',
                'code' => 'en',
                'region' => 'Europe',
            ],
        ];

        return $locales[$locale] ?? $locales[$this->defaultLocale];
    }

    /**
     * Get all available locales with metadata.
     */
    public function getAvailableLocales(): array
    {
        $locales = [];
        foreach ($this->supportedLocales as $locale) {
            $locales[$locale] = $this->getLocaleInfo($locale);
        }

        return $locales;
    }

    /**
     * Check if a locale is supported.
     */
    public function isSupported(string $locale): bool
    {
        return in_array($locale, $this->supportedLocales);
    }

    /**
     * Get the URL prefix for a locale (if any).
     */
    public function getUrlPrefix(string $locale): string
    {
        return $locale === $this->defaultLocale ? '' : $locale;
    }

    /**
     * Get localized URL for a given locale.
     */
    public function getLocalizedUrl(string $locale, ?string $url = null): string
    {
        $url = $url ?: request()->fullUrl();

        // Replace locale prefix in URL
        foreach ($this->supportedLocales as $supportedLocale) {
            if (str_starts_with($url, '/' . $supportedLocale . '/')) {
                $url = substr($url, strlen('/' . $supportedLocale));
                break;
            }
        }

        // Add new locale prefix
        $prefix = $this->getUrlPrefix($locale);

        return rtrim($prefix . '/' . ltrim($url, '/'), '/');
    }

    /**
     * Get available translations for a model.
     */
    public function getAvailableTranslations($model): array
    {
        if (!method_exists($model, 'getAvailableTranslations')) {
            return [];
        }

        return $model->getAvailableTranslations();
    }

    /**
     * Check if a model has a translation in a specific locale.
     */
    public function hasTranslation($model, string $locale): bool
    {
        $translations = $this->getAvailableTranslations($model);

        return in_array($locale, $translations);
    }

    /**
     * Get the fallback locale for a given locale.
     */
    public function getFallbackLocale(string $locale): string
    {
        return $this->defaultLocale;
    }

    /**
     * Get RTL (Right-to-Left) locales.
     */
    public function isRtl(string $locale): bool
    {
        $rtlLocales = ['ar', 'he', 'fa', 'ur'];

        return in_array($locale, $rtlLocales);
    }

    /**
     * Get locale statistics for content.
     */
    public function getLocaleStats(): array
    {
        return Cache::remember('locale_stats', 3600, function () {
            $stats = [];

            foreach ($this->supportedLocales as $locale) {
                $stats[$locale] = [
                    'posts' => \App\Models\Post::where('language', $locale)->count(),
                    'pages' => \App\Models\Page::where('language', $locale)->count(),
                ];
            }

            return $stats;
        });
    }

    /**
     * Clear locale cache.
     */
    public function clearCache(): void
    {
        Cache::forget('locale_stats');
    }
}
