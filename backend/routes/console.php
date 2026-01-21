<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Schedule;
use App\Console\Commands\PublishScheduledPosts;

// Inspiring quote command
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Scheduled tasks
Schedule::command('posts:publish-scheduled')
    ->everyMinute()
    ->description('Check and publish scheduled posts and pages')
    ->withoutOverlapping();

// Cleanup tasks
Schedule::command('queue:retry all')
    ->everyFiveMinutes()
    ->description('Retry failed queue jobs');

Schedule::call(function () {
    \App\Services\PostRevisionService::make()->cleanupOldAutoSaves();
})->daily()
    ->description('Clean up old auto-save revisions');

Schedule::call(function () {
    \App\Services\RememberTokenService::make()->cleanupExpiredTokens();
})->monthly()
    ->description('Clean up expired remember tokens');
