<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommentTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $author;
    protected Post $post;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->author = User::factory()->create(['role' => 'author']);
        $this->post = Post::factory()->create(['status' => 'published']);
    }

    public function test_can_list_comments_for_post(): void
    {
        Comment::factory()->count(3)->for($this->post)->create();

        $response = $this->getJson("/api/v1/posts/{$this->post->id}/comments");

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data.data');
    }

    public function test_authenticated_user_can_create_comment(): void
    {
        $token = $this->author->createToken('auth-token')->plainTextToken;

        $commentData = [
            'content' => 'Great article!',
        ];

        $response = $this->withToken($token)->postJson("/api/v1/posts/{$this->post->id}/comments", $commentData);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'content' => 'Great article!',
                ],
            ]);

        $this->assertDatabaseHas('comments', [
            'post_id' => $this->post->id,
            'user_id' => $this->author->id,
            'content' => 'Great article!',
        ]);
    }

    public function test_guest_can_create_comment_with_name_and_email(): void
    {
        $commentData = [
            'content' => 'Great article!',
            'author_name' => 'John Doe',
            'author_email' => 'john@example.com',
        ];

        $response = $this->postJson("/api/v1/posts/{$this->post->id}/comments", $commentData);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'content' => 'Great article!',
                    'author_name' => 'John Doe',
                ],
            ]);

        $this->assertDatabaseHas('comments', [
            'post_id' => $this->post->id,
            'author_name' => 'John Doe',
            'author_email' => 'john@example.com',
        ]);
    }

    public function test_can_update_own_comment(): void
    {
        $comment = Comment::factory()->for($this->post)->for($this->author)->create();

        $token = $this->author->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->putJson("/api/v1/comments/{$comment->id}", [
            'content' => 'Updated comment',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'content' => 'Updated comment',
                ],
            ]);

        $this->assertDatabaseHas('comments', [
            'id' => $comment->id,
            'content' => 'Updated comment',
        ]);
    }

    public function test_admin_can_update_any_comment(): void
    {
        $comment = Comment::factory()->for($this->post)->for($this->author)->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->putJson("/api/v1/comments/{$comment->id}", [
            'content' => 'Admin updated comment',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('comments', [
            'id' => $comment->id,
            'content' => 'Admin updated comment',
        ]);
    }

    public function test_can_delete_own_comment(): void
    {
        $comment = Comment::factory()->for($this->post)->for($this->author)->create();

        $token = $this->author->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->deleteJson("/api/v1/comments/{$comment->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('comments', [
            'id' => $comment->id,
        ]);
    }

    public function test_admin_can_delete_any_comment(): void
    {
        $comment = Comment::factory()->for($this->post)->for($this->author)->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->deleteJson("/api/v1/comments/{$comment->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('comments', [
            'id' => $comment->id,
        ]);
    }

    public function test_user_cannot_update_other_users_comment(): void
    {
        $otherUser = User::factory()->create();
        $comment = Comment::factory()->for($this->post)->for($otherUser)->create();

        $token = $this->author->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->putJson("/api/v1/comments/{$comment->id}", [
            'content' => 'Trying to update',
        ]);

        $response->assertStatus(403);
    }

    public function test_comment_content_is_required(): void
    {
        $token = $this->author->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson("/api/v1/posts/{$this->post->id}/comments", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['content']);
    }

    public function test_guest_must_provide_name_and_email(): void
    {
        $response = $this->postJson("/api/v1/posts/{$this->post->id}/comments", [
            'content' => 'Great article!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['author_name', 'author_email']);
    }
}
