<?php

return [
    'default' => env('PAYMENT_GATEWAY', 'stripe'),

    'currency' => env('PAYMENT_CURRENCY', 'EUR'),

    'tax_rate' => env('PAYMENT_TAX_RATE', 19),

    'gateways' => [
        'stripe' => [
            'enabled' => env('STRIPE_ENABLED', true),
            'publishable_key' => env('STRIPE_KEY'),
            'secret_key' => env('STRIPE_SECRET'),
            'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
            'test_mode' => env('STRIPE_TEST_MODE', true),
            'fee_percent' => env('STRIPE_FEE_PERCENT', 2.9),
            'fee_fixed' => env('STRIPE_FEE_FIXED', 0.30),
            'payment_methods' => ['card', 'sepa_debit', 'sofort', 'giropay'],
        ],

        'paypal' => [
            'enabled' => env('PAYPAL_ENABLED', true),
            'client_id' => env('PAYPAL_CLIENT_ID'),
            'client_secret' => env('PAYPAL_CLIENT_SECRET'),
            'webhook_id' => env('PAYPAL_WEBHOOK_ID'),
            'test_mode' => env('PAYPAL_TEST_MODE', true),
        ],
    ],

    'status_mapping' => [
        'pending' => 'Pending',
        'processing' => 'Processing',
        'completed' => 'Completed',
        'failed' => 'Failed',
        'refunded' => 'Refunded',
        'partially_refunded' => 'Partially Refunded',
        'cancelled' => 'Cancelled',
        'disputed' => 'Disputed',
    ],

    'refund_reasons' => [
        'requested_by_customer' => 'Requested by Customer',
        'duplicate' => 'Duplicate Payment',
        'fraudulent' => 'Fraudulent Transaction',
        'other' => 'Other',
    ],

    'webhooks' => [
        'retry_attempts' => env('PAYMENT_WEBHOOK_RETRIES', 3),
        'retry_delay' => env('PAYMENT_WEBHOOK_RETRY_DELAY', 300),
    ],

    'notifications' => [
        'admin_on_payment' => env('PAYMENT_NOTIFY_ADMIN', true),
        'customer_on_success' => env('PAYMENT_NOTIFY_CUSTOMER', true),
        'admin_on_refund' => env('REFUND_NOTIFY_ADMIN', true),
    ],
];
