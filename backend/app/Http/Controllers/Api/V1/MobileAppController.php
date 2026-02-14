<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Post;
use App\Models\Category;
use App\Models\Tag;
use App\Models\Media;
use App\Models\ShopProduct;
use App\Models\ShopOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MobileAppController extends Controller
{
    public function getConfig(): JsonResponse
    {
        return response()->json([
            'app_name' => config('app.name'),
            'version' => config('app.version', '1.0.0'),
            'min_app_version' => '1.0.0',
            'force_update' => false,
            'maintenance_mode' => app()->isDownForMaintenance(),
            'features' => [
                'blog' => true,
                'shop' => config('shop.enabled', true),
                'comments' => true,
                'push_notifications' => config('webpush.enabled', true),
                'dark_mode' => true,
            ],
            'theme' => [
                'primary_color' => config('app.theme.primary_color', '#1890ff'),
                'logo_url' => config('app.logo'),
            ],
        ]);
    }

    public function getHomeFeed(Request $request): JsonResponse
    {
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 20);

        $cacheKey = "mobile:home_feed:{$page}";

        $data = Cache::remember($cacheKey, 300, function () use ($perPage) {
            $featured = Post::with(['category', 'tags', 'author'])
                ->where('status', 'published')
                ->where('featured', true)
                ->orderBy('published_at', 'desc')
                ->limit(5)
                ->get();

            $latest = Post::with(['category', 'tags', 'author'])
                ->where('status', 'published')
                ->orderBy('published_at', 'desc')
                ->paginate($perPage);

            $categories = Category::withCount('posts')
                ->orderBy('posts_count', 'desc')
                ->limit(10)
                ->get();

            $popularTags = Tag::orderBy('usage_count', 'desc')
                ->limit(20)
                ->get();

            return [
                'featured' => $featured,
                'latest' => $latest->items(),
                'meta' => [
                    'current_page' => $latest->currentPage(),
                    'last_page' => $latest->lastPage(),
                    'total' => $latest->total(),
                ],
                'categories' => $categories,
                'popular_tags' => $popularTags,
            ];
        });

        return response()->json($data);
    }

    public function getPost(Request $request, string $slug): JsonResponse
    {
        $post = Post::with(['category', 'tags', 'author', 'featuredImage'])
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        $post->increment('view_count');

        $related = Post::with(['category', 'featuredImage'])
            ->where('status', 'published')
            ->where('category_id', $post->category_id)
            ->where('id', '!=', $post->id)
            ->orderBy('published_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'post' => $post,
            'related' => $related,
        ]);
    }

    public function getCategoryPosts(Request $request, string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)->firstOrFail();

        $posts = Post::with(['tags', 'author', 'featuredImage'])
            ->where('status', 'published')
            ->where('category_id', $category->id)
            ->orderBy('published_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'category' => $category,
            'posts' => $posts->items(),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    public function getTagPosts(Request $request, string $slug): JsonResponse
    {
        $tag = Tag::where('slug', $slug)->firstOrFail();

        $posts = $tag->posts()
            ->with(['category', 'author', 'featuredImage'])
            ->where('status', 'published')
            ->orderBy('published_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'tag' => $tag,
            'posts' => $posts->items(),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2',
        ]);

        $query = $request->get('q');
        $type = $request->get('type', 'all');

        $results = [];

        if ($type === 'all' || $type === 'posts') {
            $results['posts'] = Post::with(['category', 'featuredImage'])
                ->where('status', 'published')
                ->where(function ($q) use ($query) {
                    $q->where('title', 'like', "%{$query}%")
                        ->orWhere('content', 'like', "%{$query}%");
                })
                ->orderBy('published_at', 'desc')
                ->limit(20)
                ->get();
        }

        if ($type === 'all' || $type === 'products') {
            $results['products'] = ShopProduct::where('status', 'active')
                ->where(function ($q) use ($query) {
                    $q->where('name', 'like', "%{$query}%")
                        ->orWhere('description', 'like', "%{$query}%");
                })
                ->limit(20)
                ->get();
        }

        return response()->json($results);
    }

    public function getShopProducts(Request $request): JsonResponse
    {
        $query = ShopProduct::with(['category', 'images'])
            ->where('status', 'active');

        if ($request->has('category')) {
            $query->whereHas('category', fn($q) => $q->where('slug', $request->category));
        }

        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }

        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        $sort = $request->get('sort', 'newest');
        switch ($sort) {
            case 'price_asc':
                $query->orderBy('price', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('price', 'desc');
                break;
            case 'popular':
                $query->orderBy('view_count', 'desc');
                break;
            default:
                $query->orderBy('created_at', 'desc');
        }

        $products = $query->paginate($request->get('per_page', 20));

        return response()->json($products);
    }

    public function getProduct(Request $request, string $slug): JsonResponse
    {
        $product = ShopProduct::with(['category', 'images', 'tags', 'reviews.user'])
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $product->increment('view_count');

        $related = ShopProduct::with(['images'])
            ->where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->where('status', 'active')
            ->limit(5)
            ->get();

        return response()->json([
            'product' => $product,
            'related' => $related,
        ]);
    }

    public function getOrders(Request $request): JsonResponse
    {
        $user = $request->user();

        $orders = ShopOrder::with(['items.product.images'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($orders);
    }

    public function getOrder(Request $request, int $id): JsonResponse
    {
        $order = ShopOrder::with(['items.product.images', 'transactions'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json($order);
    }

    public function getUserProfile(Request $request): JsonResponse
    {
        $user = $request->user()->load(['socialAccounts']);

        return response()->json([
            'user' => $user,
            'stats' => [
                'orders_count' => $user->orders()->count(),
                'comments_count' => $user->comments()->count(),
            ],
        ]);
    }

    public function updateUserProfile(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'avatar_url' => 'sometimes|url',
            'settings' => 'sometimes|array',
        ]);

        $user = $request->user();
        $user->update($request->only(['name', 'avatar_url', 'settings']));

        return response()->json([
            'success' => true,
            'user' => $user->fresh(),
        ]);
    }

    public function registerDevice(Request $request): JsonResponse
    {
        $request->validate([
            'device_token' => 'required|string',
            'platform' => 'required|in:ios,android',
            'device_name' => 'nullable|string',
            'os_version' => 'nullable|string',
            'app_version' => 'nullable|string',
        ]);

        $user = $request->user();

        $user->devices()->updateOrCreate(
            ['device_token' => $request->device_token],
            [
                'platform' => $request->platform,
                'device_name' => $request->device_name,
                'os_version' => $request->os_version,
                'app_version' => $request->app_version,
                'last_active_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Device registered',
        ]);
    }

    public function unregisterDevice(Request $request): JsonResponse
    {
        $request->validate([
            'device_token' => 'required|string',
        ]);

        $request->user()->devices()
            ->where('device_token', $request->device_token)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Device unregistered',
        ]);
    }
}
