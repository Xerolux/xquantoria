<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminPassword = env('ADMIN_PASSWORD', 'Admin123!@#');
        $editorPassword = env('EDITOR_PASSWORD', 'Editor123!@#');

        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@example.com')],
            [
                'name' => 'Super Admin',
                'email' => env('ADMIN_EMAIL', 'admin@example.com'),
                'password' => Hash::make($adminPassword),
                'role' => 'super_admin',
                'display_name' => 'Administrator',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        User::updateOrCreate(
            ['email' => env('EDITOR_EMAIL', 'editor@example.com')],
            [
                'name' => 'Editor User',
                'email' => env('EDITOR_EMAIL', 'editor@example.com'),
                'password' => Hash::make($editorPassword),
                'role' => 'editor',
                'display_name' => 'Editor',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
    }
}
