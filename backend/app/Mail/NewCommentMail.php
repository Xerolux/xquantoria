<?php

namespace App\Mail;

use App\Models\Comment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewCommentMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Comment $comment,
        public string $postTitle
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Neuer Kommentar: {$this->postTitle}",
            tags: ['comment', 'notification'],
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.comments.new',
            with: [
                'comment' => $this->comment,
                'postTitle' => $this->postTitle,
                'authorName' => $this->comment->author_name,
                'approveUrl' => config('app.url') . '/admin/comments/' . $this->comment->id . '/approve',
            ],
        );
    }
}
