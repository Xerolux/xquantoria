<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Menu extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'location',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(MenuItem::class)->whereNull('parent_id')->orderBy('order');
    }

    public function allItems(): HasMany
    {
        return $this->hasMany(MenuItem::class)->orderBy('order');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByLocation($query, string $location)
    {
        return $query->where('location', $location);
    }

    public function getTree(): array
    {
        return $this->buildTree($this->items()->with('children')->get());
    }

    protected function buildTree($items): array
    {
        $tree = [];
        foreach ($items as $item) {
            $node = $item->toArray();
            if ($item->children->isNotEmpty()) {
                $node['children'] = $this->buildTree($item->children);
            }
            $tree[] = $node;
        }
        return $tree;
    }

    public static function getLocations(): array
    {
        return [
            'header' => 'Header Navigation',
            'footer' => 'Footer Navigation',
            'sidebar' => 'Sidebar Navigation',
            'mobile' => 'Mobile Navigation',
            'social' => 'Social Links',
        ];
    }
}
