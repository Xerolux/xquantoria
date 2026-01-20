<?php

namespace App\Providers;

use App\Models\Post;
use App\Models\User;
use App\Models\Download;
use App\Policies\PostPolicy;
use App\Policies\UserPolicy;
use App\Policies\DownloadPolicy;
use App\Policies\BackupPolicy;
use App\Policies\PluginPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Post::class => PostPolicy::class,
        User::class => UserPolicy::class,
        Download::class => DownloadPolicy::class,
        // BackupPolicy and PluginPolicy don't have models
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        // Register policies without models using Gate
        $this->registerGatePermissions();
    }

    /**
     * Register gate permissions for non-model policies.
     */
    protected function registerGatePermissions(): void
    {
        // Backup permissions
        \Illuminate\Support\Facades\Gate::define('backups.viewAny', [BackupPolicy::class, 'viewAny']);
        \Illuminate\Support\Facades\Gate::define('backups.view', [BackupPolicy::class, 'view']);
        \Illuminate\Support\Facades\Gate::define('backups.create', [BackupPolicy::class, 'create']);
        \Illuminate\Support\Facades\Gate::define('backups.restore', [BackupPolicy::class, 'restore']);
        \Illuminate\Support\Facades\Gate::define('backups.download', [BackupPolicy::class, 'download']);
        \Illuminate\Support\Facades\Gate::define('backups.delete', [BackupPolicy::class, 'delete']);
        \Illuminate\Support\Facades\Gate::define('backups.viewStats', [BackupPolicy::class, 'viewStats']);

        // Plugin permissions
        \Illuminate\Support\Facades\Gate::define('plugins.viewAny', [PluginPolicy::class, 'viewAny']);
        \Illuminate\Support\Facades\Gate::define('plugins.view', [PluginPolicy::class, 'view']);
        \Illuminate\Support\Facades\Gate::define('plugins.install', [PluginPolicy::class, 'install']);
        \Illuminate\Support\Facades\Gate::define('plugins.activate', [PluginPolicy::class, 'activate']);
        \Illuminate\Support\Facades\Gate::define('plugins.deactivate', [PluginPolicy::class, 'deactivate']);
        \Illuminate\Support\Facades\Gate::define('plugins.updateConfig', [PluginPolicy::class, 'updateConfig']);
        \Illuminate\Support\Facades\Gate::define('plugins.uninstall', [PluginPolicy::class, 'uninstall']);
        \Illuminate\Support\Facades\Gate::define('plugins.viewStats', [PluginPolicy::class, 'viewStats']);
        \Illuminate\Support\Facades\Gate::define('plugins.manageHooks', [PluginPolicy::class, 'manageHooks']);
    }
}
