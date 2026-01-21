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

        $schemaType = $request->get('schema_type', 'article');

        $seo = [
            'title' => $this->getTitle($post),
            'description' => $this->getDescription($post),
            'keywords' => $this->getKeywords($post),
            'canonical_url' => $this->getCanonicalUrl($post),
            'alternate_urls' => $this->getAlternateUrls($post),
            'og_tags' => $this->getOpenGraphTags($post),
            'twitter_card' => $this->getTwitterCard($post),
            'schema' => $this->getSchemaMarkup($post, $schemaType),
            'robots' => $this->getRobotsMeta($post),
            'hreflang' => $this->getHreflangTags($post),
        ];

        return response()->json([
            'post_id' => $post->id,
            'schema_type' => $schemaType,
            'seo' => $seo,
        ]);
    }

    /**
     * Get all available schema types.
     */
    public function schemaTypes()
    {
        return response()->json([
            'schema_types' => [
                'article' => 'Article (default)',
                'blog_posting' => 'BlogPosting',
                'news_article' => 'NewsArticle',
                'tech_article' => 'TechArticle',
                'opinion_news_article' => 'OpinionNewsArticle',
                'report_news_article' => 'ReportageNewsArticle',
                'review' => 'Review (with rating)',
                'product' => 'Product (with offers)',
                'event' => 'Event',
                'recipe' => 'Recipe',
                'video' => 'VideoObject',
                'faq' => 'FAQPage',
                'how_to' => 'HowTo',
            ],
        ]);
    }

    /**
     * Get JSON-LD schema script tag.
     */
    public function schemaScript(Request $request, $id)
    {
        $post = Post::where('id', $id)
            ->orWhere('slug', $id)
            ->firstOrFail();

        $this->authorize('view', $post);

        $schemaType = $request->get('schema_type', 'article');
        $schema = $this->getSchemaMarkup($post, $schemaType);

        $jsonLd = json_encode($schema, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        return response()
            ->json(['schema' => $schema, 'json_ld' => $jsonLd])
            ->header('Content-Type', 'application/ld+json');
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
     * Get Schema.org JSON-LD markup with support for different schema types.
     */
    protected function getSchemaMarkup(Post $post, string $schemaType = 'article'): array
    {
        $baseSchema = [
            '@context' => 'https://schema.org',
            '@type' => $this->getSchemaType($schemaType),
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
            'mainEntityOfPage' => [
                '@type' => 'WebPage',
                '@id' => $this->getCanonicalUrl($post),
            ],
        ];

        // Add type-specific properties
        return $this->addSchemaTypeSpecificProperties($baseSchema, $post, $schemaType);
    }

    /**
     * Map schema type string to Schema.org type.
     */
    protected function getSchemaType(string $schemaType): string
    {
        return match($schemaType) {
            'blog_posting' => 'BlogPosting',
            'news_article' => 'NewsArticle',
            'tech_article' => 'TechArticle',
            'opinion_news_article' => 'OpinionNewsArticle',
            'report_news_article' => 'ReportageNewsArticle',
            'review' => 'Review',
            'product' => 'Product',
            'event' => 'Event',
            'recipe' => 'Recipe',
            'video' => 'VideoObject',
            'faq' => 'FAQPage',
            'how_to' => 'HowTo',
            default => 'Article',
        };
    }

    /**
     * Add type-specific properties to schema.
     */
    protected function addSchemaTypeSpecificProperties(array $schema, Post $post, string $schemaType): array
    {
        switch ($schemaType) {
            case 'blog_posting':
                return array_merge($schema, [
                    '@type' => 'BlogPosting',
                ]);

            case 'news_article':
                return array_merge($schema, [
                    '@type' => 'NewsArticle',
                    'dateline' => $post->published_at?->format('Y-m-d'),
                ]);

            case 'tech_article':
                return array_merge($schema, [
                    '@type' => 'TechArticle',
                    'proficiencyLevel' => 'Beginner',
                ]);

            case 'review':
                return array_merge($schema, [
                    '@type' => 'Review',
                    'itemReviewed' => [
                        '@type' => 'Thing',
                        'name' => $post->title,
                    ],
                    'reviewRating' => [
                        '@type' => 'Rating',
                        'ratingValue' => $post->rating ?? 4.5,
                        'bestRating' => 5,
                    ],
                ]);

            case 'product':
                return array_merge($schema, [
                    '@type' => 'Product',
                    'name' => $post->title,
                    'offers' => [
                        '@type' => 'Offer',
                        'price' => $post->price ?? '0.00',
                        'priceCurrency' => $post->currency ?? 'USD',
                        'availability' => 'https://schema.org/InStock',
                    ],
                ]);

            case 'event':
                return array_merge($schema, [
                    '@type' => 'Event',
                    'name' => $post->title,
                    'startDate' => $post->event_start_date ?? $post->published_at,
                    'endDate' => $post->event_end_date ?? $post->published_at,
                    'location' => [
                        '@type' => 'Place',
                        'name' => $post->event_location ?? 'TBD',
                    ],
                ]);

            case 'recipe':
                return array_merge($schema, [
                    '@type' => 'Recipe',
                    'name' => $post->title,
                    'recipeCategory' => $post->categories->first()?->name,
                    'recipeCuisine' => $post->cuisine ?? 'International',
                ]);

            case 'video':
                return array_merge($schema, [
                    '@type' => 'VideoObject',
                    'name' => $post->title,
                    'description' => $this->getDescription($post),
                    'thumbnailUrl' => $post->featuredImage?->url,
                    'uploadDate' => $post->published_at?->toW3cString(),
                ]);

            case 'faq':
                return array_merge($schema, [
                    '@type' => 'FAQPage',
                    'mainEntity' => $post->faqs ?? [],
                ]);

            case 'how_to':
                return array_merge($schema, [
                    '@type' => 'HowTo',
                    'name' => $post->title,
                    'step' => $post->how_to_steps ?? [],
                ]);

            default:
                return $schema;
        }
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
