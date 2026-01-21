<?php

use App\Http\Controllers\RssFeedController;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

// RSS Feeds (vor dem Catch-all Route!)
Route::prefix('rss')->name('rss.')->group(function () {
    Route::get('/', [RssFeedController::class, 'index'])->name('feed');
    Route::get('/category/{slug}', [RssFeedController::class, 'category'])->name('category');
    Route::get('/tag/{slug}', [RssFeedController::class, 'tag'])->name('tag');
});

// Alle Routes werden durch die React SPA gehandelt
// Dieser Catch-all Route leitet alles an die Frontend-App weiter
Route::get('/{any?}', function () {
    // Versuche die index.html vom Frontend zu laden
    $indexPath = public_path('admin/index.html');

    if (File::exists($indexPath)) {
        return File::get($indexPath);
    }

    // Fallback: return view('spa');
    return response()->json([
        'message' => 'API is running. Please access the frontend at /admin',
        'api_docs' => '/api/v1/health'
    ]);
})->where('any', '.*');
