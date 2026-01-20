<?php

namespace App\Policies;

use App\Models\Download;
use App\Models\User;

class DownloadPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true; // All authenticated users can view downloads
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Download $download): bool
    {
        // Check access level
        switch ($download->access_level) {
            case 'public':
                return true;
            case 'registered':
                return true; // User is authenticated
            case 'premium':
                return in_array($user->role, ['author', 'editor', 'admin', 'super_admin']);
            case 'admin':
                return in_array($user->role, ['admin', 'super_admin']);
            default:
                return false;
        }
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Author and above can create downloads
        return in_array($user->role, [
            'author',
            'editor',
            'admin',
            'super_admin'
        ]);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Download $download): bool
    {
        // Editor and above can update downloads
        return in_array($user->role, ['editor', 'admin', 'super_admin']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Download $download): bool
    {
        // Only admin or super_admin can delete downloads
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Download $download): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Download $download): bool
    {
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can generate a download token.
     */
    public function generateToken(User $user, Download $download): bool
    {
        return $this->view($user, $download);
    }
}
