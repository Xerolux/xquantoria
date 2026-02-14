<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LegalDocument extends Model
{
    use HasFactory;

    public const TYPE_IMPRESSUM = 'impressum';
    public const TYPE_DATENSCHUTZ = 'datenschutz';
    public const TYPE_VERSAND = 'versand';
    public const TYPE_WIDERRUF = 'widerruf';
    public const TYPE_BEZAHLUNG = 'bezahlung';
    public const TYPE_AGB = 'agb';
    public const TYPE_COOKIE = 'cookie';

    protected $fillable = [
        'type',
        'title',
        'content',
        'slug',
        'form_data',
        'language',
        'version',
        'generated_at',
        'valid_until',
        'is_published',
        'created_by',
    ];

    protected $casts = [
        'form_data' => 'array',
        'generated_at' => 'datetime',
        'valid_until' => 'datetime',
        'is_published' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function getTypes(): array
    {
        return [
            self::TYPE_IMPRESSUM => 'Impressum',
            self::TYPE_DATENSCHUTZ => 'Datenschutzerklärung',
            self::TYPE_VERSAND => 'Versand- & Lieferbedingungen',
            self::TYPE_WIDERRUF => 'Widerrufsrecht',
            self::TYPE_BEZAHLUNG => 'Zahlungsarten',
            self::TYPE_AGB => 'AGB',
            self::TYPE_COOKIE => 'Cookie-Richtlinie',
        ];
    }

    public function getExcerpt(int $length = 150): string
    {
        return str(strip_tags($this->content))->limit($length);
    }
}
