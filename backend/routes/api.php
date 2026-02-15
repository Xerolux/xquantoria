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
use App\Http\Controllers\Api\V1\EmailVerificationController;
use App\Http\Controllers\Api\V1\SessionController;
use App\Http\Controllers\Api\V1\PostRevisionController;
use App\Http\Controllers\Api\V1\ScheduleController;
use App\Http\Controllers\Api\V1\LanguageController;
use App\Http\Controllers\Api\V1\ImageProcessingController;
use App\Http\Controllers\Api\V1\SocialMediaController;
use App\Http\Controllers\Api\V1\SeoController;
use App\Http\Controllers\Api\V1\TranslationController;
use App\Http\Controllers\Api\V1\WebhookController;
use App\Http\Controllers\Api\V1\PublicController;
use App\Http\Controllers\Api\V1\CollaborationController;
use App\Http\Controllers\Api\V1\LegalDocumentController;
use App\Http\Controllers\Api\V1\ShopController;
use App\Http\Controllers\Api\V1\ThemeController;
use App\Http\Controllers\Api\V1\ImportExportController;
use App\Http\Controllers\Api\V1\FormBuilderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\OAuthController;
use App\Http\Controllers\Api\V1\PushNotificationController;
use App\Http\Controllers\Api\V1\ABTestController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\MobileAppController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ElasticsearchController;
use App\Http\Controllers\Api\V1\QueueMonitorController;
use App\Http\Controllers\Api\V1\SchedulerController;
use App\Http\Controllers\Api\V1\PerformanceController;
use App\Http\Controllers\Api\V1\ContentApprovalController;
use App\Http\Controllers\NewsletterSubscriptionController;
use App\Http\Controllers\SitemapController;

