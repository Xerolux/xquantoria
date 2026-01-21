<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\PostRevisionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class PostController extends Controller
{
    protected PostRevisionService $revisionService;

    public function __construct(PostRevisionService $revisionService)
    {
        $this->revisionService = $revisionService;
    }
    public function index(Request $request)
    {
        $this->authorize('viewAny', Post::class);

        // Eager loading to prevent N+1 queries - only select needed fields
        $query = Post::with([
            'author:id,name,email,display_name',
            'categories:id,name,slug',
            'tags:id,name,slug',
            'featuredImage:id,file_path,alt_text,width,height'
        ]);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('category_id')) {
            $query->whereHas('categories', function ($q) use ($request) {
                $q->where('categories.id', $request->category_id);
            });
        }

        if ($request->has('tag_id')) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('tags.id', $request->tag_id);
            });
        }

        if ($request->has('search')) {
            $query->where('title', 'ilike', '%' . $request->search . '%')
                ->orWhere('content', 'ilike', '%' . $request->search . '%');
        }

        $posts = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 15));

        return response()->json($posts);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Post::class);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string',
            'featured_image_id' => 'nullable|exists:media,id',
            'status' => 'in:draft,scheduled,published,archived',
            'published_at' => 'nullable|date',
            'categories' => 'array',
            'categories.*' => 'exists:categories,id',
            'tags' => 'array',
            'tags.*' => 'exists:tags,id',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'language' => 'in:de,en|size:2',
        ]);

        $post = Post::create([
            'title' => $validated['title'],
            'slug' => Str::slug($validated['title']),
            'content' => $validated['content'],
            'excerpt' => $validated['excerpt'] ?? null,
            'featured_image_id' => $validated['featured_image_id'] ?? null,
            'author_id' => Auth::id(),
            'status' => $validated['status'] ?? 'draft',
            'published_at' => $validated['published_at'] ?? null,
            'meta_title' => $validated['meta_title'] ?? null,
            'meta_description' => $validated['meta_description'] ?? null,
            'language' => $validated['language'] ?? 'de',
        ]);

        if (isset($validated['categories'])) {
            $post->categories()->attach($validated['categories']);
        }

        if (isset($validated['tags'])) {
            $post->tags()->attach($validated['tags']);
        }

        return response()->json($post->load(['author', 'categories', 'tags']), 201);
    }

    public function show($id)
    {
        $post = Post::with([
            'author:id,name,email,display_name',
            'categories:id,name,slug',
            'tags:id,name,slug',
            'featuredImage:id,file_path,alt_text,width,height',
            'downloads:id,title,file_path,file_size'
        ])
            ->where('id', $id)
            ->orWhere('slug', $id)
            ->firstOrFail();

        $this->authorize('view', $post);

        $post->increment('view_count');

        return response()->json($post);
    }

    public function update(Request $request, $id)
    {
        $post = Post::findOrFail($id);

        $this->authorize('update', $post);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required|string',
            'excerpt' => 'nullable|string',
            'featured_image_id' => 'nullable|exists:media,id',
            'status' => 'in:draft,scheduled,published,archived',
            'published_at' => 'nullable|date',
            'categories' => 'array',
            'categories.*' => 'exists:categories,id',
            'tags' => 'array',
            'tags.*' => 'exists:tags,id',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'create_revision' => 'boolean',
            'revision_reason' => 'nullable|string|max:255',
        ]);

        if (isset($validated['title'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        $post->update($validated);

        if (isset($validated['categories'])) {
            $post->categories()->sync($validated['categories']);
        }

        if (isset($validated['tags'])) {
            $post->tags()->sync($validated['tags']);
        }

        // Create revision if requested
        if ($request->boolean('create_revision', false)) {
            $this->revisionService->createRevision(
                $post,
                Auth::id(),
                false,
                $validated['revision_reason'] ?? 'Manual save'
            );
        }

        return response()->json($post->load(['author', 'categories', 'tags']));
    }

    /**
     * Auto-save endpoint (called every 30 seconds by frontend).
     */
    public function autoSave(Request $request, $id)
    {
        $post = Post::findOrFail($id);

        $this->authorize('update', $post);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string',
            'featured_image_id' => 'nullable|exists:media,id',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
        ]);

        // Update the post
        $post->update($validated);

        // Create auto-save revision
        $revision = $this->revisionService->createAutoSave($post, Auth::id());

        return response()->json([
            'message' => 'Auto-saved successfully',
            'revision_id' => $revision->id,
            'saved_at' => $revision->created_at,
        ]);
    }

    public function destroy($id)
    {
        $post = Post::findOrFail($id);

        $this->authorize('delete', $post);

        $post->delete();

        return response()->json(null, 204);
    }

    public function bulkStore(Request $request)
    {
        $this->authorize('bulkCreate', Post::class);

        $validated = $request->validate([
            'posts' => 'required|array',
            'posts.*.title' => 'required|string|max:255',
            'posts.*.content' => 'required|string',
        ]);

        $posts = collect($validated['posts'])->map(function ($data) {
            return Post::create([
                'title' => $data['title'],
                'slug' => Str::slug($data['title']),
                'content' => $data['content'],
                'author_id' => Auth::id(),
                'status' => 'draft',
            ]);
        });

        return response()->json($posts, 201);
    }

    public function bulkDestroy(Request $request)
    {
        $this->authorize('bulkDelete', Post::class);

        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:posts,id',
        ]);

        Post::whereIn('id', $validated['ids'])->delete();

        return response()->json(null, 204);
    }
}
