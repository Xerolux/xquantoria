<?php

namespace Tests\Feature;

use App\Models\Backup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BackupApiTest extends TestCase
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
        Storage::fake('local');
    }

    public function test_admin_can_list_backups()
    {
        Backup::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/backups");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'type',
                        'status',
                        'size',
                    ]
                ]
            ]);
    }

    public function test_editor_cannot_access_backups()
    {
        $response = $this->actingAs($this->editor)
            ->getJson("{$this->apiVersion}/backups");

        $response->assertStatus(403);
    }

    public function test_admin_can_create_backup()
    {
        $response = $this->actingAs($this->admin)
            ->postJson("{$this->apiVersion}/backups", [
                'name' => 'Test Backup',
                'type' => 'database',
                'description' => 'Test description',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'name' => 'Test Backup',
                    'type' => 'database',
                    'status' => 'pending',
                ]
            ]);

        $this->assertDatabaseHas('backups', [
            'name' => 'Test Backup',
            'type' => 'database',
        ]);
    }

    public function test_backup_creation_requires_type()
    {
        $response = $this->actingAs($this->admin)
            ->postJson("{$this->apiVersion}/backups", [
                'name' => 'Test Backup',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    public function test_backup_type_must_be_valid()
    {
        $response = $this->actingAs($this->admin)
            ->postJson("{$this->apiVersion}/backups", [
                'name' => 'Test Backup',
                'type' => 'invalid_type',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    public function test_admin_can_view_backup()
    {
        $backup = Backup::factory()->create();

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/backups/{$backup->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $backup->id,
                    'name' => $backup->name,
                ]
            ]);
    }

    public function test_admin_can_delete_backup()
    {
        $backup = Backup::factory()->create();

        $response = $this->actingAs($this->admin)
            ->deleteJson("{$this->apiVersion}/backups/{$backup->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('backups', ['id' => $backup->id]);
    }

    public function test_cannot_delete_backup_in_creating_status()
    {
        $backup = Backup::factory()->create(['status' => 'creating']);

        $response = $this->actingAs($this->admin)
            ->deleteJson("{$this->apiVersion}/backups/{$backup->id}");

        $response->assertStatus(403);
    }

    public function test_admin_can_get_backup_stats()
    {
        Backup::factory()->count(3)->create(['status' => 'completed']);
        Backup::factory()->create(['status' => 'failed']);

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/backups/stats");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_backups',
                'completed_backups',
                'failed_backups',
                'total_size',
            ]);
    }

    public function test_admin_can_download_backup()
    {
        $backup = Backup::factory()->create([
            'status' => 'completed',
            'file_path' => 'backups/test-backup.zip',
        ]);

        Storage::disk('local')->put('backups/test-backup.zip', 'test content');

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/backups/{$backup->id}/download");

        $response->assertStatus(200);
    }

    public function test_cannot_download_pending_backup()
    {
        $backup = Backup::factory()->create(['status' => 'pending']);

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/backups/{$backup->id}/download");

        $response->assertStatus(403);
    }

    public function test_admin_can_restore_backup()
    {
        $backup = Backup::factory()->create([
            'status' => 'completed',
            'file_path' => 'backups/test-backup.zip',
        ]);

        Storage::disk('local')->put('backups/test-backup.zip', 'test content');

        $response = $this->actingAs($this->admin)
            ->postJson("{$this->apiVersion}/backups/{$backup->id}/restore", [
                'restore_database' => true,
                'restore_files' => false,
                'confirm' => true,
            ]);

        $response->assertStatus(200);
    }

    public function test_restore_requires_confirmation()
    {
        $backup = Backup::factory()->create(['status' => 'completed']);

        $response = $this->actingAs($this->admin)
            ->postJson("{$this->apiVersion}/backups/{$backup->id}/restore", [
                'restore_database' => true,
                'restore_files' => true,
                'confirm' => false,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['confirm']);
    }
}
