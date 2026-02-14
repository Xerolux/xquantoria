<?php

return [
    'csp' => [
        'enabled' => env('CSP_ENABLED', true),
        'report_only' => env('CSP_REPORT_ONLY', false),
        'report_uri' => env('CSP_REPORT_URI', '/api/v1/csp-report'),
        'local_enabled' => env('CSP_LOCAL_ENABLED', false),
        'api_enabled' => env('CSP_API_ENABLED', false),
        'allow_inline_scripts' => env('CSP_ALLOW_INLINE_SCRIPTS', false),
        'allow_inline_styles' => env('CSP_ALLOW_INLINE_STYLES', true),
        'allow_eval' => env('CSP_ALLOW_EVAL', false),
        'script_domains' => array_filter(explode(',', env('CSP_SCRIPT_DOMAINS', ''))),
        'style_domains' => array_filter(explode(',', env('CSP_STYLE_DOMAINS', ''))),
        'image_domains' => array_filter(explode(',', env('CSP_IMAGE_DOMAINS', ''))),
        'font_domains' => array_filter(explode(',', env('CSP_FONT_DOMAINS', ''))),
        'connect_domains' => array_filter(explode(',', env('CSP_CONNECT_DOMAINS', ''))),
        'frame_domains' => array_filter(explode(',', env('CSP_FRAME_DOMAINS', ''))),
    ],

    'cors' => [
        'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', env('APP_URL')))),
        'allowed_origins_patterns' => [],
        'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-TOKEN'],
        'exposed_headers' => [],
        'max_age' => env('CORS_MAX_AGE', 86400),
        'supports_credentials' => true,
    ],

    'headers' => [
        'x_frame_options' => env('X_FRAME_OPTIONS', 'SAMEORIGIN'),
        'x_content_type_options' => env('X_CONTENT_TYPE_OPTIONS', 'nosniff'),
        'x_xss_protection' => env('X_XSS_PROTECTION', '1; mode=block'),
        'referrer_policy' => env('REFERRER_POLICY', 'strict-origin-when-cross-origin'),
        'permissions_policy' => env('PERMISSIONS_POLICY', 'camera=(), microphone=(), geolocation=()'),
        'hsts_enabled' => env('HSTS_ENABLED', true),
        'hsts_max_age' => env('HSTS_MAX_AGE', 31536000),
        'hsts_include_subdomains' => env('HSTS_INCLUDE_SUBDOMAINS', true),
        'hsts_preload' => env('HSTS_PRELOAD', false),
    ],

    'rate_limiting' => [
        'api_max_attempts' => env('RATE_LIMIT_API', 100),
        'api_decay_minutes' => env('RATE_LIMIT_API_DECAY', 1),
        'auth_max_attempts' => env('RATE_LIMIT_AUTH', 5),
        'auth_decay_minutes' => env('RATE_LIMIT_AUTH_DECAY', 1),
        'upload_max_attempts' => env('RATE_LIMIT_UPLOAD', 20),
        'upload_decay_minutes' => env('RATE_LIMIT_UPLOAD_DECAY', 1),
    ],
];
