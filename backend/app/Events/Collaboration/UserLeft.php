<?php

namespace App\Events\Collaboration;

use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserLeft implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $documentId,
        public int $userId,
        public string $sessionId
    ) {}

    public function broadcastOn()
    {
        return new PresenceChannel("document.{$this->documentId}");
    }

    public function broadcastAs()
    {
        return 'user.left';
    }

    public function broadcastWith()
    {
        return [
            'userId' => $this->userId,
            'sessionId' => $this->sessionId,
        ];
    }
}
