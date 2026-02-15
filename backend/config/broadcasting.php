<?php

return [
    'default' => env('BROADCAST_CONNECTION', 'reverb'),

    'connections' => [
        'pusher' => [
            'driver' => 'pusher',
            'key' => env('PUSHER_APP_KEY'),
            'secret' => env('PUSHER_APP_SECRET'),
            'app_id' => env('PUSHER_APP_ID'),
            'options' => [
                'cluster' => env('PUSHER_APP_CLUSTER', 'eu'),
                'host' => env('PUSHER_HOST') ?: 'api-'.env('PUSHER_APP_CLUSTER', 'eu').'.pusher.com',
                'port' => env('PUSHER_PORT', 443),
                'scheme' => env('PUSHER_SCHEME', 'https'),
                'encrypted' => true,
                'useTLS' => true,
            ],
            'client_options' => [],
        ],

        'ably' => [
            'driver' => 'ably',
            'key' => env('ABLY_KEY'),
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_HOST', '127.0.0.1'),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'encrypted' => true,
            ],
            'client_options' => [],
        ],

        'soketi' => [
            'driver' => 'pusher',
            'key' => env('SOKETI_APP_KEY', 'app-key'),
            'secret' => env('SOKETI_APP_SECRET', 'app-secret'),
            'app_id' => env('SOKETI_APP_ID', 'app-id'),
            'options' => [
                'host' => env('SOKETI_HOST', '127.0.0.1'),
                'port' => env('SOKETI_PORT', 6001),
                'scheme' => env('SOKETI_SCHEME', 'http'),
                'encrypted' => true,
            ],
        ],
    ],
];
