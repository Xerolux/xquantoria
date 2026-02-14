<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

class Plugin extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'namespace',
        'version',
        'author',
        'author_url',
        'description',
        'path',
        'entry_point',
        'config',
        'default_config',
        'dependencies',
        'compatibility',
        'license',
        'license_url',
        'icon',
        'cover_image',
        'tags',
        'screenshots',
        'repository_url',
        'download_url',
        'marketplace_id',
        'checksum',
        'status',
        'is_system',
        'is_premium',
        'auto_update',
        'load_order',
        'installed_by',
        'installed_at',
        'activated_at',
        'last_error_at',
        'last_error',
    ];

    protected $casts = [
        'config' => 'array',
        'default_config' => 'array',
        'dependencies' => 'array',
        'compatibility' => 'array',
        'tags' => 'array',
        'screenshots' => 'array',
        'is_system' => 'boolean',
        'is_premium' => 'boolean',
        'auto_update' => 'boolean',
        'installed_at' => 'datetime',
        'activated_at' => 'datetime',
        'last_error_at' => 'datetime',
    ];

    public function installer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'installed_by');
    }

    public function hooks(): HasMany
    {
        return $this->hasMany(PluginHook::class);
    }

    public function settings(): HasMany
    {
        return $this->hasMany(PluginSetting::class);
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(PluginPermission::class);
    }

    public function migrations(): HasMany
    {
        return $this->hasMany(PluginMigration::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeSystem($query)
    {
        return $query->where('is_system', true);
    }

    public function scopeCommunity($query)
    {
        return $query->where('is_system', false);
    }

    public function scopeOrderByLoadOrder($query)
    {
        return $query->orderBy('load_order')->orderBy('id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function hasError(): bool
    {
        return $this->status === 'error';
    }

    public function getConfigValue(string $key, mixed $default = null): mixed
    {
        $config = $this->config ?? $this->default_config ?? [];
        return data_get($config, $key, $default);
    }

    public function setConfigValue(string $key, mixed $value): void
    {
        $config = $this->config ?? [];
        data_set($config, $key, $value);
        $this->config = $config;
        $this->save();
    }

    public function getIconUrlAttribute(): ?string
    {
        if (!$this->icon) {
            return null;
        }
        if (str_starts_with($this->icon, 'http')) {
            return $this->icon;
        }
        return Storage::url($this->icon);
    }

    public function getDependenciesListAttribute(): array
    {
        $deps = $this->dependencies ?? [];
        $list = [];
        foreach ($deps as $slug => $version) {
            $list[] = [
                'slug' => $slug,
                'version' => $version,
                'installed' => static::where('slug', $slug)->where('status', 'active')->exists(),
            ];
        }
        return $list;
    }

    public function setError(string $message): void
    {
        $this->update([
            'status' => 'error',
            'last_error' => $message,
            'last_error_at' => now(),
        ]);
    }

    public function clearError(): void
    {
        $this->update([
            'last_error' => null,
            'last_error_at' => null,
        ]);
    }
}
