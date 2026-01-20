<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\PostController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\TagController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\DownloadController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\AdController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\PageController;
use App\Http\Controllers\Api\V1\CommentController;
use App\Http\Controllers\Api\V1\NewsletterController;
use App\Http\Controllers\Api\V1\RobotsTxtController;
use App\Http\Controllers\Api\V1\TwoFactorAuthController;
use App\Http\Controllers\Api\V1\BackupController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\ActivityLogController;
use App\Http\Controllers\Api\V1\SystemHealthController;
use App\Http\Controllers\Api\V1\AIController;
use App\Http\Controllers\Api\V1\PostShareController;
use App\Http\Controllers\Api\V1\PluginController;
use App\Http\Controllers\Api\V1\PasswordResetController;
use App\Http\Controllers\NewsletterSubscriptionController;
use App\Http\Controllers\SitemapController;

Route::prefix('v1')->group(function () {
    // Public Health Check (kein Rate Limit)
    Route::get('/health', function () {
        return response()->json(['status' => 'ok', 'timestamp' => now()]);
    })->withoutMiddleware('throttle:api');

    // Login mit striktem Rate Limit (5 Versuche/Minute)
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1');

    // Password Reset (public)
    Route::post('/auth/password/reset-request', [PasswordResetController::class, 'requestReset'])
        ->middleware('throttle:3,1'); // 3 attempts per minute
    Route::post('/auth/password/reset', [PasswordResetController::class, 'reset'])
        ->middleware('throttle:5,1');

    // Public comment creation with strict rate limiting (MOVED OUTSIDE auth group)
    Route::post('/comments', [CommentController::class, 'store'])
        ->middleware('throttle:10,1'); // 10 comments per minute max

    // Geschützte Routes mit Standard Rate Limit (100/Minute)
    Route::middleware(['auth:sanctum', 'throttle:100,1'])->group(function () {
        Route::apiResource('posts', PostController::class);
        Route::post('posts/bulk', [PostController::class, 'bulkStore']);
        Route::delete('posts/bulk', [PostController::class, 'bulkDestroy']);

        Route::apiResource('categories', CategoryController::class);

        Route::apiResource('tags', TagController::class);

        // Media Uploads mit eigenem Rate Limit (20/Minute)
        Route::apiResource('media', MediaController::class)
            ->middleware('throttle:20,1');
        Route::post('media/bulk-upload', [MediaController::class, 'bulkUpload'])
            ->middleware('throttle:20,1');

        Route::apiResource('downloads', DownloadController::class);

        Route::apiResource('ads', AdController::class);

        Route::post('/auth/refresh', [AuthController::class, 'refresh']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        // User management - Admin only
        Route::apiResource('users', UserController::class)
            ->middleware('role:admin,super_admin');

        // Analytics
        Route::prefix('analytics')->group(function () {
            Route::get('/stats', [AnalyticsController::class, 'stats']);
            Route::get('/posts/{id}', [AnalyticsController::class, 'postStats']);
            Route::get('/export', [AnalyticsController::class, 'export']);
        });

        Route::post('/analytics/track', [AnalyticsController::class, 'track'])
            ->withoutMiddleware('auth:sanctum'); // Track Endpoint kann public sein

        // Search (mit geringerem Rate Limit für öffentliche Suche)
        Route::get('/search', [SearchController::class, 'search'])
            ->withoutMiddleware('auth:sanctum')
            ->middleware('throttle:60,1');
        Route::get('/search/suggestions', [SearchController::class, 'suggestions'])
            ->withoutMiddleware('auth:sanctum')
            ->middleware('throttle:60,1');
        Route::get('/search/related/{id}', [SearchController::class, 'relatedPosts'])
            ->withoutMiddleware('auth:sanctum');
        Route::get('/search/trending', [SearchController::class, 'trending'])
            ->withoutMiddleware('auth:sanctum');

        // Admin Search Stats (auth required)
        Route::get('/search/stats', [SearchController::class, 'stats']);
        Route::get('/search/advanced', [SearchController::class, 'advancedSearch']);

        // Pages Management
        Route::apiResource('pages', PageController::class);
        Route::get('/pages/menu', [PageController::class, 'menu'])->withoutMiddleware('auth:sanctum');

        // Comments Management (authenticated users)
        Route::apiResource('comments', CommentController::class)->except(['store']);
        Route::post('/comments/{id}/approve', [CommentController::class, 'approve'])
            ->middleware('role:admin,super_admin,editor');
        Route::post('/comments/{id}/reject', [CommentController::class, 'reject'])
            ->middleware('role:admin,super_admin,editor');
        Route::post('/comments/{id}/spam', [CommentController::class, 'markAsSpam'])
            ->middleware('role:admin,super_admin,editor');

        // Newsletter Management - Admin/Editor only
        Route::prefix('newsletters')->middleware('role:admin,super_admin,editor')->group(function () {
            Route::get('/', [NewsletterController::class, 'index']);
            Route::post('/', [NewsletterController::class, 'store']);
            Route::get('/stats', [NewsletterController::class, 'getStats']);
            Route::get('/{id}', [NewsletterController::class, 'show']);
            Route::put('/{id}', [NewsletterController::class, 'update']);
            Route::delete('/{id}', [NewsletterController::class, 'destroy']);
            Route::post('/{id}/send', [NewsletterController::class, 'send']);
        });

        Route::prefix('newsletter')->middleware('role:admin,super_admin,editor')->group(function () {
            Route::get('/subscribers', [NewsletterController::class, 'subscribers']);
            Route::get('/subscribers/{id}', [NewsletterController::class, 'showSubscriber']);
            Route::put('/subscribers/{id}', [NewsletterController::class, 'updateSubscriber']);
            Route::delete('/subscribers/{id}', [NewsletterController::class, 'deleteSubscriber']);
            Route::get('/subscribers/export', [NewsletterController::class, 'exportSubscribers']);
        });

        // Robots.txt Management - Admin only
        Route::prefix('seo')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/robots', [RobotsTxtController::class, 'index']);
            Route::post('/robots/validate', [RobotsTxtController::class, 'validateContent']);
            Route::put('/robots', [RobotsTxtController::class, 'update']);
            Route::post('/robots/reset', [RobotsTxtController::class, 'reset']);
        });

        // Two-Factor Authentication
        Route::prefix('2fa')->group(function () {
            Route::get('/status', [TwoFactorAuthController::class, 'status']);
            Route::post('/setup', [TwoFactorAuthController::class, 'setup']);
            Route::post('/confirm', [TwoFactorAuthController::class, 'confirm']);
            Route::post('/verify', [TwoFactorAuthController::class, 'verify']);
            Route::post('/disable', [TwoFactorAuthController::class, 'disable']);
            Route::get('/recovery-codes', [TwoFactorAuthController::class, 'recoveryCodes']);
            Route::post('/recovery-codes/regenerate', [TwoFactorAuthController::class, 'regenerateRecoveryCodes']);
        });

        // Backup Management - Super Admin only
        Route::prefix('backups')->middleware('role:super_admin')->group(function () {
            Route::get('/', [BackupController::class, 'index']);
            Route::post('/', [BackupController::class, 'store']);
            Route::get('/stats', [BackupController::class, 'stats']);
            Route::get('/{id}', [BackupController::class, 'show']);
            Route::post('/{id}/restore', [BackupController::class, 'restore']);
            Route::get('/{id}/download', [BackupController::class, 'download']);
            Route::delete('/{id}', [BackupController::class, 'destroy']);
        });

        // Settings Management - Admin only
        Route::prefix('settings')->group(function () {
            Route::get('/public', [SettingsController::class, 'public'])->withoutMiddleware('auth:sanctum');
            Route::middleware('role:admin,super_admin')->group(function () {
                Route::get('/', [SettingsController::class, 'index']);
                Route::post('/bulk', [SettingsController::class, 'updateBulk']);
                Route::get('/{key}', [SettingsController::class, 'show']);
                Route::put('/{key}', [SettingsController::class, 'update']);
                Route::post('/{key}/reset', [SettingsController::class, 'reset']);
            });
        });

        // Activity Log Management - Admin only
        Route::prefix('activity-logs')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/', [ActivityLogController::class, 'index']);
            Route::get('/stats', [ActivityLogController::class, 'stats']);
            Route::get('/export', [ActivityLogController::class, 'export']);
            Route::post('/clean', [ActivityLogController::class, 'clean']);
            Route::get('/{id}', [ActivityLogController::class, 'show']);
        });

        // System Health Monitoring - Admin only
        Route::prefix('system')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/health', [SystemHealthController::class, 'index']);
            Route::get('/ping', [SystemHealthController::class, 'ping']);
        });

        // AI Assistant Features - Author and above
        Route::prefix('ai')->middleware('role:author,editor,admin,super_admin')->group(function () {
            Route::post('/generate-content', [AIController::class, 'generateContent']);
            Route::post('/generate-summary', [AIController::class, 'generateSummary']);
            Route::post('/generate-keywords', [AIController::class, 'generateKeywords']);
            Route::post('/generate-meta-description', [AIController::class, 'generateMetaDescription']);
            Route::post('/suggest-related', [AIController::class, 'suggestRelated']);
            Route::post('/proofread', [AIController::class, 'proofread']);
            Route::post('/generate-ideas', [AIController::class, 'generateIdeas']);
        });

        // Post Sharing
        Route::prefix('posts')->group(function () {
            Route::get('/{post}/shares', [PostShareController::class, 'index']);
            Route::get('/{post}/shares/stats', [PostShareController::class, 'getStats']);
            Route::post('/{post}/shares/generate', [PostShareController::class, 'generateLink']);
            Route::post('/{post}/shares/bulk', [PostShareController::class, 'bulkShare']);
            Route::get('/{post}/shares/qr', [PostShareController::class, 'getQrCode']);
            Route::post('/shares/track', [PostShareController::class, 'trackClick']);
            Route::delete('/shares/{share}', [PostShareController::class, 'destroy']);
        });

        // Plugin Management - Admin/Super Admin only
        Route::prefix('plugins')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/', [PluginController::class, 'index']);
            Route::get('/stats', [PluginController::class, 'getStats']);
            Route::get('/hooks', [PluginController::class, 'getHooks']);
            Route::get('/hooks/available', [PluginController::class, 'getAvailableHooks']);
            // Plugin installation and uninstallation - Super Admin only
            Route::middleware('role:super_admin')->group(function () {
                Route::post('/', [PluginController::class, 'install']);
                Route::post('/hooks', [PluginController::class, 'registerHook']);
                Route::delete('/{plugin}', [PluginController::class, 'uninstall']);
            });
            Route::get('/{plugin}', [PluginController::class, 'show']);
            Route::put('/{plugin}/config', [PluginController::class, 'updateConfig']);
            Route::post('/{plugin}/activate', [PluginController::class, 'activate']);
            Route::post('/{plugin}/deactivate', [PluginController::class, 'deactivate']);
        });
    });

    // Public Newsletter Subscription (Double-Opt-in)
    Route::post('/newsletter/subscribe', [NewsletterSubscriptionController::class, 'subscribe']);
    Route::get('/newsletter/confirm/{token}', [NewsletterSubscriptionController::class, 'confirm']);
    Route::get('/newsletter/unsubscribe/{token}', [NewsletterSubscriptionController::class, 'unsubscribe']);
    Route::get('/newsletter/status', [NewsletterSubscriptionController::class, 'status']);

    // Newsletter Tracking (öffentlich für Pixel-Tracking)
    Route::get('/newsletter/track/open/{id}', [NewsletterSubscriptionController::class, 'trackOpen']);
    Route::get('/newsletter/track/click/{id}', [NewsletterSubscriptionController::class, 'trackClick']);

    // Öffentlicher Download ohne Auth aber mit Rate Limit (100/Minute)
    Route::get('dl/{token}', [DownloadController::class, 'download'])
        ->middleware('throttle:100,1');

    // Sitemap (öffentlich)
    Route::get('/sitemap.xml', [SitemapController::class, 'index']);

    // Robots.txt (öffentlich)
    Route::get('/robots.txt', [RobotsTxtController::class, 'show']);
});
