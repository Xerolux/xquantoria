<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Category;
use App\Models\Tag;
use App\Models\Page;
use App\Models\Media;
use App\Models\Settings;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PublicController extends Controller
{
    public function homepage(Request $request)
    {
        $cacheKey = 'public:homepage';
        $cacheTtl = config('cdn.cache_rules.homepage.ttl', 300);

        return Cache::remember($cacheKey, $cacheTtl, function () {
            $settings = $this->getPublicSettings();
            
            $featuredPosts = Post::with(['author:id,name,display_name', 'categories:id,name,slug', 'featuredImage:id,url,alt_text'])
                ->where('status', 'published')
                ->whereNotNull('featured_image_id')
                ->orderBy('published_at', 'desc')
                ->limit($settings['homepage_featured_count'] ?? 5)
                ->get();

            $latestPosts = Post::with(['author:id,name,display_name', 'categories:id,name,slug', 'featuredImage:id,url,alt_text'])
                ->where('status', 'published')
                ->orderBy('published_at', 'desc')
                ->limit($settings['homepage_posts_count'] ?? 10)
                ->get();

            $categories = Category::withCount(['posts' => function ($q) {
                $q->where('status', 'published');
            }])
                ->orderBy('posts_count', 'desc')
                ->limit(10)
                ->get();

            $popularTags = Tag::withCount(['posts' => function ($q) {
                $q->where('status', 'published');
            }])
                ->orderBy('posts_count', 'desc')
                ->limit(20)
                ->get();

            $menuPages = Page::where('show_in_menu', true)
                ->where('status', 'published')
                ->orderBy('menu_order')
                ->get(['id', 'title', 'slug']);

            return response()->json([
                'settings' => $settings,
                'featured_posts' => $featuredPosts,
                'latest_posts' => $latestPosts,
                'categories' => $categories,
                'popular_tags' => $popularTags,
                'menu_pages' => $menuPages,
            ]);
        });
    }

    public function posts(Request $request)
    {
        $query = Post::with(['author:id,name,display_name', 'categories:id,name,slug', 'tags:id,name,slug', 'featuredImage:id,url,alt_text'])
            ->where('status', 'published')
            ->orderBy('published_at', 'desc');

        if ($request->has('category')) {
            $query->whereHas('categories', function ($q) use ($request) {
                $q->where('slug', $request->category);
            });
        }

        if ($request->has('tag')) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('slug', $request->tag);
            });
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                    ->orWhere('content', 'ilike', "%{$search}%")
                    ->orWhere('excerpt', 'ilike', "%{$search}%");
            });
        }

        if ($request->has('year')) {
            $query->whereYear('published_at', $request->year);
        }

        if ($request->has('month')) {
            $query->whereMonth('published_at', $request->month);
        }

        $posts = $query->paginate($request->per_page ?? 12);

        return response()->json([
            'posts' => $posts,
            'settings' => $this->getPublicSettings(),
        ]);
    }

    public function post(string $slug)
    {
        $cacheKey = "public:post:{$slug}";
        $cacheTtl = config('cdn.cache_rules.posts.ttl', 3600);

        return Cache::remember($cacheKey, $cacheTtl, function () use ($slug) {
            $post = Post::with([
                'author:id,name,display_name,bio,avatar',
                'categories:id,name,slug,description',
                'tags:id,name,slug',
                'featuredImage:id,url,alt_text,width,height',
            ])
                ->where('slug', $slug)
                ->where('status', 'published')
                ->firstOrFail();

            $post->increment('views_count');

            $relatedPosts = Post::with(['categories:id,name,slug', 'featuredImage:id,url,alt_text'])
                ->where('status', 'published')
                ->where('id', '!=', $post->id)
                ->whereHas('categories', function ($q) use ($post) {
                    $q->whereIn('categories.id', $post->categories->pluck('id'));
                })
                ->limit(4)
                ->orderBy('published_at', 'desc')
                ->get();

            $prevPost = Post::where('status', 'published')
                ->where('published_at', '<', $post->published_at)
                ->orderBy('published_at', 'desc')
                ->first(['id', 'title', 'slug']);

            $nextPost = Post::where('status', 'published')
                ->where('published_at', '>', $post->published_at)
                ->orderBy('published_at', 'asc')
                ->first(['id', 'title', 'slug']);

            return response()->json([
                'post' => $post,
                'related_posts' => $relatedPosts,
                'prev_post' => $prevPost,
                'next_post' => $nextPost,
                'settings' => $this->getPublicSettings(),
            ]);
        });
    }

    public function categories()
    {
        $categories = Category::withCount(['posts' => function ($q) {
            $q->where('status', 'published');
        }])
            ->with(['parent:id,name,slug', 'children:id,name,slug,parent_id'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'categories' => $categories,
            'settings' => $this->getPublicSettings(),
        ]);
    }

    public function category(string $slug)
    {
        $category = Category::with(['parent', 'children'])
            ->where('slug', $slug)
            ->firstOrFail();

        $posts = Post::with(['author:id,name,display_name', 'featuredImage:id,url,alt_text'])
            ->where('status', 'published')
            ->whereHas('categories', function ($q) use ($slug) {
                $q->where('slug', $slug);
            })
            ->orderBy('published_at', 'desc')
            ->paginate(12);

        return response()->json([
            'category' => $category,
            'posts' => $posts,
            'settings' => $this->getPublicSettings(),
        ]);
    }

    public function tags()
    {
        $tags = Tag::withCount(['posts' => function ($q) {
            $q->where('status', 'published');
        }])
            ->orderBy('name')
            ->get();

        return response()->json([
            'tags' => $tags,
            'settings' => $this->getPublicSettings(),
        ]);
    }

    public function tag(string $slug)
    {
        $tag = Tag::where('slug', $slug)->firstOrFail();

        $posts = Post::with(['author:id,name,display_name', 'categories:id,name,slug', 'featuredImage:id,url,alt_text'])
            ->where('status', 'published')
            ->whereHas('tags', function ($q) use ($slug) {
                $q->where('slug', $slug);
            })
            ->orderBy('published_at', 'desc')
            ->paginate(12);

        return response()->json([
            'tag' => $tag,
            'posts' => $posts,
            'settings' => $this->getPublicSettings(),
        ]);
    }

    public function page(string $slug)
    {
        $cacheKey = "public:page:{$slug}";
        $cacheTtl = config('cdn.cache_rules.pages.ttl', 3600);

        return Cache::remember($cacheKey, $cacheTtl, function () use ($slug) {
            $page = Page::where('slug', $slug)
                ->where('status', 'published')
                ->firstOrFail();

            return response()->json([
                'page' => $page,
                'settings' => $this->getPublicSettings(),
            ]);
        });
    }

    public function menu()
    {
        $pages = Page::where('show_in_menu', true)
            ->where('status', 'published')
            ->orderBy('menu_order')
            ->get(['id', 'title', 'slug', 'menu_order']);

        $categories = Category::withCount(['posts' => function ($q) {
            $q->where('status', 'published');
        }])
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        return response()->json([
            'pages' => $pages,
            'categories' => $categories,
            'settings' => $this->getPublicSettings(),
        ]);
    }

    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2',
        ]);

        $query = $request->q;

        $posts = Post::with(['author:id,name,display_name', 'categories:id,name,slug', 'featuredImage:id,url,alt_text'])
            ->where('status', 'published')
            ->where(function ($q) use ($query) {
                $q->where('title', 'ilike', "%{$query}%")
                    ->orWhere('content', 'ilike', "%{$query}%")
                    ->orWhere('excerpt', 'ilike', "%{$query}%");
            })
            ->orderBy('published_at', 'desc')
            ->paginate(12);

        $pages = Page::where('status', 'published')
            ->where(function ($q) use ($query) {
                $q->where('title', 'ilike', "%{$query}%")
                    ->orWhere('content', 'ilike', "%{$query}%");
            })
            ->orderBy('title')
            ->get(['id', 'title', 'slug', 'excerpt']);

        return response()->json([
            'query' => $query,
            'posts' => $posts,
            'pages' => $pages,
            'settings' => $this->getPublicSettings(),
        ]);
    }

    public function archive(Request $request)
    {
        $archive = Post::where('status', 'published')
            ->selectRaw("DATE_TRUNC('month', published_at) as month, COUNT(*) as count")
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->month,
                    'year' => date('Y', strtotime($item->month)),
                    'month' => date('m', strtotime($item->month)),
                    'month_name' => date('F', strtotime($item->month)),
                    'count' => $item->count,
                ];
            });

        return response()->json([
            'archive' => $archive,
        ]);
    }

    public function author(int $id)
    {
        $author = \App\Models\User::findOrFail($id);

        $posts = Post::with(['categories:id,name,slug', 'featuredImage:id,url,alt_text'])
            ->where('author_id', $id)
            ->where('status', 'published')
            ->orderBy('published_at', 'desc')
            ->paginate(12);

        return response()->json([
            'author' => [
                'id' => $author->id,
                'name' => $author->name,
                'display_name' => $author->display_name,
                'bio' => $author->bio,
                'avatar' => $author->avatar,
                'posts_count' => $author->posts()->where('status', 'published')->count(),
            ],
            'posts' => $posts,
            'settings' => $this->getPublicSettings(),
        ]);
    }

    public function subscribe(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:newsletter_subscribers,email',
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
        ]);

        $subscriber = NewsletterSubscriber::create([
            'email' => $request->email,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'status' => 'pending',
            'confirmation_token' => \Str::random(64),
            'unsubscribe_token' => \Str::random(64),
            'ip_address' => $request->ip(),
            'source' => 'website',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Please check your email to confirm your subscription.',
        ], 201);
    }

    public function feed(Request $request)
    {
        $posts = Post::with(['author:id,name,display_name', 'categories:id,name,slug'])
            ->where('status', 'published')
            ->orderBy('published_at', 'desc')
            ->limit(50)
            ->get();

        $settings = $this->getPublicSettings();

        $feed = '<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>' . htmlspecialchars($settings['site_name'] ?? 'Blog') . '</title>
    <link>' . config('app.url') . '</link>
    <description>' . htmlspecialchars($settings['site_description'] ?? '') . '</description>
    <atom:link href="' . url('/api/v1/public/feed') . '" rel="self" type="application/rss+xml"/>
    <language>' . ($settings['language'] ?? 'de') . '</language>
    <lastBuildDate>' . now()->toRssString() . '</lastBuildDate>';

        foreach ($posts as $post) {
            $feed .= '
    <item>
        <title>' . htmlspecialchars($post->title) . '</title>
        <link>' . url('/blog/' . $post->slug) . '</link>
        <description>' . htmlspecialchars(strip_tags($post->excerpt ?? substr($post->content, 0, 200))) . '</description>
        <pubDate>' . $post->published_at->toRssString() . '</pubDate>
        <author>' . htmlspecialchars($post->author->name) . '</author>
        <guid isPermaLink="true">' . url('/blog/' . $post->slug) . '</guid>
    </item>';
        }

        $feed .= '
</channel>
</rss>';

        return response($feed)->header('Content-Type', 'application/rss+xml');
    }

    protected function getPublicSettings(): array
    {
        return Cache::remember('public:settings', 3600, function () {
            $settings = Settings::where('is_public', true)->pluck('value', 'key')->toArray();

            return [
                'site_name' => $settings['site_name'] ?? config('app.name'),
                'site_description' => $settings['site_description'] ?? '',
                'site_logo' => $settings['site_logo'] ?? null,
                'site_favicon' => $settings['site_favicon'] ?? null,
                'language' => $settings['language'] ?? 'de',
                'timezone' => $settings['timezone'] ?? 'Europe/Berlin',
                'posts_per_page' => $settings['posts_per_page'] ?? 12,
                'homepage_featured_count' => $settings['homepage_featured_count'] ?? 5,
                'homepage_posts_count' => $settings['homepage_posts_count'] ?? 10,
                'social_facebook' => $settings['social_facebook'] ?? null,
                'social_twitter' => $settings['social_twitter'] ?? null,
                'social_instagram' => $settings['social_instagram'] ?? null,
                'social_linkedin' => $settings['social_linkedin'] ?? null,
                'social_youtube' => $settings['social_youtube'] ?? null,
                'footer_text' => $settings['footer_text'] ?? null,
                'footer_copyright' => $settings['footer_copyright'] ?? null,
                'google_analytics_id' => $settings['google_analytics_id'] ?? null,
                'gtm_id' => $settings['gtm_id'] ?? null,
            ];
        });
    }
}
