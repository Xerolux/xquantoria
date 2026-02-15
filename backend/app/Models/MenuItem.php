<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MenuItem extends Model
{
    protected $fillable = [
        'menu_id',
        'parent_id',
        'title',
        'url',
        'target',
        'icon',
        'class',
        'order',
        'type',
        'linkable_id',
        'linkable_type',
        'meta',
        'is_active',
    ];

    protected $casts = [
        'meta' => 'array',
        'is_active' => 'boolean',
    ];

    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(MenuItem::class, 'parent_id')->orderBy('order');
    }

    public function linkable(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRoot($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    public function getResolvedUrlAttribute(): string
    {
        if ($this->url) {
            return $this->url;
        }

        if ($this->linkable) {
            return $this->linkable->slug ?? $this->linkable->id;
        }

        return '#';
    }

    public function getFullPathAttribute(): string
    {
        $url = $this->resolved_url;

        if (str_starts_with($url, 'http') || str_starts_with($url, '/')) {
            return $url;
        }

        return '/' . $url;
    }

    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }

    public function getDepth(): int
    {
        $depth = 0;
        $parent = $this->parent;

        while ($parent) {
            $depth++;
            $parent = $parent->parent;
        }

        return $depth;
    }

    public static function getTypes(): array
    {
        return [
            'custom' => 'Custom Link',
            'post' => 'Post',
            'page' => 'Page',
            'category' => 'Category',
            'tag' => 'Tag',
        ];
    }

    public static function getTargets(): array
    {
        return [
            '_self' => 'Same Window',
            '_blank' => 'New Window',
        ];
    }
}
