<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Models\SentNotification;
use App\Models\User;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class PushNotificationController extends Controller
{
    protected WebPush $webPush;

    public function __construct()
    {
        $this->webPush = new WebPush([
            'VAPID' => [
                'subject' => config('app.url'),
                'publicKey' => config('webpush.vapid.public_key'),
                'privateKey' => config('webpush.vapid.private_key'),
            ],
        ]);
    }

    public function getVapidPublicKey(): JsonResponse
    {
        return response()->json([
            'public_key' => config('webpush.vapid.public_key'),
        ]);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string|url',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        $user = $request->user();

        $existing = PushSubscription::where('endpoint', $request->endpoint)->first();

        if ($existing) {
            $existing->update([
                'user_id' => $user?->id,
                'p256dh_key' => $request->keys['p256dh'],
                'auth_token' => $request->keys['auth'],
                'user_agent' => $request->userAgent(),
                'ip_address' => $request->ip(),
                'enabled' => true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Push subscription updated',
            ]);
        }

        PushSubscription::create([
            'user_id' => $user?->id,
            'endpoint' => $request->endpoint,
            'p256dh_key' => $request->keys['p256dh'],
            'auth_token' => $request->keys['auth'],
            'user_agent' => $request->userAgent(),
            'ip_address' => $request->ip(),
            'subscribed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Push subscription created',
        ]);
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string|url',
        ]);

        PushSubscription::where('endpoint', $request->endpoint)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Push subscription removed',
        ]);
    }

    public function getSubscriptions(Request $request): JsonResponse
    {
        $user = $request->user();

        $subscriptions = PushSubscription::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($sub) => [
                'id' => $sub->id,
                'endpoint' => $sub->endpoint,
                'user_agent' => $sub->user_agent,
                'enabled' => $sub->enabled,
                'subscribed_at' => $sub->subscribed_at,
                'last_notified_at' => $sub->last_notified_at,
            ]);

        return response()->json($subscriptions);
    }

    public function toggleSubscription(Request $request, int $id): JsonResponse
    {
        $subscription = PushSubscription::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $subscription->update(['enabled' => !$subscription->enabled]);

        return response()->json([
            'success' => true,
            'enabled' => $subscription->enabled,
        ]);
    }

    public function sendToUser(int $userId, string $title, string $body, array $data = []): array
    {
        $subscriptions = PushSubscription::where('user_id', $userId)
            ->where('enabled', true)
            ->get();

        $results = [];

        foreach ($subscriptions as $subscription) {
            $result = $this->sendNotification($subscription, $title, $body, $data);
            $results[$subscription->id] = $result;
        }

        return $results;
    }

    public function sendToAll(string $title, string $body, array $data = []): array
    {
        $subscriptions = PushSubscription::where('enabled', true)->get();

        $results = ['sent' => 0, 'failed' => 0];

        foreach ($subscriptions as $subscription) {
            $result = $this->sendNotification($subscription, $title, $body, $data);

            if ($result['success']) {
                $results['sent']++;
            } else {
                $results['failed']++;
            }
        }

        return $results;
    }

    public function sendNotification(PushSubscription $subscription, string $title, string $body, array $data = []): array
    {
        try {
            $webPushSubscription = Subscription::create([
                'endpoint' => $subscription->endpoint,
                'publicKey' => $subscription->p256dh_key,
                'authToken' => $subscription->auth_token,
            ]);

            $payload = json_encode([
                'title' => $title,
                'body' => $body,
                'icon' => config('app.url') . '/icons/icon-192x192.png',
                'badge' => config('app.url') . '/icons/badge-72x72.png',
                'data' => array_merge($data, [
                    'timestamp' => now()->toIso8601String(),
                ]),
                'actions' => $data['actions'] ?? [],
            ]);

            $this->webPush->sendOneNotification($webPushSubscription, $payload);

            $subscription->update(['last_notified_at' => now()]);

            return ['success' => true];
        } catch (\Exception $e) {
            if (str_contains($e->getMessage(), '410') || str_contains($e->getMessage(), '404')) {
                $subscription->delete();
            }

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function notifyNewPost(Post $post): array
    {
        return $this->sendToAll(
            $post->title,
            Str::limit($post->excerpt ?? strip_tags($post->content), 100),
            [
                'url' => route('blog.show', $post->slug),
                'type' => 'new_post',
                'post_id' => $post->id,
            ]
        );
    }

    public function getNotificationHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = SentNotification::where('user_id', $user->id)
            ->orWhereNull('user_id')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($notifications);
    }

    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $notification = SentNotification::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $notification->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        SentNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }
}
