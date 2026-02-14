<?php

return [
    'host' => env('MEILISEARCH_HOST', 'http://127.0.0.1:7700'),
    'key' => env('MEILISEARCH_KEY', ''),
    
    'index_prefix' => env('MEILISEARCH_INDEX_PREFIX', 'cms_'),

    'searchable_attributes' => [
        'posts' => ['title', 'content', 'excerpt', 'meta_title', 'meta_description'],
        'pages' => ['title', 'content'],
        'products' => ['name', 'description', 'sku', 'short_description'],
        'media' => ['title', 'alt_text', 'caption'],
    ],

    'filterable_attributes' => [
        'posts' => ['status', 'category_id', 'author_id', 'language', 'published_at'],
        'products' => ['price', 'category_id', 'is_active', 'is_featured'],
    ],

    'sortable_attributes' => [
        'posts' => ['published_at', 'created_at', 'title'],
        'products' => ['price', 'name', 'created_at'],
    ],

    'ranking_rules' => [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
    ],

    'indices' => [
        'posts' => [
            'model' => \App\Models\Post::class,
            'sync' => true,
        ],
        'pages' => [
            'model' => \App\Models\StaticPage::class,
            'sync' => true,
        ],
        'products' => [
            'model' => \App\Models\ShopProduct::class,
            'sync' => true,
        ],
        'media' => [
            'model' => \App\Models\Media::class,
            'sync' => true,
        ],
    ],
];
