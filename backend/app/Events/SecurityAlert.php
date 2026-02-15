<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SecurityAlert implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admin.security'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'security.alert';
    }

    public function broadcastWith(): array
    {
        return [
            'type' => $this->data['type'] ?? 'unknown',
            'severity' => $this->data['severity'] ?? 'info',
            'message' => $this->data['message'] ?? '',
            'ip_address' => $this->data['ip_address'] ?? null,
            'user_id' => $this->data['user_id'] ?? null,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
