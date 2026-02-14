<?php

namespace App\Services\Plugin;

use App\Models\Plugin;
use App\Models\PluginHook;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PluginScheduler
{
    protected string $pluginPath;

    public function __construct()
    {
        $this->pluginPath = base_path('plugins');
    }

    public function checkForUpdates(): array
    {
        $plugins = Plugin::where('status', 'active')
            ->where('auto_update', true)
            ->get();

        $updates = [];

        foreach ($plugins as $plugin) {
            $update = $this->checkPluginUpdate($plugin);
            if ($update) {
                $updates[] = $update;
            }
        }

        return $updates;
    }

    protected function checkPluginUpdate(Plugin $plugin): ?array
    {
        if (!$plugin->marketplace_id) {
            return null;
        }

        try {
            $apiUrl = config('cms.marketplace_url', 'https://marketplace.example.com/api/v1');
            $response = Http::timeout(10)->get("{$apiUrl}/plugins/{$plugin->marketplace_id}");

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();

            if (version_compare($data['version'], $plugin->version, '>')) {
                return [
                    'plugin_id' => $plugin->id,
                    'slug' => $plugin->slug,
                    'name' => $plugin->name,
                    'current_version' => $plugin->version,
                    'new_version' => $data['version'],
                    'changelog' => $data['changelog'] ?? null,
                    'download_url' => $data['download_url'] ?? null,
                ];
            }
        } catch (\Exception $e) {
            Log::error("Failed to check plugin update: {$plugin->slug}", ['error' => $e->getMessage()]);
        }

        return null;
    }

    public function autoUpdate(): int
    {
        $updates = $this->checkForUpdates();
        $updated = 0;

        foreach ($updates as $update) {
            try {
                $plugin = Plugin::find($update['plugin_id']);
                if (!$plugin || !$plugin->auto_update) {
                    continue;
                }

                $installer = app(PluginInstaller::class);
                $installer->update($plugin);
                $updated++;

                Log::info("Auto-updated plugin", [
                    'plugin' => $plugin->slug,
                    'from' => $update['current_version'],
                    'to' => $update['new_version'],
                ]);
            } catch (\Exception $e) {
                Log::error("Failed to auto-update plugin: {$update['slug']}", ['error' => $e->getMessage()]);
            }
        }

        return $updated;
    }

    public function cleanupOldFiles(): int
    {
        $cleaned = 0;
        $tempPath = storage_path('app/plugin-temp');

        if (File::exists($tempPath)) {
            $files = File::directories($tempPath);
            foreach ($files as $dir) {
                $modified = File::lastModified($dir);
                if (time() - $modified > 86400) {
                    File::deleteDirectory($dir);
                    $cleaned++;
                }
            }
        }

        return $cleaned;
    }

    public function cleanupOldMigrations(): int
    {
        return 0;
    }

    public function generateReport(): array
    {
        $plugins = Plugin::with('hooks')->get();

        $report = [
            'total_plugins' => $plugins->count(),
            'active_plugins' => $plugins->where('status', 'active')->count(),
            'inactive_plugins' => $plugins->where('status', 'inactive')->count(),
            'error_plugins' => $plugins->where('status', 'error')->count(),
            'system_plugins' => $plugins->where('is_system', true)->count(),
            'premium_plugins' => $plugins->where('is_premium', true)->count(),
            'total_hooks' => PluginHook::count(),
            'active_hooks' => PluginHook::where('is_active', true)->count(),
            'updates_available' => count($this->checkForUpdates()),
            'plugins' => [],
        ];

        foreach ($plugins as $plugin) {
            $report['plugins'][] = [
                'slug' => $plugin->slug,
                'name' => $plugin->name,
                'version' => $plugin->version,
                'status' => $plugin->status,
                'hooks_count' => $plugin->hooks->count(),
                'last_error' => $plugin->last_error,
                'installed_at' => $plugin->installed_at?->toIso8601String(),
                'activated_at' => $plugin->activated_at?->toIso8601String(),
            ];
        }

        return $report;
    }

    public function getPerformanceMetrics(): array
    {
        $hooks = PluginHook::where('is_active', true)
            ->where('execution_count', '>', 0)
            ->orderByDesc('avg_execution_time')
            ->limit(20)
            ->get();

        return [
            'slowest_hooks' => $hooks->map(fn($hook) => [
                'hook' => $hook->hook,
                'handler' => $hook->handler,
                'avg_time' => round($hook->avg_execution_time * 1000, 2) . 'ms',
                'execution_count' => $hook->execution_count,
                'plugin' => $hook->plugin->name ?? 'Unknown',
            ]),
            'total_executions' => PluginHook::sum('execution_count'),
            'total_plugins_loaded' => count(app(PluginManager::class)->getLoadedPlugins()),
        ];
    }
}
