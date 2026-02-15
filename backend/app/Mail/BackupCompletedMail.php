<?php

namespace App\Mail;

use App\Models\Backup;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BackupCompletedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Backup $backup
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Backup erfolgreich: {$this->backup->name}",
            tags: ['backup', 'system'],
            priority: 2,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.system.backup-completed',
            with: [
                'backup' => $this->backup,
                'size' => $this->formatBytes($this->backup->size),
                'downloadUrl' => config('app.url') . '/admin/backups/' . $this->backup->id,
            ],
        );
    }

    protected function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
