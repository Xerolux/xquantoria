<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Theme extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'version',
        'description',
        'author',
        'author_url',
        'screenshot',
        'preview_url',
        'settings',
        'colors',
        'fonts',
        'layouts',
        'custom_css',
        'templates',
        'parent_theme',
        'is_active',
        'is_child_theme',
    ];

    protected $casts = [
        'settings' => 'array',
        'colors' => 'array',
        'fonts' => 'array',
        'layouts' => 'array',
        'custom_css' => 'array',
        'templates' => 'array',
        'is_active' => 'boolean',
        'is_child_theme' => 'boolean',
    ];

    public function settings(): HasMany
    {
        return $this->hasMany(ThemeSetting::class);
    }

    public function modifications(): HasMany
    {
        return $this->hasMany(ThemeModification::class);
    }

    public function themeTemplates(): HasMany
    {
        return $this->hasMany(ThemeTemplate::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_theme', 'slug');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_theme', 'slug');
    }

    public function activate(): void
    {
        self::where('is_active', true)->update(['is_active' => false]);
        $this->update(['is_active' => true]);
    }

    public function getSetting(string $key, $default = null)
    {
        $modification = $this->modifications()->where('setting_key', $key)->first();
        if ($modification) {
            return $modification->setting_value;
        }

        $setting = $this->settings()->where('key', $key)->first();
        if ($setting) {
            return $setting->value;
        }

        return $this->settings[$key] ?? $default;
    }

    public function setSetting(string $key, $value): void
    {
        $this->modifications()->updateOrCreate(
            ['setting_key' => $key],
            ['setting_value' => $value]
        );
    }

    public function getGeneratedCss(): string
    {
        $css = '';
        $colors = $this->colors ?? [];
        $fonts = $this->fonts ?? [];

        foreach ($colors as $name => $value) {
            $css .= "--color-{$name}: {$value};\n";
        }

        foreach ($fonts as $name => $value) {
            $css .= "--font-{$name}: {$value};\n";
        }

        if (!empty($css)) {
            $css = ":root {\n{$css}}\n";
        }

        if ($this->custom_css) {
            foreach ($this->custom_css as $selector => $rules) {
                $css .= "{$selector} {\n{$rules}\n}\n";
            }
        }

        return $css;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeParents($query)
    {
        return $query->where('is_child_theme', false);
    }
}
