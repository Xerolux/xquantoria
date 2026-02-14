<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PluginPermission extends Model
{
    protected $fillable = [
        'plugin_id',
        'permission',
        'description',
        'is_granted',
    ];

    protected $casts = [
        'is_granted' => 'boolean',
    ];

    public function plugin(): BelongsTo
    {
        return $this->belongsTo(Plugin::class);
    }

    public function scopeGranted($query)
    {
        return $query->where('is_granted', true);
    }
}
