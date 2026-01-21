<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TranslationService
{
    protected string $apiKey;
    protected string $apiUrl;

    public function __construct()
    {
        $this->apiKey = config('services.deepl.api_key');
        $this->apiUrl = config('services.deepl.url', 'https://api-free.deepl.com/v2/translate');
    }

    /**
     * Translate a post to a target language.
     */
    public function translatePost(Post $post, string $targetLang, int $translatedBy): array
    {
        if ($post->language === $targetLang) {
            throw new \Exception('Source and target languages are the same');
        }

        // Update translation status
        $post->update([
            'translation_status' => 'in_progress',
        ]);

        try {
            // Translate title
            $translatedTitle = $this->translateText($post->title, $targetLang);

            // Translate content
            $translatedContent = $this->translateText($post->content, $targetLang);

            // Translate excerpt if exists
            $translatedExcerpt = $post->excerpt ? $this->translateText($post->excerpt, $targetLang) : null;

            // Create new translated post
            $translatedPost = Post::create([
                'original_post_id' => $post->id,
                'title' => $translatedTitle,
                'content' => $translatedContent,
                'excerpt' => $translatedExcerpt,
                'slug' => $this->generateUniqueSlug($translatedTitle, $targetLang),
                'language' => $targetLang,
                'status' => 'draft', // Translated posts start as draft for review
                'user_id' => $post->user_id,
                'translation_status' => 'completed',
                'translated_at' => now(),
                'translated_by' => $translatedBy,
                'published_at' => null, // Not published yet
            ]);

            // Copy categories and tags
            $this->copyTaxonomies($post, $translatedPost);

            // Mark original as having translation
            $post->update([
                'translation_status' => 'completed',
            ]);

            return [
                'success' => true,
                'post' => $translatedPost,
                'message' => 'Post translated successfully. Please review before publishing.',
            ];
        } catch (\Exception $e) {
            $post->update([
                'translation_status' => 'needs_review',
            ]);

            Log::error('Translation failed', [
                'post_id' => $post->id,
                'target_lang' => $targetLang,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Translate text using DeepL API.
     */
    protected function translateText(string $text, string $targetLang): string
    {
        if (empty($text)) {
            return $text;
        }

        // Split long text into chunks (DeepL limit is 5000 chars per request)
        $chunks = $this->splitText($text, 4000);
        $translatedChunks = [];

        foreach ($chunks as $chunk) {
            $response = Http::withHeaders([
                'Authorization' => 'DeepL-Auth-Key ' . $this->apiKey,
            ])->asForm()->post($this->apiUrl, [
                'text' => $chunk,
                'target_lang' => strtoupper($targetLang),
                'preserve_formatting' => true,
            ]);

            if (!$response->successful()) {
                throw new \Exception('DeepL API error: ' . $response->body());
            }

            $data = $response->json();
            $translatedChunks[] = $data['translations'][0]['text'] ?? $chunk;
        }

        return implode('', $translatedChunks);
    }

    /**
     * Split text into chunks to respect API limits.
     */
    protected function splitText(string $text, int $maxLength): array
    {
        if (strlen($text) <= $maxLength) {
            return [$text];
        }

        $chunks = [];
        $currentChunk = '';

        // Split by paragraphs
        $paragraphs = preg_split('/\n\n+/', $text);

        foreach ($paragraphs as $paragraph) {
            if (strlen($currentChunk . $paragraph) <= $maxLength) {
                $currentChunk .= ($currentChunk ? "\n\n" : '') . $paragraph;
            } else {
                if ($currentChunk) {
                    $chunks[] = $currentChunk;
                }

                // If single paragraph is too long, split by sentences
                if (strlen($paragraph) > $maxLength) {
                    $sentences = preg_split('/(?<=[.!?])\s+/', $paragraph);
                    $currentChunk = '';

                    foreach ($sentences as $sentence) {
                        if (strlen($currentChunk . $sentence) <= $maxLength) {
                            $currentChunk .= ($currentChunk ? ' ' : '') . $sentence;
                        } else {
                            if ($currentChunk) {
                                $chunks[] = $currentChunk;
                            }
                            $currentChunk = $sentence;
                        }
                    }
                } else {
                    $currentChunk = $paragraph;
                }
            }
        }

        if ($currentChunk) {
            $chunks[] = $currentChunk;
        }

        return $chunks;
    }

    /**
     * Generate unique slug for translated post.
     */
    protected function generateUniqueSlug(string $title, string $lang): string
    {
        $slug = \Illuminate\Support\Str::slug($title);
        $originalSlug = $slug;
        $counter = 1;

        while (Post::where('slug', $slug)->where('language', $lang)->exists()) {
            $slug = $originalSlug . '-' . $lang . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Copy categories and tags to translated post.
     */
    protected function copyTaxonomies(Post $source, Post $target): void
    {
        // Copy categories
        $categoryIds = $source->categories()->pluck('categories.id')->toArray();
        if (!empty($categoryIds)) {
            $target->categories()->attach($categoryIds);
        }

        // Copy tags
        $tagIds = $source->tags()->pluck('tags.id')->toArray();
        if (!empty($tagIds)) {
            $target->tags()->attach($tagIds);
        }
    }

    /**
     * Get supported languages.
     */
    public function getSupportedLanguages(): array
    {
        return [
            'de' => 'German',
            'en' => 'English',
            'fr' => 'French',
            'es' => 'Spanish',
            'it' => 'Italian',
            'pt' => 'Portuguese',
            'ru' => 'Russian',
            'ja' => 'Japanese',
            'zh' => 'Chinese',
        ];
    }

    /**
     * Detect language of text.
     */
    public function detectLanguage(string $text): ?string
    {
        if (empty($text)) {
            return null;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'DeepL-Auth-Key ' . $this->apiKey,
            ])->asForm()->post($this->apiUrl . '/detect', [
                'text' => substr($text, 0, 1000), // Only check first 1000 chars
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return strtolower($data[0]['language'] ?? null);
            }
        } catch (\Exception $e) {
            Log::error('Language detection failed', ['error' => $e->getMessage()]);
        }

        return null;
    }
}
