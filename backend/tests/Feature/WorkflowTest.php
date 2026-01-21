<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use App\Models\PostAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $editor;
    protected User $author;
    protected Post $post;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->editor = User::factory()->create(['role' => 'editor']);
        $this->author = User::factory()->create(['role' => 'author']);
        $this->post = Post::factory()->create(['status' => 'draft']);
    }

    public function test_editor_can_get_workflow_stats(): void
    {
        Post::factory()->create(['status' => 'pending_review']);
        Post::factory()->create(['status' => 'approved']);
        Post::factory()->create(['status' => 'changes_requested']);

        $token = $this->editor->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/workflow/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'pending_review',
                    'approved',
                    'changes_requested',
                    'draft',
                ],
            ]);
    }

    public function test_author_cannot_get_workflow_stats(): void
    {
        $token = $this->author->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/workflow/stats');

        $response->assertStatus(403);
    }

    public function test_can_assign_user_to_post(): void
    {
        $token = $this->editor->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson("/api/v1/workflow/posts/{$this->post->id}/assign", [
            'user_id' => $this->author->id,
            'role' => 'author',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('post_assignments', [
            'post_id' => $this->post->id,
            'user_id' => $this->author->id,
            'role' => 'author',
        ]);
    }

    public function test_can_submit_post_for_review(): void
    {
        $token = $this->author->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson("/api/v1/workflow/posts/{$this->post->id}/submit");

        $response->assertStatus(200);

        $this->assertDatabaseHas('posts', [
            'id' => $this->post->id,
            'status' => 'pending_review',
        ]);

        $this->assertNotNull($this->post->fresh()->submitted_for_review_at);
    }

    public function test_editor_can_approve_post(): void
    {
        $this->post->update(['status' => 'pending_review']);

        $token = $this->editor->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson("/api/v1/workflow/posts/{$this->post->id}/approve", [
            'feedback' => 'Looks great!',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('posts', [
            'id' => $this->post->id,
            'status' => 'approved',
            'approved_by' => $this->editor->id,
            'reviewer_feedback' => 'Looks great!',
        ]);

        $this->assertNotNull($this->post->fresh()->approved_at);
    }

    public function test_editor_can_request_changes(): void
    {
        $this->post->update(['status' => 'pending_review']);

        $token = $this->editor->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson("/api/v1/workflow/posts/{$this->post->id}/request-changes", [
            'feedback' => 'Please fix the grammar',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('posts', [
            'id' => $this->post->id,
            'status' => 'changes_requested',
            'reviewer_feedback' => 'Please fix the grammar',
        ]);

        $this->assertNotNull($this->post->fresh()->changes_requested_at);
    }

    public function test_can_get_seo_score(): void
    {
        $token = $this->editor->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->getJson("/api/v1/workflow/posts/{$this->post->id}/seo-score");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'score',
                    'grade',
                    'issues',
                    'warnings',
                    'passes',
                ],
            ]);
    }

    public function test_can_get_editorial_calendar(): void
    {
        Post::factory()->create([
            'status' => 'scheduled',
            'published_at' => now()->addDays(5),
        ]);

        $token = $this->editor->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/workflow/calendar?year=' . now()->year . '&month=' . now()->month);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'year',
                    'month',
                    'events',
                ],
            ]);
    }

    public function test_author_cannot_approve_post(): void
    {
        $this->post->update(['status' => 'pending_review']);

        $token = $this->author->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson("/api/v1/workflow/posts/{$this->post->id}/approve");

        $response->assertStatus(403);
    }

    public function test_only_draft_or_changes_requested_can_be_submitted(): void
    {
        $this->post->update(['status' => 'approved']);

        $token = $this->author->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson("/api/v1/workflow/posts/{$this->post->id}/submit");

        $response->assertStatus(422);
    }
}
