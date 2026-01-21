<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\User;
use App\Services\ContentWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WorkflowController extends Controller
{
    protected ContentWorkflowService $workflowService;

    public function __construct(ContentWorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    /**
     * Get workflow statistics.
     */
    public function getStats(): JsonResponse
    {
        $stats = $this->workflowService->getWorkflowStats();

        return response()->json([
            'data' => $stats,
        ]);
    }

    /**
     * Get editorial calendar.
     */
    public function getEditorialCalendar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
        ]);

        $calendar = $this->workflowService->getEditorialCalendar(
            $validated['year'],
            $validated['month']
        );

        return response()->json([
            'data' => $calendar,
        ]);
    }

    /**
     * Assign a user to a post.
     */
    public function assignUser(Request $request, int $postId): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|in:author,reviewer,editor',
        ]);

        $post = Post::findOrFail($postId);
        $user = User::findOrFail($validated['user_id']);

        $this->workflowService->assignPost($post, $validated['user_id'], $validated['role']);

        return response()->json([
            'message' => 'User assigned to post successfully',
            'data' => [
                'post_id' => $post->id,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'role' => $validated['role'],
            ],
        ], 201);
    }

    /**
     * Submit post for review.
     */
    public function submitForReview(Request $request, int $postId): JsonResponse
    {
        $post = Post::findOrFail($postId);

        $this->authorize('update', $post);

        $this->workflowService->submitForReview($post, $request->user()->id);

        return response()->json([
            'message' => 'Post submitted for review successfully',
            'data' => [
                'post_id' => $post->id,
                'status' => $post->status,
                'submitted_at' => $post->submitted_for_review_at,
            ],
        ]);
    }

    /**
     * Approve a post.
     */
    public function approvePost(Request $request, int $postId): JsonResponse
    {
        $validated = $request->validate([
            'feedback' => 'nullable|string|max:5000',
        ]);

        $post = Post::findOrFail($postId);

        $this->authorize('update', $post);

        $this->workflowService->approvePost(
            $post,
            $request->user()->id,
            $validated['feedback'] ?? null
        );

        return response()->json([
            'message' => 'Post approved successfully',
            'data' => [
                'post_id' => $post->id,
                'status' => $post->status,
                'approved_at' => $post->approved_at,
                'approved_by' => $request->user()->name,
            ],
        ]);
    }

    /**
     * Request changes to a post.
     */
    public function requestChanges(Request $request, int $postId): JsonResponse
    {
        $validated = $request->validate([
            'feedback' => 'required|string|min:10|max:5000',
        ]);

        $post = Post::findOrFail($postId);

        $this->authorize('update', $post);

        $this->workflowService->requestChanges(
            $post,
            $request->user()->id,
            $validated['feedback']
        );

        return response()->json([
            'message' => 'Changes requested successfully',
            'data' => [
                'post_id' => $post->id,
                'status' => $post->status,
                'feedback' => $post->reviewer_feedback,
                'changes_requested_at' => $post->changes_requested_at,
            ],
        ]);
    }

    /**
     * Get SEO score for a post.
     */
    public function getSEOScore(int $postId): JsonResponse
    {
        $post = Post::with(['categories', 'tags'])->findOrFail($postId);

        $seoScore = $this->workflowService->calculateSEOScore($post);

        return response()->json([
            'data' => $seoScore,
        ]);
    }
}
