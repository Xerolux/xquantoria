<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ShopProduct extends Model
{
    use HasFactory;

    protected $fillable = [
        'sku',
        'name',
        'slug',
        'description',
        'short_description',
        'price',
        'sale_price',
        'cost_price',
        'stock_quantity',
        'manage_stock',
        'backorders',
        'is_virtual',
        'is_downloadable',
        'download_url',
        'download_limit',
        'download_expiry_days',
        'category_id',
        'featured_image_id',
        'gallery',
        'attributes',
        'variations',
        'weight',
        'length',
        'width',
        'height',
        'is_featured',
        'is_active',
        'sale_starts_at',
        'sale_ends_at',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'weight' => 'decimal:3',
        'length' => 'decimal:2',
        'width' => 'decimal:2',
        'height' => 'decimal:2',
        'gallery' => 'array',
        'attributes' => 'array',
        'variations' => 'array',
        'manage_stock' => 'boolean',
        'backorders' => 'boolean',
        'is_virtual' => 'boolean',
        'is_downloadable' => 'boolean',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'sale_starts_at' => 'datetime',
        'sale_ends_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function (self $product) {
            if (empty($product->slug)) {
                $product->slug = Str::slug($product->name);
            }
            if (empty($product->sku)) {
                $product->sku = 'PRD-' . strtoupper(Str::random(8));
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ShopProductCategory::class, 'category_id');
    }

    public function featuredImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'featured_image_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(ShopProductTag::class, 'shop_product_tag', 'product_id', 'tag_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ShopReview::class, 'product_id');
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(ShopOrderItem::class, 'product_id');
    }

    public function getCurrentPrice(): float
    {
        if ($this->sale_price && $this->isOnSale()) {
            return $this->sale_price;
        }
        return $this->price;
    }

    public function isOnSale(): bool
    {
        if (!$this->sale_price) {
            return false;
        }
        $now = now();
        if ($this->sale_starts_at && $now->lt($this->sale_starts_at)) {
            return false;
        }
        if ($this->sale_ends_at && $now->gt($this->sale_ends_at)) {
            return false;
        }
        return true;
    }

    public function isInStock(): bool
    {
        if (!$this->manage_stock) {
            return true;
        }
        return $this->stock_quantity > 0 || $this->backorders;
    }

    public function getAverageRating(): float
    {
        return $this->reviews()->approved()->avg('rating') ?? 0;
    }

    public function getReviewCount(): int
    {
        return $this->reviews()->approved()->count();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeOnSale($query)
    {
        return $query->whereNotNull('sale_price')
            ->where(function ($q) {
                $q->whereNull('sale_starts_at')
                    ->orWhere('sale_starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('sale_ends_at')
                    ->orWhere('sale_ends_at', '>=', now());
            });
    }

    public function scopeInStock($query)
    {
        return $query->where(function ($q) {
            $q->where('manage_stock', false)
                ->orWhere('stock_quantity', '>', 0)
                ->orWhere('backorders', true);
        });
    }
}
