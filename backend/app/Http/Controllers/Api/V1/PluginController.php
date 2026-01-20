<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Plugin;
use App\Models\PluginHook;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Gate;

class PluginController extends Controller
{
    /**
     * Get all plugins
     */
    public function index(): JsonResponse
    {
        Gate::authorize('plugins.viewAny');

        $plugins = Plugin::with('hooks')->orderBy('created_at', 'desc')->get();

        return response()->json($plugins);
    }

    /**
     * Get single plugin details
     */
    public function show(Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.view');

        $plugin->load('hooks');

        return response()->json($plugin);
    }

    /**
     * Install a new plugin
     */
    public function install(Request $request): JsonResponse
    {
        Gate::authorize('plugins.install');

        $request->validate([
            'name' => 'required|string|max:255',
            'version' => 'required|string|max:20',
            'author' => 'required|string|max:255',
            'description' => 'required|string',
            'path' => 'required|string',
            'config' => 'array',
        ]);

        $plugin = Plugin::create([
            'name' => $request->name,
            'version' => $request->version,
            'author' => $request->author,
            'description' => $request->description,
            'path' => $request->path,
            'is_active' => false,
            'config' => $request->config ?? [],
        ]);

        return response()->json([
            'success' => true,
            'plugin' => $plugin,
            'message' => 'Plugin installed successfully',
        ], 201);
    }

    /**
     * Uninstall a plugin
     */
    public function uninstall(Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.uninstall');

        // Deactivate first
        if ($plugin->is_active) {
            $this->deactivate($plugin);
        }

        // Delete plugin and its hooks
        $plugin->hooks()->delete();
        $plugin->delete();

        return response()->json([
            'success' => true,
            'message' => 'Plugin uninstalled successfully',
        ]);
    }

    /**
     * Activate a plugin
     */
    public function activate(Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.activate');

        $plugin->update(['is_active' => true]);

        // Execute activation hooks
        $this->executeHook('plugin.activated', [
            'plugin' => $plugin,
            'timestamp' => now(),
        ]);

        return response()->json([
            'success' => true,
            'plugin' => $plugin,
            'message' => 'Plugin activated successfully',
        ]);
    }

    /**
     * Deactivate a plugin
     */
    public function deactivate(Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.deactivate');

        $plugin->update(['is_active' => false]);

        // Execute deactivation hooks
        $this->executeHook('plugin.deactivated', [
            'plugin' => $plugin,
            'timestamp' => now(),
        ]);

        return response()->json([
            'success' => true,
            'plugin' => $plugin,
            'message' => 'Plugin deactivated successfully',
        ]);
    }

    /**
     * Update plugin configuration
     */
    public function updateConfig(Request $request, Plugin $plugin): JsonResponse
    {
        Gate::authorize('plugins.updateConfig');

        $request->validate([
            'config' => 'required|array',
        ]);

        $plugin->update(['config' => $request->config]);

        // Execute config update hooks
        $this->executeHook('plugin.config_updated', [
            'plugin' => $plugin,
            'config' => $request->config,
            'timestamp' => now(),
        ]);

        return response()->json([
            'success' => true,
            'plugin' => $plugin,
            'message' => 'Plugin configuration updated',
        ]);
    }

    /**
     * Get plugin hooks
     */
    public function getHooks(): JsonResponse
    {
        Gate::authorize('plugins.viewAny');

        $hooks = PluginHook::with('plugin')
            ->orderBy('priority', 'desc')
            ->get()
            ->groupBy('hook');

        return response()->json($hooks);
    }

    /**
     * Register a new hook
     */
    public function registerHook(Request $request): JsonResponse
    {
        Gate::authorize('plugins.manageHooks');

        $request->validate([
            'plugin_id' => 'required|exists:plugins,id',
            'hook' => 'required|string|max:255',
            'callback' => 'required|string|max:255',
            'priority' => 'integer|min:0|max:100',
        ]);

        $hook = PluginHook::create([
            'plugin_id' => $request->plugin_id,
            'hook' => $request->hook,
            'callback' => $request->callback,
            'priority' => $request->priority ?? 50,
        ]);

        return response()->json([
            'success' => true,
            'hook' => $hook,
            'message' => 'Hook registered successfully',
        ], 201);
    }

    /**
     * Execute a hook with data
     */
    public function executeHook(string $hookName, array $data = []): void
    {
        $hooks = PluginHook::where('hook', $hookName)
            ->whereHas('plugin', function ($query) {
                $query->where('is_active', true);
            })
            ->orderBy('priority', 'desc')
            ->get();

        foreach ($hooks as $hook) {
            try {
                // Execute callback if exists
                if (method_exists($hook->plugin, $hook->callback)) {
                    call_user_func([$hook->plugin, $hook->callback], $data);
                }
            } catch (\Exception $e) {
                // Log error but continue execution
                \Log::error("Hook execution failed: {$hookName}", [
                    'error' => $e->getMessage(),
                    'hook' => $hook->id,
                ]);
            }
        }
    }

    /**
     * Get available hooks
     */
    public function getAvailableHooks(): JsonResponse
    {
        Gate::authorize('plugins.viewAny');

        $availableHooks = [
            ['name' => 'post.created', 'description' => 'When a post is created'],
            ['name' => 'post.updated', 'description' => 'When a post is updated'],
            ['name' => 'post.deleted', 'description' => 'When a post is deleted'],
            ['name' => 'post.published', 'description' => 'When a post is published'],
            ['name' => 'user.login', 'description' => 'When a user logs in'],
            ['name' => 'user.logout', 'description' => 'When a user logs out'],
            ['name' => 'user.registered', 'description' => 'When a user registers'],
            ['name' => 'comment.created', 'description' => 'When a comment is created'],
            ['name' => 'comment.approved', 'description' => 'When a comment is approved'],
            ['name' => 'media.uploaded', 'description' => 'When media is uploaded'],
            ['name' => 'plugin.activated', 'description' => 'When a plugin is activated'],
            ['name' => 'plugin.deactivated', 'description' => 'When a plugin is deactivated'],
            ['name' => 'plugin.config_updated', 'description' => 'When plugin config is updated'],
            ['name' => 'settings.updated', 'description' => 'When settings are updated'],
        ];

        return response()->json($availableHooks);
    }

    /**
     * Get plugin statistics
     */
    public function getStats(): JsonResponse
    {
        Gate::authorize('plugins.viewStats');

        $totalPlugins = Plugin::count();
        $activePlugins = Plugin::where('is_active', true)->count();
        $inactivePlugins = Plugin::where('is_active', false)->count();
        $totalHooks = PluginHook::count();

        return response()->json([
            'total_plugins' => $totalPlugins,
            'active_plugins' => $activePlugins,
            'inactive_plugins' => $inactivePlugins,
            'total_hooks' => $totalHooks,
        ]);
    }
}
