<?php

namespace App\Services\Collaboration;

use App\Events\Collaboration\UserJoined;
use App\Events\Collaboration\UserLeft;
use App\Events\Collaboration\CursorMoved;
use App\Events\Collaboration\BlockUpdated;
use App\Events\Collaboration\DocumentSynced;
use App\Events\Collaboration\SelectionChanged;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CollaborationService
{
    protected string $cachePrefix = 'collab:';
    protected int $sessionTimeout = 300; // 5 minutes
    protected array $userColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    ];

    public function joinDocument(string $documentId, int $userId): array
    {
        $user = User::find($userId);
        $sessionId = Str::uuid()->toString();
        $userColor = $this->assignUserColor($documentId, $userId);

        $session = [
            'sessionId' => $sessionId,
            'userId' => $userId,
            'userName' => $user->display_name ?? $user->name,
            'userColor' => $userColor,
            'joinedAt' => now()->toIso8601String(),
            'lastActivity' => now()->toIso8601String(),
        ];

        $this->addUserToDocument($documentId, $session);

        broadcast(new UserJoined(
            $documentId,
            $userId,
            $session['userName'],
            $userColor,
            $sessionId
        ))->toOthers();

        return [
            'session' => $session,
            'document' => $this->getDocumentState($documentId),
            'users' => $this->getActiveUsers($documentId),
        ];
    }

    public function leaveDocument(string $documentId, int $userId, string $sessionId): void
    {
        $this->removeUserFromDocument($documentId, $userId, $sessionId);

        broadcast(new UserLeft($documentId, $userId, $sessionId));
    }

    public function updateCursor(
        string $documentId,
        int $userId,
        ?string $blockId = null,
        ?int $offset = null,
        ?int $x = null,
        ?int $y = null,
        ?string $selection = null
    ): void {
        $session = $this->getUserSession($documentId, $userId);
        
        if (!$session) {
            return;
        }

        $this->updateUserActivity($documentId, $userId);

        broadcast(new CursorMoved(
            $documentId,
            $userId,
            $session['userName'],
            $session['userColor'],
            $blockId,
            $offset,
            $x,
            $y,
            $selection
        ))->toOthers();
    }

    public function updateBlock(
        string $documentId,
        int $userId,
        string $blockId,
        string $operation,
        array $data
    ): array {
        $session = $this->getUserSession($documentId, $userId);
        
        if (!$session) {
            throw new \Exception('User not in document session');
        }

        $this->updateUserActivity($documentId, $userId);

        $version = $this->incrementDocumentVersion($documentId);

        $this->storeOperation($documentId, [
            'operation' => $operation,
            'blockId' => $blockId,
            'data' => $data,
            'userId' => $userId,
            'version' => $version,
            'timestamp' => now()->toIso8601String(),
        ]);

        broadcast(new BlockUpdated(
            $documentId,
            $userId,
            $session['userName'],
            $blockId,
            $operation,
            $data,
            $version
        ))->toOthers();

        return [
            'version' => $version,
            'success' => true,
        ];
    }

    public function updateSelection(
        string $documentId,
        int $userId,
        array $selectedBlockIds = [],
        ?string $textSelection = null
    ): void {
        $session = $this->getUserSession($documentId, $userId);
        
        if (!$session) {
            return;
        }

        $this->updateUserActivity($documentId, $userId);

        broadcast(new SelectionChanged(
            $documentId,
            $userId,
            $session['userName'],
            $session['userColor'],
            $selectedBlockIds,
            $textSelection
        ))->toOthers();
    }

    public function syncDocument(string $documentId, array $blocks, int $version): void
    {
        broadcast(new DocumentSynced($documentId, $blocks, $version));
    }

    public function getActiveUsers(string $documentId): array
    {
        $key = $this->getUsersKey($documentId);
        $users = Cache::get($key, []);

        $activeUsers = array_filter($users, function ($session) {
            $lastActivity = strtotime($session['lastActivity']);
            return (time() - $lastActivity) < $this->sessionTimeout;
        });

        return array_values($activeUsers);
    }

    public function getDocumentState(string $documentId): array
    {
        $post = Post::where('id', $documentId)
            ->orWhere('slug', $documentId)
            ->first();

        if (!$post) {
            return [
                'id' => $documentId,
                'blocks' => [],
                'version' => 0,
            ];
        }

        $version = $this->getDocumentVersion($documentId);

        return [
            'id' => $post->id,
            'title' => $post->title,
            'content' => $post->content,
            'blocks' => $this->parseContentToBlocks($post->content),
            'version' => $version,
        ];
    }

    public function heartbeat(string $documentId, int $userId): void
    {
        $this->updateUserActivity($documentId, $userId);
    }

    public function checkConflict(string $documentId, int $clientVersion): ?array
    {
        $serverVersion = $this->getDocumentVersion($documentId);

        if ($clientVersion < $serverVersion) {
            return [
                'hasConflict' => true,
                'serverVersion' => $serverVersion,
                'operations' => $this->getOperationsSince($documentId, $clientVersion),
            ];
        }

        return null;
    }

    protected function assignUserColor(string $documentId, int $userId): string
    {
        $usedColors = [];
        $users = $this->getActiveUsers($documentId);

        foreach ($users as $user) {
            if ($user['userId'] !== $userId) {
                $usedColors[] = $user['userColor'];
            }
        }

        $availableColors = array_diff($this->userColors, $usedColors);

        if (empty($availableColors)) {
            return $this->userColors[$userId % count($this->userColors)];
        }

        return array_values($availableColors)[0];
    }

    protected function addUserToDocument(string $documentId, array $session): void
    {
        $key = $this->getUsersKey($documentId);
        $users = Cache::get($key, []);
        $users[$session['sessionId']] = $session;
        Cache::put($key, $users, $this->sessionTimeout);
    }

    protected function removeUserFromDocument(string $documentId, int $userId, string $sessionId): void
    {
        $key = $this->getUsersKey($documentId);
        $users = Cache::get($key, []);
        unset($users[$sessionId]);
        Cache::put($key, $users, $this->sessionTimeout);
    }

    protected function getUserSession(string $documentId, int $userId): ?array
    {
        $users = $this->getActiveUsers($documentId);
        
        foreach ($users as $session) {
            if ($session['userId'] === $userId) {
                return $session;
            }
        }

        return null;
    }

    protected function updateUserActivity(string $documentId, int $userId): void
    {
        $key = $this->getUsersKey($documentId);
        $users = Cache::get($key, []);

        foreach ($users as &$session) {
            if ($session['userId'] === $userId) {
                $session['lastActivity'] = now()->toIso8601String();
            }
        }

        Cache::put($key, $users, $this->sessionTimeout);
    }

    protected function getUsersKey(string $documentId): string
    {
        return $this->cachePrefix . "users:{$documentId}";
    }

    protected function getVersionKey(string $documentId): string
    {
        return $this->cachePrefix . "version:{$documentId}";
    }

    protected function getOperationsKey(string $documentId): string
    {
        return $this->cachePrefix . "operations:{$documentId}";
    }

    protected function getDocumentVersion(string $documentId): int
    {
        return Cache::get($this->getVersionKey($documentId), 0);
    }

    protected function incrementDocumentVersion(string $documentId): int
    {
        $key = $this->getVersionKey($documentId);
        $version = Cache::increment($key);
        
        if ($version === false) {
            Cache::put($key, 1);
            return 1;
        }

        return $version;
    }

    protected function storeOperation(string $documentId, array $operation): void
    {
        $key = $this->getOperationsKey($documentId);
        $operations = Cache::get($key, []);
        $operations[] = $operation;

        if (count($operations) > 100) {
            $operations = array_slice($operations, -100);
        }

        Cache::put($key, $operations, 3600);
    }

    protected function getOperationsSince(string $documentId, int $sinceVersion): array
    {
        $key = $this->getOperationsKey($documentId);
        $operations = Cache::get($key, []);

        return array_filter($operations, function ($op) use ($sinceVersion) {
            return $op['version'] > $sinceVersion;
        });
    }

    protected function parseContentToBlocks(?string $content): array
    {
        if (!$content) {
            return [];
        }

        return [];
    }
}
