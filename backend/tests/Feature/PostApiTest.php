<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Post;
use App\Models\Category;
use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PostApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create(['role' => 'author']);
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_can_list_posts(): void
    {
        Post::factory()->count(5)->create(['status' => 'published']);

        $response = $this->getJson('/api/v1/posts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'title', 'slug', 'status']
                ],
                'meta'
            ]);
    }

    public function test_can_filter_posts_by_status(): void
    {
        Post::factory()->count(3)->create(['status' => 'published']);
        Post::factory()->count(2)->create(['status' => 'draft']);

        $response = $this->getJson('/api/v1/posts?status=published');

        $response->assertStatus(200);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_can_search_posts(): void
    {
        Post::factory()->create(['title' => 'Laravel Testing', 'status' => 'published']);
        Post::factory()->create(['title' => 'React Components', 'status' => 'published']);

        $response = $this->getJson('/api/v1/posts?search=Laravel');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_authenticated_user_can_create_post(): void
    {
        Sanctum::actingAs($this->user);

        $category = Category::factory()->create();
        
        $postData = [
            'title' => 'Test Post',
            'content' => 'This is test content',
            'status' => 'draft',
            'category_id' => $category->id,
        ];

        $response = $this->postJson('/api/v1/posts', $postData);

        $response->assertStatus(201)
            ->assertJsonFragment(['title' => 'Test Post']);

        $this->assertDatabaseHas('posts', ['title' => 'Test Post']);
    }

    public function test_unauthenticated_user_cannot_create_post(): void
    {
        $response = $this->postJson('/api/v1/posts', [
            'title' => 'Test Post',
            'content' => 'Content',
        ]);

        $response->assertStatus(401);
    }

    public function test_can_show_single_post(): void
    {
        $post = Post::factory()->create(['status' => 'published']);

        $response = $this->getJson("/api/v1/posts/{$post->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $post->id]);
    }

    public function test_can_show_post_by_slug(): void
    {
        $post = Post::factory()->create(['status' => 'published']);

        $response = $this->getJson("/api/v1/posts/{$post->slug}");

        $response->assertStatus(200)
            ->assertJsonFragment(['slug' => $post->slug]);
    }

    public function test_author_can_update_own_post(): void
    {
        $post = Post::factory()->create(['user_id' => $this->user->id]);
        
        Sanctum::actingAs($this->user);

        $response = $this->putJson("/api/v1/posts/{$post->id}", [
            'title' => 'Updated Title',
            'content' => $post->content,
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['title' => 'Updated Title']);
    }

    public function test_author_cannot_update_others_post(): void
    {
        $otherUser = User::factory()->create(['role' => 'author']);
        $post = Post::factory()->create(['user_id' => $otherUser->id]);
        
        Sanctum::actingAs($this->user);

        $response = $this->putJson("/api/v1/posts/{$post->id}", [
            'title' => 'Updated Title',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_update_any_post(): void
    {
        $post = Post::factory()->create();
        
        Sanctum::actingAs($this->admin);

        $response = $this->putJson("/api/v1/posts/{$post->id}", [
            'title' => 'Admin Updated',
            'content' => $post->content,
        ]);

        $response->assertStatus(200);
    }

    public function test_author_can_delete_own_post(): void
    {
        $post = Post::factory()->create(['user_id' => $this->user->id]);
        
        Sanctum::actingAs($this->user);

        $response = $this->deleteJson("/api/v1/posts/{$post->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
    }

    public function test_validation_fails_for_invalid_post_data(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/v1/posts', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'content']);
    }

    public function test_can_attach_tags_to_post(): void
    {
        Sanctum::actingAs($this->user);
        
        $tags = Tag::factory()->count(3)->create();
        $category = Category::factory()->create();

        $response = $this->postJson('/api/v1/posts', [
            'title' => 'Tagged Post',
            'content' => 'Content',
            'category_id' => $category->id,
            'tags' => $tags->pluck('id')->toArray(),
        ]);

        $response->assertStatus(201);
        $this->assertCount(3, Post::find($response->json('id'))->tags);
    }
}
