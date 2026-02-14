<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentRefund extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'order_id',
        'refund_id',
        'gateway_refund_id',
        'amount',
        'currency',
        'status',
        'reason',
        'reason_text',
        'gateway_response',
        'processed_by',
        'processed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'gateway_response' => 'array',
        'processed_at' => 'datetime',
    ];

    public function transaction()
    {
        return $this->belongsTo(PaymentTransaction::class, 'transaction_id');
    }

    public function order()
    {
        return $this->belongsTo(ShopOrder::class, 'order_id');
    }

    public function processor()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pending',
            'processing' => 'Processing',
            'completed' => 'Completed',
            'failed' => 'Failed',
            default => 'Unknown',
        };
    }

    public function getReasonLabelAttribute(): string
    {
        return match ($this->reason) {
            'requested_by_customer' => 'Requested by Customer',
            'duplicate' => 'Duplicate Payment',
            'fraudulent' => 'Fraudulent Transaction',
            'other' => 'Other',
            default => 'Unknown',
        };
    }
}
