<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Post;
use App\Models\Category;
use App\Models\Tag;
use App\Models\Media;
use App\Models\Comment;
use App\Models\Newsletter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;

class ApiCoverageTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutExceptionHandling();
    }

    protected function createUserWithRole(string $role = 'author'): User
    {
        return User::factory()->create(['role' => $role]);
    }

    protected function actingAsUser(string $role = 'author'): User
    {
        $user = $this->createUserWithRole($role);
        Sanctum::actingAs($user);
        return $user;
    }

    public function test_health_endpoint(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'timestamp',
                'version',
            ]);
    }

    public function test_unauthenticated_access(): void
    {
        $response = $this->getJson('/api/v1/posts');
        $response->assertStatus(401);
    }

    public function test_login_success(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'user',
                'token',
            ]);
    }

    public function test_login_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }

    public function test_logout(): void
    {
        $this->actingAsUser('author');

        $response = $this->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Logged out successfully']);
    }

    public function test_get_current_user(): void
    {
        $user = $this->actingAsUser('author');

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'id' => $user->id,
                'email' => $user->email,
            ]);
    }

    public function test_posts_index(): void
    {
        $this->actingAsUser('author');
        Post::factory()->count(5)->create();

        $response = $this->getJson('/api/v1/posts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'meta' => [
                    'current_page',
                    'total',
                    'per_page',
                ],
            ]);
    }

    public function test_posts_create(): void
    {
        $user = $this->actingAsUser('author');
        $category = Category::factory()->create();

        $response = $this->postJson('/api/v1/posts', [
            'title' => 'Test Post',
            'content' => 'Test content',
            'excerpt' => 'Test excerpt',
            'status' => 'draft',
            'category_ids' => [$category->id],
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Post created successfully',
            ]);

        $this->assertDatabaseHas('posts', [
            'title' => 'Test Post',
            'user_id' => $user->id,
        ]);
    }

    public function test_posts_update(): void
    {
        $user = $this->actingAsUser('author');
        $post = Post::factory()->create(['user_id' => $user->id]);

        $response = $this->putJson("/api/v1/posts/{$post->id}", [
            'title' => 'Updated Title',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Post updated successfully',
            ]);

        $this->assertDatabaseHas('posts', [
            'id' => $post->id,
            'title' => 'Updated Title',
        ]);
    }

    public function test_posts_delete(): void
    {
        $user = $this->actingAsUser('admin');
        $post = Post::factory()->create();

        $response = $this->deleteJson("/api/v1/posts/{$post->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
    }

    public function test_categories_crud(): void
    {
        $this->actingAsUser('admin');

        $create = $this->postJson('/api/v1/categories', [
            'name' => 'Test Category',
            'slug' => 'test-category',
        ]);
        $create->assertStatus(201);

        $categoryId = $create->json('data.id');

        $update = $this->putJson("/api/v1/categories/{$categoryId}", [
            'name' => 'Updated Category',
        ]);
        $update->assertStatus(200);

        $delete = $this->deleteJson("/api/v1/categories/{$categoryId}");
        $delete->assertStatus(200);
    }

    public function test_tags_crud(): void
    {
        $this->actingAsUser('admin');

        $create = $this->postJson('/api/v1/tags', [
            'name' => 'Test Tag',
            'slug' => 'test-tag',
        ]);
        $create->assertStatus(201);

        $tagId = $create->json('data.id');

        $update = $this->putJson("/api/v1/tags/{$tagId}", [
            'name' => 'Updated Tag',
        ]);
        $update->assertStatus(200);

        $delete = $this->deleteJson("/api/v1/tags/{$tagId}");
        $delete->assertStatus(200);
    }

    public function test_comments_crud(): void
    {
        $this->actingAsUser('author');
        $post = Post::factory()->create();

        $create = $this->postJson('/api/v1/comments', [
            'post_id' => $post->id,
            'content' => 'Test comment',
        ]);
        $create->assertStatus(201);

        $commentId = $create->json('data.id');

        $update = $this->putJson("/api/v1/comments/{$commentId}", [
            'content' => 'Updated comment',
        ]);
        $update->assertStatus(200);

        $delete = $this->deleteJson("/api/v1/comments/{$commentId}");
        $delete->assertStatus(200);
    }

    public function test_users_index_requires_admin(): void
    {
        $this->actingAsUser('author');

        $response = $this->getJson('/api/v1/users');

        $response->assertStatus(403);
    }

    public function test_users_index_as_admin(): void
    {
        $this->actingAsUser('admin');
        User::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'meta',
            ]);
    }

    public function test_newsletter_subscription(): void
    {
        $response = $this->postJson('/api/v1/newsletters', [
            'email' => 'subscriber@example.com',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('newsletters', [
            'email' => 'subscriber@example.com',
        ]);
    }

    public function test_newsletter_unsubscribe(): void
    {
        $newsletter = Newsletter::factory()->create([
            'email' => 'unsubscribe@example.com',
        ]);

        $response = $this->postJson('/api/v1/newsletters/unsubscribe', [
            'email' => 'unsubscribe@example.com',
        ]);

        $response->assertStatus(200);
    }

    public function test_media_upload_requires_auth(): void
    {
        $response = $this->postJson('/api/v1/media', []);

        $response->assertStatus(401);
    }

    public function test_settings_index_requires_admin(): void
    {
        $this->actingAsUser('author');

        $response = $this->getJson('/api/v1/settings');

        $response->assertStatus(403);
    }

    public function test_settings_index_as_admin(): void
    {
        $this->actingAsUser('admin');

        $response = $this->getJson('/api/v1/settings');

        $response->assertStatus(200);
    }

    public function test_activity_logs_requires_admin(): void
    {
        $this->actingAsUser('author');

        $response = $this->getJson('/api/v1/activity-logs');

        $response->assertStatus(403);
    }

    public function test_activity_logs_as_admin(): void
    {
        $this->actingAsUser('admin');

        $response = $this->getJson('/api/v1/activity-logs');

        $response->assertStatus(200);
    }

    public function test_backups_index_requires_admin(): void
    {
        $this->actingAsUser('author');

        $response = $this->getJson('/api/v1/backups');

        $response->assertStatus(403);
    }

    public function test_dashboard_stats(): void
    {
        $this->actingAsUser('admin');

        $response = $this->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'posts',
                'users',
                'comments',
            ]);
    }

    public function test_search_endpoint(): void
    {
        $this->actingAsUser('author');
        Post::factory()->create(['title' => 'Laravel Tutorial']);
        Post::factory()->create(['title' => 'React Guide']);

        $response = $this->getJson('/api/v1/search?q=Laravel');

        $response->assertStatus(200);
    }

    public function test_rate_limiting(): void
    {
        $user = $this->actingAsUser('author');

        for ($i = 0; $i < 70; $i++) {
            $this->getJson('/api/v1/posts');
        }

        $response = $this->getJson('/api/v1/posts');
        $response->assertStatus(429);
    }

    public function test_two_factor_setup(): void
    {
        $user = $this->actingAsUser('author');

        $response = $this->postJson('/api/v1/auth/2fa/enable');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'secret',
                'qr_code',
            ]);
    }

    public function test_password_update(): void
    {
        $user = $this->actingAsUser('author');

        $response = $this->putJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(200);
    }

    public function test_profile_update(): void
    {
        $user = $this->actingAsUser('author');

        $response = $this->putJson('/api/v1/auth/profile', [
            'name' => 'Updated Name',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
        ]);
    }
}
