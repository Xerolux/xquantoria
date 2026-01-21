<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_can_list_categories(): void
    {
        Category::factory()->count(3)->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/categories');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_can_create_category(): void
    {
        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $categoryData = [
            'name' => 'Technology',
            'slug' => 'technology',
            'description' => 'Tech related posts',
        ];

        $response = $this->withToken($token)->postJson('/api/v1/categories', $categoryData);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'name' => 'Technology',
                    'slug' => 'technology',
                ],
            ]);

        $this->assertDatabaseHas('categories', [
            'name' => 'Technology',
            'slug' => 'technology',
        ]);
    }

    public function test_can_update_category(): void
    {
        $category = Category::factory()->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->putJson("/api/v1/categories/{$category->id}", [
            'name' => 'Updated Category',
            'slug' => 'updated-category',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'name' => 'Updated Category',
                ],
            ]);

        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'name' => 'Updated Category',
        ]);
    }

    public function test_can_delete_category(): void
    {
        $category = Category::factory()->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->deleteJson("/api/v1/categories/{$category->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('categories', [
            'id' => $category->id,
        ]);
    }

    public function test_category_must_have_unique_slug(): void
    {
        Category::factory()->create(['slug' => 'technology']);

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/v1/categories', [
            'name' => 'Technology',
            'slug' => 'technology',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['slug']);
    }

    public function test_can_get_category_with_posts(): void
    {
        $category = Category::factory()->create();
        $post = \App\Models\Post::factory()->create();
        $category->posts()->attach($post);

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->getJson("/api/v1/categories/{$category->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'slug',
                    'posts',
                ],
            ]);
    }

    public function test_unauthorized_user_cannot_create_category(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $token = $author->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/v1/categories', [
            'name' => 'Test Category',
            'slug' => 'test-category',
        ]);

        $response->assertStatus(403);
    }
}
