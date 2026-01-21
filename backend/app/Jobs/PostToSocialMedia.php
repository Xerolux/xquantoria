<?php

namespace App\Jobs;

use App\Models\Post;
use App\Services\SocialMediaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class PostToSocialMedia implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $postId;
    protected array $platforms;

    public function __construct(int $postId, array $platforms)
    {
        $this->postId = $postId;
        $this->platforms = $platforms;
        $this->onQueue('social-media');
    }

    public function handle(SocialMediaService $socialService): void
    {
        $post = Post::find($this->postId);

        if (!$post) {
            \Log::warning("Post {$this->postId} not found for social media posting");
            return;
        }

        $socialService->postToMultiple($post, $this->platforms);
    }

    public function failed(\Throwable $exception): void
    {
        \Log::error("Failed to post to social media: " . $exception->getMessage());
    }
}
