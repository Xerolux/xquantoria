<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ScheduleService;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    protected ScheduleService $scheduleService;

    public function __construct(ScheduleService $scheduleService)
    {
        $this->scheduleService = $scheduleService;
    }

    /**
     * Get all scheduled content.
     */
    public function index(Request $request)
    {
        $scheduled = $this->scheduleService->getScheduledContent();

        return response()->json($scheduled);
    }

    /**
     * Get scheduled content statistics.
     */
    public function stats()
    {
        $stats = $this->scheduleService->getScheduledStats();

        return response()->json($stats);
    }

    /**
     * Schedule a post for publishing.
     */
    public function schedulePost(Request $request, int $postId)
    {
        $validated = $request->validate([
            'publish_at' => 'required|date|after:now',
        ]);

        $post = \App\Models\Post::findOrFail($postId);

        $this->authorize('update', $post);

        $publishAt = \Carbon\Carbon::parse($validated['publish_at']);
        $this->scheduleService->schedulePost($post, $publishAt);

        return response()->json([
            'message' => 'Post scheduled successfully',
            'post' => $post->fresh(),
            'scheduled_for' => $publishAt,
        ]);
    }

    /**
     * Reschedule a post.
     */
    public function reschedulePost(Request $request, int $postId)
    {
        $validated = $request->validate([
            'publish_at' => 'required|date|after:now',
        ]);

        $post = \App\Models\Post::findOrFail($postId);

        $this->authorize('update', $post);

        if ($post->status !== 'scheduled') {
            return response()->json([
                'error' => 'Post is not scheduled',
            ], 400);
        }

        $newPublishAt = \Carbon\Carbon::parse($validated['publish_at']);
        $this->scheduleService->reschedulePost($post, $newPublishAt);

        return response()->json([
            'message' => 'Post rescheduled successfully',
            'post' => $post->fresh(),
            'new_scheduled_for' => $newPublishAt,
        ]);
    }

    /**
     * Cancel scheduled publishing.
     */
    public function cancelScheduledPost(int $postId)
    {
        $post = \App\Models\Post::findOrFail($postId);

        $this->authorize('update', $post);

        if ($post->status !== 'scheduled') {
            return response()->json([
                'error' => 'Post is not scheduled',
            ], 400);
        }

        $this->scheduleService->cancelScheduledPost($post);

        return response()->json([
            'message' => 'Scheduled publishing cancelled',
            'post' => $post->fresh(),
        ]);
    }

    /**
     * Get calendar view data.
     */
    public function calendar(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
        ]);

        $calendarData = $this->scheduleService->getCalendarSchedule(
            $validated['year'],
            $validated['month']
        );

        return response()->json($calendarData);
    }

    /**
     * Manually trigger check for overdue posts (admin only).
     */
    public function checkOverdue()
    {
        $this->authorize('admin', \App\Models\User::class);

        $publishedCount = $this->scheduleService->checkAndPublishOverduePosts();

        return response()->json([
            'message' => "Checked and published {$publishedCount} overdue items",
            'published_count' => $publishedCount,
        ]);
    }
}
