<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Jobs\PublishScheduledPost;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PublishScheduledPosts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'posts:publish-scheduled';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Publish scheduled posts whose publication time has arrived';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking for scheduled posts to publish...');

        $scheduledPosts = Post::where('status', 'scheduled')
            ->where('published_at', '<=', now())
            ->get();

        if ($scheduledPosts->isEmpty()) {
            $this->info('No scheduled posts to publish.');
            return self::SUCCESS;
        }

        $this->info("Found {$scheduledPosts->count()} scheduled post(s) to publish.");

        foreach ($scheduledPosts as $post) {
            $this->info("Dispatching job for post: {$post->title}");

            // Dispatch job to handle the publishing asynchronously
            PublishScheduledPost::dispatch($post);

            Log::info("Scheduled post dispatch initiated", [
                'post_id' => $post->id,
                'title' => $post->title,
                'scheduled_for' => $post->published_at,
            ]);
        }

        $this->info("Successfully dispatched {$scheduledPosts->count()} post(s) for publishing.");

        return self::SUCCESS;
    }
}
