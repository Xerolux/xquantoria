<?php

namespace App\Events\Collaboration;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserJoined implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $documentId,
        public int $userId,
        public string $userName,
        public string $userColor,
        public string $sessionId
    ) {}

    public function broadcastOn()
    {
        return new PresenceChannel("document.{$this->documentId}");
    }

    public function broadcastAs()
    {
        return 'user.joined';
    }

    public function broadcastWith()
    {
        return [
            'userId' => $this->userId,
            'userName' => $this->userName,
            'userColor' => $this->userColor,
            'sessionId' => $this->sessionId,
            'joinedAt' => now()->toIso8601String(),
        ];
    }
}
