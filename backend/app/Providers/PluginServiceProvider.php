<?php

namespace App\Providers;

use App\Services\Plugin\PluginInstaller;
use App\Services\Plugin\PluginManager;
use App\Services\Plugin\PluginMarketplace;
use App\Services\Plugin\PluginScheduler;
use Illuminate\Support\ServiceProvider;

class PluginServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PluginManager::class, function ($app) {
            return new PluginManager();
        });

        $this->app->singleton(PluginInstaller::class, function ($app) {
            return new PluginInstaller($app->make(PluginManager::class));
        });

        $this->app->singleton(PluginMarketplace::class, function ($app) {
            return new PluginMarketplace();
        });

        $this->app->singleton(PluginScheduler::class, function ($app) {
            return new PluginScheduler();
        });
    }

    public function boot(): void
    {
        if (!$this->app->runningInConsole()) {
            $this->app->make(PluginManager::class);
        }

        $this->publishes([
            __DIR__ . '/../../config/plugins.php' => config_path('plugins.php'),
        ], 'plugins-config');

        $this->loadViewsFrom(base_path('plugins'), 'plugins');

        if ($this->app->runningInConsole()) {
            $this->commands([
                \App\Console\Commands\PluginMakeCommand::class,
                \App\Console\Commands\PluginListCommand::class,
                \App\Console\Commands\PluginActivateCommand::class,
                \App\Console\Commands\PluginDeactivateCommand::class,
            ]);
        }
    }
}
