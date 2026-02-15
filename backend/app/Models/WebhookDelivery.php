<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WebhookDelivery extends Model
{
    use HasFactory;

    protected $fillable = [
        'webhook_id',
        'event',
        'payload',
        'response_code',
        'response_body',
        'attempts',
        'delivered_at',
        'next_retry_at',
        'status',
        'error_message',
    ];

    protected $casts = [
        'payload' => 'array',
        'delivered_at' => 'datetime',
        'next_retry_at' => 'datetime',
    ];

    public function webhook()
    {
        return $this->belongsTo(Webhook::class);
    }

    public function markAsSuccess(int $responseCode, string $responseBody): void
    {
        $this->update([
            'status' => 'success',
            'response_code' => $responseCode,
            'response_body' => $responseBody,
            'delivered_at' => now(),
        ]);
    }

    public function markAsFailed(string $errorMessage, ?int $responseCode = null, ?string $responseBody = null): void
    {
        $maxAttempts = config('webhooks.max_retries', 5);
        
        $data = [
            'status' => $this->attempts >= $maxAttempts ? 'failed' : 'retrying',
            'error_message' => $errorMessage,
            'response_code' => $responseCode,
            'response_body' => $responseBody,
        ];

        if ($data['status'] === 'retrying') {
            $data['next_retry_at'] = now()->addMinutes($this->getRetryDelay());
        }

        $this->update($data);
    }

    protected function getRetryDelay(): int
    {
        return match ($this->attempts) {
            1 => 1,
            2 => 5,
            3 => 15,
            4 => 60,
            default => 120,
        };
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeForRetry($query)
    {
        return $query->where('status', 'retrying')
            ->where('next_retry_at', '<=', now());
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeSuccessful($query)
    {
        return $query->where('status', 'success');
    }
}
