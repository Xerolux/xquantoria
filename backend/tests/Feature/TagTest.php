<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TagTest extends TestCase
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
        Tag::factory()->count(3)->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/tags');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_can_create_tag(): void
    {
        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $tagData = [
            'name' => 'Laravel',
            'slug' => 'laravel',
        ];

        $response = $this->withToken($token)->postJson('/api/v1/tags', $tagData);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'name' => 'Laravel',
                    'slug' => 'laravel',
                ],
            ]);

        $this->assertDatabaseHas('tags', [
            'name' => 'Laravel',
            'slug' => 'laravel',
        ]);
    }

    public function test_can_update_tag(): void
    {
        $tag = Tag::factory()->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->putJson("/api/v1/tags/{$tag->id}", [
            'name' => 'Updated Tag',
            'slug' => 'updated-tag',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'name' => 'Updated Tag',
                ],
            ]);

        $this->assertDatabaseHas('tags', [
            'id' => $tag->id,
            'name' => 'Updated Tag',
        ]);
    }

    public function test_can_delete_tag(): void
    {
        $tag = Tag::factory()->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->deleteJson("/api/v1/tags/{$tag->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('tags', [
            'id' => $tag->id,
        ]);
    }

    public function test_tag_must_have_unique_slug(): void
    {
        Tag::factory()->create(['slug' => 'laravel']);

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/v1/tags', [
            'name' => 'Laravel',
            'slug' => 'laravel',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['slug']);
    }

    public function test_can_search_tags(): void
    {
        Tag::factory()->create(['name' => 'Laravel']);
        Tag::factory()->create(['name' => 'React']);
        Tag::factory()->create(['name' => 'Vue']);

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/tags?search=Laravel');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->assertEquals('Laravel', $response->json('data.0.name'));
    }
}
