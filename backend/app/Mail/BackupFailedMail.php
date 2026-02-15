<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BackupFailedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public ?string $errorMessage = null
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Backup fehlgeschlagen!',
            tags: ['backup', 'system', 'alert'],
            priority: 1,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.system.backup-failed',
            with: [
                'errorMessage' => $this->errorMessage ?? 'Unbekannter Fehler',
                'timestamp' => now()->format('d.m.Y H:i:s'),
                'dashboardUrl' => config('app.url') . '/admin/backups',
            ],
        );
    }
}
