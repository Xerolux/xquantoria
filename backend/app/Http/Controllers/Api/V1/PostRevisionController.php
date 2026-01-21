<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\PostRevisionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PostRevisionController extends Controller
{
    protected PostRevisionService $revisionService;

    public function __construct(PostRevisionService $revisionService)
    {
        $this->revisionService = $revisionService;
    }

    /**
     * Get all revisions for a post.
     */
    public function index(Request $request, int $postId)
    {
        $post = \App\Models\Post::findOrFail($postId);
        $includeAutoSaves = $request->boolean('include_auto_saves', false);

        $revisions = $this->revisionService->getRevisions($post, $includeAutoSaves);

        return response()->json([
            'post_id' => $postId,
            'revisions' => $revisions,
            'stats' => $this->revisionService->getRevisionStats($post),
        ]);
    }

    /**
     * Get a specific revision.
     */
    public function show(int $postId, int $revisionId)
    {
        $post = \App\Models\Post::findOrFail($postId);
        $revision = $post->revisions()->findOrFail($revisionId);

        return response()->json([
            'post_id' => $postId,
            'revision' => $revision,
            'is_different_from_current' => $revision->isDifferentFromCurrent(),
        ]);
    }

    /**
     * Compare two revisions.
     */
    public function compare(Request $request, int $postId)
    {
        $validated = $request->validate([
            'from' => 'required|exists:post_revisions,id',
            'to' => 'required|exists:post_revisions,id',
        ]);

        $post = \App\Models\Post::findOrFail($postId);
        $from = $post->revisions()->findOrFail($validated['from']);
        $to = $post->revisions()->findOrFail($validated['to']);

        $comparison = $this->revisionService->compareRevisions($from, $to);

        return response()->json($comparison);
    }

    /**
     * Restore a post from a revision.
     */
    public function restore(Request $request, int $postId, int $revisionId)
    {
        $post = \App\Models\Post::findOrFail($postId);
        $revision = $post->revisions()->findOrFail($revisionId);

        $restoredPost = $this->revisionService->restoreFromRevision($revision, $request->user()->id);

        return response()->json([
            'message' => 'Post restored from revision successfully',
            'post' => $restoredPost,
            'restored_from_revision' => $revisionId,
        ]);
    }

    /**
     * Create a manual revision.
     */
    public function store(Request $request, int $postId)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:255',
        ]);

        $post = \App\Models\Post::findOrFail($postId);
        $revision = $this->revisionService->createRevision(
            $post,
            $request->user()->id,
            false,
            $validated['reason'] ?? 'Manual snapshot'
        );

        return response()->json([
            'message' => 'Revision created successfully',
            'revision' => $revision,
        ], 201);
    }

    /**
     * Delete a revision.
     */
    public function destroy(Request $request, int $postId, int $revisionId)
    {
        $post = \App\Models\Post::findOrFail($postId);
        $revision = $post->revisions()->findOrFail($revisionId);

        // Prevent deleting the only revision
        if ($post->revisions()->count() <= 1) {
            return response()->json([
                'error' => 'Cannot delete the only revision',
            ], 400);
        }

        $revision->delete();

        return response()->json([
            'message' => 'Revision deleted successfully',
        ]);
    }

    /**
     * Check for conflicts.
     */
    public function checkConflict(Request $request, int $postId)
    {
        $validated = $request->validate([
            'last_known_revision_id' => 'nullable|exists:post_revisions,id',
        ]);

        $post = \App\Models\Post::findOrFail($postId);
        $conflict = $this->revisionService->checkConflict(
            $post,
            $validated['last_known_revision_id'] ?? null
        );

        return response()->json($conflict);
    }

    /**
     * Get revision statistics.
     */
    public function stats(int $postId)
    {
        $post = \App\Models\Post::findOrFail($postId);
        $stats = $this->revisionService->getRevisionStats($post);

        return response()->json($stats);
    }
}
