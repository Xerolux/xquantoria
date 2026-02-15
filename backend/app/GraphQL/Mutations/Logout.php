<?php

namespace App\GraphQL\Mutations;

use Illuminate\Support\Facades\Auth;

class Logout
{
    public function __invoke($_, array $args): bool
    {
        $user = Auth::user();

        if ($user) {
            $user->currentAccessToken()->delete();
            return true;
        }

        return false;
    }
}
