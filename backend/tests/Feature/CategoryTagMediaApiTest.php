<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Category;
use App\Models\Tag;
use App\Models\Media;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoryApiTest extends TestCase
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
        Category::factory()->count(5)->create();

        $response = $this->getJson('/api/v1/categories');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    }

    public function test_can_create_category(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/categories', [
            'name' => 'Technology',
            'slug' => 'technology',
            'description' => 'Tech articles',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Technology']);

        $this->assertDatabaseHas('categories', ['slug' => 'technology']);
    }

    public function test_can_create_nested_category(): void
    {
        Sanctum::actingAs($this->admin);

        $parent = Category::factory()->create();

        $response = $this->postJson('/api/v1/categories', [
            'name' => 'Child Category',
            'slug' => 'child-category',
            'parent_id' => $parent->id,
        ]);

        $response->assertStatus(201);
        $this->assertEquals($parent->id, Category::find($response->json('id'))->parent_id);
    }

    public function test_can_update_category(): void
    {
        Sanctum::actingAs($this->admin);

        $category = Category::factory()->create();

        $response = $this->putJson("/api/v1/categories/{$category->id}", [
            'name' => 'Updated Name',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Updated Name']);
    }

    public function test_can_delete_category(): void
    {
        Sanctum::actingAs($this->admin);

        $category = Category::factory()->create();

        $response = $this->deleteJson("/api/v1/categories/{$category->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_slug_is_auto_generated(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/categories', [
            'name' => 'Test Category Name',
        ]);

        $response->assertStatus(201);
        $this->assertEquals('test-category-name', $response->json('slug'));
    }
}

class TagApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_can_list_tags(): void
    {
        Tag::factory()->count(5)->create();

        $response = $this->getJson('/api/v1/tags');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    }

    public function test_can_create_tag(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/tags', [
            'name' => 'Laravel',
            'slug' => 'laravel',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Laravel']);
    }

    public function test_can_update_tag(): void
    {
        Sanctum::actingAs($this->admin);

        $tag = Tag::factory()->create();

        $response = $this->putJson("/api/v1/tags/{$tag->id}", [
            'name' => 'Updated Tag',
        ]);

        $response->assertStatus(200);
    }

    public function test_can_delete_tag(): void
    {
        Sanctum::actingAs($this->admin);

        $tag = Tag::factory()->create();

        $response = $this->deleteJson("/api/v1/tags/{$tag->id}");

        $response->assertStatus(204);
    }
}

class MediaApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'author']);
        Storage::fake('public');
    }

    public function test_can_upload_image(): void
    {
        Sanctum::actingAs($this->user);

        $file = UploadedFile::fake()->image('test.jpg', 800, 600);

        $response = $this->postJson('/api/v1/media', [
            'file' => $file,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'filename', 'mime_type']);

        Storage::disk('public')->assertExists('media/' . date('Y/m') . '/' . $response->json('filename'));
    }

    public function test_can_list_media(): void
    {
        Sanctum::actingAs($this->user);

        Media::factory()->count(5)->create();

        $response = $this->getJson('/api/v1/media');

        $response->assertStatus(200);
    }

    public function test_can_delete_media(): void
    {
        Sanctum::actingAs($this->user);

        $media = Media::factory()->create();

        $response = $this->deleteJson("/api/v1/media/{$media->id}");

        $response->assertStatus(204);
    }

    public function test_rejects_invalid_file_type(): void
    {
        Sanctum::actingAs($this->user);

        $file = UploadedFile::fake()->create('test.exe', 1000);

        $response = $this->postJson('/api/v1/media', [
            'file' => $file,
        ]);

        $response->assertStatus(422);
    }
}
