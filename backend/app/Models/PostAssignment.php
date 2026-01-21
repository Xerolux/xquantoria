<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostAssignment extends Model
{
    protected $fillable = [
        'post_id',
        'user_id',
        'role',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The post that was assigned.
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * The user who is assigned.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for authors.
     */
    public function scopeAuthors($query)
    {
        return $query->where('role', 'author');
    }

    /**
     * Scope for reviewers.
     */
    public function scopeReviewers($query)
    {
        return $query->where('role', 'reviewer');
    }

    /**
     * Scope for editors.
     */
    public function scopeEditors($query)
    {
        return $query->where('role', 'editor');
    }

    /**
     * Scope for specific role.
     */
    public function scopeWithRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Get role options.
     */
    public static function getRoles(): array
    {
        return [
            'author' => 'Author',
            'reviewer' => 'Reviewer',
            'editor' => 'Editor',
        ];
    }
}
