<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\PaymentTransaction;
use App\Models\ShopOrder;
use App\Models\ShopProduct;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['token', 'user']);

        $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
    }

    public function test_registration_requires_valid_email(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Test User',
            'email' => 'invalid-email',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_user_can_login(): void
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
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_login_fails_with_wrong_credentials(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_get_profile(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonFragment(['email' => $user->email]);
    }

    public function test_user_can_logout(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/auth/logout');

        $response->assertStatus(200);
    }
}

class ShopApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_can_list_products(): void
    {
        ShopProduct::factory()->count(5)->create(['status' => 'active']);

        $response = $this->getJson('/api/v1/shop/products');

        $response->assertStatus(200);
    }

    public function test_can_add_to_cart(): void
    {
        Sanctum::actingAs($this->user);
        
        $product = ShopProduct::factory()->create(['status' => 'active', 'stock_quantity' => 10]);

        $response = $this->postJson('/api/v1/shop/cart/add', [
            'product_id' => $product->id,
            'quantity' => 2,
        ]);

        $response->assertStatus(200);
    }

    public function test_can_get_cart(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/v1/shop/cart');

        $response->assertStatus(200);
    }

    public function test_can_create_order(): void
    {
        Sanctum::actingAs($this->user);
        
        $product = ShopProduct::factory()->create(['status' => 'active', 'stock_quantity' => 10, 'price' => 29.99]);
        
        $this->postJson('/api/v1/shop/cart/add', [
            'product_id' => $product->id,
            'quantity' => 1,
        ]);

        $response = $this->postJson('/api/v1/shop/checkout', [
            'billing_name' => 'Test User',
            'billing_email' => 'test@example.com',
            'billing_address' => 'Test Street 1',
            'billing_city' => 'Test City',
            'billing_postal_code' => '12345',
            'billing_country' => 'DE',
        ]);

        $response->assertStatus(201);
    }
}

class PaymentApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_can_get_payment_config(): void
    {
        $response = $this->getJson('/api/v1/payments/config');

        $response->assertStatus(200)
            ->assertJsonStructure(['stripe', 'paypal', 'currency']);
    }

    public function test_can_list_transactions(): void
    {
        Sanctum::actingAs($this->admin);
        
        $order = ShopOrder::factory()->create();
        PaymentTransaction::factory()->count(3)->create(['order_id' => $order->id]);

        $response = $this->getJson('/api/v1/payments/transactions');

        $response->assertStatus(200);
    }

    public function test_can_get_payment_stats(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/payments/stats');

        $response->assertStatus(200)
            ->assertJsonStructure(['total_revenue', 'total_fees', 'total_refunds', 'net_revenue']);
    }
}

class UserApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_admin_can_list_users(): void
    {
        Sanctum::actingAs($this->admin);
        
        User::factory()->count(5)->create();

        $response = $this->getJson('/api/v1/users');

        $response->assertStatus(200);
    }

    public function test_admin_can_create_user(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'subscriber',
        ]);

        $response->assertStatus(201);
    }

    public function test_admin_can_update_user(): void
    {
        Sanctum::actingAs($this->admin);
        
        $user = User::factory()->create();

        $response = $this->putJson("/api/v1/users/{$user->id}", [
            'name' => 'Updated Name',
        ]);

        $response->assertStatus(200);
    }

    public function test_admin_can_delete_user(): void
    {
        Sanctum::actingAs($this->admin);
        
        $user = User::factory()->create();

        $response = $this->deleteJson("/api/v1/users/{$user->id}");

        $response->assertStatus(204);
    }

    public function test_non_admin_cannot_list_users(): void
    {
        $user = User::factory()->create(['role' => 'subscriber']);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/users');

        $response->assertStatus(403);
    }
}
