<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\Page;
use App\Models\Category;
use App\Models\Tag;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class GenerateSitemap extends Command
{
    protected $signature = 'sitemap:generate
        {--type=all : Sitemap type (all, posts, pages, categories, tags, images)}
        {--limit=50000 : Maximum URLs per sitemap}
        {--compress : Compress sitemaps}';

    protected $description = 'Generate XML sitemaps for SEO';

    protected string $baseUrl;
    protected int $limit;

    public function handle(): int
    {
        $this->baseUrl = config('app.url');
        $this->limit = (int) $this->option('limit');
        $type = $this->option('type');
        $compress = $this->option('compress');

        $this->info('Generating sitemaps...');

        Storage::disk('public')->makeDirectory('sitemaps');

        $sitemaps = [];

        if ($type === 'all' || $type === 'posts') {
            $sitemaps['posts'] = $this->generatePostsSitemap();
        }

        if ($type === 'all' || $type === 'pages') {
            $sitemaps['pages'] = $this->generatePagesSitemap();
        }

        if ($type === 'all' || $type === 'categories') {
            $sitemaps['categories'] = $this->generateCategoriesSitemap();
        }

        if ($type === 'all' || $type === 'tags') {
            $sitemaps['tags'] = $this->generateTagsSitemap();
        }

        if ($type === 'all' || $type === 'images') {
            $sitemaps['images'] = $this->generateImageSitemap();
        }

        $this->generateSitemapIndex($sitemaps);

        if ($compress) {
            $this->compressSitemaps($sitemaps);
        }

        $this->info('Sitemaps generated successfully!');

        return Command::SUCCESS;
    }

    protected function generatePostsSitemap(): array
    {
        $posts = Post::where('status', 'published')
            ->orderBy('published_at', 'desc')
            ->get();

        $chunks = $posts->chunk($this->limit);
        $files = [];

        foreach ($chunks as $index => $chunk) {
            $filename = $index === 0 ? 'sitemap-posts.xml' : "sitemap-posts-{$index}.xml";
            $xml = $this->buildXml($chunk->map(function ($post) {
                return [
                    'loc' => $this->baseUrl . '/blog/' . $post->slug,
                    'lastmod' => $post->updated_at->toIso8601String(),
                    'changefreq' => 'weekly',
                    'priority' => $post->featured ? 0.9 : 0.7,
                ];
            }));

            Storage::disk('public')->put("sitemaps/{$filename}", $xml);
            $files[] = $filename;

            $this->line("Generated {$filename} with {$chunk->count()} URLs");
        }

        return $files;
    }

    protected function generatePagesSitemap(): array
    {
        $pages = Page::where('status', 'published')->get();

        $xml = $this->buildXml($pages->map(function ($page) {
            return [
                'loc' => $this->baseUrl . '/' . $page->slug,
                'lastmod' => $page->updated_at->toIso8601String(),
                'changefreq' => 'monthly',
                'priority' => 0.8,
            ];
        }));

        Storage::disk('public')->put('sitemaps/sitemap-pages.xml', $xml);

        $this->line("Generated sitemap-pages.xml with {$pages->count()} URLs");

        return ['sitemap-pages.xml'];
    }

    protected function generateCategoriesSitemap(): array
    {
        $categories = Category::all();

        $xml = $this->buildXml($categories->map(function ($category) {
            return [
                'loc' => $this->baseUrl . '/category/' . $category->slug,
                'lastmod' => $category->updated_at->toIso8601String(),
                'changefreq' => 'weekly',
                'priority' => 0.6,
            ];
        }));

        Storage::disk('public')->put('sitemaps/sitemap-categories.xml', $xml);

        $this->line("Generated sitemap-categories.xml with {$categories->count()} URLs");

        return ['sitemap-categories.xml'];
    }

    protected function generateTagsSitemap(): array
    {
        $tags = Tag::all();

        $xml = $this->buildXml($tags->map(function ($tag) {
            return [
                'loc' => $this->baseUrl . '/tag/' . $tag->slug,
                'lastmod' => $tag->updated_at->toIso8601String(),
                'changefreq' => 'weekly',
                'priority' => 0.5,
            ];
        }));

        Storage::disk('public')->put('sitemaps/sitemap-tags.xml', $xml);

        $this->line("Generated sitemap-tags.xml with {$tags->count()} URLs");

        return ['sitemap-tags.xml'];
    }

    protected function generateImageSitemap(): array
    {
        $posts = Post::where('status', 'published')
            ->whereNotNull('featured_image_id')
            ->with('featuredImage')
            ->get();

        $images = $posts->filter(fn($p) => $p->featuredImage)->map(function ($post) {
            $image = $post->featuredImage;
            return [
                'loc' => $this->baseUrl . '/storage/' . $image->path,
                'lastmod' => $image->updated_at->toIso8601String(),
                'changefreq' => 'monthly',
                'priority' => 0.5,
                'image' => [
                    'loc' => $this->baseUrl . '/storage/' . $image->path,
                    'title' => $image->alt_text ?: $post->title,
                    'caption' => $image->caption,
                ],
            ];
        });

        $xml = $this->buildImageXml($images);

        Storage::disk('public')->put('sitemaps/sitemap-images.xml', $xml);

        $this->line("Generated sitemap-images.xml with {$images->count()} URLs");

        return ['sitemap-images.xml'];
    }

    protected function buildXml($urls): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($urls as $url) {
            $xml .= "  <url>\n";
            $xml .= "    <loc>{$url['loc']}</loc>\n";
            $xml .= "    <lastmod>{$url['lastmod']}</lastmod>\n";
            $xml .= "    <changefreq>{$url['changefreq']}</changefreq>\n";
            $xml .= "    <priority>{$url['priority']}</priority>\n";
            $xml .= "  </url>\n";
        }

        $xml .= '</urlset>';

        return $xml;
    }

    protected function buildImageXml($urls): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' .
                ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";

        foreach ($urls as $url) {
            $xml .= "  <url>\n";
            $xml .= "    <loc>{$url['loc']}</loc>\n";
            if (isset($url['image'])) {
                $xml .= "    <image:image>\n";
                $xml .= "      <image:loc>{$url['image']['loc']}</image:loc>\n";
                if ($url['image']['title']) {
                    $xml .= "      <image:title>" . htmlspecialchars($url['image']['title']) . "</image:title>\n";
                }
                if ($url['image']['caption']) {
                    $xml .= "      <image:caption>" . htmlspecialchars($url['image']['caption']) . "</image:caption>\n";
                }
                $xml .= "    </image:image>\n";
            }
            $xml .= "  </url>\n";
        }

        $xml .= '</urlset>';

        return $xml;
    }

    protected function generateSitemapIndex(array $sitemaps): void
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($sitemaps as $files) {
            foreach ($files as $file) {
                $xml .= "  <sitemap>\n";
                $xml .= "    <loc>{$this->baseUrl}/storage/sitemaps/{$file}</loc>\n";
                $xml .= "    <lastmod>" . now()->toIso8601String() . "</lastmod>\n";
                $xml .= "  </sitemap>\n";
            }
        }

        $xml .= '</sitemapindex>';

        Storage::disk('public')->put('sitemap.xml', $xml);

        $this->info('Generated sitemap index');
    }

    protected function compressSitemaps(array $sitemaps): void
    {
        foreach ($sitemaps as $files) {
            foreach ($files as $file) {
                $path = Storage::disk('public')->path("sitemaps/{$file}");
                if (file_exists($path)) {
                    $gz = gzopen("{$path}.gz", 'w9');
                    gzwrite($gz, file_get_contents($path));
                    gzclose($gz);
                    $this->line("Compressed {$file}");
                }
            }
        }
    }
}
