<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PluginMigration extends Model
{
    protected $fillable = [
        'plugin_id',
        'migration',
        'batch',
    ];

    protected $casts = [
        'batch' => 'integer',
    ];

    public function plugin(): BelongsTo
    {
        return $this->belongsTo(Plugin::class);
    }
}
