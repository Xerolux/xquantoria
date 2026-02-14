<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShopOrder extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_ON_HOLD = 'on_hold';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_REFUNDED = 'refunded';
    public const STATUS_FAILED = 'failed';

    public const PAYMENT_PENDING = 'pending';
    public const PAYMENT_PROCESSING = 'processing';
    public const PAYMENT_COMPLETED = 'completed';
    public const PAYMENT_FAILED = 'failed';
    public const PAYMENT_REFUNDED = 'refunded';

    protected $fillable = [
        'order_number',
        'user_id',
        'status',
        'payment_status',
        'payment_method',
        'transaction_id',
        'subtotal',
        'tax',
        'shipping',
        'discount',
        'total',
        'currency',
        'billing_address',
        'shipping_address',
        'customer_notes',
        'internal_notes',
        'paid_at',
        'shipped_at',
        'delivered_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'shipping' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'billing_address' => 'array',
        'shipping_address' => 'array',
        'paid_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function (self $order) {
            if (empty($order->order_number)) {
                $order->order_number = 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ShopOrderItem::class, 'order_id');
    }

    public function getStatusLabel(): string
    {
        return match ($this->status) {
            self::STATUS_PENDING => 'Ausstehend',
            self::STATUS_PROCESSING => 'In Bearbeitung',
            self::STATUS_ON_HOLD => 'Wartend',
            self::STATUS_COMPLETED => 'Abgeschlossen',
            self::STATUS_CANCELLED => 'Storniert',
            self::STATUS_REFUNDED => 'Erstattet',
            self::STATUS_FAILED => 'Fehlgeschlagen',
            default => $this->status,
        };
    }

    public function getPaymentStatusLabel(): string
    {
        return match ($this->payment_status) {
            self::PAYMENT_PENDING => 'Ausstehend',
            self::PAYMENT_PROCESSING => 'Wird verarbeitet',
            self::PAYMENT_COMPLETED => 'Bezahlt',
            self::PAYMENT_FAILED => 'Fehlgeschlagen',
            self::PAYMENT_REFUNDED => 'Erstattet',
            default => $this->payment_status,
        };
    }

    public function isPaid(): bool
    {
        return $this->payment_status === self::PAYMENT_COMPLETED;
    }

    public function canCancel(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_PROCESSING, self::STATUS_ON_HOLD]);
    }

    public function canRefund(): bool
    {
        return $this->payment_status === self::PAYMENT_COMPLETED;
    }

    public function markAsPaid(string $transactionId): void
    {
        $this->update([
            'payment_status' => self::PAYMENT_COMPLETED,
            'transaction_id' => $transactionId,
            'paid_at' => now(),
            'status' => self::STATUS_PROCESSING,
        ]);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeRecent($query)
    {
        return $query->orderBy('created_at', 'desc');
    }
}
