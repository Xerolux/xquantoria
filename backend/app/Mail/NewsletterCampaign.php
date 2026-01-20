<?php

namespace App\Mail;

use App\Models\Newsletter;
use App\Models\NewsletterSubscriber;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewsletterCampaign extends Mailable
{
    use Queueable, SerializesModels;

    public $newsletter;
    public $subscriber;
    public $unsubscribeUrl;

    public function __construct(Newsletter $newsletter, NewsletterSubscriber $subscriber)
    {
        $this->newsletter = $newsletter;
        $this->subscriber = $subscriber;
        $this->unsubscribeUrl = config('app.url') . "/newsletter/unsubscribe/{$subscriber->unsubscribe_token}";

        // Add tracking pixel
        $this->withSymfonyMessage(function ($message) use ($subscriber) {
            $message->getHeaders()->addTextHeader('X-Newsletter-ID', $this->newsletter->id);
            $message->getHeaders()->addTextHeader('X-Subscriber-ID', $this->subscriber->id);
        });
    }

    public function build()
    {
        return $this->markdown('emails.newsletter.campaign')
                    ->subject($this->newsletter->subject);
    }
}
