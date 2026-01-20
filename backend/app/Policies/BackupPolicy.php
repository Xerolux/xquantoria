<?php

namespace App\Policies;

use App\Models\User;

class BackupPolicy
{
    /**
     * Determine whether the user can view any backups.
     */
    public function viewAny(User $user): bool
    {
        // Only super_admin can view backups
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can view the backup.
     */
    public function view(User $user): bool
    {
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can create backups.
     */
    public function create(User $user): bool
    {
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can restore backups.
     */
    public function restore(User $user): bool
    {
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can download backups.
     */
    public function download(User $user): bool
    {
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can delete backups.
     */
    public function delete(User $user): bool
    {
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can view backup stats.
     */
    public function viewStats(User $user): bool
    {
        return $user->role === 'super_admin';
    }
}