Route::prefix('v1')->group(function () {
    // Public Website API (no auth required)
    Route::prefix('public')->group(function () {
        Route::get('/', [PublicController::class, 'homepage']);
        Route::get('/posts', [PublicController::class, 'posts']);
        Route::get('/posts/{slug}', [PublicController::class, 'post']);
        Route::get('/categories', [PublicController::class, 'categories']);
        Route::get('/categories/{slug}', [PublicController::class, 'category']);
        Route::get('/tags', [PublicController::class, 'tags']);
        Route::get('/tags/{slug}', [PublicController::class, 'tag']);
        Route::get('/pages/{slug}', [PublicController::class, 'page']);
        Route::get('/menu', [PublicController::class, 'menu']);
        Route::get('/search', [PublicController::class, 'search']);
        Route::get('/archive', [PublicController::class, 'archive']);
        Route::get('/authors/{id}', [PublicController::class, 'author']);
        Route::post('/subscribe', [PublicController::class, 'subscribe']);
        Route::get('/feed', [PublicController::class, 'feed']);
    });

    // Public Health Check (kein Rate Limit)
    Route::get('/health', function () {
        return response()->json(['status' => 'ok', 'timestamp' => now()]);
    })->withoutMiddleware('throttle:api');

    // Registration (public)
    Route::post('/auth/register', [AuthController::class, 'register'])
        ->middleware('throttle:5,1'); // 5 registrations per minute

    // Language (public)
    Route::get('/languages', [LanguageController::class, 'index']);
    Route::get('/languages/current', [LanguageController::class, 'current']);
    Route::get('/languages/localize-url', [LanguageController::class, 'getLocalizedUrl']);

    // Login mit striktem Rate Limit (5 Versuche/Minute)
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1');

    // Login with remember token (public)
    Route::post('/auth/login/remember', [AuthController::class, 'loginWithRememberToken'])
        ->middleware('throttle:10,1');

    // Email Verification (public)
    Route::post('/auth/email/verify', [EmailVerificationController::class, 'verify'])
        ->middleware('throttle:10,1');

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
        Route::post('posts/{id}/auto-save', [PostController::class, 'autoSave']);

        // Post Revisions
        Route::prefix('posts/{postId}/revisions')->group(function () {
            Route::get('/', [PostRevisionController::class, 'index']);
            Route::post('/', [PostRevisionController::class, 'store']);
            Route::get('/stats', [PostRevisionController::class, 'stats']);
            Route::get('/compare', [PostRevisionController::class, 'compare']);
            Route::get('/check-conflict', [PostRevisionController::class, 'checkConflict']);
            Route::get('/{revisionId}', [PostRevisionController::class, 'show']);
            Route::post('/{revisionId}/restore', [PostRevisionController::class, 'restore']);
            Route::delete('/{revisionId}', [PostRevisionController::class, 'destroy']);
        });

        // Post Translations
        Route::prefix('posts/{id}/translations')->group(function () {
            Route::get('/', [TranslationController::class, 'translations']);
            Route::post('/', [TranslationController::class, 'translate']);
            Route::get('/detect', [TranslationController::class, 'detect']);
        });
        Route::post('translations/link', [TranslationController::class, 'link']);
        Route::get('translations/languages', [TranslationController::class, 'languages']);

        Route::apiResource('categories', CategoryController::class);

        Route::apiResource('tags', TagController::class);

        // Media Uploads mit eigenem Rate Limit (20/Minute)
        Route::apiResource('media', MediaController::class)
            ->middleware('throttle:20,1');
        Route::post('media/bulk-upload', [MediaController::class, 'bulkUpload'])
            ->middleware('throttle:20,1');

        // Image Processing
        Route::prefix('media/{id}/')->group(function () {
            Route::post('thumbnails', [ImageProcessingController::class, 'generateThumbnails']);
            Route::post('crop', [ImageProcessingController::class, 'crop']);
            Route::post('resize', [ImageProcessingController::class, 'resize']);
            Route::post('rotate', [ImageProcessingController::class, 'rotate']);
            Route::post('flip', [ImageProcessingController::class, 'flip']);
            Route::post('optimize', [ImageProcessingController::class, 'optimize']);
            Route::post('convert-webp', [ImageProcessingController::class, 'convertToWebP']);
            Route::post('blurhash', [ImageProcessingController::class, 'generateBlurhash']);
            Route::get('srcset', [ImageProcessingController::class, 'getSrcset']);
        });

        Route::prefix('image-processing')->group(function () {
            Route::post('/batch-optimize', [ImageProcessingController::class, 'batchOptimize']);
            Route::get('/stats', [ImageProcessingController::class, 'stats']);
            Route::post('/generate-all-blurhashes', [ImageProcessingController::class, 'generateAllBlurhashes']);
            Route::post('/auto-optimize-all', [ImageProcessingController::class, 'autoOptimizeAll']);
        });


        Route::apiResource('downloads', DownloadController::class);

        Route::apiResource('ads', AdController::class);

        // Legal Document Generator
        Route::prefix('legal-documents')->group(function () {
            Route::get('/', [LegalDocumentController::class, 'index']);
            Route::get('/types', [LegalDocumentController::class, 'types']);
            Route::get('/{type}/form-fields', [LegalDocumentController::class, 'formFields']);
            Route::post('/{type}/preview', [LegalDocumentController::class, 'preview']);
            Route::post('/{type}/generate', [LegalDocumentController::class, 'generate']);
            Route::get('/{id}', [LegalDocumentController::class, 'show']);
            Route::put('/{id}', [LegalDocumentController::class, 'update']);
            Route::delete('/{id}', [LegalDocumentController::class, 'destroy']);
            Route::post('/{id}/publish', [LegalDocumentController::class, 'publish']);
            Route::post('/{id}/unpublish', [LegalDocumentController::class, 'unpublish']);
            Route::post('/{id}/duplicate', [LegalDocumentController::class, 'duplicate']);
            Route::get('/{id}/export/{format?}', [LegalDocumentController::class, 'export']);
        });

        // E-Commerce / Shop
        Route::prefix('shop')->group(function () {
            Route::get('/products', [ShopController::class, 'products']);
            Route::get('/products/{slug}', [ShopController::class, 'product']);
            Route::get('/categories', [ShopController::class, 'categories']);
            Route::get('/categories/{slug}', [ShopController::class, 'category']);
            Route::get('/cart', [ShopController::class, 'getCart']);
            Route::post('/cart/add', [ShopController::class, 'addToCart']);
            Route::put('/cart/update', [ShopController::class, 'updateCartItem']);
            Route::delete('/cart/remove', [ShopController::class, 'removeFromCart']);
            Route::delete('/cart/clear', [ShopController::class, 'clearCart']);
            Route::post('/coupon/apply', [ShopController::class, 'applyCoupon']);
            Route::post('/checkout', [ShopController::class, 'checkout']);
            Route::get('/orders', [ShopController::class, 'orders']);
            Route::get('/orders/{id}', [ShopController::class, 'order']);
            Route::put('/orders/{id}/status', [ShopController::class, 'updateOrderStatus']);
        });

        // Payment System
        Route::prefix('payments')->group(function () {
            Route::get('/config', [PaymentController::class, 'getConfig']);
            Route::post('/stripe/create-intent', [PaymentController::class, 'createStripeIntent']);
            Route::post('/stripe/confirm', [PaymentController::class, 'confirmStripePayment']);
            Route::post('/paypal/create-order', [PaymentController::class, 'createPayPalOrder']);
            Route::post('/paypal/capture', [PaymentController::class, 'capturePayPalOrder']);
            Route::get('/transactions', [PaymentController::class, 'getTransactions']);
            Route::get('/transactions/{id}', [PaymentController::class, 'getTransaction']);
            Route::get('/stats', [PaymentController::class, 'getStats']);
            Route::get('/refunds', [PaymentController::class, 'getRefunds']);
            
            // Admin only - Refunds
            Route::middleware('role:admin,super_admin')->group(function () {
                Route::post('/refund', [PaymentController::class, 'createRefund']);
            });
        });

        // Payment Webhooks (public, no auth)
        Route::post('/webhooks/stripe', [PaymentController::class, 'stripeWebhook'])
            ->withoutMiddleware(['auth:sanctum', 'throttle:100,1']);
        Route::post('/webhooks/paypal', [PaymentController::class, 'paypalWebhook'])
            ->withoutMiddleware(['auth:sanctum', 'throttle:100,1']);

        // Theme System
        Route::prefix('themes')->group(function () {
            Route::get('/', [ThemeController::class, 'index']);
            Route::post('/', [ThemeController::class, 'store']);
            Route::get('/active', [ThemeController::class, 'getActive']);
            Route::post('/import', [ThemeController::class, 'import']);
            Route::get('/{id}', [ThemeController::class, 'show']);
            Route::put('/{id}', [ThemeController::class, 'update']);
            Route::delete('/{id}', [ThemeController::class, 'destroy']);
            Route::post('/{id}/activate', [ThemeController::class, 'activate']);
            Route::post('/{id}/duplicate', [ThemeController::class, 'duplicate']);
            Route::get('/{id}/settings', [ThemeController::class, 'getSettings']);
            Route::post('/{id}/settings', [ThemeController::class, 'updateSetting']);
            Route::delete('/{id}/settings', [ThemeController::class, 'resetSettings']);
            Route::get('/{id}/templates', [ThemeController::class, 'templates']);
            Route::post('/{id}/templates', [ThemeController::class, 'storeTemplate']);
            Route::put('/{id}/templates/{templateId}', [ThemeController::class, 'updateTemplate']);
            Route::delete('/{id}/templates/{templateId}', [ThemeController::class, 'destroyTemplate']);
            Route::get('/{id}/export', [ThemeController::class, 'export']);
        });

        // Form Builder
        Route::prefix('forms')->group(function () {
            Route::get('/', [FormBuilderController::class, 'index']);
            Route::post('/', [FormBuilderController::class, 'store']);
            Route::get('/{id}', [FormBuilderController::class, 'show']);
            Route::put('/{id}', [FormBuilderController::class, 'update']);
            Route::delete('/{id}', [FormBuilderController::class, 'destroy']);
            Route::post('/{id}/duplicate', [FormBuilderController::class, 'duplicate']);
            Route::get('/{id}/submissions', [FormBuilderController::class, 'submissions']);
            Route::get('/{id}/submissions/{submissionId}', [FormBuilderController::class, 'getSubmission']);
            Route::post('/{id}/submissions/{submissionId}/read', [FormBuilderController::class, 'markSubmissionRead']);
            Route::post('/{id}/submissions/{submissionId}/spam', [FormBuilderController::class, 'markSubmissionSpam']);
            Route::delete('/{id}/submissions/{submissionId}', [FormBuilderController::class, 'deleteSubmission']);
            Route::get('/{id}/export/{format?}', [FormBuilderController::class, 'exportSubmissions']);
        });

        // Import/Export
        Route::prefix('import-export')->group(function () {
            Route::get('/export/posts', [ImportExportController::class, 'exportPosts']);
            Route::get('/export/categories', [ImportExportController::class, 'exportCategories']);
            Route::get('/export/tags', [ImportExportController::class, 'exportTags']);
            Route::get('/export/users', [ImportExportController::class, 'exportUsers']);
            Route::get('/export/all', [ImportExportController::class, 'exportAll']);
            Route::post('/import/wordpress', [ImportExportController::class, 'importWordPress']);
            Route::post('/import/json', [ImportExportController::class, 'importJson']);
        });

        Route::post('/auth/refresh', [AuthController::class, 'refresh']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Email Verification (authenticated)
        Route::post('/auth/email/resend', [EmailVerificationController::class, 'sendVerificationEmail'])
            ->middleware('throttle:3,1'); // 3 resends per minute
        Route::get('/auth/email/status', [EmailVerificationController::class, 'status']);

        // Session Management
        Route::prefix('sessions')->group(function () {
            Route::get('/', [SessionController::class, 'index']);
            Route::delete('/{tokenId}', [SessionController::class, 'destroy']);
            Route::delete('/', [SessionController::class, 'destroyAll']);
            Route::post('/heartbeat', [SessionController::class, 'heartbeat']);
        });

        // Content Scheduling
        Route::prefix('schedule')->group(function () {
            Route::get('/', [ScheduleController::class, 'index']);
            Route::get('/stats', [ScheduleController::class, 'stats']);
            Route::get('/calendar', [ScheduleController::class, 'calendar']);
            Route::post('/posts/{postId}', [ScheduleController::class, 'schedulePost']);
            Route::put('/posts/{postId}/reschedule', [ScheduleController::class, 'reschedulePost']);
            Route::delete('/posts/{postId}/cancel', [ScheduleController::class, 'cancelScheduledPost']);
            Route::post('/check-overdue', [ScheduleController::class, 'checkOverdue'])
                ->middleware('role:super_admin,admin');
        });

        // Language & Translations
        Route::prefix('languages')->group(function () {
            Route::get('/stats', [LanguageController::class, 'stats']);
            Route::post('/set', [LanguageController::class, 'setLanguage']);
            Route::get('/translations', [LanguageController::class, 'translations']);
            Route::post('/translations', [LanguageController::class, 'createTranslation']);
        });

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

        // SEO Metadata - Public (get) and Protected (update)
        Route::prefix('seo')->group(function () {
            // Get SEO metadata for a post (public for published posts)
            Route::get('/posts/{id}', [SeoController::class, 'show']);
            Route::get('/posts/{id}/schema', [SeoController::class, 'schemaScript']);
            Route::get('/schema-types', [SeoController::class, 'schemaTypes']);
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
            // Content Generation
            Route::post('/generate-full-article', [AIController::class, 'generateFullArticle']);
            Route::post('/generate-content', [AIController::class, 'generateContent']);
            Route::post('/generate-ideas', [AIController::class, 'generateIdeas']);
            Route::post('/suggest-headlines', [AIController::class, 'suggestHeadlines']);

            // Content Analysis & Optimization
            Route::post('/optimize-seo', [AIController::class, 'optimizeSEO']);
            Route::post('/proofread', [AIController::class, 'proofread']);
            Route::post('/check-plagiarism', [AIController::class, 'checkPlagiarism']);
            Route::post('/analyze-sentiment', [AIController::class, 'analyzeSentiment']);

            // SEO & Metadata
            Route::post('/generate-summary', [AIController::class, 'generateSummary']);
            Route::post('/generate-keywords', [AIController::class, 'generateKeywords']);
            Route::post('/generate-tags', [AIController::class, 'generateTags']);
            Route::post('/generate-meta-description', [AIController::class, 'generateMetaDescription']);

            // Content Recommendations
            Route::post('/suggest-related', [AIController::class, 'suggestRelated']);

            // Translation
            Route::post('/translate-content', [AIController::class, 'translateContent']);

            // Image Generation
            Route::post('/generate-image', [AIController::class, 'generateImage']);

            // Chatbot & RAG
            Route::post('/chat', [AIController::class, 'chat']);
            Route::post('/rag-chat', [AIController::class, 'ragChat']);

            // Service Status
            Route::get('/check-availability', [AIController::class, 'checkAvailability']);
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

        Route::prefix('plugins')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/', [PluginController::class, 'index']);
            Route::get('/stats', [PluginController::class, 'getStats']);
            Route::get('/performance', [PluginController::class, 'getPerformance']);
            Route::get('/hooks', [PluginController::class, 'getHooks']);
            Route::get('/hooks/stats', [PluginController::class, 'getHookStats']);
            Route::post('/reorder', [PluginController::class, 'reorder']);
            Route::post('/bulk', [PluginController::class, 'bulkAction']);
            Route::post('/check-updates', [PluginController::class, 'checkUpdates']);
            Route::post('/auto-update', [PluginController::class, 'runAutoUpdate']);

            Route::middleware('role:super_admin')->group(function () {
                Route::post('/upload', [PluginController::class, 'upload']);
                Route::post('/install-marketplace', [PluginController::class, 'installFromMarketplace']);
                Route::delete('/{plugin}', [PluginController::class, 'uninstall']);
            });

            Route::get('/{plugin}', [PluginController::class, 'show']);
            Route::post('/{plugin}/activate', [PluginController::class, 'activate']);
            Route::post('/{plugin}/deactivate', [PluginController::class, 'deactivate']);
            Route::post('/{plugin}/update', [PluginController::class, 'update']);
            Route::put('/{plugin}/config', [PluginController::class, 'updateConfig']);
            Route::get('/{plugin}/settings', [PluginController::class, 'getSettings']);
            Route::put('/{plugin}/settings', [PluginController::class, 'updateSettings']);
            Route::post('/{plugin}/toggle-auto-update', [PluginController::class, 'toggleAutoUpdate']);
            Route::get('/{plugin}/export-config', [PluginController::class, 'exportConfig']);
            Route::post('/{plugin}/import-config', [PluginController::class, 'importConfig']);

            Route::prefix('marketplace')->group(function () {
                Route::get('/search', [PluginController::class, 'marketplaceSearch']);
                Route::get('/categories', [PluginController::class, 'marketplaceCategories']);
                Route::get('/featured', [PluginController::class, 'marketplaceFeatured']);
                Route::get('/popular', [PluginController::class, 'marketplacePopular']);
                Route::get('/new', [PluginController::class, 'marketplaceNew']);
                Route::get('/{id}', [PluginController::class, 'marketplaceGet']);
            });
        });

        // Social Media Management - Author and above
        Route::prefix('social-media')->middleware('role:author,editor,admin,super_admin')->group(function () {
            Route::get('/stats', [SocialMediaController::class, 'getStats']);
            Route::post('/posts/{postId}/share', [SocialMediaController::class, 'sharePost']);
            Route::post('/posts/{postId}/schedule', [SocialMediaController::class, 'scheduleShare']);
            Route::get('/posts/{postId}/shares', [SocialMediaController::class, 'getPostShares']);
            Route::delete('/shares/{shareId}', [SocialMediaController::class, 'deleteShare']);
            Route::post('/batch-share', [SocialMediaController::class, 'batchShare']);
        });

        // Content Workflow - Editor and above
        Route::prefix('workflow')->middleware('role:editor,admin,super_admin')->group(function () {
            Route::get('/stats', [\App\Http\Controllers\Api\V1\WorkflowController::class, 'getStats']);
            Route::get('/calendar', [\App\Http\Controllers\Api\V1\WorkflowController::class, 'getEditorialCalendar']);
            Route::post('/posts/{postId}/assign', [\App\Http\Controllers\Api\V1\WorkflowController::class, 'assignUser']);
            Route::post('/posts/{postId}/submit', [\App\Http\Controllers\Api\V1\WorkflowController::class, 'submitForReview']);
            Route::post('/posts/{postId}/approve', [\App\Http\Controllers\Api\V1\WorkflowController::class, 'approvePost']);
            Route::post('/posts/{postId}/request-changes', [\App\Http\Controllers\Api\V1\WorkflowController::class, 'requestChanges']);
            Route::get('/posts/{postId}/seo-score', [\App\Http\Controllers\Api\V1\WorkflowController::class, 'getSEOScore']);
        });

        // Webhook Management - Admin and above
        Route::prefix('webhooks')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/', [WebhookController::class, 'index']);
            Route::get('/events', [WebhookController::class, 'events']);
            Route::post('/', [WebhookController::class, 'store']);
            Route::get('/{webhook}', [WebhookController::class, 'show']);
            Route::put('/{webhook}', [WebhookController::class, 'update']);
            Route::delete('/{webhook}', [WebhookController::class, 'destroy']);
            Route::post('/{webhook}/test', [WebhookController::class, 'test']);
            Route::post('/{webhook}/retry', [WebhookController::class, 'retry']);
            Route::post('/{webhook}/toggle', [WebhookController::class, 'toggle']);
            Route::post('/{webhook}/regenerate-secret', [WebhookController::class, 'regenerateSecret']);
            Route::get('/{webhook}/stats', [WebhookController::class, 'stats']);
            Route::get('/{webhook}/logs', [WebhookController::class, 'logs']);
            Route::get('/{webhook}/logs/{log}', [WebhookController::class, 'log']);
        });

        // Collaboration - Real-time editing
        Route::prefix('collaboration')->group(function () {
            Route::post('/{documentId}/join', [CollaborationController::class, 'join']);
            Route::post('/{documentId}/leave', [CollaborationController::class, 'leave']);
            Route::post('/{documentId}/cursor', [CollaborationController::class, 'cursor']);
            Route::post('/{documentId}/block', [CollaborationController::class, 'block']);
            Route::post('/{documentId}/selection', [CollaborationController::class, 'selection']);
            Route::post('/{documentId}/sync', [CollaborationController::class, 'sync']);
            Route::post('/{documentId}/heartbeat', [CollaborationController::class, 'heartbeat']);
            Route::get('/{documentId}/users', [CollaborationController::class, 'users']);
            Route::get('/{documentId}/state', [CollaborationController::class, 'state']);
        });

        // OAuth - Social Login
        Route::prefix('oauth')->group(function () {
            Route::get('/{provider}/redirect', [OAuthController::class, 'redirectToProvider']);
            Route::get('/{provider}/callback', [OAuthController::class, 'handleProviderCallback']);
            Route::post('/{provider}/mobile', [OAuthController::class, 'handleMobileAuth']);
            Route::post('/{provider}/link', [OAuthController::class, 'linkProvider']);
            Route::delete('/{provider}/unlink', [OAuthController::class, 'unlinkProvider']);
            Route::get('/providers', [OAuthController::class, 'getLinkedProviders']);
        });

        // Push Notifications
        Route::prefix('push-notifications')->group(function () {
            Route::get('/vapid-key', [PushNotificationController::class, 'getVapidPublicKey']);
            Route::post('/subscribe', [PushNotificationController::class, 'subscribe']);
            Route::post('/unsubscribe', [PushNotificationController::class, 'unsubscribe']);
            Route::get('/subscriptions', [PushNotificationController::class, 'getSubscriptions']);
            Route::post('/subscriptions/{id}/toggle', [PushNotificationController::class, 'toggleSubscription']);
            Route::get('/history', [PushNotificationController::class, 'getNotificationHistory']);
            Route::post('/history/{id}/read', [PushNotificationController::class, 'markAsRead']);
            Route::post('/history/read-all', [PushNotificationController::class, 'markAllAsRead']);
        });

        // Dashboard Stats
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

        // Notifications
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
            Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
            Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
            Route::delete('/{id}', [NotificationController::class, 'destroy']);
        });

        // Elasticsearch
        Route::prefix('elasticsearch')->group(function () {
            Route::get('/search', [ElasticsearchController::class, 'search']);
            Route::get('/suggest', [ElasticsearchController::class, 'suggest']);
            Route::get('/status', [ElasticsearchController::class, 'status']);
            Route::post('/index', [ElasticsearchController::class, 'indexDocument']);
            Route::post('/bulk', [ElasticsearchController::class, 'bulkIndex']);
            Route::delete('/document', [ElasticsearchController::class, 'deleteDocument']);
            Route::post('/sync', [ElasticsearchController::class, 'syncIndex']);
            Route::post('/indices', [ElasticsearchController::class, 'createIndices']);
            Route::delete('/indices', [ElasticsearchController::class, 'deleteIndices']);
        });

        // A/B Testing
        Route::prefix('ab-tests')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/', [ABTestController::class, 'index']);
            Route::post('/', [ABTestController::class, 'store']);
            Route::get('/{id}', [ABTestController::class, 'show']);
            Route::put('/{id}', [ABTestController::class, 'update']);
            Route::delete('/{id}', [ABTestController::class, 'destroy']);
            Route::post('/{id}/start', [ABTestController::class, 'start']);
            Route::post('/{id}/pause', [ABTestController::class, 'pause']);
            Route::post('/{id}/complete', [ABTestController::class, 'complete']);
            Route::get('/{id}/results', [ABTestController::class, 'getResults']);
        });

        // A/B Testing - Public
        Route::prefix('ab')->group(function () {
            Route::get('/{testName}/variant', [ABTestController::class, 'getVariant']);
            Route::post('/{testName}/convert', [ABTestController::class, 'trackConversion']);
        });

        // Audit Log Export
        Route::prefix('audit-log')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/', [AuditLogController::class, 'index']);
            Route::get('/{id}', [AuditLogController::class, 'show']);
            Route::get('/export/csv', [AuditLogController::class, 'exportCsv']);
            Route::get('/export/pdf', [AuditLogController::class, 'exportPdf']);
            Route::get('/actions', [AuditLogController::class, 'getActions']);
            Route::get('/model-types', [AuditLogController::class, 'getModelTypes']);
            Route::get('/stats', [AuditLogController::class, 'getStats']);
            Route::post('/clean', [AuditLogController::class, 'cleanOld']);
        });

        // Queue Monitor - Admin only
        Route::prefix('queue-monitor')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/', [QueueMonitorController::class, 'index']);
            Route::get('/{queue}', [QueueMonitorController::class, 'show']);
            Route::post('/failed/{id}/retry', [QueueMonitorController::class, 'retry']);
            Route::delete('/failed/{id}', [QueueMonitorController::class, 'forget']);
            Route::delete('/failed', [QueueMonitorController::class, 'flush']);
            Route::delete('/{queue}/clear', [QueueMonitorController::class, 'clear']);
            Route::post('/{queue}/pause', [QueueMonitorController::class, 'pause']);
            Route::post('/{queue}/resume', [QueueMonitorController::class, 'resume']);
        });

        // Scheduler - Admin only
        Route::prefix('scheduler')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/', [SchedulerController::class, 'index']);
            Route::post('/run', [SchedulerController::class, 'run']);
            Route::post('/tasks/{task}/run', [SchedulerController::class, 'runTask']);
            Route::post('/enable', [SchedulerController::class, 'enable']);
            Route::post('/disable', [SchedulerController::class, 'disable']);
            Route::delete('/history', [SchedulerController::class, 'clearHistory']);
        });

        // Performance - Admin only
        Route::prefix('performance')->middleware('role:admin,super_admin')->group(function () {
            Route::get('/', [PerformanceController::class, 'index']);
            Route::get('/database', [PerformanceController::class, 'database']);
            Route::get('/cache', [PerformanceController::class, 'cache']);
            Route::post('/cache/clear', [PerformanceController::class, 'clearCache']);
            Route::post('/optimize', [PerformanceController::class, 'optimize']);
            Route::get('/opcache', [PerformanceController::class, 'opcache']);
            Route::post('/opcache/reset', [PerformanceController::class, 'resetOpcache']);
        });

        // Content Approval Workflow
        Route::prefix('content-approval')->middleware('role:admin,super_admin,editor')->group(function () {
            Route::get('/pending', [ContentApprovalController::class, 'pending']);
            Route::get('/stats', [ContentApprovalController::class, 'stats']);
            Route::post('/posts/{id}/approve', [ContentApprovalController::class, 'approve']);
            Route::post('/posts/{id}/reject', [ContentApprovalController::class, 'reject']);
            Route::post('/posts/{id}/request-changes', [ContentApprovalController::class, 'requestChanges']);
            Route::post('/comments/{id}/approve', [ContentApprovalController::class, 'approveComment']);
            Route::post('/comments/{id}/reject', [ContentApprovalController::class, 'rejectComment']);
            Route::get('/history', [ContentApprovalController::class, 'history']);
        });
    });

    // Mobile App API (public endpoints)
    Route::prefix('mobile')->group(function () {
        Route::get('/config', [MobileAppController::class, 'getConfig']);
        Route::get('/feed', [MobileAppController::class, 'getHomeFeed']);
        Route::get('/posts/{slug}', [MobileAppController::class, 'getPost']);
        Route::get('/categories/{slug}/posts', [MobileAppController::class, 'getCategoryPosts']);
        Route::get('/tags/{slug}/posts', [MobileAppController::class, 'getTagPosts']);
        Route::get('/search', [MobileAppController::class, 'search']);
        Route::get('/products', [MobileAppController::class, 'getShopProducts']);
        Route::get('/products/{slug}', [MobileAppController::class, 'getProduct']);
    });

    // Mobile App API (authenticated)
    Route::middleware(['auth:sanctum', 'throttle:100,1'])->group(function () {
        Route::prefix('mobile')->group(function () {
            Route::get('/orders', [MobileAppController::class, 'getOrders']);
            Route::get('/orders/{id}', [MobileAppController::class, 'getOrder']);
            Route::get('/profile', [MobileAppController::class, 'getUserProfile']);
            Route::put('/profile', [MobileAppController::class, 'updateUserProfile']);
            Route::post('/device/register', [MobileAppController::class, 'registerDevice']);
            Route::delete('/device/unregister', [MobileAppController::class, 'unregisterDevice']);
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
