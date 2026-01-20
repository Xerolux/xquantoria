<?php

namespace App\Jobs;

use App\Models\Newsletter;
use App\Models\NewsletterSubscriber;
use App\Models\NewsletterSent;
use App\Mail\NewsletterCampaign;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendNewsletterEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $newsletter;
    protected $subscriber;

    public function __construct(Newsletter $newsletter, NewsletterSubscriber $subscriber)
    {
        $this->newsletter = $newsletter;
        $this->subscriber = $subscriber;
    }

    public function handle()
    {
        // Check if already sent to avoid duplicates (optional but good practice)
        $exists = NewsletterSent::where('newsletter_id', $this->newsletter->id)
            ->where('subscriber_id', $this->subscriber->id)
            ->exists();

        if ($exists) {
            return;
        }

        try {
            Mail::to($this->subscriber->email)->send(new NewsletterCampaign($this->newsletter, $this->subscriber));

            // Record success
            NewsletterSent::create([
                'newsletter_id' => $this->newsletter->id,
                'subscriber_id' => $this->subscriber->id,
                'sent_at' => now(),
                'unsubscribe_token' => $this->subscriber->unsubscribe_token,
            ]);

            $this->subscriber->incrementSent();

        } catch (\Exception $e) {
            \Log::error("Failed to send newsletter {$this->newsletter->id} to {$this->subscriber->email}: " . $e->getMessage());
            $this->fail($e);
        }
    }
}
