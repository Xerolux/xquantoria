<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Category;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Response;

class RssFeedController extends Controller
{
    /**
     * Generate main RSS feed.
     */
    public function index(Request $request)
    {
        $cacheKey = 'rss_feed:' . ($request->get('lang') ?? 'de');

        $feed = Cache::remember($cacheKey, 3600, function () use ($request) {
            $posts = Post::with(['author', 'categories', 'tags'])
                ->where('status', 'published')
                ->where('language', $request->get('lang', 'de'))
                ->orderBy('published_at', 'desc')
                ->limit(50)
                ->get();

            return $this->generateFeed(
                $posts,
                config('app.name') . ' - RSS Feed',
                'Latest posts from ' . config('app.name'),
                route('rss.feed')
            );
        });

        return Response::make($feed, 200, ['Content-Type' => 'application/xml']);
    }

    /**
     * Generate category-specific RSS feed.
     */
    public function category(Request $request, $slug)
    {
        $category = Category::where('slug', $slug)->firstOrFail();

        $cacheKey = 'rss_category:' . $slug . ':' . ($request->get('lang') ?? 'de');

        $feed = Cache::remember($cacheKey, 3600, function () use ($category, $request) {
            $posts = $category->posts()
                ->with(['author', 'categories', 'tags'])
                ->where('status', 'published')
                ->where('language', $request->get('lang', 'de'))
                ->orderBy('published_at', 'desc')
                ->limit(50)
                ->get();

            return $this->generateFeed(
                $posts,
                $category->name . ' - RSS Feed',
                'Latest posts in ' . $category->name,
                route('rss.category', $slug)
            );
        });

        return Response::make($feed, 200, ['Content-Type' => 'application/xml']);
    }

    /**
     * Generate tag-specific RSS feed.
     */
    public function tag(Request $request, $slug)
    {
        $tag = Tag::where('slug', $slug)->firstOrFail();

        $cacheKey = 'rss_tag:' . $slug . ':' . ($request->get('lang') ?? 'de');

        $feed = Cache::remember($cacheKey, 3600, function () use ($tag, $request) {
            $posts = $tag->posts()
                ->with(['author', 'categories', 'tags'])
                ->where('status', 'published')
                ->where('language', $request->get('lang', 'de'))
                ->orderBy('published_at', 'desc')
                ->limit(50)
                ->get();

            return $this->generateFeed(
                $posts,
                $tag->name . ' - RSS Feed',
                'Latest posts tagged with ' . $tag->name,
                route('rss.tag', $slug)
            );
        });

        return Response::make($feed, 200, ['Content-Type' => 'application/xml']);
    }

    /**
     * Generate RSS XML feed.
     *
     * @param  \Illuminate\Support\Collection  $posts
     * @param  string  $title
     * @param  string  $description
     * @param  string  $link
     * @return string
     */
    protected function generateFeed($posts, $title, $description, $link)
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">' . "\n";
        $xml .= '<channel>' . "\n";
        $xml .= '<title>' . htmlspecialchars($title) . '</title>' . "\n";
        $xml .= '<description>' . htmlspecialchars($description) . '</description>' . "\n";
        $xml .= '<link>' . $link . '</link>' . "\n";
        $xml .= '<atom:link href="'-> url()->current() . '" rel="self" type="application/rss+xml" />' . "\n";
        $xml .= '<language>' . (app()->getLocale() ?? 'de') . '</language>' . "\n";
        $xml .= '<lastBuildDate>' . now()->toRss760String() . '</lastBuildDate>' . "\n";

        foreach ($posts as $post) {
            $xml .= '<item>' . "\n";
            $xml .= '<title>' . htmlspecialchars($post->title) . '</title>' . "\n";
            $xml .= '<description>' . htmlspecialchars($this->stripTags($post->excerpt ?? $post->content)) . '</description>' . "\n";
            $xml .= '<link>' . $post->getFullUrl() . '</link>' . "\n";
            $xml .= '<guid>' . $post->getFullUrl() . '</guid>' . "\n";
            $xml .= '<pubDate>' . $post->published_at->toRss760String() . '</pubDate>' . "\n";
            $xml .= '<author>' . htmlspecialchars($post->author->email) . ' (' . htmlspecialchars($post->author->name) . ')</author>' . "\n";

            // Categories
            foreach ($post->categories as $category) {
                $xml .= '<category>' . htmlspecialchars($category->name) . '</category>' . "\n";
            }

            // Tags
            foreach ($post->tags as $tag) {
                $xml .= '<category>' . htmlspecialchars($tag->name) . '</category>' . "\n";
            }

            // Enclosure (if featured image exists)
            if ($post->featuredImage) {
                $xml .= '<enclosure url="' . $post->featuredImage->url . '" type="' . $post->featuredImage->mime_type . '" length="' . $post->featuredImage->size . '" />' . "\n";
            }

            $xml .= '</item>' . "\n";
        }

        $xml .= '</channel>' . "\n";
        $xml .= '</rss>';

        return $xml;
    }

    /**
     * Strip HTML tags and truncate content.
     *
     * @param  string  $content
     * @param  int  $length
     * @return string
     */
    protected function stripTags($content, $length = 500)
    {
        $content = strip_tags($content);
        $content = html_entity_decode($content, ENT_QUOTES, 'UTF-8');
        $content = preg_replace('/\s+/', ' ', $content);
        $content = trim($content);

        if (strlen($content) > $length) {
            $content = substr($content, 0, $length);
            $content = substr($content, 0, strrpos($content, ' ')) . '...';
        }

        return $content;
    }
}
