<?php

return [
    'enabled' => env('WAF_ENABLED', true),

    'mode' => env('WAF_MODE', 'block'),

    'log_blocked_requests' => env('WAF_LOG_BLOCKED', true),

    'log_all_requests' => env('WAF_LOG_ALL', false),

    'max_request_size' => env('WAF_MAX_REQUEST_SIZE', 10485760),

    'max_url_length' => env('WAF_MAX_URL_LENGTH', 2048),

    'max_header_length' => env('WAF_MAX_HEADER_LENGTH', 8192),

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],

    'auto_ban_threshold' => env('WAF_AUTO_BAN_THRESHOLD', 10),

    'auto_ban_duration' => env('WAF_AUTO_BAN_DURATION', 86400),

    'whitelisted_ips' => array_filter(explode(',', env('WAF_WHITELIST_IPS', '127.0.0.1'))),

    'blacklisted_ips' => array_filter(explode(',', env('WAF_BLACKLIST_IPS', ''))),

    'rules' => [
        'sql_injection' => [
            'enabled' => env('WAF_SQL_INJECTION', true),
            'action' => 'block',
        ],
        'xss' => [
            'enabled' => env('WAF_XSS', true),
            'action' => 'block',
        ],
        'path_traversal' => [
            'enabled' => env('WAF_PATH_TRAVERSAL', true),
            'action' => 'block',
        ],
        'command_injection' => [
            'enabled' => env('WAF_COMMAND_INJECTION', true),
            'action' => 'block',
        ],
        'file_inclusion' => [
            'enabled' => env('WAF_FILE_INCLUSION', true),
            'action' => 'block',
        ],
        'user_agent_blocking' => [
            'enabled' => env('WAF_USER_AGENT_BLOCKING', true),
            'action' => 'block',
        ],
    ],

    'crowdsec' => [
        'enabled' => env('CROWDSEC_ENABLED', false),
        'api_url' => env('CROWDSEC_API_URL', 'http://crowdsec:8080'),
        'api_key' => env('CROWDSEC_API_KEY'),
        'bounce_url' => env('CROWDSEC_BOUNCE_URL'),
        'cache_ttl' => env('CROWDSEC_CACHE_TTL', 60),
    ],

    'ip_reputation' => [
        'enabled' => env('IP_REPUTATION_ENABLED', true),
        'check_tor' => env('IP_REPUTATION_CHECK_TOR', true),
        'check_proxy' => env('IP_REPUTATION_CHECK_PROXY', true),
        'check_vpn' => env('IP_REPUTATION_CHECK_VPN', true),
        'check_spam' => env('IP_REPUTATION_CHECK_SPAM', true),
        'cache_ttl' => env('IP_REPUTATION_CACHE_TTL', 3600),
        'ban_threshold' => env('IP_REPUTATION_BAN_THRESHOLD', 50),
    ],

    'rate_limiting' => [
        'enabled' => env('WAF_RATE_LIMIT_ENABLED', true),
        'global_limit' => env('WAF_GLOBAL_RATE_LIMIT', 1000),
        'per_ip_limit' => env('WAF_PER_IP_RATE_LIMIT', 100),
        'per_ip_window' => env('WAF_RATE_LIMIT_WINDOW', 60),
        'login_limit' => env('WAF_LOGIN_RATE_LIMIT', 5),
        'login_window' => env('WAF_LOGIN_RATE_WINDOW', 60),
        'api_limit' => env('WAF_API_RATE_LIMIT', 100),
        'api_window' => env('WAF_API_RATE_WINDOW', 60),
    ],

    'headers' => [
        'x_frame_options' => 'SAMEORIGIN',
        'x_content_type_options' => 'nosniff',
        'x_xss_protection' => '1; mode=block',
        'strict_transport_security' => 'max-age=31536000; includeSubDomains',
        'content_security_policy' => "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
        'referrer_policy' => 'strict-origin-when-cross-origin',
        'permissions_policy' => 'geolocation=(), microphone=(), camera=()',
    ],

    'audit_log' => [
        'enabled' => env('SECURITY_AUDIT_ENABLED', true),
        'retention_days' => env('SECURITY_AUDIT_RETENTION', 90),
        'log_successful_logins' => env('SECURITY_LOG_LOGINS', true),
        'log_failed_logins' => env('SECURITY_LOG_FAILED_LOGINS', true),
        'log_password_changes' => env('SECURITY_LOG_PASSWORD_CHANGES', true),
        'log_permission_changes' => env('SECURITY_LOG_PERMISSIONS', true),
        'log_suspicious_activity' => env('SECURITY_LOG_SUSPICIOUS', true),
    ],
];
