<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ThemeSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'theme_id',
        'key',
        'value',
        'type',
        'group',
        'label',
        'description',
        'options',
        'sort_order',
    ];

    protected $casts = [
        'options' => 'array',
    ];

    public function theme(): BelongsTo
    {
        return $this->belongsTo(Theme::class);
    }
}
