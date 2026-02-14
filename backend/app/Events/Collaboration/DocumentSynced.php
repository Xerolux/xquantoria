<?php

namespace App\Events\Collaboration;

use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DocumentSynced implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $documentId,
        public array $blocks,
        public int $version,
        public array $operations = []
    ) {}

    public function broadcastOn()
    {
        return new PresenceChannel("document.{$this->documentId}");
    }

    public function broadcastAs()
    {
        return 'document.synced';
    }

    public function broadcastWith()
    {
        return [
            'blocks' => $this->blocks,
            'version' => $this->version,
            'operations' => $this->operations,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
