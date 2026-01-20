<?php

namespace App\Policies;

use App\Models\User;

class PluginPolicy
{
    /**
     * Determine whether the user can view any plugins.
     */
    public function viewAny(User $user): bool
    {
        // Admins and super_admins can view plugins
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can view the plugin.
     */
    public function view(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can install plugins.
     */
    public function install(User $user): bool
    {
        // Only super_admin can install plugins (security risk)
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can activate plugins.
     */
    public function activate(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can deactivate plugins.
     */
    public function deactivate(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can update plugin config.
     */
    public function updateConfig(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can uninstall plugins.
     */
    public function uninstall(User $user): bool
    {
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can view plugin stats.
     */
    public function viewStats(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can manage hooks.
     */
    public function manageHooks(User $user): bool
    {
        return $user->role === 'super_admin';
    }
}
