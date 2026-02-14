<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Form extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'fields',
        'settings',
        'notifications',
        'success_message',
        'redirect_url',
        'store_submissions',
        'send_notification',
        'notification_email',
        'is_active',
    ];

    protected $casts = [
        'fields' => 'array',
        'settings' => 'array',
        'notifications' => 'array',
        'store_submissions' => 'boolean',
        'send_notification' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function submissions(): HasMany
    {
        return $this->hasMany(FormSubmission::class);
    }

    public function getSubmissionCount(): int
    {
        return $this->submissions()->count();
    }

    public function getUnreadCount(): int
    {
        return $this->submissions()->where('is_read', false)->count();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
