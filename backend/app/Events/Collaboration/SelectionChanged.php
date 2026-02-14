<?php

namespace App\Events\Collaboration;

use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SelectionChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $documentId,
        public int $userId,
        public string $userName,
        public string $userColor,
        public array $selectedBlockIds = [],
        public ?string $textSelection = null
    ) {}

    public function broadcastOn()
    {
        return new PresenceChannel("document.{$this->documentId}");
    }

    public function broadcastAs()
    {
        return 'selection.changed';
    }

    public function broadcastWith()
    {
        return [
            'userId' => $this->userId,
            'userName' => $this->userName,
            'userColor' => $this->userColor,
            'selectedBlockIds' => $this->selectedBlockIds,
            'textSelection' => $this->textSelection,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
