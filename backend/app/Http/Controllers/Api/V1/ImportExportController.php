<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Category;
use App\Models\Tag;
use App\Models\User;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use SimpleXMLElement;

class ImportExportController extends Controller
{
    public function exportPosts(Request $request): JsonResponse
    {
        $query = Post::with(['categories', 'tags', 'author']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('category_id')) {
            $query->whereHas('categories', fn($q) => $q->where('id', $request->category_id));
        }

        $posts = $query->get();

        $format = $request->get('format', 'json');

        if ($format === 'xml') {
            return $this->exportAsXml($posts, 'posts');
        }

        if ($format === 'csv') {
            return $this->exportAsCsv($posts, 'posts');
        }

        return response()->json([
            'data' => $posts,
            'count' => $posts->count(),
            'format' => 'json',
        ]);
    }

    public function exportCategories(Request $request): JsonResponse
    {
        $categories = Category::with('parent')->get();

        return response()->json([
            'data' => $categories,
            'count' => $categories->count(),
        ]);
    }

    public function exportTags(Request $request): JsonResponse
    {
        $tags = Tag::all();

        return response()->json([
            'data' => $tags,
            'count' => $tags->count(),
        ]);
    }

    public function exportUsers(Request $request): JsonResponse
    {
        $users = User::select(['id', 'name', 'email', 'role', 'created_at'])->get();

        return response()->json([
            'data' => $users,
            'count' => $users->count(),
        ]);
    }

    public function exportAll(Request $request): JsonResponse
    {
        $data = [
            'posts' => Post::with(['categories', 'tags'])->get(),
            'categories' => Category::all(),
            'tags' => Tag::all(),
            'users' => User::select(['id', 'name', 'email', 'role'])->get(),
            'exported_at' => now()->toIso8601String(),
            'version' => '1.0',
        ];

        return response()->json([
            'data' => $data,
            'format' => 'json',
        ]);
    }

