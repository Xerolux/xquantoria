<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ThemeTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'theme_id',
        'name',
        'slug',
        'type',
        'content',
        'settings',
        'is_custom',
    ];

    protected $casts = [
        'settings' => 'array',
        'is_custom' => 'boolean',
    ];

    public function theme(): BelongsTo
    {
        return $this->belongsTo(Theme::class);
    }
}
