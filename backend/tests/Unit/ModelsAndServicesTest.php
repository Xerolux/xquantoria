<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\Post;
use App\Services\AI\AIService;
use App\Services\SEO\SEOService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_has_default_role(): void
    {
        $user = User::factory()->create();

        $this->assertEquals('subscriber', $user->role);
    }

    public function test_user_can_check_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $subscriber = User::factory()->create(['role' => 'subscriber']);

        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($subscriber->isAdmin());
    }

    public function test_user_has_posts_relationship(): void
    {
        $user = User::factory()->create();
        Post::factory()->count(3)->create(['user_id' => $user->id]);

        $this->assertCount(3, $user->posts);
    }
}

class PostTest extends TestCase
{
    use RefreshDatabase;

    public function test_post_generates_slug_from_title(): void
    {
        $post = Post::factory()->create(['title' => 'Test Post Title']);

        $this->assertEquals('test-post-title', $post->slug);
    }

    public function test_post_has_excerpt(): void
    {
        $post = Post::factory()->create([
            'content' => str_repeat('This is test content. ', 50),
        ]);

        $this->assertNotEmpty($post->excerpt);
        $this->assertLessThanOrEqual(160, strlen($post->excerpt));
    }

    public function test_post_is_published(): void
    {
        $publishedPost = Post::factory()->create([
            'status' => 'published',
            'published_at' => now()->subDay(),
        ]);

        $draftPost = Post::factory()->create(['status' => 'draft']);

        $this->assertTrue($publishedPost->isPublished());
        $this->assertFalse($draftPost->isPublished());
    }

    public function test_post_reading_time(): void
    {
        $post = Post::factory()->create([
            'content' => str_repeat('word ', 600),
        ]);

        $this->assertEquals(3, $post->reading_time);
    }
}

class SEOServiceTest extends TestCase
{
    protected SEOService $seoService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seoService = app(SEOService::class);
    }

    public function test_generates_meta_title(): void
    {
        $post = Post::factory()->create(['title' => 'Test Post']);

        $metaTitle = $this->seoService->generateMetaTitle($post);

        $this->assertStringContainsString('Test Post', $metaTitle);
    }

    public function test_generates_meta_description(): void
    {
        $post = Post::factory()->create([
            'content' => 'This is a test content for meta description generation.',
        ]);

        $description = $this->seoService->generateMetaDescription($post);

        $this->assertNotEmpty($description);
        $this->assertLessThanOrEqual(160, strlen($description));
    }

    public function test_generates_open_graph_tags(): void
    {
        $post = Post::factory()->create(['status' => 'published']);

        $ogTags = $this->seoService->generateOpenGraphTags($post);

        $this->assertArrayHasKey('og:title', $ogTags);
        $this->assertArrayHasKey('og:description', $ogTags);
        $this->assertArrayHasKey('og:type', $ogTags);
    }
}

class HelperFunctionsTest extends TestCase
{
    public function test_format_currency(): void
    {
        $this->assertEquals('€10.00', format_currency(10, 'EUR'));
        $this->assertEquals('$10.00', format_currency(10, 'USD'));
    }

    public function test_slugify(): void
    {
        $this->assertEquals('test-title', slugify('Test Title'));
        $this->assertEquals('test-title-123', slugify('Test Title 123!'));
    }

    public function test_truncate(): void
    {
        $text = 'This is a long text that needs to be truncated.';

        $this->assertEquals('This is a long...', truncate($text, 15));
    }
}