    public function importWordPress(Request $request): JsonResponse
    {
        $request->validate([
            'xml_file' => 'required|file|mimes:xml',
        ]);

        $file = $request->file('xml_file');
        $xml = simplexml_load_file($file->getPathname());

        if (!$xml) {
            return response()->json(['message' => 'Ungültige XML-Datei'], 400);
        }

        $imported = [
            'posts' => 0,
            'categories' => 0,
            'tags' => 0,
            'authors' => 0,
        ];

        DB::beginTransaction();
        try {
            $namespaces = $xml->getDocNamespaces();
            $wp = $xml->children($namespaces['wp'] ?? null);
            $content = $xml->children($namespaces['content'] ?? null);

            // Import categories
            if (isset($wp->category)) {
                foreach ($wp->category as $cat) {
                    $name = (string) $cat->cat_name;
                    $slug = (string) $cat->category_nicename;

                    if ($name && $slug) {
                        Category::firstOrCreate(
                            ['slug' => $slug],
                            ['name' => $name, 'description' => '']
                        );
                        $imported['categories']++;
                    }
                }
            }

            // Import tags
            if (isset($wp->tag)) {
                foreach ($wp->tag as $tag) {
                    $name = (string) $tag->tag_name;
                    $slug = (string) $tag->tag_slug;

                    if ($name && $slug) {
                        Tag::firstOrCreate(
                            ['slug' => $slug],
                            ['name' => $name]
                        );
                        $imported['tags']++;
                    }
                }
            }

            // Import posts
            foreach ($xml->channel->item as $item) {
                $wpNs = $item->children($namespaces['wp'] ?? null);
                $dcNs = $item->children($namespaces['dc'] ?? null);

                $postType = (string) $wpNs->post_type;
                if ($postType !== 'post' && $postType !== 'page') {
                    continue;
                }

                $status = (string) $wpNs->status;
                $statusMap = [
                    'publish' => 'published',
                    'draft' => 'draft',
                    'pending' => 'draft',
                    'private' => 'published',
                ];

                $title = (string) $item->title;
                $content = (string) $item->children($namespaces['content'] ?? null)->encoded;
                $link = (string) $item->link;
                $pubDate = (string) $item->pubDate;
                $slug = (string) $wpNs->post_name ?: Str::slug($title);

                $authorEmail = (string) $dcNs->creator;
                $author = User::where('email', 'like', "%{$authorEmail}%")->first();
                if (!$author) {
                    $author = User::first();
                }

                $post = Post::create([
                    'title' => $title ?: 'Untitled',
                    'slug' => $slug,
                    'content' => $content,
                    'excerpt' => Str::limit(strip_tags($content), 200),
                    'status' => $statusMap[$status] ?? 'draft',
                    'user_id' => $author->id ?? 1,
                    'published_at' => $status === 'publish' ? ($pubDate ? date('Y-m-d H:i:s', strtotime($pubDate)) : now()) : null,
                ]);

                // Import categories for this post
                foreach ($item->category as $cat) {
                    $catName = (string) $cat;
                    $category = Category::where('name', $catName)->orWhere('slug', Str::slug($catName))->first();
                    if ($category) {
                        $post->categories()->attach($category->id);
                    }
                }

                $imported['posts']++;
            }

            DB::commit();

            return response()->json([
                'message' => 'WordPress Import erfolgreich',
                'imported' => $imported,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Import fehlgeschlagen',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function importJson(Request $request): JsonResponse
    {
        $request->validate([
            'data' => 'required|array',
        ]);

        $data = $request->data;
        $imported = [
            'posts' => 0,
            'categories' => 0,
            'tags' => 0,
        ];

        DB::beginTransaction();
        try {
            // Import categories first
            if (!empty($data['categories'])) {
                foreach ($data['categories'] as $cat) {
                    Category::firstOrCreate(
                        ['slug' => $cat['slug']],
                        [
                            'name' => $cat['name'],
                            'description' => $cat['description'] ?? '',
                            'parent_id' => $cat['parent_id'] ?? null,
                        ]
                    );
                    $imported['categories']++;
                }
            }

            // Import tags
            if (!empty($data['tags'])) {
                foreach ($data['tags'] as $tag) {
                    Tag::firstOrCreate(
                        ['slug' => $tag['slug']],
                        ['name' => $tag['name']]
                    );
                    $imported['tags']++;
                }
            }

            // Import posts
            if (!empty($data['posts'])) {
                foreach ($data['posts'] as $postData) {
                    $post = Post::firstOrCreate(
                        ['slug' => $postData['slug']],
                        [
                            'title' => $postData['title'],
                            'content' => $postData['content'] ?? '',
                            'excerpt' => $postData['excerpt'] ?? '',
                            'status' => $postData['status'] ?? 'draft',
                            'user_id' => $postData['user_id'] ?? auth()->id(),
                            'published_at' => $postData['published_at'] ?? null,
                        ]
                    );

                    if (!empty($postData['categories'])) {
                        foreach ($postData['categories'] as $catSlug) {
                            $category = Category::where('slug', $catSlug)->first();
                            if ($category) {
                                $post->categories()->syncWithoutDetaching($category->id);
                            }
                        }
                    }

                    if (!empty($postData['tags'])) {
                        foreach ($postData['tags'] as $tagSlug) {
                            $tag = Tag::where('slug', $tagSlug)->first();
                            if ($tag) {
                                $post->tags()->syncWithoutDetaching($tag->id);
                            }
                        }
                    }

                    $imported['posts']++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Import erfolgreich',
                'imported' => $imported,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Import fehlgeschlagen',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function exportAsXml($data, string $type): JsonResponse
    {
        $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><export></export>');
        $xml->addAttribute('type', $type);
        $xml->addAttribute('date', now()->toIso8601String());

        foreach ($data as $item) {
            $itemXml = $xml->addChild('item');
            foreach ($item->toArray() as $key => $value) {
                if (is_array($value)) {
                    $value = json_encode($value);
                }
                $itemXml->addChild($key, htmlspecialchars($value ?? ''));
            }
        }

        return response()->json([
            'data' => $xml->asXML(),
            'format' => 'xml',
        ]);
    }

    private function exportAsCsv($data, string $type): JsonResponse
    {
        $csv = [];
        $headers = [];

        foreach ($data as $item) {
            $row = [];
            $itemArray = $item->toArray();

            if (empty($headers)) {
                $headers = array_keys($itemArray);
            }

            foreach ($headers as $header) {
                $value = $itemArray[$header] ?? '';
                if (is_array($value)) {
                    $value = json_encode($value);
                }
                $row[] = '"' . str_replace('"', '""', $value) . '"';
            }
            $csv[] = implode(',', $row);
        }

        array_unshift($csv, implode(',', $headers));

        return response()->json([
            'data' => implode("\n", $csv),
            'format' => 'csv',
        ]);
    }
}
