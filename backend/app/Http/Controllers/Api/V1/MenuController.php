<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\MenuItem;
use App\Models\Post;
use App\Models\Category;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class MenuController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Menu::withCount('allItems');

        if ($request->has('location')) {
            $query->byLocation($request->location);
        }

        if ($request->boolean('active_only')) {
            $query->active();
        }

        $menus = $query->orderBy('name')->get();

        return response()->json([
            'data' => $menus,
            'locations' => Menu::getLocations(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:menus,slug',
            'location' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $menu = Menu::create($validated);

        return response()->json([
            'message' => 'Menu created successfully',
            'data' => $menu,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $menu = Menu::with(['items.children'])->findOrFail($id);

        return response()->json([
            'data' => $menu,
            'tree' => $menu->getTree(),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $menu = Menu::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:menus,slug,' . $id,
            'location' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $menu->update($validated);

        return response()->json([
            'message' => 'Menu updated successfully',
            'data' => $menu,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $menu = Menu::findOrFail($id);
        $menu->delete();

        return response()->json([
            'message' => 'Menu deleted successfully',
        ]);
    }

    public function getByLocation(string $location): JsonResponse
    {
        $menu = Menu::active()
            ->byLocation($location)
            ->with(['items.children'])
            ->first();

        if (!$menu) {
            return response()->json([
                'data' => null,
                'items' => [],
            ]);
        }

        return response()->json([
            'data' => $menu,
            'items' => $menu->getTree(),
        ]);
    }

    public function addItem(Request $request, int $menuId): JsonResponse
    {
        $menu = Menu::findOrFail($menuId);

        $validated = $request->validate([
            'parent_id' => 'nullable|exists:menu_items,id',
            'title' => 'required|string|max:255',
            'url' => 'nullable|string|max:500',
            'target' => 'in:_self,_blank',
            'icon' => 'nullable|string|max:100',
            'class' => 'nullable|string|max:255',
            'type' => 'in:custom,post,page,category,tag',
            'linkable_id' => 'nullable|integer',
            'linkable_type' => 'nullable|string',
            'meta' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        $maxOrder = MenuItem::where('menu_id', $menuId)
            ->where('parent_id', $validated['parent_id'] ?? null)
            ->max('order') ?? -1;

        $validated['menu_id'] = $menuId;
        $validated['order'] = $maxOrder + 1;

        if (empty($validated['url']) && !empty($validated['linkable_type']) && !empty($validated['linkable_id'])) {
            $validated['url'] = $this->resolveLinkableUrl($validated['linkable_type'], $validated['linkable_id']);
        }

        $item = MenuItem::create($validated);

        return response()->json([
            'message' => 'Menu item created successfully',
            'data' => $item,
        ], 201);
    }

    public function updateItem(Request $request, int $menuId, int $itemId): JsonResponse
    {
        $item = MenuItem::where('menu_id', $menuId)->findOrFail($itemId);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'url' => 'nullable|string|max:500',
            'target' => 'in:_self,_blank',
            'icon' => 'nullable|string|max:100',
            'class' => 'nullable|string|max:255',
            'type' => 'in:custom,post,page,category,tag',
            'linkable_id' => 'nullable|integer',
            'linkable_type' => 'nullable|string',
            'meta' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        $item->update($validated);

        return response()->json([
            'message' => 'Menu item updated successfully',
            'data' => $item,
        ]);
    }

    public function deleteItem(int $menuId, int $itemId): JsonResponse
    {
        $item = MenuItem::where('menu_id', $menuId)->findOrFail($itemId);
        $item->delete();

        return response()->json([
            'message' => 'Menu item deleted successfully',
        ]);
    }

    public function reorderItems(Request $request, int $menuId): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer|exists:menu_items,id',
            'items.*.order' => 'required|integer',
            'items.*.parent_id' => 'nullable|integer|exists:menu_items,id',
        ]);

        foreach ($validated['items'] as $itemData) {
            MenuItem::where('menu_id', $menuId)
                ->where('id', $itemData['id'])
                ->update([
                    'order' => $itemData['order'],
                    'parent_id' => $itemData['parent_id'] ?? null,
                ]);
        }

        return response()->json([
            'message' => 'Menu items reordered successfully',
        ]);
    }

    public function getLinkableOptions(Request $request): JsonResponse
    {
        $type = $request->get('type');
        $search = $request->get('search', '');

        $options = [];

        switch ($type) {
            case 'post':
                $query = Post::where('status', 'published')
                    ->select('id', 'title', 'slug');
                if ($search) {
                    $query->where('title', 'like', "%{$search}%");
                }
                $options = $query->limit(20)->get()->map(fn($p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                    'url' => '/blog/' . $p->slug,
                    'type' => 'post',
                ]);
                break;

            case 'page':
                $query = Post::where('type', 'page')
                    ->where('status', 'published')
                    ->select('id', 'title', 'slug');
                if ($search) {
                    $query->where('title', 'like', "%{$search}%");
                }
                $options = $query->limit(20)->get()->map(fn($p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                    'url' => '/page/' . $p->slug,
                    'type' => 'page',
                ]);
                break;

            case 'category':
                $query = Category::select('id', 'name', 'slug');
                if ($search) {
                    $query->where('name', 'like', "%{$search}%");
                }
                $options = $query->limit(20)->get()->map(fn($c) => [
                    'id' => $c->id,
                    'title' => $c->name,
                    'url' => '/category/' . $c->slug,
                    'type' => 'category',
                ]);
                break;

            case 'tag':
                $query = Tag::select('id', 'name', 'slug');
                if ($search) {
                    $query->where('name', 'like', "%{$search}%");
                }
                $options = $query->limit(20)->get()->map(fn($t) => [
                    'id' => $t->id,
                    'title' => $t->name,
                    'url' => '/tag/' . $t->slug,
                    'type' => 'tag',
                ]);
                break;
        }

        return response()->json([
            'data' => $options,
        ]);
    }

    protected function resolveLinkableUrl(string $type, int $id): ?string
    {
        return match ($type) {
            'post' => Post::find($id)?->slug ? '/blog/' . Post::find($id)->slug : null,
            'page' => Post::find($id)?->slug ? '/page/' . Post::find($id)->slug : null,
            'category' => Category::find($id)?->slug ? '/category/' . Category::find($id)->slug : null,
            'tag' => Tag::find($id)?->slug ? '/tag/' . Tag::find($id)->slug : null,
            default => null,
        };
    }
}
