<?php

namespace App\Events\Collaboration;

use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BlockUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $documentId,
        public int $userId,
        public string $userName,
        public string $blockId,
        public string $operation,
        public array $data,
        public ?int $version = null
    ) {}

    public function broadcastOn()
    {
        return new PresenceChannel("document.{$this->documentId}");
    }

    public function broadcastAs()
    {
        return 'block.updated';
    }

    public function broadcastWith()
    {
        return [
            'userId' => $this->userId,
            'userName' => $this->userName,
            'blockId' => $this->blockId,
            'operation' => $this->operation,
            'data' => $this->data,
            'version' => $this->version,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
