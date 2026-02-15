<?php

return [
    'default' => env('REVERB_SERVER', 'reverb'),

    'servers' => [
        'reverb' => [
            'host' => env('REVERB_HOST', '0.0.0.0'),
            'port' => env('REVERB_PORT', 8080),
            'hostname' => env('REVERB_HOSTNAME', 'localhost'),
            'options' => [
                'tls' => [],
            ],
            'max_request_size' => env('REVERB_MAX_REQUEST_SIZE', 10_000),
            'scaling' => [
                'enabled' => env('REVERB_SCALING_ENABLED', false),
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server' => [
                    'url' => env('REDIS_URL'),
                    'host' => env('REDIS_HOST', '127.0.0.1'),
                    'port' => env('REDIS_PORT', 6379),
                    'password' => env('REDIS_PASSWORD'),
                ],
            ],
            'pulse_interval' => env('REVERB_PULSE_INTERVAL', 60),
            'max_memory' => env('REVERB_MAX_MEMORY', 128),
        ],
    ],

    'apps' => [
        'default' => [
            'app_id' => env('REVERB_APP_ID', 'xquantoria-cms'),
            'app_key' => env('REVERB_APP_KEY', 'xquantoria'),
            'app_secret' => env('REVERB_APP_SECRET', 'xquantoria-secret'),
            'capacity' => env('REVERB_CAPACITY', null),
            'enable_client_messages' => env('REVERB_CLIENT_MESSAGES', true),
            'enable_http_api' => env('REVERB_HTTP_API', true),
            'max_backend_events_per_second' => env('REVERB_BACKEND_EVENTS_PER_SECOND', 100),
            'max_client_events_per_second' => env('REVERB_CLIENT_EVENTS_PER_SECOND', 100),
            'max_read_requests_per_second' => env('REVERB_READ_REQUESTS_PER_SECOND', 100),
            'webhooks' => [
                [
                    'url' => env('REVERB_WEBHOOK_URL'),
                    'events' => ['client_event', 'channel_occupied', 'channel_vacated'],
                ],
            ],
        ],
    ],
];
