<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Plugin;
use App\Models\PluginHook;
use App\Models\PluginSetting;
use App\Services\Plugin\PluginInstaller;
use App\Services\Plugin\PluginManager;
use App\Services\Plugin\PluginMarketplace;
use App\Services\Plugin\PluginScheduler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;

class PluginController extends Controller
{
    public function __construct(
        protected PluginManager $pluginManager,
        protected PluginInstaller $installer,
        protected PluginMarketplace $marketplace,
        protected PluginScheduler $scheduler
    ) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('plugins.viewAny');

        $query = Plugin::with(['installer', 'hooks']);

        if ($request->has('status')) {
            $query->byStatus($request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $plugins = $query->orderBy('load_order')->paginate($request->per_page ?? 20);

        return response()->json($plugins);
    }

    public function show(Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.view');

        $plugin->load(['installer', 'hooks', 'settings', 'permissions', 'migrations']);

        return response()->json([
            'plugin' => $plugin,
            'dependencies_status' => $plugin->dependencies_list,
            'hooks_available' => $this->pluginManager->getAvailableHooks(),
        ]);
    }

    public function upload(Request $request): JsonResponse
    {
        Gate::authorize('plugins.install');

        $request->validate([
            'file' => 'required|file|mimes:zip|max:51200',
        ]);

        try {
            $plugin = $this->installer->installFromUpload(
                $request->file('file'),
                $request->user()->id
            );

            return response()->json([
                'success' => true,
                'plugin' => $plugin,
                'message' => 'Plugin installed successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function installFromMarketplace(Request $request): JsonResponse
    {
        Gate::authorize('plugins.install');

        $request->validate([
            'marketplace_id' => 'required|string',
        ]);

        try {
            $plugin = $this->installer->installFromMarketplace(
                $request->marketplace_id,
                $request->user()->id
            );

            return response()->json([
                'success' => true,
                'plugin' => $plugin,
                'message' => 'Plugin installed successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function activate(Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.activate');

        try {
            $this->installer->activate($plugin);

            return response()->json([
                'success' => true,
                'plugin' => $plugin->fresh(),
                'message' => 'Plugin activated successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function deactivate(Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.deactivate');

        try {
            $this->installer->deactivate($plugin);

            return response()->json([
                'success' => true,
                'plugin' => $plugin->fresh(),
                'message' => 'Plugin deactivated successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function update(Plugin $plugin, Request $request): JsonResponse
    {
        Gate::authorize('plugins.install');

        try {
            $file = $request->hasFile('file') ? $request->file('file') : null;
            $updated = $this->installer->update($plugin, $file);

            return response()->json([
                'success' => true,
                'plugin' => $updated->fresh(),
                'message' => 'Plugin updated successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function uninstall(Plugin $plugin, Request $request): JsonResponse
    {
        Gate::authorize('plugins.uninstall');

        try {
            $deleteData = $request->boolean('delete_data', false);
            $this->installer->uninstall($plugin, $deleteData);

            return response()->json([
                'success' => true,
                'message' => 'Plugin uninstalled successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function updateConfig(Request $request, Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.updateConfig');

        $request->validate([
            'config' => 'required|array',
        ]);

        foreach ($request->config as $key => $value) {
            $plugin->setConfigValue($key, $value);
        }

        $this->pluginManager->clearCache();

        return response()->json([
            'success' => true,
            'plugin' => $plugin->fresh(),
            'message' => 'Configuration updated successfully',
        ]);
    }

    public function getSettings(Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.view');

        $settings = $plugin->settings()->get()->keyBy('key');

        return response()->json([
            'settings' => $settings,
        ]);
    }

    public function updateSettings(Request $request, Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.updateConfig');

        foreach ($request->all() as $key => $value) {
            $type = gettype($value);
            PluginSetting::updateOrCreate(
                ['plugin_id' => $plugin->id, 'key' => $key],
                ['value' => $value, 'type' => $type]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Settings saved successfully',
        ]);
    }

    public function toggleAutoUpdate(Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.updateConfig');

        $plugin->update([
            'auto_update' => !$plugin->auto_update,
        ]);

        return response()->json([
            'success' => true,
            'auto_update' => $plugin->auto_update,
        ]);
    }

    public function getHooks(): JsonResponse
    {
        Gate::authorize('plugins.viewAny');

        $hooks = PluginHook::with('plugin')
            ->orderBy('hook')
            ->orderBy('priority')
            ->get()
            ->groupBy('hook');

        return response()->json([
            'hooks' => $hooks,
            'available' => $this->pluginManager->getAvailableHooks(),
        ]);
    }

    public function getHookStats(): JsonResponse
    {
        Gate::authorize('plugins.viewStats');

        $stats = PluginHook::with('plugin')
            ->where('execution_count', '>', 0)
            ->orderByDesc('avg_execution_time')
            ->limit(50)
            ->get();

        return response()->json([
            'slowest_hooks' => $stats,
            'total_executions' => PluginHook::sum('execution_count'),
        ]);
    }

    public function getStats(): JsonResponse
    {
        Gate::authorize('plugins.viewStats');

        return response()->json([
            'total_plugins' => Plugin::count(),
            'active_plugins' => Plugin::where('status', 'active')->count(),
            'inactive_plugins' => Plugin::where('status', 'inactive')->count(),
            'error_plugins' => Plugin::where('status', 'error')->count(),
            'system_plugins' => Plugin::where('is_system', true)->count(),
            'premium_plugins' => Plugin::where('is_premium', true)->count(),
            'total_hooks' => PluginHook::count(),
            'active_hooks' => PluginHook::where('is_active', true)->count(),
            'loaded_plugins' => count($this->pluginManager->getLoadedPlugins()),
        ]);
    }

    public function getPerformance(): JsonResponse
    {
        Gate::authorize('plugins.viewStats');

        return response()->json($this->scheduler->getPerformanceMetrics());
    }

    public function checkUpdates(): JsonResponse
    {
        Gate::authorize('plugins.view');

        $updates = $this->scheduler->checkForUpdates();

        return response()->json([
            'updates_available' => count($updates),
            'updates' => $updates,
        ]);
    }

    public function runAutoUpdate(): JsonResponse
    {
        Gate::authorize('plugins.install');

        $updated = $this->scheduler->autoUpdate();

        return response()->json([
            'success' => true,
            'plugins_updated' => $updated,
        ]);
    }

    public function marketplaceSearch(Request $request): JsonResponse
    {
        Gate::authorize('plugins.view');

        $results = $this->marketplace->search($request->all());

        return response()->json($results);
    }

    public function marketplaceGet(string $id): JsonResponse
    {
        Gate::authorize('plugins.view');

        $plugin = $this->marketplace->getPlugin($id);

        if (!$plugin) {
            return response()->json([
                'message' => 'Plugin not found in marketplace',
            ], 404);
        }

        return response()->json($plugin);
    }

    public function marketplaceCategories(): JsonResponse
    {
        Gate::authorize('plugins.view');

        return response()->json($this->marketplace->getCategories());
    }

    public function marketplaceFeatured(): JsonResponse
    {
        Gate::authorize('plugins.view');

        return response()->json($this->marketplace->getFeatured());
    }

    public function marketplacePopular(): JsonResponse
    {
        Gate::authorize('plugins.view');

        return response()->json($this->marketplace->getPopular());
    }

    public function marketplaceNew(): JsonResponse
    {
        Gate::authorize('plugins.view');

        return response()->json($this->marketplace->getNewReleases());
    }

    public function reorder(Request $request): JsonResponse
    {
        Gate::authorize('plugins.updateConfig');

        $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer|exists:plugins,id',
        ]);

        foreach ($request->order as $index => $pluginId) {
            Plugin::where('id', $pluginId)->update(['load_order' => $index]);
        }

        $this->pluginManager->clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Plugin order updated',
        ]);
    }

    public function bulkAction(Request $request): JsonResponse
    {
        Gate::authorize('plugins.updateConfig');

        $request->validate([
            'action' => 'required|in:activate,deactivate,uninstall',
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:plugins,id',
        ]);

        $plugins = Plugin::whereIn('id', $request->ids)->get();
        $results = [];

        foreach ($plugins as $plugin) {
            try {
                switch ($request->action) {
                    case 'activate':
                        $this->installer->activate($plugin);
                        $results[$plugin->id] = 'activated';
                        break;
                    case 'deactivate':
                        $this->installer->deactivate($plugin);
                        $results[$plugin->id] = 'deactivated';
                        break;
                    case 'uninstall':
                        $this->installer->uninstall($plugin);
                        $results[$plugin->id] = 'uninstalled';
                        break;
                }
            } catch (\Exception $e) {
                $results[$plugin->id] = 'error: ' . $e->getMessage();
            }
        }

        return response()->json([
            'success' => true,
            'results' => $results,
        ]);
    }

    public function exportConfig(Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.view');

        return response()->json([
            'slug' => $plugin->slug,
            'version' => $plugin->version,
            'config' => $plugin->config,
            'settings' => $plugin->settings->pluck('value', 'key'),
            'exported_at' => now()->toIso8601String(),
        ]);
    }

    public function importConfig(Request $request, Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.updateConfig');

        $request->validate([
            'config' => 'required|array',
            'settings' => 'array',
        ]);

        if ($request->has('config')) {
            $plugin->update(['config' => $request->config]);
        }

        if ($request->has('settings')) {
            foreach ($request->settings as $key => $value) {
                PluginSetting::updateOrCreate(
                    ['plugin_id' => $plugin->id, 'key' => $key],
                    ['value' => $value, 'type' => gettype($value)]
                );
            }
        }

        $this->pluginManager->clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Configuration imported successfully',
        ]);
    }
}
