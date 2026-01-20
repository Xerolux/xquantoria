<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Account Lockout Configuration
    |--------------------------------------------------------------------------
    |
    | Configure the account lockout behavior after failed login attempts.
    |
    */

    'lockout' => [
        // Maximum failed login attempts before account lockout
        'max_attempts' => env('AUTH_LOCKOUT_MAX_ATTEMPTS', 5),

        // Duration of account lockout in minutes
        'duration_minutes' => env('AUTH_LOCKOUT_DURATION', 30),

        // Time window in minutes to count failed attempts
        'attempts_window' => env('AUTH_LOCKOUT_WINDOW', 15),
    ],
];
