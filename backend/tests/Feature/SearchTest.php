<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use App\Models\Category;
use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    public function test_can_search_posts_by_keyword(): void
    {
        Post::factory()->create(['title' => 'How to learn Laravel']);
        Post::factory()->create(['title' => 'React Guide']);
        Post::factory()->create(['content' => 'Advanced Laravel techniques']);

        $response = $this->getJson('/api/v1/search?q=Laravel');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data.data.posts');
    }

    public function test_search_returns_empty_for_no_results(): void
    {
        Post::factory()->create(['title' => 'React Guide']);

        $response = $this->getJson('/api/v1/search?q=NonExistentKeyword');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data.data.posts'));
    }

    public function test_can_filter_search_by_category(): void
    {
        $category1 = Category::factory()->create(['name' => 'Technology']);
        $category2 = Category::factory()->create(['name' => 'Lifestyle']);

        Post::factory()->create(['title' => 'Post 1'])->categories()->attach($category1);
        Post::factory()->create(['title' => 'Post 2'])->categories()->attach($category2);
        Post::factory()->create(['title' => 'Post 3'])->categories()->attach($category1);

        $response = $this->getJson('/api/v1/search?categories=' . $category1->id);

        $response->assertStatus(200);
        $posts = $response->json('data.data.posts');
        $this->assertCount(2, $posts);
    }

    public function test_can_filter_search_by_tags(): void
    {
        $tag1 = Tag::factory()->create(['name' => 'Laravel']);
        $tag2 = Tag::factory()->create(['name' => 'React']);

        Post::factory()->create(['title' => 'Post 1'])->tags()->attach($tag1);
        Post::factory()->create(['title' => 'Post 2'])->tags()->attach($tag2);
        Post::factory()->create(['title' => 'Post 3'])->tags()->attach($tag1);

        $response = $this->getJson('/api/v1/search?tags=' . $tag1->id);

        $response->assertStatus(200);
        $posts = $response->json('data.data.posts');
        $this->assertCount(2, $posts);
    }

    public function test_can_filter_search_by_author(): void
    {
        $author1 = User::factory()->create();
        $author2 = User::factory()->create();

        Post::factory()->create(['title' => 'Post 1', 'author_id' => $author1->id]);
        Post::factory()->create(['title' => 'Post 2', 'author_id' => $author2->id]);
        Post::factory()->create(['title' => 'Post 3', 'author_id' => $author1->id]);

        $response = $this->getJson('/api/v1/search?authors=' . $author1->id);

        $response->assertStatus(200);
        $posts = $response->json('data.data.posts');
        $this->assertCount(2, $posts);
    }

    public function test_can_filter_search_by_status(): void
    {
        Post::factory()->create(['title' => 'Published Post', 'status' => 'published']);
        Post::factory()->create(['title' => 'Draft Post', 'status' => 'draft']);
        Post::factory()->create(['title' => 'Another Published', 'status' => 'published']);

        $token = $this->user->createToken('auth-token')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/search?status=published');

        $response->assertStatus(200);
        $posts = $response->json('data.data.posts');
        $this->assertCount(2, $posts);
    }

    public function test_can_filter_search_by_date_range(): void
    {
        Post::factory()->create([
            'title' => 'Old Post',
            'created_at' => now()->subDays(10),
        ]);
        Post::factory()->create([
            'title' => 'Recent Post',
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/v1/search?date_from=' . now()->subDays(5)->format('Y-m-d') . '&date_to=' . now()->format('Y-m-d'));

        $response->assertStatus(200);
        $posts = $response->json('data.data.posts');
        $this->assertCount(1, $posts);
        $this->assertEquals('Recent Post', $posts[0]['title']);
    }

    public function test_can_sort_search_results(): void
    {
        Post::factory()->create([
            'title' => 'First Post',
            'created_at' => now()->subDays(5),
        ]);
        Post::factory()->create([
            'title' => 'Second Post',
            'created_at' => now()->subDays(2),
        ]);

        $response = $this->getJson('/api/v1/search?sort_by=date');

        $response->assertStatus(200);
        $posts = $response->json('data.data.posts');
        $this->assertEquals('Second Post', $posts[0]['title']);
    }

    public function test_search_handles_empty_query(): void
    {
        Post::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/search?q=');

        $response->assertStatus(200);
        $posts = $response->json('data.data.posts');
        $this->assertGreaterThanOrEqual(3, count($posts));
    }
}
