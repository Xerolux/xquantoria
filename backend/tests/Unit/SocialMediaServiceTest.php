<?php

namespace Tests\Unit;

use App\Models\Post;
use App\Models\User;
use App\Models\SocialShare;
use App\Services\SocialMediaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocialMediaServiceTest extends TestCase
{
    use RefreshDatabase;

    protected SocialMediaService $service;
    protected User $admin;
    protected Post $post;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new SocialMediaService();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->post = Post::factory()->create(['status' => 'published']);
    }

    public function test_get_social_media_stats(): void
    {
        SocialShare::factory()->for($this->post)->create(['platform' => 'twitter', 'share_count' => 100]);
        SocialShare::factory()->for($this->post)->create(['platform' => 'facebook', 'share_count' => 50]);
        SocialShare::factory()->for($this->post)->create(['platform' => 'linkedin', 'share_count' => 25]);

        $stats = $this->service->getStats();

        $this->assertEquals(3, $stats['total_shares']);
        $this->assertEquals(175, $stats['total_share_count']);
        $this->assertEquals(1, $stats['by_platform']['twitter']);
        $this->assertEquals(1, $stats['by_platform']['facebook']);
    }

    public function test_share_post_creates_social_share_records(): void
    {
        $platforms = ['twitter', 'facebook'];
        $customMessage = 'Check out this post!';

        $this->service->sharePost($this->post->id, $platforms, $customMessage);

        $this->assertDatabaseHas('social_shares', [
            'post_id' => $this->post->id,
            'platform' => 'twitter',
        ]);

        $this->assertDatabaseHas('social_shares', [
            'post_id' => $this->post->id,
            'platform' => 'facebook',
        ]);
    }

    public function test_schedule_share(): void
    {
        $scheduledAt = now()->addDays(3);

        $this->service->scheduleShare(
            $this->post->id,
            ['twitter'],
            $scheduledAt->format('Y-m-d H:i:s'),
            'Scheduled message'
        );

        $this->assertDatabaseHas('scheduled_shares', [
            'post_id' => $this->post->id,
            'platform' => 'twitter',
            'scheduled_at' => $scheduledAt,
        ]);
    }

    public function test_get_post_shares(): void
    {
        SocialShare::factory()->for($this->post)->create(['platform' => 'twitter']);
        SocialShare::factory()->for($this->post)->create(['platform' => 'facebook']);

        $shares = $this->service->getPostShares($this->post->id);

        $this->assertCount(2, $shares);
        $this->assertEquals('twitter', $shares[0]['platform']);
    }

    public function test_delete_share(): void
    {
        $share = SocialShare::factory()->for($this->post)->create(['platform' => 'twitter']);

        $this->service->deleteShare($share->id);

        $this->assertDatabaseMissing('social_shares', [
            'id' => $share->id,
        ]);
    }

    public function test_batch_share_multiple_posts(): void
    {
        $posts = Post::factory()->count(3)->create(['status' => 'published']);

        $postIds = $posts->pluck('id')->toArray();

        $this->service->batchShare($postIds, ['twitter']);

        foreach ($posts as $post) {
            $this->assertDatabaseHas('social_shares', [
                'post_id' => $post->id,
                'platform' => 'twitter',
            ]);
        }
    }

    public function test_can_only_share_published_posts(): void
    {
        $draftPost = Post::factory()->create(['status' => 'draft']);

        $this->expectException(\Exception::class);

        $this->service->sharePost($draftPost->id, ['twitter']);
    }

    public function test_share_count_increments(): void
    {
        SocialShare::factory()->for($this->post)->create([
            'platform' => 'twitter',
            'share_count' => 10,
        ]);

        $this->service->sharePost($this->post->id, ['twitter']);

        $share = SocialShare::where('post_id', $this->post->id)
            ->where('platform', 'twitter')
            ->latest()
            ->first();

        $this->assertEquals(1, $share->share_count);
    }
}
