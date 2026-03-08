<?php

namespace Tests\Feature;

use App\Models\Newsletter;
use App\Models\NewsletterSubscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NewsletterApiTest extends TestCase
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

    public function test_admin_can_list_newsletters()
    {
        Newsletter::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/newsletters");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'subject',
                        'status',
                        'recipients',
                        'opened_count',
                        'clicked_count',
                    ]
                ],
                'meta' => ['current_page', 'total']
            ]);
    }

    public function test_editor_cannot_access_newsletters()
    {
        $response = $this->actingAs($this->editor)
            ->getJson("{$this->apiVersion}/newsletters");

        $response->assertStatus(403);
    }

    public function test_admin_can_create_newsletter()
    {
        $newsletterData = [
            'subject' => 'Test Newsletter',
            'preview_text' => 'This is a preview',
            'content' => '<p>Hello World</p>',
            'status' => 'draft',
        ];

        $response = $this->actingAs($this->admin)
            ->postJson("{$this->apiVersion}/newsletters", $newsletterData);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'subject' => 'Test Newsletter',
                    'status' => 'draft',
                ]
            ]);

        $this->assertDatabaseHas('newsletters', [
            'subject' => 'Test Newsletter',
        ]);
    }

    public function test_newsletter_creation_requires_subject()
    {
        $response = $this->actingAs($this->admin)
            ->postJson("{$this->apiVersion}/newsletters", [
                'content' => '<p>Content</p>',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['subject']);
    }

    public function test_admin_can_update_newsletter()
    {
        $newsletter = Newsletter::factory()->create(['status' => 'draft']);

        $response = $this->actingAs($this->admin)
            ->putJson("{$this->apiVersion}/newsletters/{$newsletter->id}", [
                'subject' => 'Updated Subject',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'subject' => 'Updated Subject',
                ]
            ]);
    }

    public function test_cannot_update_sent_newsletter()
    {
        $newsletter = Newsletter::factory()->create(['status' => 'sent']);

        $response = $this->actingAs($this->admin)
            ->putJson("{$this->apiVersion}/newsletters/{$newsletter->id}", [
                'subject' => 'Updated Subject',
            ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_delete_newsletter()
    {
        $newsletter = Newsletter::factory()->create(['status' => 'draft']);

        $response = $this->actingAs($this->admin)
            ->deleteJson("{$this->apiVersion}/newsletters/{$newsletter->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('newsletters', ['id' => $newsletter->id]);
    }

    public function test_public_can_subscribe_to_newsletter()
    {
        $response = $this->postJson("{$this->apiVersion}/newsletter/subscribe", [
            'email' => 'subscriber@example.com',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('newsletter_subscribers', [
            'email' => 'subscriber@example.com',
            'status' => 'pending',
        ]);
    }

    public function test_subscription_requires_valid_email()
    {
        $response = $this->postJson("{$this->apiVersion}/newsletter/subscribe", [
            'email' => 'invalid-email',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_cannot_subscribe_twice_with_same_email()
    {
        NewsletterSubscriber::factory()->create([
            'email' => 'existing@example.com',
            'status' => 'active',
        ]);

        $response = $this->postJson("{$this->apiVersion}/newsletter/subscribe", [
            'email' => 'existing@example.com',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_confirm_subscription()
    {
        $subscriber = NewsletterSubscriber::factory()->create([
            'status' => 'pending',
            'confirmation_token' => 'test-token-123',
        ]);

        $response = $this->getJson("{$this->apiVersion}/newsletter/confirm/test-token-123");

        $response->assertStatus(200);

        $subscriber->refresh();
        $this->assertEquals('active', $subscriber->status);
        $this->assertNotNull($subscriber->confirmed_at);
    }

    public function test_can_unsubscribe()
    {
        $subscriber = NewsletterSubscriber::factory()->create([
            'status' => 'active',
            'unsubscribe_token' => 'unsubscribe-token-123',
        ]);

        $response = $this->getJson("{$this->apiVersion}/newsletter/unsubscribe/unsubscribe-token-123");

        $response->assertStatus(200);

        $subscriber->refresh();
        $this->assertEquals('unsubscribed', $subscriber->status);
    }

    public function test_admin_can_list_subscribers()
    {
        NewsletterSubscriber::factory()->count(5)->create();

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/newsletter/subscribers");

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    }

    public function test_admin_can_get_newsletter_stats()
    {
        Newsletter::factory()->count(3)->create(['status' => 'sent']);
        NewsletterSubscriber::factory()->count(10)->create(['status' => 'active']);

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/newsletters/stats");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_newsletters',
                'sent_newsletters',
                'total_subscribers',
                'active_subscribers',
            ]);
    }

    public function test_admin_can_export_subscribers()
    {
        NewsletterSubscriber::factory()->count(3)->create(['status' => 'active']);

        $response = $this->actingAs($this->admin)
            ->getJson("{$this->apiVersion}/newsletter/subscribers/export");

        $response->assertStatus(200)
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }
}
