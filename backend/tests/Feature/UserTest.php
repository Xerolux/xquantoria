<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_can_list_users(): void
    {
        User::factory()->count(3)->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/users');

        $response->assertStatus(200)
            ->assertJsonCount(4, 'data.data'); // 3 + 1 admin
    }

    public function test_can_create_user(): void
    {
        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $userData = [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'author',
        ];

        $response = $this->withToken($token)->postJson('/api/v1/users', $userData);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'name' => 'John Doe',
                    'email' => 'john@example.com',
                    'role' => 'author',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'role' => 'author',
        ]);
    }

    public function test_can_update_user(): void
    {
        $user = User::factory()->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->putJson("/api/v1/users/{$user->id}", [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'name' => 'Updated Name',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
        ]);
    }

    public function test_can_delete_user(): void
    {
        $user = User::factory()->create();

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->deleteJson("/api/v1/users/{$user->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('users', [
            'id' => $user->id,
        ]);
    }

    public function test_non_admin_cannot_create_user(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $token = $author->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(403);
    }

    public function test_can_filter_users_by_role(): void
    {
        User::factory()->create(['role' => 'author']);
        User::factory()->create(['role' => 'editor']);
        User::factory()->create(['role' => 'author']);

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/users?role=author');

        $response->assertStatus(200);

        $authors = $response->json('data.data');
        $this->assertCount(2, $authors);
        foreach ($authors as $author) {
            $this->assertEquals('author', $author['role']);
        }
    }

    public function test_can_deactivate_user(): void
    {
        $user = User::factory()->create(['is_active' => true]);

        $token = $this->admin->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)->putJson("/api/v1/users/{$user->id}", [
            'is_active' => false,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'is_active' => false,
        ]);
    }

    public function test_deactivated_user_cannot_login(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(401);
    }
}
