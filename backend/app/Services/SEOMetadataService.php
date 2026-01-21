<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SEOMetadataService
{
    /**
     * Generate Open Graph metadata for a post.
     */
    public function generateOpenGraph(Post $post): array
    {
        return [
            'og:type' => 'article',
            'og:title' => $post->title,
            'og:description' => $post->excerpt ?: $post->meta_description ?: Str::limit(strip_tags($post->content), 160),
            'og:url' => $post->getFullUrl(),
            'og:image' => $post->featuredImage?->url ?? null,
            'og:image:width' => $post->featuredImage?->width ?? null,
            'og:image:height' => $post->featuredImage?->height ?? null,
            'og:image:alt' => $post->featuredImage?->alt_text ?? null,
            'og:site_name' => config('app.name'),
            'og:locale' => $post->language === 'de' ? 'de_DE' : 'en_US',
            'article:published_time' => $post->published_at?->toIso8601String(),
            'article:modified_time' => $post->updated_at->toIso8601String(),
            'article:author' => $post->author?->name ?? null,
            'article:section' => $post->categories->first()->name ?? null,
            'article:tag' => $post->tags->pluck('name')->toArray(),
        ];
    }

    /**
     * Generate Twitter Card metadata.
     */
    public function generateTwitterCard(Post $post): array
    {
        return [
            'twitter:card' => 'summary_large_image',
            'twitter:site' => config('services.twitter.username'),
            'twitter:creator' => $post->author?->twitter_username ?? null,
            'twitter:title' => $post->title,
            'twitter:description' => $post->excerpt ?: $post->meta_description ?: Str::limit(strip_tags($post->content), 160),
            'twitter:image' => $post->featuredImage?->url ?? null,
            'twitter:image:alt' => $post->featuredImage?->alt_text ?? null,
        ];
    }

    /**
     * Generate Schema.org structured data.
     */
    public function generateSchemaOrg(Post $post): array
    {
        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'Article',
            'headline' => $post->title,
            'description' => $post->excerpt ?: $post->meta_description,
            'image' => $post->featuredImage?->url ?? null,
            'author' => [
                '@type' => 'Person',
                'name' => $post->author?->name ?? null,
            ],
            'publisher' => [
                '@type' => 'Organization',
                'name' => config('app.name'),
                'logo' => [
                    '@type' => 'ImageObject',
                    'url' => asset('logo.png'),
                ],
            ],
            'datePublished' => $post->published_at?->toIso8601String(),
            'dateModified' => $post->updated_at->toIso8601String(),
        ];

        return $schema;
    }

    /**
     * Generate canonical URL.
     */
    public function getCanonicalUrl(Post $post): string
    {
        return $post->getFullUrl();
    }

    /**
     * Generate hreflang tags.
     */
    public function generateHreflang(Post $post): array
    {
        $hreflangs = [];

        // Add current language
        $hreflangs[] = [
            'hreflang' => $post->language === 'de' ? 'de-DE' : 'en-US',
            'href' => $post->getFullUrl(),
        ];

        // Add translations
        $translations = Post::where('translation_of_id', $post->id)
            ->orWhere('id', $post->translation_of_id)
            ->get();

        foreach ($translations as $translation) {
            $hreflangs[] = [
                'hreflang' => $translation->language === 'de' ? 'de-DE' : 'en-US',
                'href' => $translation->getFullUrl(),
            ];
        }

        return $hreflangs;
    }

    /**
     * Generate robots meta tag.
     */
    public function generateRobotsMeta(Post $post): string
    {
        if ($post->meta_robots) {
            return $post->meta_robots;
        }

        if ($post->status !== 'published') {
            return 'noindex, nofollow';
        }

        return 'index, follow';
    }

    /**
     * Generate complete SEO metadata.
     */
    public function getCompleteMetadata(Post $post): array
    {
        return [
            'title' => $this->getTitle($post),
            'description' => $this->getDescription($post),
            'canonical' => $this->getCanonicalUrl($post),
            'robots' => $this->generateRobotsMeta($post),
            'open_graph' => $this->generateOpenGraph($post),
            'twitter_card' => $this->generateTwitterCard($post),
            'schema_org' => $this->generateSchemaOrg($post),
            'hreflang' => $this->generateHreflang($post),
        ];
    }

    /**
     * Get page title.
     */
    protected function getTitle(Post $post): string
    {
        if ($post->meta_title) {
            return $post->meta_title;
        }

        return $post->title . ' - ' . config('app.name');
    }

    /**
     * Get page description.
     */
    protected function getDescription(Post $post): string
    {
        if ($post->meta_description) {
            return $post->meta_description;
        }

        return Str::limit(strip_tags($post->content), 160);
    }
}
