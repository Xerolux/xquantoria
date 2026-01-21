<?php

namespace Tests\Unit;

use App\Models\Post;
use App\Models\User;
use App\Services\ContentWorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentWorkflowServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ContentWorkflowService $service;
    protected User $admin;
    protected Post $post;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new ContentWorkflowService();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->post = Post::factory()->create(['status' => 'draft']);
    }

    public function test_assign_user_to_post(): void
    {
        $user = User::factory()->create();

        $this->service->assignPost($this->post, $user->id, 'author');

        $this->assertDatabaseHas('post_assignments', [
            'post_id' => $this->post->id,
            'user_id' => $user->id,
            'role' => 'author',
        ]);
    }

    public function test_submit_post_for_review(): void
    {
        $this->service->submitForReview($this->post, $this->admin->id);

        $this->assertEquals('pending_review', $this->post->fresh()->status);
        $this->assertNotNull($this->post->fresh()->submitted_for_review_at);
    }

    public function test_approve_post(): void
    {
        $this->post->update(['status' => 'pending_review']);

        $this->service->approvePost($this->post, $this->admin->id, 'Looks good!');

        $this->assertEquals('approved', $this->post->fresh()->status);
        $this->assertEquals($this->admin->id, $this->post->fresh()->approved_by);
        $this->assertNotNull($this->post->fresh()->approved_at);
        $this->assertEquals('Looks good!', $this->post->fresh()->reviewer_feedback);
    }

    public function test_request_changes(): void
    {
        $this->post->update(['status' => 'pending_review']);

        $this->service->requestChanges($this->post, $this->admin->id, 'Please fix the grammar');

        $this->assertEquals('changes_requested', $this->post->fresh()->status);
        $this->assertEquals('Please fix the grammar', $this->post->fresh()->reviewer_feedback);
        $this->assertNotNull($this->post->fresh()->changes_requested_at);
    }

    public function test_calculate_seo_score(): void
    {
        $this->post->update([
            'title' => 'This is a perfect SEO title for testing',
            'meta_description' => 'This is a perfect meta description that is between 120 and 160 characters long.',
            'content' => str_repeat('word ', 500), // 500 words
        ]);

        $category = \App\Models\Category::factory()->create();
        $this->post->categories()->attach($category);
        $tag = \App\Models\Tag::factory()->create();
        $this->post->tags()->attach($tag);

        $score = $this->service->calculateSEOScore($this->post);

        $this->assertGreaterThanOrEqual(80, $score['score']);
        $this->assertArrayHasKey('issues', $score);
        $this->assertArrayHasKey('warnings', $score);
        $this->assertArrayHasKey('passes', $score);
    }

    public function test_seo_score_with_missing_meta_description(): void
    {
        $this->post->update([
            'title' => 'Test Title',
            'meta_description' => null,
        ]);

        $score = $this->service->calculateSEOScore($this->post);

        $this->assertContains('Meta description is missing', $score['issues']);
    }

    public function test_get_workflow_stats(): void
    {
        Post::factory()->create(['status' => 'pending_review']);
        Post::factory()->create(['status' => 'approved']);
        Post::factory()->create(['status' => 'changes_requested']);
        Post::factory()->create(['status' => 'draft']);

        $stats = $this->service->getWorkflowStats();

        $this->assertEquals(1, $stats['pending_review']);
        $this->assertEquals(1, $stats['approved']);
        $this->assertEquals(1, $stats['changes_requested']);
        $this->assertEquals(1, $stats['draft']);
    }
}
