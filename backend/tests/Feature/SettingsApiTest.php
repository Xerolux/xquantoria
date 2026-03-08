<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsApiTest extends TestCase
{
    use RefreshDatabase;

    protected string $apiVersion = 'api/v1';
    protected User $admin;
    protected User $editor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
        $this->editor = User::factory()->create(['role' => 'editor']);
    }

    public function test_admin_can_list_settings()
    {
        Setting::factory()->count(5)->create();

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/settings");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'general',
                    'seo',
                    'media',
                    'email',
                    'security',
                    'performance',
                ]
            ]);
    }

    public function test_editor_cannot_access_settings()
    {
        $response = $this->actingAs($this->editor)
            ->getJson("{$this->apiVersion}/settings");

        $response->assertStatus(403);
    }

    public function test_admin_can_get_single_setting()
    {
        Setting::create([
            'key' => 'site_name',
            'value' => 'Test CMS',
            'group' => 'general',
            'type' => 'text',
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/settings/site_name");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'key' => 'site_name',
                    'value' => 'Test CMS',
                ]
            ]);
    }

    public function test_admin_can_update_setting()
    {
        Setting::create([
            'key' => 'site_name',
            'value' => 'Old Name',
            'group' => 'general',
            'type' => 'text',
        ]);

        $response = $this->actingAs($this->admin)
            ->putJson("{$this->apiVersion}/settings/site_name", [
                'value' => 'New Site Name',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'value' => 'New Site Name',
                ]
            ]);

        $this->assertDatabaseHas('settings', [
            'key' => 'site_name',
            'value' => 'New Site Name',
        ]);
    }

    public function test_admin_can_bulk_update_settings()
    {
        Setting::create(['key' => 'site_name', 'value' => 'Old', 'group' => 'general', 'type' => 'text']);
        Setting::create(['key' => 'posts_per_page', 'value' => '10', 'group' => 'general', 'type' => 'number']);

        $response = $this->actingAs($this->admin)
            ->postJson("{$this->apiVersion}/settings/bulk", [
                'settings' => [
                    ['key' => 'site_name', 'value' => 'New Name'],
                    ['key' => 'posts_per_page', 'value' => '20'],
                ]
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('settings', ['key' => 'site_name', 'value' => 'New Name']);
        $this->assertDatabaseHas('settings', ['key' => 'posts_per_page', 'value' => '20']);
    }

    public function test_admin_can_reset_setting_to_default()
    {
        Setting::create([
            'key' => 'site_name',
            'value' => 'Custom Value',
            'default_value' => 'Default CMS',
            'group' => 'general',
            'type' => 'text',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("{$this->apiVersion}/settings/site_name/reset");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'value' => 'Default CMS',
                ]
            ]);
    }

    public function test_public_can_get_public_settings()
    {
        Setting::create([
            'key' => 'site_name',
            'value' => 'Public CMS',
            'group' => 'general',
            'type' => 'text',
            'is_public' => true,
        ]);

        Setting::create([
            'key' => 'secret_key',
            'value' => 'secret',
            'group' => 'security',
            'type' => 'text',
            'is_public' => false,
        ]);

        $response = $this->getJson("{$this->apiVersion}/settings/public");

        $response->assertStatus(200)
            ->assertJsonFragment(['site_name' => 'Public CMS'])
            ->assertJsonMissing(['secret_key' => 'secret']);
    }

    public function test_boolean_setting_is_cast_correctly()
    {
        Setting::create([
            'key' => 'enable_cache',
            'value' => '1',
            'group' => 'performance',
            'type' => 'boolean',
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/settings/enable_cache");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'value' => true,
                ]
            ]);
    }

    public function test_json_setting_is_cast_correctly()
    {
        Setting::create([
            'key' => 'social_links',
            'value' => json_encode(['twitter' => 'https://twitter.com']),
            'group' => 'general',
            'type' => 'json',
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/settings/social_links");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'value' => ['twitter' => 'https://twitter.com'],
                ]
            ]);
    }
}
