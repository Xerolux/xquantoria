<?php

namespace App\Services\Plugin;

use App\Models\Plugin;
use App\Models\PluginHook;
use App\Models\PluginSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class PluginManager
{
    protected array $loadedPlugins = [];
    protected array $actions = [];
    protected array $filters = [];
    protected array $actionQueue = [];
    protected bool $isRunningAction = false;
    protected string $pluginPath;
    protected int $maxExecutionTime = 30;
    protected array $forbiddenFunctions = [
        'exec', 'shell_exec', 'system', 'passthru', 'popen', 'proc_open',
        'pcntl_exec', 'eval', 'assert', 'preg_replace', 'create_function',
        'call_user_func_array', 'include_once', 'require_once',
    ];

    public function __construct()
    {
        $this->pluginPath = base_path('plugins');
        $this->loadActivePlugins();
    }

    public function loadActivePlugins(): void
    {
        $plugins = Cache::remember('plugins.active', 3600, fn() =>
            Plugin::active()->orderByLoadOrder()->get()
        );

        foreach ($plugins as $plugin) {
            $this->loadPlugin($plugin);
        }
    }

    public function loadPlugin(Plugin $plugin): bool
    {
        if (isset($this->loadedPlugins[$plugin->slug])) {
            return true;
        }

        if (!$this->validatePlugin($plugin)) {
            return false;
        }

        $this->registerHooks($plugin);

        $this->loadedPlugins[$plugin->slug] = $plugin;

        return true;
    }

    protected function validatePlugin(Plugin $plugin): bool
    {
        $pluginFile = $this->pluginPath . '/' . $plugin->path . '/' . $plugin->entry_point;

        if (!File::exists($pluginFile)) {
            $plugin->setError("Plugin file not found: {$plugin->entry_point}");
            return false;
        }

        $manifestFile = $this->pluginPath . '/' . $plugin->path . '/manifest.json';
        if (File::exists($manifestFile)) {
            $manifest = json_decode(File::get($manifestFile), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $plugin->setError("Invalid manifest.json");
                return false;
            }
            if (isset($manifest['min_cms_version'])) {
                if (!version_compare(config('app.version', '1.0.0'), $manifest['min_cms_version'], '>=')) {
                    $plugin->setError("CMS version too old. Required: {$manifest['min_cms_version']}");
                    return false;
                }
            }
        }

        return true;
    }

    protected function registerHooks(Plugin $plugin): void
    {
        $hooks = PluginHook::where('plugin_id', $plugin->id)
            ->where('is_active', true)
            ->orderBy('priority')
            ->get();

        foreach ($hooks as $hook) {
            $this->registerHook($hook);
        }
    }

    protected function registerHook(PluginHook $hook): void
    {
        $entry = [
            'id' => $hook->id,
            'callback' => $hook->handler,
            'priority' => $hook->priority,
            'accepted_args' => $hook->accepted_args,
        ];

        if ($hook->type === 'action') {
            $this->actions[$hook->hook][$hook->priority][] = $entry;
            ksort($this->actions[$hook->hook]);
        } else {
            $this->filters[$hook->hook][$hook->priority][] = $entry;
            ksort($this->filters[$hook->hook]);
        }
    }

    public function doAction(string $tag, ...$args): void
    {
        if (!isset($this->actions[$tag])) {
            return;
        }

        if ($this->isRunningAction && in_array($tag, $this->actionQueue)) {
            Log::warning("Recursive action detected: {$tag}");
            return;
        }

        $this->isRunningAction = true;
        $this->actionQueue[] = $tag;

        foreach ($this->actions[$tag] as $priority => $hooks) {
            foreach ($hooks as $hook) {
                $this->executeHook($hook, $args);
            }
        }

        array_pop($this->actionQueue);
        $this->isRunningAction = false;
    }

    public function applyFilters(string $tag, mixed $value, ...$args): mixed
    {
        if (!isset($this->filters[$tag])) {
            return $value;
        }

        array_unshift($args, $value);

        foreach ($this->filters[$tag] as $priority => $hooks) {
            foreach ($hooks as $hook) {
                $result = $this->executeFilter($hook, $args);
                if ($result !== null) {
                    $args[0] = $result;
                }
            }
        }

        return $args[0];
    }

    protected function executeHook(array $hook, array $args): void
    {
        $startTime = microtime(true);

        try {
            $callback = $this->resolveCallback($hook['callback']);
            $args = array_slice($args, 0, $hook['accepted_args']);
            call_user_func_array($callback, $args);

            $executionTime = microtime(true) - $startTime;
            $this->recordExecution($hook['id'], $executionTime);
        } catch (\Throwable $e) {
            Log::error("Plugin hook execution failed", [
                'hook_id' => $hook['id'],
                'error' => $e->getMessage(),
            ]);
        }
    }

    protected function executeFilter(array $hook, array $args): mixed
    {
        $startTime = microtime(true);

        try {
            $callback = $this->resolveCallback($hook['callback']);
            $args = array_slice($args, 0, $hook['accepted_args']);
            $result = call_user_func_array($callback, $args);

            $executionTime = microtime(true) - $startTime;
            $this->recordExecution($hook['id'], $executionTime);

            return $result;
        } catch (\Throwable $e) {
            Log::error("Plugin filter execution failed", [
                'hook_id' => $hook['id'],
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    protected function resolveCallback(string $handler): callable
    {
        if (str_contains($handler, '@')) {
            [$class, $method] = explode('@', $handler, 2);
            if (class_exists($class)) {
                return [app($class), $method];
            }
        }

        if (function_exists($handler)) {
            return $handler;
        }

        throw new RuntimeException("Cannot resolve callback: {$handler}");
    }

    protected function recordExecution(int $hookId, float $duration): void
    {
        PluginHook::where('id', $hookId)->update([
            'execution_count' => \DB::raw('execution_count + 1'),
            'last_executed_at' => now(),
        ]);
    }

    public function addAction(string $tag, callable $callback, int $priority = 10, int $acceptedArgs = 1): void
    {
        $this->actions[$tag][$priority][] = [
            'callback' => $callback,
            'priority' => $priority,
            'accepted_args' => $acceptedArgs,
        ];
        ksort($this->actions[$tag]);
    }

    public function addFilter(string $tag, callable $callback, int $priority = 10, int $acceptedArgs = 1): void
    {
        $this->filters[$tag][$priority][] = [
            'callback' => $callback,
            'priority' => $priority,
            'accepted_args' => $acceptedArgs,
        ];
        ksort($this->filters[$tag]);
    }

    public function removeAction(string $tag, callable $callback, int $priority = 10): bool
    {
        if (!isset($this->actions[$tag][$priority])) {
            return false;
        }

        foreach ($this->actions[$tag][$priority] as $key => $hook) {
            if ($hook['callback'] === $callback) {
                unset($this->actions[$tag][$priority][$key]);
                return true;
            }
        }

        return false;
    }

    public function hasAction(string $tag): bool
    {
        return !empty($this->actions[$tag]);
    }

    public function hasFilter(string $tag): bool
    {
        return !empty($this->filters[$tag]);
    }

    public function getLoadedPlugins(): array
    {
        return $this->loadedPlugins;
    }

    public function getPlugin(string $slug): ?Plugin
    {
        return $this->loadedPlugins[$slug] ?? null;
    }

    public function getAvailableHooks(): array
    {
        return [
            'actions' => [
                'plugin.activated' => 'Fired when a plugin is activated',
                'plugin.deactivated' => 'Fired when a plugin is deactivated',
                'plugin.installed' => 'Fired when a plugin is installed',
                'plugin.uninstalled' => 'Fired when a plugin is uninstalled',
                'post.created' => 'Fired when a post is created',
                'post.updated' => 'Fired when a post is updated',
                'post.deleted' => 'Fired when a post is deleted',
                'post.published' => 'Fired when a post is published',
                'post.scheduled' => 'Fired when a post is scheduled',
                'user.registered' => 'Fired when a user registers',
                'user.login' => 'Fired when a user logs in',
                'user.logout' => 'Fired when a user logs out',
                'user.updated' => 'Fired when a user profile is updated',
                'user.deleted' => 'Fired when a user is deleted',
                'comment.created' => 'Fired when a comment is created',
                'comment.approved' => 'Fired when a comment is approved',
                'comment.spam' => 'Fired when a comment is marked as spam',
                'media.uploaded' => 'Fired when media is uploaded',
                'media.deleted' => 'Fired when media is deleted',
                'settings.updated' => 'Fired when settings are updated',
                'cache.cleared' => 'Fired when cache is cleared',
                'backup.created' => 'Fired when a backup is created',
                'backup.restored' => 'Fired when a backup is restored',
            ],
            'filters' => [
                'post.content' => 'Filter post content before display',
                'post.excerpt' => 'Filter post excerpt',
                'post.title' => 'Filter post title',
                'post.permalink' => 'Filter post URL',
                'post.meta' => 'Filter post meta tags',
                'comment.content' => 'Filter comment content before display',
                'user.display_name' => 'Filter user display name',
                'media.url' => 'Filter media URL',
                'page.title' => 'Filter page title',
                'page.content' => 'Filter page content',
                'email.subject' => 'Filter email subject',
                'email.body' => 'Filter email body',
                'api.response' => 'Filter API responses',
                'seo.title' => 'Filter SEO title',
                'seo.description' => 'Filter SEO description',
                'search.query' => 'Filter search query',
                'search.results' => 'Filter search results',
                'upload.filename' => 'Filter uploaded filename',
                'menu.items' => 'Filter menu items',
                'breadcrumb.items' => 'Filter breadcrumb items',
            ],
        ];
    }

    public function clearCache(): void
    {
        Cache::forget('plugins.active');
        Cache::forget('plugins.hooks');
    }
}
