<?php

namespace App\Services\Plugin;

use App\Models\Plugin;
use App\Models\PluginHook;
use App\Models\PluginSetting;

abstract class BasePlugin
{
    protected Plugin $plugin;
    protected PluginManager $pluginManager;

    public function __construct(Plugin $plugin, PluginManager $pluginManager)
    {
        $this->plugin = $plugin;
        $this->pluginManager = $pluginManager;
    }

    public function getName(): string
    {
        return $this->plugin->name;
    }

    public function getSlug(): string
    {
        return $this->plugin->slug;
    }

    public function getVersion(): string
    {
        return $this->plugin->version;
    }

    public function getConfig(string $key = null, mixed $default = null): mixed
    {
        if ($key === null) {
            return $this->plugin->config ?? [];
        }
        return $this->plugin->getConfigValue($key, $default);
    }

    public function setConfig(string $key, mixed $value): void
    {
        $this->plugin->setConfigValue($key, $value);
    }

    public function getSetting(string $key, mixed $default = null): mixed
    {
        $setting = PluginSetting::where('plugin_id', $this->plugin->id)
            ->where('key', $key)
            ->first();

        return $setting ? $setting->typed_value : $default;
    }

    public function setSetting(string $key, mixed $value, string $type = null): void
    {
        PluginSetting::updateOrCreate(
            ['plugin_id' => $this->plugin->id, 'key' => $key],
            [
                'value' => $value,
                'type' => $type ?? gettype($value),
            ]
        );
    }

    protected function addAction(string $hook, string $method, int $priority = 10, int $acceptedArgs = 1): void
    {
        $handler = get_class($this) . '@' . $method;

        PluginHook::firstOrCreate(
            [
                'plugin_id' => $this->plugin->id,
                'hook' => $hook,
                'handler' => $handler,
            ],
            [
                'type' => 'action',
                'priority' => $priority,
                'accepted_args' => $acceptedArgs,
                'is_active' => true,
            ]
        );
    }

    protected function addFilter(string $hook, string $method, int $priority = 10, int $acceptedArgs = 1): void
    {
        $handler = get_class($this) . '@' . $method;

        PluginHook::firstOrCreate(
            [
                'plugin_id' => $this->plugin->id,
                'hook' => $hook,
                'handler' => $handler,
            ],
            [
                'type' => 'filter',
                'priority' => $priority,
                'accepted_args' => $acceptedArgs,
                'is_active' => true,
            ]
        );
    }

    protected function removeAction(string $hook, string $method): void
    {
        $handler = get_class($this) . '@' . $method;

        PluginHook::where('plugin_id', $this->plugin->id)
            ->where('hook', $hook)
            ->where('handler', $handler)
            ->delete();
    }

    protected function doAction(string $hook, ...$args): void
    {
        $this->pluginManager->doAction($hook, ...$args);
    }

    protected function applyFilters(string $hook, mixed $value, ...$args): mixed
    {
        return $this->pluginManager->applyFilters($hook, $value, ...$args);
    }

    protected function log(string $message, array $context = []): void
    {
        \Log::info("[Plugin: {$this->getSlug()}] {$message}", $context);
    }

    protected function logError(string $message, array $context = []): void
    {
        \Log::error("[Plugin: {$this->getSlug()}] {$message}", $context);
    }

    public function activate(): void
    {
    }

    public function deactivate(): void
    {
    }

    public function uninstall(): void
    {
    }

    public function boot(): void
    {
    }

    public static function getManifest(): array
    {
        return [
            'name' => '',
            'slug' => '',
            'version' => '1.0.0',
            'namespace' => '',
            'author' => '',
            'author_url' => '',
            'description' => '',
            'entry_point' => 'Plugin.php',
            'license' => 'MIT',
            'dependencies' => [],
            'compatibility' => [
                'php' => '>=8.2',
                'cms' => '>=1.0.0',
            ],
            'hooks' => [],
            'permissions' => [],
            'config' => [],
            'default_config' => [],
            'tags' => [],
        ];
    }

    public static function getSettingsSchema(): array
    {
        return [];
    }
}
