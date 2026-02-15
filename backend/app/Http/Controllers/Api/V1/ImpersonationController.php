<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImpersonationController extends Controller
{
    public function start(User $user): JsonResponse
    {
        $currentUser = Auth::user();

        if (!$this->canImpersonate($currentUser, $user)) {
            return response()->json([
                'message' => 'You do not have permission to impersonate this user.',
            ], 403);
        }

        session([
            'impersonating' => $user->id,
            'impersonator_id' => $currentUser->id,
            'impersonator_token' => $currentUser->currentAccessToken()->id,
        ]);

        $newToken = $user->createToken('impersonation-token')->plainTextToken;

        return response()->json([
            'message' => "Now impersonating {$user->name}",
            'impersonated_user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'token' => $newToken,
            'is_impersonating' => true,
        ]);
    }

    public function stop(): JsonResponse
    {
        if (!session('impersonating')) {
            return response()->json([
                'message' => 'You are not impersonating anyone.',
            ], 400);
        }

        $impersonatorId = session('impersonator_id');
        $impersonator = User::find($impersonatorId);

        session()->forget(['impersonating', 'impersonator_id', 'impersonator_token']);

        if ($impersonator) {
            $newToken = $impersonator->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'Stopped impersonating. Returned to your account.',
                'original_user' => [
                    'id' => $impersonator->id,
                    'name' => $impersonator->name,
                    'email' => $impersonator->email,
                    'role' => $impersonator->role,
                ],
                'token' => $newToken,
                'is_impersonating' => false,
            ]);
        }

        return response()->json([
            'message' => 'Stopped impersonating.',
            'is_impersonating' => false,
        ]);
    }

    public function status(): JsonResponse
    {
        $isImpersonating = session()->has('impersonating');

        if ($isImpersonating) {
            $impersonatedUser = User::find(session('impersonating'));
            $impersonator = User::find(session('impersonator_id'));

            return response()->json([
                'is_impersonating' => true,
                'impersonated_user' => $impersonatedUser ? [
                    'id' => $impersonatedUser->id,
                    'name' => $impersonatedUser->name,
                    'email' => $impersonatedUser->email,
                    'role' => $impersonatedUser->role,
                ] : null,
                'impersonator' => $impersonator ? [
                    'id' => $impersonator->id,
                    'name' => $impersonator->name,
                    'email' => $impersonator->email,
                    'role' => $impersonator->role,
                ] : null,
            ]);
        }

        return response()->json([
            'is_impersonating' => false,
        ]);
    }

    public function getImpersonatableUsers(): JsonResponse
    {
        $currentUser = Auth::user();

        $query = User::where('id', '!=', $currentUser->id);

        if ($currentUser->role === 'super_admin') {
            $query->whereIn('role', ['admin', 'editor', 'author', 'contributor', 'subscriber']);
        } elseif ($currentUser->role === 'admin') {
            $query->whereIn('role', ['editor', 'author', 'contributor', 'subscriber']);
        } else {
            return response()->json([
                'message' => 'You do not have permission to impersonate users.',
                'users' => [],
            ], 403);
        }

        $users = $query->orderBy('name')->get(['id', 'name', 'email', 'role', 'is_active']);

        return response()->json([
            'users' => $users,
            'total' => $users->count(),
        ]);
    }

    protected function canImpersonate(User $impersonator, User $target): bool
    {
        if ($impersonator->id === $target->id) {
            return false;
        }

        $roleHierarchy = [
            'super_admin' => 5,
            'admin' => 4,
            'editor' => 3,
            'author' => 2,
            'contributor' => 1,
            'subscriber' => 0,
        ];

        $impersonatorLevel = $roleHierarchy[$impersonator->role] ?? 0;
        $targetLevel = $roleHierarchy[$target->role] ?? 0;

        return $impersonatorLevel > $targetLevel;
    }
}
