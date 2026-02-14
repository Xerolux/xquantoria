<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PaymentTransaction extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_id',
        'user_id',
        'transaction_id',
        'gateway',
        'gateway_transaction_id',
        'gateway_payment_intent_id',
        'amount',
        'currency',
        'fee_amount',
        'net_amount',
        'status',
        'payment_method',
        'payment_details',
        'gateway_response',
        'metadata',
        'paid_at',
        'failed_at',
        'refunded_at',
        'failure_reason',
        'refund_reason',
        'refund_amount',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'fee_amount' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'payment_details' => 'array',
        'gateway_response' => 'array',
        'metadata' => 'array',
        'paid_at' => 'datetime',
        'failed_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(ShopOrder::class, 'order_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function refunds()
    {
        return $this->hasMany(PaymentRefund::class, 'transaction_id');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeByGateway($query, string $gateway)
    {
        return $query->where('gateway', $gateway);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isRefundable(): bool
    {
        return in_array($this->status, ['completed', 'partially_refunded']);
    }

    public function getNetAmountAttribute($value): ?float
    {
        return $value ?? $this->amount;
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pending',
            'processing' => 'Processing',
            'completed' => 'Completed',
            'failed' => 'Failed',
            'refunded' => 'Refunded',
            'partially_refunded' => 'Partially Refunded',
            'cancelled' => 'Cancelled',
            'disputed' => 'Disputed',
            default => 'Unknown',
        };
    }
}
