<?php

namespace App\Jobs;

use App\Models\Post;
use App\Services\ScheduleService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PublishScheduledPost implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $postId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $postId)
    {
        $this->postId = $postId;
        $this->onQueue('publishing'); // Separate queue for publishing
    }

    /**
     * Execute the job.
     */
    public function handle(ScheduleService $scheduleService): void
    {
        $post = Post::find($this->postId);

        if (!$post) {
            Log::warning("Scheduled post not found: {$this->postId}");
            return;
        }

        if ($post->status === 'published') {
            Log::info("Post {$this->postId} is already published, skipping");
            return;
        }

        // Publish the post
        $scheduleService->publishScheduledPost($post);

        Log::info("Successfully published scheduled post: {$this->postId}");
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("Failed to publish scheduled post {$this->postId}: " . $exception->getMessage());
    }
}
