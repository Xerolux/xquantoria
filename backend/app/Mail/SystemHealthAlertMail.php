<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SystemHealthAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public array $data
    ) {}

    public function envelope(): Envelope
    {
        $severity = !empty($this->data['issues']) ? 'CRITICAL' : 'WARNING';
        $count = count($this->data['issues']) + count($this->data['warnings']);

        return new Envelope(
            subject: "[{$severity}] System Health Alert - {$count} issues detected",
            priority: !empty($this->data['issues']) ? 1 : 3,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.system.health-alert',
            with: [
                'issues' => $this->data['issues'] ?? [],
                'warnings' => $this->data['warnings'] ?? [],
                'stats' => $this->data['stats'] ?? [],
                'timestamp' => $this->data['timestamp'] ?? now()->toISOString(),
                'appName' => config('app.name'),
                'appUrl' => config('app.url'),
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
