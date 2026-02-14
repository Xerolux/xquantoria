<?php

namespace App\Events\Collaboration;

use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CursorMoved implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $documentId,
        public int $userId,
        public string $userName,
        public string $userColor,
        public ?string $blockId = null,
        public ?int $offset = null,
        public ?int $x = null,
        public ?int $y = null,
        public ?string $selection = null
    ) {}

    public function broadcastOn()
    {
        return new PresenceChannel("document.{$this->documentId}");
    }

    public function broadcastAs()
    {
        return 'cursor.moved';
    }

    public function broadcastWith()
    {
        return [
            'userId' => $this->userId,
            'userName' => $this->userName,
            'userColor' => $this->userColor,
            'blockId' => $this->blockId,
            'offset' => $this->offset,
            'x' => $this->x,
            'y' => $this->y,
            'selection' => $this->selection,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
