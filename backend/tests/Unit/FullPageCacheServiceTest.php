<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\FullPageCacheService;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

class FullPageCacheServiceTest extends TestCase
{
    use RefreshDatabase;

    private FullPageCacheService $cacheService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cacheService = app(FullPageCacheService::class);
    }

    public function test_cache_key_generation(): void
    {
        $key = $this->cacheService->generateKey('posts', 1, 'de');
        
        $this->assertEquals('page:posts:1:de', $key);
    }

    public function test_cache_post(): void
    {
        $post = Post::factory()->create(['status' => 'published']);
        
        $html = '<html><body>Test Content</body></html>';
        $this->cacheService->cachePost($post->id, $html, 'de');
        
        $cached = $this->cacheService->getPost($post->id, 'de');
        
        $this->assertEquals($html, $cached);
    }

    public function test_cache_homepage(): void
    {
        $html = '<html><body>Homepage</body></html>';
        $this->cacheService->cacheHomepage($html, 'de');
        
        $cached = $this->cacheService->getHomepage('de');
        
        $this->assertEquals($html, $cached);
    }

    public function test_invalidate_post_cache(): void
    {
        $post = Post::factory()->create(['status' => 'published']);
        
        $html = '<html><body>Test</body></html>';
        $this->cacheService->cachePost($post->id, $html, 'de');
        
        $this->cacheService->invalidatePost($post->id);
        
        $cached = $this->cacheService->getPost($post->id, 'de');
        
        $this->assertNull($cached);
    }

    public function test_cache_statistics(): void
    {
        $post = Post::factory()->create(['status' => 'published']);
        
        $this->cacheService->cachePost($post->id, 'test', 'de');
        $this->cacheService->cacheHomepage('homepage', 'de');
        
        $stats = $this->cacheService->getStatistics();
        
        $this->assertArrayHasKey('total_keys', $stats);
        $this->assertArrayHasKey('memory_usage', $stats);
    }

    public function test_clear_all_cache(): void
    {
        $post = Post::factory()->create(['status' => 'published']);
        
        $this->cacheService->cachePost($post->id, 'test', 'de');
        $this->cacheService->cacheHomepage('homepage', 'de');
        
        $this->cacheService->clearAll();
        
        $this->assertNull($this->cacheService->getPost($post->id, 'de'));
        $this->assertNull($this->cacheService->getHomepage('de'));
    }
}
