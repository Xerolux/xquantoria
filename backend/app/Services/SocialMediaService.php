<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SocialMediaService
{
    protected array $connections = [];

    public function __construct()
    {
        $this->connections = [
            'twitter' => [
                'api_key' => config('services.twitter.api_key'),
                'api_secret' => config('services.twitter.api_secret'),
                'access_token' => config('services.twitter.access_token'),
                'access_secret' => config('services.twitter.access_secret'),
                'bearer_token' => config('services.twitter.bearer_token'),
            ],
            'facebook' => [
                'app_id' => config('services.facebook.app_id'),
                'app_secret' => config('services.facebook.app_secret'),
                'page_id' => config('services.facebook.page_id'),
                'page_access_token' => config('services.facebook.page_access_token'),
            ],
            'linkedin' => [
                'client_id' => config('services.linkedin.client_id'),
                'client_secret' => config('services.linkedin.client_secret'),
                'access_token' => config('services.linkedin.access_token'),
                'page_id' => config('services.linkedin.page_id'),
            ],
        ];
    }

    /**
     * Post to Twitter/X.
     */
    public function postToTwitter(Post $post, ?string $customMessage = null): bool
    {
        if (empty($this->connections['twitter']['bearer_token'])) {
            Log::warning('Twitter credentials not configured');
            return false;
        }

        try {
            $message = $customMessage ?: $this->generateTwitterMessage($post);

            $response = Http::withToken($this->connections['twitter']['bearer_token'])
                ->post('https://api.twitter.com/2/tweets', [
                    'text' => $message,
                ]);

            if ($response->successful()) {
                Log::info("Posted to Twitter: {$post->title}");
                return true;
            }

            Log::error("Twitter API error: " . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error("Failed to post to Twitter: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Post to Facebook.
     */
    public function postToFacebook(Post $post): bool
    {
        if (empty($this->connections['facebook']['page_access_token'])) {
            Log::warning('Facebook credentials not configured');
            return false;
        }

        try {
            $url = $post->getFullUrl();
            $message = $this->generateFacebookMessage($post);

            $response = Http::asForm()->post(
                "https://graph.facebook.com/{$this->connections['facebook']['page_id']}/feed",
                [
                    'message' => $message,
                    'link' => $url,
                    'access_token' => $this->connections['facebook']['page_access_token'],
                ]
            );

            if ($response->successful()) {
                Log::info("Posted to Facebook: {$post->title}");
                return true;
            }

            Log::error("Facebook API error: " . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error("Failed to post to Facebook: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Post to LinkedIn.
     */
    public function postToLinkedIn(Post $post): bool
    {
        if (empty($this->connections['linkedin']['access_token'])) {
            Log::warning('LinkedIn credentials not configured');
            return false;
        }

        try {
            $url = $post->getFullUrl();
            $message = $this->generateLinkedInMessage($post);

            $response = Http::withToken($this->connections['linkedin']['access_token'])
                ->post("https://api.linkedin.com/v2/ugcPosts", [
                    'author' => "urn:li:person:{$this->connections['linkedin']['page_id']}",
                    'lifecycleState' => 'PUBLISHED',
                    'specificContent' => [
                        'com.linkedin.ugc.ShareContent' => [
                            'shareCommentary' => $message,
                            'shareMediaCategory' => 'ARTICLE',
                            'media' => [
                                [
                                    'status' => 'READY',
                                    'description' => $post->excerpt ?? $post->title,
                                    'originalUrl' => $url,
                                    'title' => $post->title,
                                ]
                            ]
                        ]
                    ],
                    'visibility' => [
                        'com.linkedin.ugc.MemberNetworkVisibility' => [
                            'networkVisibility' => 'PUBLIC'
                        ]
                    ]
                ]
            );

            if ($response->successful()) {
                Log::info("Posted to LinkedIn: {$post->title}");
                return true;
            }

            Log::error("LinkedIn API error: " . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error("Failed to post to LinkedIn: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Post to multiple platforms.
     */
    public function postToMultiple(Post $post, array $platforms, ?string $customMessage = null): array
    {
        $results = [];

        foreach ($platforms as $platform) {
            $method = 'postTo' . ucfirst($platform);
            if (method_exists($this, $method)) {
                $results[$platform] = $this->$method($post, $customMessage);
            }
        }

        return $results;
    }

    /**
     * Generate Twitter message (280 chars max).
     */
    protected function generateTwitterMessage(Post $post): string
    {
        $url = $post->getFullUrl();
        $urlLength = strlen($url) + 1; // URL + space
        $availableLength = 280 - $urlLength;

        $title = $post->title;
        if (strlen($title) > $availableLength) {
            $title = substr($title, 0, $availableLength - 3) . '...';
        }

        return $title . ' ' . $url;
    }

    /**
     * Generate Facebook message.
     */
    protected function generateFacebookMessage(Post $post): string
    {
        $message = $post->title . "\n\n";

        if ($post->excerpt) {
            $message .= $post->excerpt . "\n\n";
        }

        return $message;
    }

    /**
     * Generate LinkedIn message.
     */
    protected function generateLinkedInMessage(Post $post): string
    {
        return $post->title . "\n\n" . ($post->excerpt ?: '');
    }

    /**
     * Get social media connection status.
     */
    public function getConnectionStatus(): array
    {
        return [
            'twitter' => [
                'configured' => !empty($this->connections['twitter']['bearer_token']),
            ],
            'facebook' => [
                'configured' => !empty($this->connections['facebook']['page_access_token']),
            ],
            'linkedin' => [
                'configured' => !empty($this->connections['linkedin']['access_token']),
            ],
        ];
    }

    /**
     * Schedule social media post for future publishing.
     */
    public function scheduleSocialPost(Post $post, array $platforms, \DateTime $publishAt): void
    {
        $job = new \App\Jobs\PostToSocialMedia($post->id, $platforms);
        $job->delay($publishAt);
        dispatch($job);
    }

    /**
     * Track social media share.
     */
    public function trackShare(string $platform, int $postId): void
    {
        \DB::table('social_shares')->insert([
            'platform' => $platform,
            'post_id' => $postId,
            'shared_at' => now(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Get share statistics for a post.
     */
    public function getShareStats(int $postId): array
    {
        return \DB::table('social_shares')
            ->where('post_id', $postId)
            ->selectRaw('platform, COUNT(*) as count')
            ->groupBy('platform')
            ->pluck('count', 'platform')
            ->toArray();
    }
}
