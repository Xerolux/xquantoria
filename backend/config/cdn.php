<?php

return [
    'default' => env('CDN_DEFAULT', 'auto'),

    'cloudflare' => [
        'enabled' => env('CLOUDFLARE_ENABLED', false),
        'api_token' => env('CLOUDFLARE_API_TOKEN'),
        'zone_id' => env('CLOUDFLARE_ZONE_ID'),
        'email' => env('CLOUDFLARE_EMAIL'),
        'api_key' => env('CLOUDFLARE_API_KEY'),
    ],

    'varnish' => [
        'enabled' => env('VARNISH_ENABLED', false),
        'host' => env('VARNISH_HOST', '127.0.0.1'),
        'port' => env('VARNISH_PORT', 6081),
        'admin_port' => env('VARNISH_ADMIN_PORT', 6082),
        'secret' => env('VARNISH_SECRET'),
        'ban_method' => env('VARNISH_BAN_METHOD', 'PURGE'),
    ],

    'cache_rules' => [
        'homepage' => [
            'ttl' => env('CDN_CACHE_HOMEPAGE_TTL', 300),
            'stale' => env('CDN_CACHE_HOMEPAGE_STALE', 60),
        ],
        'posts' => [
            'ttl' => env('CDN_CACHE_POSTS_TTL', 3600),
            'stale' => env('CDN_CACHE_POSTS_STALE', 300),
        ],
        'pages' => [
            'ttl' => env('CDN_CACHE_PAGES_TTL', 3600),
            'stale' => env('CDN_CACHE_PAGES_STALE', 300),
        ],
        'api' => [
            'ttl' => env('CDN_CACHE_API_TTL', 60),
            'stale' => env('CDN_CACHE_API_STALE', 30),
        ],
        'media' => [
            'ttl' => env('CDN_CACHE_MEDIA_TTL', 86400),
            'stale' => env('CDN_CACHE_MEDIA_STALE', 3600),
        ],
        'static' => [
            'ttl' => env('CDN_CACHE_STATIC_TTL', 31536000),
            'stale' => env('CDN_CACHE_STATIC_STALE', 86400),
        ],
    ],

    'purge_hooks' => [
        'post_updated' => true,
        'post_deleted' => true,
        'post_published' => true,
        'page_updated' => true,
        'page_deleted' => true,
        'media_uploaded' => true,
        'media_deleted' => true,
        'settings_updated' => true,
    ],

    'warmup' => [
        'enabled' => env('CDN_WARMUP_ENABLED', true),
        'concurrent' => env('CDN_WARMUP_CONCURRENT', 5),
        'timeout' => env('CDN_WARMUP_TIMEOUT', 30),
        'urls' => [
            '/',
            '/posts',
            '/pages',
        ],
    ],
];
