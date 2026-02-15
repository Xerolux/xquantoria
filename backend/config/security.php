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

    'failed_login' => [
        'enabled' => env('SECURITY_FAILED_LOGIN_TRACKING', true),
        'max_attempts' => env('SECURITY_MAX_LOGIN_ATTEMPTS', 5),
        'decay_minutes' => env('SECURITY_LOGIN_DECAY_MINUTES', 60),
    ],

    'max_failed_attempts' => env('SECURITY_MAX_FAILED_ATTEMPTS', 5),
    'block_duration_minutes' => env('SECURITY_BLOCK_DURATION_MINUTES', 60),
    'failed_attempts_window_minutes' => env('SECURITY_FAILED_ATTEMPTS_WINDOW', 60),

    'ip_blocking' => [
        'enabled' => env('SECURITY_IP_BLOCKING_ENABLED', true),
        'auto_block' => env('SECURITY_AUTO_BLOCK_ENABLED', true),
        'auto_block_threshold' => env('SECURITY_AUTO_BLOCK_THRESHOLD', 10),
        'default_duration' => env('SECURITY_DEFAULT_BLOCK_DURATION', 60),
    ],

    'two_factor' => [
        'required_for_admin' => env('SECURITY_2FA_REQUIRED_ADMIN', false),
        'required_for_all' => env('SECURITY_2FA_REQUIRED_ALL', false),
        'remember_duration' => env('SECURITY_2FA_REMEMBER_MINUTES', 1440),
    ],

    'password' => [
        'min_length' => env('SECURITY_PASSWORD_MIN_LENGTH', 8),
        'require_uppercase' => env('SECURITY_PASSWORD_REQUIRE_UPPERCASE', true),
        'require_lowercase' => env('SECURITY_PASSWORD_REQUIRE_LOWERCASE', true),
        'require_numbers' => env('SECURITY_PASSWORD_REQUIRE_NUMBERS', true),
        'require_symbols' => env('SECURITY_PASSWORD_REQUIRE_SYMBOLS', false),
        'max_age_days' => env('SECURITY_PASSWORD_MAX_AGE_DAYS', 90),
        'prevent_reuse_count' => env('SECURITY_PASSWORD_PREVENT_REUSE', 5),
    ],

    'session' => [
        'lifetime' => env('SESSION_LIFETIME', 120),
        'single_device' => env('SECURITY_SINGLE_DEVICE_SESSION', false),
        'track_ip' => env('SECURITY_SESSION_TRACK_IP', true),
        'track_user_agent' => env('SECURITY_SESSION_TRACK_UA', true),
    ],

    'audit' => [
        'enabled' => env('SECURITY_AUDIT_ENABLED', true),
        'retention_days' => env('SECURITY_AUDIT_RETENTION_DAYS', 90),
        'log_successful_logins' => env('SECURITY_LOG_SUCCESSFUL_LOGINS', true),
        'log_failed_logins' => env('SECURITY_LOG_FAILED_LOGINS', true),
        'log_permission_changes' => env('SECURITY_LOG_PERMISSION_CHANGES', true),
        'log_password_changes' => env('SECURITY_LOG_PASSWORD_CHANGES', true),
    ],

    'notifications' => [
        'email_on_blocked_ip' => env('SECURITY_NOTIFY_BLOCKED_IP', false),
        'email_on_brute_force' => env('SECURITY_NOTIFY_BRUTE_FORCE', true),
        'email_on_critical_event' => env('SECURITY_NOTIFY_CRITICAL', true),
    ],
];
