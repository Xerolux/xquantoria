<?php

namespace App\GraphQL\Queries;

use App\Models\Post;
use Illuminate\Support\Facades\DB;

class SearchPosts
{
    public function __invoke($_, array $args)
    {
        $query = $args['query'];
        $first = $args['first'] ?? 10;

        return Post::where('status', 'published')
            ->where(function ($q) use ($query) {
                $q->where('title', 'like', "%{$query}%")
                    ->orWhere('content', 'like', "%{$query}%")
                    ->orWhere('excerpt', 'like', "%{$query}%");
            })
            ->with(['categories', 'tags', 'author'])
            ->orderBy('published_at', 'desc')
            ->limit($first)
            ->get();
    }
}
