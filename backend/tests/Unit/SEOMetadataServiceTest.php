<?php

namespace Tests\Unit;

use App\Models\Post;
use App\Services\SEOMetadataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SEOMetadataServiceTest extends TestCase
{
    use RefreshDatabase;

    protected SEOMetadataService $service;
    protected Post $post;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new SEOMetadataService();
        $this->post = Post::factory()->create();
    }

    public function test_generate_meta_title(): void
    {
        $title = $this->service->generateMetaTitle($this->post);

        $this->assertNotEmpty($title);
        $this->assertLessThanOrEqual(60, strlen($title));
    }

    public function test_generate_meta_description(): void
    {
        $this->post->update([
            'content' => 'This is a long content that should be used to generate a meta description. It needs to be descriptive enough to provide value.',
        ]);

        $description = $this->service->generateMetaDescription($this->post);

        $this->assertNotEmpty($description);
        $this->assertGreaterThanOrEqual(120, strlen($description));
        $this->assertLessThanOrEqual(160, strlen($description));
    }

    public function test_generate_open_graph_data(): void
    {
        $ogData = $this->service->generateOpenGraphData($this->post);

        $this->assertArrayHasKey('og:title', $ogData);
        $this->assertArrayHasKey('og:description', $ogData);
        $this->assertArrayHasKey('og:type', $ogData);
        $this->assertArrayHasKey('og:url', $ogData);
        $this->assertEquals('article', $ogData['og:type']);
    }

    public function test_generate_twitter_card_data(): void
    {
        $twitterData = $this->service->generateTwitterCardData($this->post);

        $this->assertArrayHasKey('twitter:card', $twitterData);
        $this->assertArrayHasKey('twitter:title', $twitterData);
        $this->assertArrayHasKey('twitter:description', $twitterData);
        $this->assertEquals('summary_large_image', $twitterData['twitter:card']);
    }

    public function test_generate_json_ld_schema(): void
    {
        $schema = $this->service->generateJsonLdSchema($this->post);

        $this->assertArrayHasKey('@context', $schema);
        $this->assertArrayHasKey('@type', $schema);
        $this->assertEquals('https://schema.org', $schema['@context']);
        $this->assertEquals('Article', $schema['@type']);
    }

    public function test_generate_canonical_url(): void
    {
        $this->post->update(['slug' => 'test-post']);

        $canonicalUrl = $this->service->generateCanonicalUrl($this->post);

        $this->assertStringContainsString('test-post', $canonicalUrl);
        $this->assertStringStartsWith('http', $canonicalUrl);
    }

    public function test_calculate_keyword_density(): void
    {
        $this->post->update([
            'title' => 'Laravel Framework Guide',
            'content' => 'Laravel is a great framework. Laravel makes development easy. The Laravel framework is powerful.',
        ]);

        $density = $this->service->calculateKeywordDensity($this->post, 'Laravel');

        $this->assertGreaterThan(0, $density);
        $this->assertLessThanOrEqual(100, $density);
    }

    public function test_analyze_readability_score(): void
    {
        $this->post->update([
            'content' => 'This is a simple sentence. This is another simple sentence.',
        ]);

        $score = $this->service->analyzeReadabilityScore($this->post);

        $this->assertArrayHasKey('score', $score);
        $this->assertArrayHasKey('grade_level', $score);
        $this->assertGreaterThanOrEqual(0, $score['score']);
        $this->assertLessThanOrEqual(100, $score['score']);
    }

    public function test_validate_meta_description_length(): void
    {
        // Too short
        $shortPost = Post::factory()->create([
            'meta_description' => 'Short',
        ]);

        $validation = $this->service->validateMetaDescription($shortPost);

        $this->assertFalse($validation['valid']);
        $this->assertContains('Meta description is too short', $validation['errors']);

        // Perfect length
        $perfectPost = Post::factory()->create([
            'meta_description' => str_repeat('word ', 30), // ~150 chars
        ]);

        $validation = $this->service->validateMetaDescription($perfectPost);

        $this->assertTrue($validation['valid']);
    }

    public function test_validate_title_length(): void
    {
        // Too long
        $longPost = Post::factory()->create([
            'title' => str_repeat('word ', 20), // ~100 chars
        ]);

        $validation = $this->service->validateTitle($longPost);

        $this->assertFalse($validation['valid']);
        $this->assertContains('Title is too long', $validation['errors']);

        // Perfect length
        $perfectPost = Post::factory()->create([
            'title' => 'Perfect SEO Title Length',
        ]);

        $validation = $this->service->validateTitle($perfectPost);

        $this->assertTrue($validation['valid']);
    }
}
