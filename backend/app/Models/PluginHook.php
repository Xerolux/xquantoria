<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PluginHook extends Model
{
    protected $fillable = [
        'plugin_id',
        'hook',
        'handler',
        'type',
        'priority',
        'accepted_args',
        'is_active',
        'execution_count',
        'avg_execution_time',
        'last_executed_at',
    ];

    protected $casts = [
        'priority' => 'integer',
        'accepted_args' => 'integer',
        'is_active' => 'boolean',
        'execution_count' => 'integer',
        'avg_execution_time' => 'decimal:4',
        'last_executed_at' => 'datetime',
    ];

    public function plugin(): BelongsTo
    {
        return $this->belongsTo(Plugin::class);
    }

    public function scopeByHook($query, string $hook)
    {
        return $query->where('hook', $hook)->orderBy('priority');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->whereHas('plugin', fn($q) => $q->where('status', 'active'));
    }

    public function scopeActions($query)
    {
        return $query->where('type', 'action');
    }

    public function scopeFilters($query)
    {
        return $query->where('type', 'filter');
    }

    public function recordExecution(float $duration): void
    {
        $count = $this->execution_count + 1;
        $avg = (($this->avg_execution_time * $this->execution_count) + $duration) / $count;

        $this->update([
            'execution_count' => $count,
            'avg_execution_time' => $avg,
            'last_executed_at' => now(),
        ]);
    }
}
