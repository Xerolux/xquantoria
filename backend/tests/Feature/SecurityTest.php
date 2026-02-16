<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_sql_injection_protection(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $maliciousInput = "1'; DROP TABLE users; --";

        $response = $this->getJson("/api/v1/posts?search={$maliciousInput}");

        $response->assertStatus(200);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_xss_protection_in_posts(): void
    {
        $user = User::factory()->create(['role' => 'author']);
        Sanctum::actingAs($user);

        $xssPayload = '<script>alert("xss")</script>';

        $response = $this->postJson('/api/v1/posts', [
            'title' => $xssPayload,
            'content' => 'Test content',
            'status' => 'draft',
        ]);

        $response->assertStatus(201);
        
        $post = Post::first();
        $this->assertStringNotContainsString('<script>', $post->title);
    }

    public function test_csrf_protection(): void
    {
        $response = $this->post('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(401);
    }

    public function test_rate_limiting_on_login(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'test@example.com',
                'password' => 'wrongpassword',
            ]);
        }

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(429);
    }

    public function test_account_lockout_after_failed_attempts(): void
    {
        $user = User::factory()->create([
            'email' => 'lockout@example.com',
            'password' => bcrypt('password'),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'lockout@example.com',
                'password' => 'wrongpassword',
            ]);
        }

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'lockout@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(403);
    }

    public function test_unauthorized_access_returns_401(): void
    {
        $response = $this->getJson('/api/v1/posts');

        $response->assertStatus(401);
    }

    public function test_forbidden_access_returns_403(): void
    {
        $user = User::factory()->create(['role' => 'subscriber']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/posts', [
            'title' => 'Test',
            'content' => 'Test',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_only_endpoints(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        Sanctum::actingAs($author);

        $endpoints = [
            ['GET', '/api/v1/users'],
            ['GET', '/api/v1/settings'],
            ['GET', '/api/v1/backups'],
            ['GET', '/api/v1/activity-logs'],
            ['GET', '/api/v1/system/health'],
        ];

        foreach ($endpoints as [$method, $url]) {
            $response = $this->json($method, $url);
            $response->assertStatus(403, "Failed for {$method} {$url}");
        }
    }

    public function test_password_validation(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

        $response->assertStatus(422);
    }

    public function test_email_validation(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Test User',
            'email' => 'invalid-email',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    public function test_file_upload_validation(): void
    {
        $user = User::factory()->create(['role' => 'author']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/media', [
            'file' => 'not-a-file',
        ]);

        $response->assertStatus(422);
    }

    public function test_security_headers(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('X-XSS-Protection', '1; mode=block');
    }

    public function test_cors_headers(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertHeader('Access-Control-Allow-Origin', '*');
    }

    public function test_token_expiration(): void
    {
        $user = User::factory()->create(['role' => 'author']);
        $token = $user->createToken('test', ['*'], now()->addMinutes(-1));

        $response = $this->withHeader('Authorization', "Bearer {$token->plainTextToken}")
            ->getJson('/api/v1/posts');

        $response->assertStatus(401);
    }
}
