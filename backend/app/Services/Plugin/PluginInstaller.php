<?php

namespace App\Services\Plugin;

use App\Models\Plugin;
use App\Models\PluginHook;
use App\Models\PluginMigration;
use App\Models\PluginSetting;
use App\Models\PluginPermission;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class PluginInstaller
{
    protected string $pluginPath;
    protected PluginManager $pluginManager;
    protected array $allowedMimeTypes = ['application/zip'];
    protected int $maxFileSize = 52428800;

    public function __construct(PluginManager $pluginManager)
    {
        $this->pluginPath = base_path('plugins');
        $this->pluginManager = $pluginManager;
    }

    public function installFromUpload(UploadedFile $file, ?int $userId = null): Plugin
    {
        $this->validateUpload($file);

        $tempPath = $file->getPathname();
        $extractPath = storage_path('app/plugin-temp/' . Str::random(16));

        try {
            $manifest = $this->extractAndValidate($tempPath, $extractPath);
            $slug = $manifest['slug'] ?? Str::slug($manifest['name']);

            if (Plugin::where('slug', $slug)->exists()) {
                throw new \Exception("Plugin '{$slug}' is already installed");
            }

            $targetPath = $this->pluginPath . '/' . $slug;
            if (File::exists($targetPath)) {
                File::deleteDirectory($targetPath);
            }

            File::moveDirectory($extractPath, $targetPath);

            $plugin = $this->createPluginRecord($manifest, $slug, $userId);

            $this->runPluginMigrations($plugin);
            $this->registerPluginHooks($plugin, $manifest);
            $this->registerPluginPermissions($plugin, $manifest);

            $this->pluginManager->clearCache();

            return $plugin;
        } finally {
            if (File::exists($extractPath)) {
                File::deleteDirectory($extractPath);
            }
        }
    }

    public function installFromMarketplace(string $marketplaceId, ?int $userId = null): Plugin
    {
        $marketplaceData = $this->fetchFromMarketplace($marketplaceId);

        if (Plugin::where('marketplace_id', $marketplaceId)->exists()) {
            throw new \Exception("Plugin is already installed");
        }

        $tempPath = storage_path('app/plugin-temp/' . Str::random(16) . '.zip');
        $extractPath = storage_path('app/plugin-temp/' . Str::random(16));

        try {
            $this->downloadPlugin($marketplaceData['download_url'], $tempPath);
            $manifest = $this->extractAndValidate($tempPath, $extractPath);

            $slug = $manifest['slug'] ?? Str::slug($manifest['name']);
            $targetPath = $this->pluginPath . '/' . $slug;

            if (File::exists($targetPath)) {
                File::deleteDirectory($targetPath);
            }

            File::moveDirectory($extractPath, $targetPath);

            $plugin = $this->createPluginRecord($manifest, $slug, $userId);
            $plugin->update([
                'marketplace_id' => $marketplaceId,
                'download_url' => $marketplaceData['download_url'],
                'is_premium' => $marketplaceData['is_premium'] ?? false,
            ]);

            $this->runPluginMigrations($plugin);
            $this->registerPluginHooks($plugin, $manifest);
            $this->registerPluginPermissions($plugin, $manifest);

            $this->pluginManager->clearCache();

            return $plugin;
        } finally {
            if (File::exists($tempPath)) {
                unlink($tempPath);
            }
            if (File::exists($extractPath)) {
                File::deleteDirectory($extractPath);
            }
        }
    }

    public function uninstall(Plugin $plugin, bool $deleteData = false): void
    {
        if ($plugin->is_system) {
            throw new \Exception("Cannot uninstall system plugin");
        }

        if ($plugin->status === 'active') {
            $this->deactivate($plugin);
        }

        if ($deleteData) {
            $this->rollbackPluginMigrations($plugin);
            $plugin->settings()->delete();
            $plugin->permissions()->delete();
        }

        $plugin->hooks()->delete();
        $plugin->migrations()->delete();
        $plugin->delete();

        $pluginPath = $this->pluginPath . '/' . $plugin->path;
        if (File::exists($pluginPath)) {
            File::deleteDirectory($pluginPath);
        }

        $this->pluginManager->clearCache();
    }

    public function activate(Plugin $plugin): void
    {
        if ($plugin->status === 'active') {
            return;
        }

        $missingDeps = $this->checkDependencies($plugin);
        if (!empty($missingDeps)) {
            throw new \Exception("Missing dependencies: " . implode(', ', $missingDeps));
        }

        $this->runPluginMigrations($plugin);

        $plugin->update([
            'status' => 'active',
            'activated_at' => now(),
        ]);

        $this->pluginManager->loadPlugin($plugin);
        $this->pluginManager->doAction('plugin.activated', $plugin);

        $this->pluginManager->clearCache();
    }

    public function deactivate(Plugin $plugin): void
    {
        if ($plugin->status !== 'active') {
            return;
        }

        $this->pluginManager->doAction('plugin.deactivated', $plugin);

        $plugin->update([
            'status' => 'inactive',
            'activated_at' => null,
        ]);

        $this->pluginManager->clearCache();
    }

    public function update(Plugin $plugin, ?UploadedFile $file = null): Plugin
    {
        $oldVersion = $plugin->version;

        if ($file) {
            return $this->updateFromUpload($plugin, $file);
        }

        if ($plugin->marketplace_id) {
            return $this->updateFromMarketplace($plugin);
        }

        throw new \Exception("No update source available");
    }

    protected function updateFromUpload(Plugin $plugin, UploadedFile $file): Plugin
    {
        $this->validateUpload($file);

        $tempPath = $file->getPathname();
        $extractPath = storage_path('app/plugin-temp/' . Str::random(16));

        try {
            $manifest = $this->extractAndValidate($tempPath, $extractPath);
            $this->validateUpdate($plugin, $manifest);

            $plugin->update(['status' => 'updating']);

            $targetPath = $this->pluginPath . '/' . $plugin->path;
            File::deleteDirectory($targetPath);
            File::moveDirectory($extractPath, $targetPath);

            $this->runPluginMigrations($plugin);

            $plugin->update([
                'version' => $manifest['version'],
                'name' => $manifest['name'],
                'description' => $manifest['description'] ?? $plugin->description,
                'dependencies' => $manifest['dependencies'] ?? [],
                'status' => 'active',
                'last_error' => null,
                'last_error_at' => null,
            ]);

            $this->pluginManager->clearCache();

            return $plugin;
        } finally {
            if (File::exists($extractPath)) {
                File::deleteDirectory($extractPath);
            }
        }
    }

    protected function updateFromMarketplace(Plugin $plugin): Plugin
    {
        $marketplaceData = $this->fetchFromMarketplace($plugin->marketplace_id);

        if (version_compare($marketplaceData['version'], $plugin->version, '<=')) {
            throw new \Exception("No update available");
        }

        $tempPath = storage_path('app/plugin-temp/' . Str::random(16) . '.zip');
        $extractPath = storage_path('app/plugin-temp/' . Str::random(16));

        try {
            $this->downloadPlugin($marketplaceData['download_url'], $tempPath);
            $manifest = $this->extractAndValidate($tempPath, $extractPath);

            $plugin->update(['status' => 'updating']);

            $targetPath = $this->pluginPath . '/' . $plugin->path;
            File::deleteDirectory($targetPath);
            File::moveDirectory($extractPath, $targetPath);

            $this->runPluginMigrations($plugin);

            $plugin->update([
                'version' => $manifest['version'],
                'name' => $manifest['name'],
                'description' => $manifest['description'] ?? $plugin->description,
                'download_url' => $marketplaceData['download_url'],
                'status' => 'active',
            ]);

            $this->pluginManager->clearCache();

            return $plugin;
        } finally {
            if (File::exists($tempPath)) {
                unlink($tempPath);
            }
            if (File::exists($extractPath)) {
                File::deleteDirectory($extractPath);
            }
        }
    }

    protected function validateUpload(UploadedFile $file): void
    {
        if (!in_array($file->getMimeType(), $this->allowedMimeTypes)) {
            throw new \Exception("Invalid file type. Only ZIP files are allowed");
        }

        if ($file->getSize() > $this->maxFileSize) {
            throw new \Exception("File too large. Maximum size is 50MB");
        }
    }

    protected function extractAndValidate(string $zipPath, string $extractPath): array
    {
        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true) {
            throw new \Exception("Cannot open ZIP file");
        }

        $zip->extractTo($extractPath);
        $zip->close();

        $directories = glob($extractPath . '/*', GLOB_ONLYDIR);
        if (empty($directories)) {
            $manifestPath = $extractPath . '/manifest.json';
        } else {
            $manifestPath = $directories[0] . '/manifest.json';
            $extractPath = $directories[0];
        }

        if (!File::exists($manifestPath)) {
            throw new \Exception("Invalid plugin: missing manifest.json");
        }

        $manifest = json_decode(File::get($manifestPath), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception("Invalid manifest.json: " . json_last_error_msg());
        }

        $this->validateManifest($manifest);

        return $manifest;
    }

    protected function validateManifest(array $manifest): void
    {
        $required = ['name', 'version', 'namespace'];
        foreach ($required as $field) {
            if (empty($manifest[$field])) {
                throw new \Exception("Invalid manifest: missing '{$field}'");
            }
        }

        if (!preg_match('/^\d+\.\d+\.\d+$/', $manifest['version'])) {
            throw new \Exception("Invalid version format. Use semver (e.g., 1.0.0)");
        }

        if (isset($manifest['dependencies'])) {
            foreach ($manifest['dependencies'] as $slug => $version) {
                if (!Plugin::where('slug', $slug)->where('status', 'active')->exists()) {
                    throw new \Exception("Missing dependency: {$slug}");
                }
            }
        }
    }

    protected function validateUpdate(Plugin $plugin, array $manifest): void
    {
        if (version_compare($manifest['version'], $plugin->version, '<=')) {
            throw new \Exception("New version must be greater than current version");
        }

        if ($manifest['namespace'] !== $plugin->namespace) {
            throw new \Exception("Cannot change plugin namespace during update");
        }
    }

    protected function createPluginRecord(array $manifest, string $slug, ?int $userId): Plugin
    {
        return Plugin::create([
            'slug' => $slug,
            'name' => $manifest['name'],
            'namespace' => $manifest['namespace'],
            'version' => $manifest['version'],
            'author' => $manifest['author'] ?? null,
            'author_url' => $manifest['author_url'] ?? null,
            'description' => $manifest['description'] ?? null,
            'path' => $slug,
            'entry_point' => $manifest['entry_point'] ?? 'Plugin.php',
            'config' => $manifest['config'] ?? [],
            'default_config' => $manifest['default_config'] ?? [],
            'dependencies' => $manifest['dependencies'] ?? [],
            'compatibility' => $manifest['compatibility'] ?? [],
            'license' => $manifest['license'] ?? 'MIT',
            'license_url' => $manifest['license_url'] ?? null,
            'icon' => $manifest['icon'] ?? null,
            'tags' => $manifest['tags'] ?? [],
            'repository_url' => $manifest['repository_url'] ?? null,
            'status' => 'inactive',
            'installed_by' => $userId,
            'installed_at' => now(),
        ]);
    }

    protected function checkDependencies(Plugin $plugin): array
    {
        $missing = [];
        $dependencies = $plugin->dependencies ?? [];

        foreach ($dependencies as $slug => $version) {
            $installed = Plugin::where('slug', $slug)->where('status', 'active')->first();
            if (!$installed) {
                $missing[] = $slug;
            } elseif (version_compare($installed->version, $version, '<')) {
                $missing[] = "{$slug} (requires {$version}, installed {$installed->version})";
            }
        }

        return $missing;
    }

    protected function runPluginMigrations(Plugin $plugin): void
    {
        $migrationPath = $this->pluginPath . '/' . $plugin->path . '/migrations';
        if (!File::exists($migrationPath)) {
            return;
        }

        $migrations = glob($migrationPath . '/*.php');
        foreach ($migrations as $migration) {
            $migrationName = pathinfo($migration, PATHINFO_FILENAME);

            if (PluginMigration::where('plugin_id', $plugin->id)
                ->where('migration', $migrationName)->exists()) {
                continue;
            }

            $batch = PluginMigration::where('plugin_id', $plugin->id)->max('batch') ?? 0;

            require_once $migration;

            $className = $this->getMigrationClassName($migration);
            if (class_exists($className)) {
                $instance = new $className();
                if (method_exists($instance, 'up')) {
                    $instance->up();
                }
            }

            PluginMigration::create([
                'plugin_id' => $plugin->id,
                'migration' => $migrationName,
                'batch' => $batch + 1,
            ]);
        }
    }

    protected function rollbackPluginMigrations(Plugin $plugin): void
    {
        $migrations = PluginMigration::where('plugin_id', $plugin->id)
            ->orderBy('batch', 'desc')
            ->get();

        foreach ($migrations as $migrationRecord) {
            $migrationFile = $this->pluginPath . '/' . $plugin->path . '/migrations/' . $migrationRecord->migration . '.php';

            if (File::exists($migrationFile)) {
                require_once $migrationFile;

                $className = $this->getMigrationClassName($migrationFile);
                if (class_exists($className)) {
                    $instance = new $className();
                    if (method_exists($instance, 'down')) {
                        $instance->down();
                    }
                }
            }

            $migrationRecord->delete();
        }
    }

    protected function getMigrationClassName(string $file): string
    {
        $contents = File::get($file);
        if (preg_match('/class\s+(\w+)/', $contents, $matches)) {
            return $matches[1];
        }
        return '';
    }

    protected function registerPluginHooks(Plugin $plugin, array $manifest): void
    {
        $hooks = $manifest['hooks'] ?? [];
        foreach ($hooks as $hook) {
            PluginHook::create([
                'plugin_id' => $plugin->id,
                'hook' => $hook['hook'],
                'handler' => $hook['handler'],
                'type' => $hook['type'] ?? 'action',
                'priority' => $hook['priority'] ?? 10,
                'accepted_args' => $hook['accepted_args'] ?? 1,
                'is_active' => true,
            ]);
        }
    }

    protected function registerPluginPermissions(Plugin $plugin, array $manifest): void
    {
        $permissions = $manifest['permissions'] ?? [];
        foreach ($permissions as $permission => $description) {
            PluginPermission::create([
                'plugin_id' => $plugin->id,
                'permission' => $permission,
                'description' => $description,
                'is_granted' => false,
            ]);
        }
    }

    protected function fetchFromMarketplace(string $marketplaceId): array
    {
        $apiUrl = config('cms.marketplace_url', 'https://marketplace.example.com/api/v1');

        $response = Http::timeout(30)->get("{$apiUrl}/plugins/{$marketplaceId}");

        if (!$response->successful()) {
            throw new \Exception("Failed to fetch plugin from marketplace");
        }

        return $response->json();
    }

    protected function downloadPlugin(string $url, string $destination): void
    {
        $response = Http::timeout(120)->sink($destination)->get($url);

        if (!$response->successful()) {
            throw new \Exception("Failed to download plugin");
        }
    }
}
