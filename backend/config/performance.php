<?php

return [
    'enabled' => env('PERFORMANCE_MONITORING', true),

    'slow_query_threshold' => env('SLOW_QUERY_THRESHOLD', 1000),

    'cache' => [
        'default_ttl' => env('CACHE_DEFAULT_TTL', 3600),
        'settings_ttl' => env('CACHE_SETTINGS_TTL', 86400),
        'categories_ttl' => env('CACHE_CATEGORIES_TTL', 3600),
        'tags_ttl' => env('CACHE_TAGS_TTL', 3600),
        'posts_ttl' => env('CACHE_POSTS_TTL', 1800),
        'products_ttl' => env('CACHE_PRODUCTS_TTL', 600),
    ],

    'query_optimization' => [
        'eager_load_relations' => true,
        'chunk_size' => env('QUERY_CHUNK_SIZE', 1000),
        'prevent_n_plus_one' => env('PREVENT_N_PLUS_ONE', true),
    ],

    'opcache' => [
        'enabled' => env('OPCACHE_ENABLED', true),
        'validate_timestamps' => env('OPCACHE_VALIDATE_TIMESTAMPS', false),
        'revalidate_freq' => env('OPCACHE_REVALIDATE_FREQ', 60),
    ],

    'database' => [
        'optimize_tables_cron' => env('DB_OPTIMIZE_CRON', '0 3 * * 0'),
        'log_slow_queries' => env('DB_LOG_SLOW_QUERIES', true),
    ],

    'redis' => [
        'persistent_connection' => env('REDIS_PERSISTENT', true),
        'read_timeout' => env('REDIS_READ_TIMEOUT', 60),
        'serialization' => 'igbinary',
    ],
];
