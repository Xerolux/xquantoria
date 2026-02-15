<?php

namespace App\Mail;

use App\Models\Post;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PostPublishedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Post $post,
        public User $subscriber
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Neuer Beitrag: {$this->post->title}",
            tags: ['post', 'notification'],
            metadata: [
                'post_id' => $this->post->id,
                'subscriber_id' => $this->subscriber->id,
            ],
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.posts.published',
            with: [
                'post' => $this->post,
                'subscriber' => $this->subscriber,
                'url' => config('app.url') . '/blog/' . $this->post->slug,
                'unsubscribeUrl' => config('app.url') . '/newsletter/unsubscribe/' . $this->subscriber->unsubscribe_token,
            ],
        );
    }
}
