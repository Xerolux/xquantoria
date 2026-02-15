<?php

return [
    'enabled' => env('ELASTICSEARCH_ENABLED', false),

    'hosts' => [
        env('ELASTICSEARCH_HOST', 'http://localhost:9200'),
    ],

    'user' => env('ELASTICSEARCH_USER'),
    'password' => env('ELASTICSEARCH_PASSWORD'),

    'api_key' => env('ELASTICSEARCH_API_KEY'),

    'prefix' => env('ELASTICSEARCH_PREFIX', 'cms_'),

    'retries' => env('ELASTICSEARCH_RETRIES', 2),

    'ssl' => [
        'verify' => env('ELASTICSEARCH_SSL_VERIFY', true),
        'ca_bundle' => env('ELASTICSEARCH_CA_BUNDLE'),
    ],

    'indices' => [
        'posts' => [
            'mappings' => [
                'title' => ['type' => 'text', 'analyzer' => 'standard'],
                'content' => ['type' => 'text', 'analyzer' => 'standard'],
                'excerpt' => ['type' => 'text', 'analyzer' => 'standard'],
                'slug' => ['type' => 'keyword'],
                'status' => ['type' => 'keyword'],
                'author_id' => ['type' => 'integer'],
                'author_name' => ['type' => 'text'],
                'categories' => ['type' => 'keyword'],
                'tags' => ['type' => 'keyword'],
                'language' => ['type' => 'keyword'],
                'featured' => ['type' => 'boolean'],
                'view_count' => ['type' => 'integer'],
                'published_at' => ['type' => 'date'],
                'created_at' => ['type' => 'date'],
                'updated_at' => ['type' => 'date'],
                'suggest' => ['type' => 'completion', 'analyzer' => 'simple'],
            ],
            'settings' => [
                'number_of_shards' => 1,
                'number_of_replicas' => 0,
                'analysis' => [
                    'analyzer' => [
                        'standard' => [
                            'type' => 'standard',
                            'stopwords' => '_german_',
                        ],
                    ],
                ],
            ],
        ],
        'products' => [
            'mappings' => [
                'name' => ['type' => 'text', 'analyzer' => 'standard'],
                'description' => ['type' => 'text', 'analyzer' => 'standard'],
                'sku' => ['type' => 'keyword'],
                'price' => ['type' => 'float'],
                'sale_price' => ['type' => 'float'],
                'category_id' => ['type' => 'integer'],
                'category_name' => ['type' => 'keyword'],
                'tags' => ['type' => 'keyword'],
                'in_stock' => ['type' => 'boolean'],
                'is_active' => ['type' => 'boolean'],
                'is_digital' => ['type' => 'boolean'],
                'rating' => ['type' => 'float'],
                'created_at' => ['type' => 'date'],
                'suggest' => ['type' => 'completion', 'analyzer' => 'simple'],
            ],
            'settings' => [
                'number_of_shards' => 1,
                'number_of_replicas' => 0,
            ],
        ],
        'media' => [
            'mappings' => [
                'filename' => ['type' => 'text'],
                'alt_text' => ['type' => 'text'],
                'caption' => ['type' => 'text'],
                'mime_type' => ['type' => 'keyword'],
                'type' => ['type' => 'keyword'],
                'size' => ['type' => 'integer'],
                'width' => ['type' => 'integer'],
                'height' => ['type' => 'integer'],
                'uploaded_by' => ['type' => 'integer'],
                'created_at' => ['type' => 'date'],
            ],
            'settings' => [
                'number_of_shards' => 1,
                'number_of_replicas' => 0,
            ],
        ],
        'users' => [
            'mappings' => [
                'name' => ['type' => 'text'],
                'email' => ['type' => 'keyword'],
                'role' => ['type' => 'keyword'],
                'bio' => ['type' => 'text'],
                'is_active' => ['type' => 'boolean'],
                'created_at' => ['type' => 'date'],
                'suggest' => ['type' => 'completion', 'analyzer' => 'simple'],
            ],
            'settings' => [
                'number_of_shards' => 1,
                'number_of_replicas' => 0,
            ],
        ],
    ],

    'search' => [
        'default_size' => 20,
        'max_size' => 100,
        'min_score' => 0.1,
        'highlight' => [
            'pre_tags' => ['<mark>'],
            'post_tags' => ['</mark>'],
            'fragment_size' => 150,
            'number_of_fragments' => 3,
        ],
    ],
];
