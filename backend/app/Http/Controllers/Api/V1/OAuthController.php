<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SocialAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Sanctum\PersonalAccessToken;

class OAuthController extends Controller
{
    public function redirectToProvider(string $provider): JsonResponse
    {
        $allowedProviders = ['google', 'github', 'facebook', 'twitter', 'linkedin'];

        if (!in_array($provider, $allowedProviders)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid OAuth provider',
            ], 400);
        }

        try {
            $url = Socialite::driver($provider)->stateless()->redirect()->getTargetUrl();

            return response()->json([
                'success' => true,
                'redirect_url' => $url,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate OAuth redirect URL',
            ], 500);
        }
    }

    public function handleProviderCallback(string $provider): JsonResponse
    {
        $allowedProviders = ['google', 'github', 'facebook', 'twitter', 'linkedin'];

        if (!in_array($provider, $allowedProviders)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid OAuth provider',
            ], 400);
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'OAuth authentication failed',
            ], 401);
        }

        $socialAccount = SocialAccount::where('provider', $provider)
            ->where('provider_id', $socialUser->getId())
            ->first();

        if ($socialAccount) {
            $user = $socialAccount->user;
            $this->updateSocialAccount($socialAccount, $socialUser);
        } else {
            $user = User::where('email', $socialUser->getEmail())->first();

            if ($user) {
                $this->createSocialAccount($user, $provider, $socialUser);
            } else {
                $user = $this->createUserFromSocial($provider, $socialUser);
            }
        }

        $token = $user->createToken('oauth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $user->load(['roles', 'socialAccounts']),
            'message' => 'Successfully logged in via ' . ucfirst($provider),
        ]);
    }

    public function handleMobileAuth(Request $request, string $provider): JsonResponse
    {
        $request->validate([
            'access_token' => 'required|string',
            'id_token' => 'nullable|string',
        ]);

        $allowedProviders = ['google', 'github', 'apple'];

        if (!in_array($provider, $allowedProviders)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid OAuth provider',
            ], 400);
        }

        try {
            $socialUser = Socialite::driver($provider)
                ->stateless()
                ->userFromToken($request->access_token);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid OAuth token',
            ], 401);
        }

        $socialAccount = SocialAccount::where('provider', $provider)
            ->where('provider_id', $socialUser->getId())
            ->first();

        if ($socialAccount) {
            $user = $socialAccount->user;
        } else {
            $user = User::where('email', $socialUser->getEmail())->first();

            if ($user) {
                $this->createSocialAccount($user, $provider, $socialUser);
            } else {
                $user = $this->createUserFromSocial($provider, $socialUser);
            }
        }

        $token = $user->createToken('mobile-oauth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function linkProvider(Request $request, string $provider): JsonResponse
    {
        $request->validate([
            'access_token' => 'required|string',
        ]);

        $user = $request->user();

        $existingAccount = SocialAccount::where('provider', $provider)
            ->where('provider_id', '!=', null)
            ->whereHas('user', fn($q) => $q->where('id', '!=', $user->id))
            ->first();

        if ($existingAccount) {
            return response()->json([
                'success' => false,
                'message' => 'This ' . $provider . ' account is already linked to another user',
            ], 422);
        }

        try {
            $socialUser = Socialite::driver($provider)
                ->stateless()
                ->userFromToken($request->access_token);

            $this->createSocialAccount($user, $provider, $socialUser);

            return response()->json([
                'success' => true,
                'message' => ucfirst($provider) . ' account linked successfully',
                'social_accounts' => $user->socialAccounts,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to link ' . $provider . ' account',
            ], 500);
        }
    }

    public function unlinkProvider(Request $request, string $provider): JsonResponse
    {
        $user = $request->user();

        $socialAccount = SocialAccount::where('user_id', $user->id)
            ->where('provider', $provider)
            ->first();

        if (!$socialAccount) {
            return response()->json([
                'success' => false,
                'message' => 'No linked ' . $provider . ' account found',
            ], 404);
        }

        if (!$user->password && $user->socialAccounts()->count() === 1) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot unlink the only authentication method. Please set a password first.',
            ], 422);
        }

        $socialAccount->delete();

        return response()->json([
            'success' => true,
            'message' => ucfirst($provider) . ' account unlinked successfully',
            'social_accounts' => $user->socialAccounts()->get(),
        ]);
    }

    public function getLinkedProviders(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'providers' => $user->socialAccounts->map(fn($account) => [
                'provider' => $account->provider,
                'provider_id' => $account->provider_id,
                'name' => $account->name,
                'email' => $account->email,
                'avatar' => $account->avatar,
                'linked_at' => $account->created_at,
            ]),
        ]);
    }

    protected function createUserFromSocial(string $provider, $socialUser): User
    {
        $user = User::create([
            'name' => $socialUser->getName() ?? $socialUser->getNickname() ?? 'User',
            'email' => $socialUser->getEmail(),
            'email_verified_at' => now(),
            'password' => null,
            'role' => 'subscriber',
            'avatar_url' => $socialUser->getAvatar(),
            'settings' => [
                'oauth_provider' => $provider,
                'oauth_signup' => true,
            ],
        ]);

        $this->createSocialAccount($user, $provider, $socialUser);

        return $user;
    }

    protected function createSocialAccount(User $user, string $provider, $socialUser): SocialAccount
    {
        return SocialAccount::create([
            'user_id' => $user->id,
            'provider' => $provider,
            'provider_id' => (string) $socialUser->getId(),
            'name' => $socialUser->getName(),
            'email' => $socialUser->getEmail(),
            'avatar' => $socialUser->getAvatar(),
            'nickname' => $socialUser->getNickname(),
            'token' => $socialUser->token,
            'refresh_token' => $socialUser->refreshToken,
            'expires_at' => $socialUser->expiresIn ? now()->addSeconds($socialUser->expiresIn) : null,
            'raw' => $socialUser->getRaw(),
        ]);
    }

    protected function updateSocialAccount(SocialAccount $account, $socialUser): void
    {
        $account->update([
            'token' => $socialUser->token,
            'refresh_token' => $socialUser->refreshToken,
            'expires_at' => $socialUser->expiresIn ? now()->addSeconds($socialUser->expiresIn) : null,
            'avatar' => $socialUser->getAvatar(),
            'raw' => $socialUser->getRaw(),
        ]);
    }
}
