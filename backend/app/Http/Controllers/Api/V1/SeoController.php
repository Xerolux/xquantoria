<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\Request;

class SeoController extends Controller
{
    /**
     * Get SEO metadata for a post.
     */
    public function show(Request $request, $id)
    {
        $post = Post::where('id', $id)
            ->orWhere('slug', $id)
            ->firstOrFail();

        $this->authorize('view', $post);

        $seo = [
            'title' => $this->getTitle($post),
            'description' => $this->getDescription($post),
            'keywords' => $this->getKeywords($post),
            'canonical_url' => $this->getCanonicalUrl($post),
            'alternate_urls' => $this->getAlternateUrls($post),
            'og_tags' => $this->getOpenGraphTags($post),
            'twitter_card' => $this->getTwitterCard($post),
            'schema' => $this->getSchemaMarkup($post),
            'robots' => $this->getRobotsMeta($post),
            'hreflang' => $this->getHreflangTags($post),
        ];

        return response()->json([
            'post_id' => $post->id,
            'seo' => $seo,
        ]);
    }

    /**
     * Generate page title.
     */
    protected function getTitle(Post $post): string
    {
        if ($post->meta_title) {
            return $post->meta_title;
        }

        return $post->title . ' - ' . config('app.name');
    }

    /**
     * Generate meta description.
     */
    protected function getDescription(Post $post): string
    {
        if ($post->meta_description) {
            return $post->meta_description;
        }

        // Fallback: Use excerpt or first 160 chars of content
        $excerpt = $post->excerpt ?? strip_tags($post->content);
        return substr($excerpt, 0, 157) . '...';
    }

    /**
     * Generate keywords from tags and categories.
     */
    protected function getKeywords(Post $post): array
    {
        $keywords = [];

        // Add category names
        foreach ($post->categories as $category) {
            $keywords[] = $category->name;
        }

        // Add tag names
        foreach ($post->tags as $tag) {
            $keywords[] = $tag->name;
        }

        // Add meta keywords if set
        if ($post->meta_keywords) {
            $metaKeywords = explode(',', $post->meta_keywords);
            $keywords = array_merge($keywords, $metaKeywords);
        }

        return array_unique(array_filter(array_map('trim', $keywords)));
    }

    /**
     * Get canonical URL.
     */
    protected function getCanonicalUrl(Post $post): string
    {
        return $post->getFullUrl();
    }

    /**
     * Get alternate language URLs.
     */
    protected function getAlternateUrls(Post $post): array
    {
        $alternates = [];

        // If this post has translations
        if ($post->translationParent || $post->translations->count() > 0) {
            $parent = $post->translationParent ?? $post;
            $translations = $parent->translations;

            foreach ($translations as $translation) {
                $alternates[$translation->language] = $translation->getFullUrl();
            }

            // Add parent if it's different from current post
            if ($post->translationParent) {
                $alternates[$parent->language] = $parent->getFullUrl();
            }
        }

        return $alternates;
    }

    /**
     * Get Open Graph tags.
     */
    protected function getOpenGraphTags(Post $post): array
    {
        return [
            'og:type' => 'article',
            'og:title' => $this->getTitle($post),
            'og:description' => $this->getDescription($post),
            'og:url' => $this->getCanonicalUrl($post),
            'og:image' => $post->featuredImage?->url ?? asset('images/og-default.jpg'),
            'og:image:width' => $post->featuredImage?->width ?? 1200,
            'og:image:height' => $post->featuredImage?->height ?? 630,
            'og:image:alt' => $post->featuredImage?->alt_text ?? $post->title,
            'og:site_name' => config('app.name'),
            'og:locale' => $post->language ?? app()->getLocale(),
            'article:published_time' => $post->published_at?->toW3cString(),
            'article:modified_time' => $post->updated_at->toW3cString(),
            'article:author' => $post->author?->name,
            'article:section' => $post->categories->first()?->name,
        ];
    }

    /**
     * Get Twitter Card tags.
     */
    protected function getTwitterCard(Post $post): array
    {
        return [
            'twitter:card' => 'summary_large_image',
            'twitter:site' => config('app.twitter_handle', '@' . config('app.name')),
            'twitter:creator' => $post->author?->twitter_handle ?? '@' . $post->author?->name,
            'twitter:title' => $this->getTitle($post),
            'twitter:description' => $this->getDescription($post),
            'twitter:image' => $post->featuredImage?->url ?? asset('images/twitter-default.jpg'),
        ];
    }

    /**
     * Get Schema.org JSON-LD markup.
     */
    protected function getSchemaMarkup(Post $post): array
    {
        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'Article',
            'headline' => $post->title,
            'description' => $this->getDescription($post),
            'image' => $post->featuredImage?->url ?? asset('images/default-og.jpg'),
            'datePublished' => $post->published_at?->toW3cString(),
            'dateModified' => $post->updated_at->toW3cString(),
            'author' => [
                '@type' => 'Person',
                'name' => $post->author?->name,
                'email' => $post->author?->email,
            ],
            'publisher' => [
                '@type' => 'Organization',
                'name' => config('app.name'),
                'logo' => [
                    '@type' => 'ImageObject',
                    'url' => asset('images/logo.png'),
                ],
            ],
        ];

        // Add mainEntityOfPage
        $schema['mainEntityOfPage'] = [
            '@type' => 'WebPage',
            '@id' => $this->getCanonicalUrl($post),
        ];

        return $schema;
    }

    /**
     * Get robots meta tag.
     */
    protected function getRobotsMeta(Post $post): string
    {
        if ($post->meta_robots) {
            return $post->meta_robots;
        }

        $directives = ['index', 'follow'];

        if ($post->status !== 'published') {
            $directives = ['noindex', 'nofollow'];
        }

        return implode(', ', $directives);
    }

    /**
     * Get hreflang tags.
     */
    protected function getHreflangTags(Post $post): array
    {
        $hreflang = [];

        // Add current language
        $hreflang[$post->language ?? 'x-default'] = $this->getCanonicalUrl($post);

        // Add translations
        $alternates = $this->getAlternateUrls($post);
        foreach ($alternates as $lang => $url) {
            $hreflang[$lang] = $url;
        }

        return $hreflang;
    }
}
