<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopCart extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'session_id',
        'items',
        'currency',
    ];

    protected $casts = [
        'items' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getSubtotal(): float
    {
        $total = 0;
        foreach ($this->items ?? [] as $item) {
            $total += ($item['price'] ?? 0) * ($item['quantity'] ?? 1);
        }
        return round($total, 2);
    }

    public function getItemCount(): int
    {
        return collect($this->items ?? [])->sum('quantity');
    }

    public function addItem(int $productId, int $quantity = 1, array $attributes = []): void
    {
        $items = $this->items ?? [];
        $key = md5($productId . serialize($attributes));

        if (isset($items[$key])) {
            $items[$key]['quantity'] += $quantity;
        } else {
            $product = ShopProduct::find($productId);
            if ($product) {
                $items[$key] = [
                    'product_id' => $productId,
                    'name' => $product->name,
                    'price' => $product->getCurrentPrice(),
                    'quantity' => $quantity,
                    'attributes' => $attributes,
                ];
            }
        }

        $this->items = $items;
        $this->save();
    }

    public function updateItem(string $key, int $quantity): bool
    {
        $items = $this->items ?? [];
        if (!isset($items[$key])) {
            return false;
        }

        if ($quantity <= 0) {
            unset($items[$key]);
        } else {
            $items[$key]['quantity'] = $quantity;
        }

        $this->items = $items;
        $this->save();
        return true;
    }

    public function removeItem(string $key): bool
    {
        $items = $this->items ?? [];
        if (!isset($items[$key])) {
            return false;
        }

        unset($items[$key]);
        $this->items = $items;
        $this->save();
        return true;
    }

    public function clear(): void
    {
        $this->items = [];
        $this->save();
    }
}
