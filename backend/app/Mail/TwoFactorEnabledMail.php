<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TwoFactorEnabledMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '2-Faktor-Authentifizierung aktiviert',
            tags: ['security', '2fa'],
            priority: 1,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.auth.two-factor-enabled',
            with: [
                'user' => $this->user,
                'securityUrl' => config('app.url') . '/profile#security',
                'timestamp' => now()->format('d.m.Y H:i:s'),
            ],
        );
    }
}
