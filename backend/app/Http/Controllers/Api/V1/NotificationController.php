<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->input('limit', 20);
        $user = $request->user();

        $notifications = $this->getUserNotifications($user->id, $limit);

        return response()->json([
            'data' => $notifications,
            'unread_count' => collect($notifications)->whereNull('read_at')->count(),
        ]);
    }

    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (DB::getSchemaBuilder()->hasTable('notifications')) {
            DB::table('notifications')
                ->where('id', $id)
                ->where('notifiable_id', $user->id)
                ->update(['read_at' => now()]);
        }

        return response()->json(['success' => true]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();

        if (DB::getSchemaBuilder()->hasTable('notifications')) {
            DB::table('notifications')
                ->where('notifiable_id', $user->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (DB::getSchemaBuilder()->hasTable('notifications')) {
            DB::table('notifications')
                ->where('id', $id)
                ->where('notifiable_id', $user->id)
                ->delete();
        }

        return response()->json(['success' => true]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        $count = 0;
        if (DB::getSchemaBuilder()->hasTable('notifications')) {
            $count = DB::table('notifications')
                ->where('notifiable_id', $user->id)
                ->whereNull('read_at')
                ->count();
        }

        return response()->json(['count' => $count]);
    }

    protected function getUserNotifications(int $userId, int $limit): array
    {
        if (!DB::getSchemaBuilder()->hasTable('notifications')) {
            return $this->getMockNotifications();
        }

        $notifications = DB::table('notifications')
            ->where('notifiable_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return $notifications->map(function ($notification) {
            $data = json_decode($notification->data, true);
            return [
                'id' => $notification->id,
                'type' => $data['type'] ?? 'info',
                'title' => $data['title'] ?? 'Notification',
                'message' => $data['message'] ?? '',
                'read_at' => $notification->read_at,
                'created_at' => $notification->created_at,
                'action_url' => $data['action_url'] ?? null,
                'data' => $data,
            ];
        })->toArray();
    }

    protected function getMockNotifications(): array
    {
        return [
            [
                'id' => 1,
                'type' => 'info',
                'title' => 'Willkommen!',
                'message' => 'Willkommen im Admin Panel',
                'read_at' => null,
                'created_at' => now()->subHours(1)->toIso8601String(),
                'action_url' => null,
            ],
            [
                'id' => 2,
                'type' => 'success',
                'title' => 'System bereit',
                'message' => 'Alle Systeme laufen einwandfrei',
                'read_at' => now()->subMinutes(30)->toIso8601String(),
                'created_at' => now()->subHours(2)->toIso8601String(),
                'action_url' => '/admin/system-health',
            ],
        ];
    }
}
