<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\LanguageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class LanguageController extends Controller
{
    protected LanguageService $languageService;

    public function __construct(LanguageService $languageService)
    {
        $this->languageService = $languageService;
    }

    /**
     * Get all available languages.
     */
    public function index()
    {
        $locales = $this->languageService->getAvailableLocales();

        return response()->json([
            'locales' => $locales,
            'current' => $this->languageService->getCurrentLocale(),
            'default' => $this->languageService->getDefaultLocale(),
        ]);
    }

    /**
     * Get language statistics.
     */
    public function stats()
    {
        $stats = $this->languageService->getLocaleStats();

        return response()->json($stats);
    }

    /**
     * Set the current language.
     */
    public function setLanguage(Request $request)
    {
        $validated = $request->validate([
            'locale' => 'required|string|in:de,en',
        ]);

        $this->languageService->setLocale($validated['locale']);

        // Update user preference if authenticated
        if (auth()->check()) {
            auth()->user()->update([
                'language' => $validated['locale'],
            ]);
        }

        return response()->json([
            'message' => 'Language updated successfully',
            'locale' => $validated['locale'],
            'localized_url' => $this->languageService->getLocalizedUrl($validated['locale']),
        ]);
    }

    /**
     * Get the current locale information.
     */
    public function current()
    {
        $locale = $this->languageService->getCurrentLocale();

        return response()->json([
            'locale' => $locale,
            'info' => $this->languageService->getLocaleInfo($locale),
            'is_rtl' => $this->languageService->isRtl($locale),
            'url_prefix' => $this->languageService->getUrlPrefix($locale),
        ]);
    }

    /**
     * Get available translations for a specific content.
     */
    public function translations(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:post,page',
            'id' => 'required|integer',
        ]);

        $model = $validated['type'] === 'post'
            ? \App\Models\Post::find($validated['id'])
            : \App\Models\Page::find($validated['id']);

        if (!$model) {
            return response()->json(['error' => 'Content not found'], 404);
        }

        $translations = [];
        $currentLocale = $model->language;

        foreach ($this->languageService->getSupportedLocales() as $locale) {
            if ($locale !== $currentLocale) {
                $translation = $validated['type'] === 'post'
                    ? \App\Models\Post::where('translation_of_id', $model->id)
                        ->where('language', $locale)
                        ->first()
                    : \App\Models\Page::where('translation_of_id', $model->id)
                        ->where('language', $locale)
                        ->first();

                $translations[$locale] = $translation ? [
                    'id' => $translation->id,
                    'title' => $translation->title,
                    'locale' => $locale,
                    'url' => $translation->slug,
                ] : null;
            }
        }

        return response()->json([
            'content_id' => $model->id,
            'type' => $validated['type'],
            'current_locale' => $currentLocale,
            'translations' => $translations,
        ]);
    }

    /**
     * Create a translation for content.
     */
    public function createTranslation(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:post,page',
            'id' => 'required|integer',
            'target_locale' => 'required|string|in:de,en',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
        ]);

        $model = $validated['type'] === 'post'
            ? \App\Models\Post::find($validated['id'])
            : \App\Models\Page::find($validated['id']);

        if (!$model) {
            return response()->json(['error' => 'Content not found'], 404);
        }

        $this->authorize('createTranslation', $model);

        // Check if translation already exists
        $existingTranslation = $validated['type'] === 'post'
            ? \App\Models\Post::where('translation_of_id', $model->id)
                ->where('language', $validated['target_locale'])
                ->first()
            : \App\Models\Page::where('translation_of_id', $model->id)
                ->where('language', $validated['target_locale'])
                ->first();

        if ($existingTranslation) {
            return response()->json([
                'error' => 'Translation already exists',
                'translation' => $existingTranslation,
            ], 400);
        }

        // Create translation
        $modelClass = get_class($model);
        $translation = $modelClass::create([
            'title' => $validated['title'],
            'slug' => \Illuminate\Support\Str::slug($validated['title']),
            'content' => $validated['content'],
            'excerpt' => $validated['excerpt'] ?? null,
            'meta_title' => $validated['meta_title'] ?? null,
            'meta_description' => $validated['meta_description'] ?? null,
            'language' => $validated['target_locale'],
            'translation_of_id' => $model->id,
            'author_id' => auth()->id(),
            'status' => 'draft',
            'featured_image_id' => $model->featured_image_id,
        ]);

        // Copy categories and tags if it's a post
        if ($validated['type'] === 'post') {
            $translation->categories()->sync($model->categories->pluck('id'));
            $translation->tags()->sync($model->tags->pluck('id'));
        }

        // Clear cache
        $this->languageService->clearCache();

        return response()->json([
            'message' => 'Translation created successfully',
            'translation' => $translation,
        ], 201);
    }

    /**
     * Get localized URL.
     */
    public function getLocalizedUrl(Request $request)
    {
        $validated = $request->validate([
            'locale' => 'required|string|in:de,en',
            'url' => 'nullable|string',
        ]);

        $url = $this->languageService->getLocalizedUrl(
            $validated['locale'],
            $validated['url'] ?? null
        );

        return response()->json([
            'locale' => $validated['locale'],
            'url' => $url,
        ]);
    }
}
