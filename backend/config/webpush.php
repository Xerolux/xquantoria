<?php

return [
    'enabled' => env('WEBPUSH_ENABLED', true),
    
    'vapid' => [
        'subject' => env('VAPID_SUBJECT', env('APP_URL')),
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
    ],

    'options' => [
        'TTL' => env('WEBPUSH_TTL', 86400),
        'urgency' => env('WEBPUSH_URGENCY', 'normal'),
        'batch_size' => env('WEBPUSH_BATCH_SIZE', 100),
    ],

    'retry' => [
        'enabled' => env('WEBPUSH_RETRY_ENABLED', true),
        'max_attempts' => env('WEBPUSH_MAX_ATTEMPTS', 3),
        'delay' => env('WEBPUSH_RETRY_DELAY', 300),
    ],

    'notifications' => [
        'default_icon' => env('WEBPUSH_DEFAULT_ICON', '/icons/icon-192x192.png'),
        'default_badge' => env('WEBPUSH_DEFAULT_BADGE', '/icons/badge-72x72.png'),
        'auto_notify_new_posts' => env('WEBPUSH_AUTO_NOTIFY_POSTS', false),
    ],
];
