<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SocialMediaService;
use Illuminate\Http\Request;

class SocialMediaController extends Controller
{
    protected SocialMediaService $socialService;

    public function __construct(SocialMediaService $socialService)
    {
        $this->socialService = $socialService;
    }

    /**
     * Post immediately to social media.
     */
    public function post(Request $request, int $postId)
    {
        $validated = $request->validate([
            'platforms' => 'required|array',
            'platforms.*' => 'in:twitter,facebook,linkedin',
            'message' => 'nullable|string|max:500',
        ]);

        $post = \App\Models\Post::findOrFail($postId);
        $this->authorize('update', $post);

        $results = $this->socialService->postToMultiple(
            $post,
            $validated['platforms'],
            $validated['message'] ?? null
        );

        return response()->json([
            'message' => 'Posted to social media',
            'results' => $results,
        ]);
    }

    /**
     * Schedule social media post.
     */
    public function schedule(Request $request, int $postId)
    {
        $validated = $request->validate([
            'platforms' => 'required|array',
            'platforms.*' => 'in:twitter,facebook,linkedin',
            'publish_at' => 'required|date|after:now',
        ]);

        $post = \App\Models\Post::findOrFail($postId);
        $this->authorize('update', $post);

        $publishAt = \Carbon\Carbon::parse($validated['publish_at']);
        $this->socialService->scheduleSocialPost($post, $validated['platforms'], $publishAt);

        return response()->json([
            'message' => 'Scheduled successfully',
            'scheduled_for' => $publishAt,
        ]);
    }

    /**
     * Get connection status.
     */
    public function status()
    {
        return response()->json($this->socialService->getConnectionStatus());
    }

    /**
     * Track a share (for analytics).
     */
    public function trackShare(Request $request)
    {
        $validated = $request->validate([
            'platform' => 'required|string|in:twitter,facebook,linkedin',
            'post_id' => 'required|integer|exists:posts,id',
        ]);

        $this->socialService->trackShare($validated['platform'], $validated['post_id']);

        return response()->json(['message' => 'Share tracked']);
    }

    /**
     * Get share statistics.
     */
    public function getStats(int $postId)
    {
        $post = \App\Models\Post::findOrFail($postId);
        $this->authorize('view', $post);

        $stats = $this->socialService->getShareStats($postId);

        return response()->json($stats);
    }
}
