<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class AIContentAssistantService
{
    protected string $provider;
    protected array $config;

    public function __construct()
    {
        $this->provider = config('ai.provider', 'openai');
        $this->config = config('ai.providers', []);
    }

    public function generateArticle(array $params): array
    {
        $prompt = $this->buildArticlePrompt($params);
        
        $response = $this->sendRequest($prompt, [
            'max_tokens' => 4000,
            'temperature' => 0.7,
        ]);

        return [
            'title' => $params['title'] ?? $this->extractTitle($response),
            'content' => $response,
            'excerpt' => $this->generateExcerpt($response),
            'meta_description' => $this->generateMetaDescription($response),
        ];
    }

    public function improveContent(string $content, array $options = []): string
    {
        $prompt = "Improve the following content. Make it more engaging, clear, and well-structured. ";
        
        if (isset($options['tone'])) {
            $prompt .= "Use a {$options['tone']} tone. ";
        }
        
        if (isset($options['language'])) {
            $prompt .= "Write in {$options['language']}. ";
        }
        
        $prompt .= "\n\nContent:\n{$content}";

        return $this->sendRequest($prompt, [
            'max_tokens' => 4000,
            'temperature' => 0.5,
        ]);
    }

    public function generateHeadline(string $topic, int $count = 5): array
    {
        $prompt = "Generate {$count} catchy and SEO-friendly headlines for a blog post about: {$topic}. ";
        $prompt .= "Return them as a numbered list. Make them attention-grabbing and under 70 characters.";

        $response = $this->sendRequest($prompt, [
            'max_tokens' => 500,
            'temperature' => 0.8,
        ]);

        return $this->parseHeadlines($response);
    }

    public function generateExcerpt(string $content): string
    {
        $truncated = Str::limit(strip_tags($content), 1000);
        
        $prompt = "Write a compelling excerpt (max 160 characters) for this article:\n\n{$truncated}";

        return $this->sendRequest($prompt, [
            'max_tokens' => 100,
            'temperature' => 0.5,
        ]);
    }

    public function generateMetaDescription(string $content): string
    {
        $truncated = Str::limit(strip_tags($content), 1000);
        
        $prompt = "Write an SEO-optimized meta description (max 160 characters) for this article:\n\n{$truncated}";

        return $this->sendRequest($prompt, [
            'max_tokens' => 100,
            'temperature' => 0.5,
        ]);
    }

    public function suggestTags(string $content, int $count = 5): array
    {
        $truncated = Str::limit(strip_tags($content), 2000);
        
        $prompt = "Suggest {$count} relevant tags for this article. Return only the tags as a comma-separated list:\n\n{$truncated}";

        $response = $this->sendRequest($prompt, [
            'max_tokens' => 100,
            'temperature' => 0.3,
        ]);

        return array_map('trim', explode(',', $response));
    }

    public function suggestCategories(string $content, array $existingCategories = [], int $count = 3): array
    {
        $truncated = Str::limit(strip_tags($content), 2000);
        
        $prompt = "Suggest the {$count} most relevant categories for this article from the following options: ";
        $prompt .= implode(', ', $existingCategories);
        $prompt .= "\n\nArticle:\n{$truncated}";
        $prompt .= "\n\nReturn only the category names as a comma-separated list.";

        $response = $this->sendRequest($prompt, [
            'max_tokens' => 100,
            'temperature' => 0.3,
        ]);

        return array_map('trim', explode(',', $response));
    }

    public function checkGrammar(string $content): array
    {
        $prompt = "Check the following text for grammar, spelling, and style errors. ";
        $prompt .= "Return a JSON array of issues, each with 'type', 'original', 'suggestion', and 'explanation'.\n\n";
        $prompt .= $content;

        $response = $this->sendRequest($prompt, [
            'max_tokens' => 2000,
            'temperature' => 0.2,
        ]);

        return $this->parseJsonResponse($response);
    }

    public function calculateSEOScore(string $title, string $content, string $keyword = null): array
    {
        $score = 0;
        $recommendations = [];

        if (strlen($title) >= 30 && strlen($title) <= 70) {
            $score += 15;
        } else {
            $recommendations[] = 'Title should be between 30-70 characters';
        }

        $wordCount = str_word_count(strip_tags($content));
        if ($wordCount >= 300) {
            $score += 15;
        } else {
            $recommendations[] = 'Content should be at least 300 words';
        }

        if ($wordCount >= 1000) {
            $score += 10;
        }

        if (preg_match('/<h[1-6]/i', $content)) {
            $score += 10;
        } else {
            $recommendations[] = 'Add headings (H1-H6) to structure your content';
        }

        if (preg_match('/<img/i', $content)) {
            $score += 10;
        } else {
            $recommendations[] = 'Add images to make content more engaging';
        }

        if (preg_match('/<a\s/i', $content)) {
            $score += 10;
        } else {
            $recommendations[] = 'Add internal or external links';
        }

        if ($keyword) {
            $keywordDensity = $this->calculateKeywordDensity($content, $keyword);
            
            if ($keywordDensity >= 0.5 && $keywordDensity <= 2.5) {
                $score += 15;
            } else {
                $recommendations[] = "Keyword density is {$keywordDensity}%. Aim for 0.5-2.5%";
            }

            if (stripos($title, $keyword) !== false) {
                $score += 10;
            } else {
                $recommendations[] = 'Include the keyword in the title';
            }
        }

        return [
            'score' => min(100, $score),
            'grade' => $this->getGrade($score),
            'recommendations' => $recommendations,
            'word_count' => $wordCount,
            'keyword_density' => $keyword ? $keywordDensity : null,
        ];
    }

    protected function calculateKeywordDensity(string $content, string $keyword): float
    {
        $wordCount = str_word_count(strip_tags($content));
        $keywordCount = substr_count(strtolower($content), strtolower($keyword));
        
        return $wordCount > 0 ? round(($keywordCount / $wordCount) * 100, 2) : 0;
    }

    protected function getGrade(int $score): string
    {
        if ($score >= 90) return 'A';
        if ($score >= 80) return 'B';
        if ($score >= 70) return 'C';
        if ($score >= 60) return 'D';
        if ($score >= 50) return 'E';
        return 'F';
    }

    public function translateContent(string $content, string $targetLanguage): string
    {
        $languages = [
            'de' => 'German',
            'en' => 'English',
            'fr' => 'French',
            'es' => 'Spanish',
            'it' => 'Italian',
            'pt' => 'Portuguese',
            'nl' => 'Dutch',
            'pl' => 'Polish',
            'ru' => 'Russian',
            'ja' => 'Japanese',
            'zh' => 'Chinese',
        ];

        $targetLanguageName = $languages[$targetLanguage] ?? $targetLanguage;
        
        $prompt = "Translate the following content to {$targetLanguageName}. ";
        $prompt .= "Maintain the original formatting, tone, and style.\n\n{$content}";

        return $this->sendRequest($prompt, [
            'max_tokens' => 4000,
            'temperature' => 0.3,
        ]);
    }

    public function summarizeContent(string $content, int $maxWords = 100): string
    {
        $prompt = "Summarize the following content in approximately {$maxWords} words or less:\n\n";
        $prompt .= Str::limit(strip_tags($content), 4000);

        return $this->sendRequest($prompt, [
            'max_tokens' => 500,
            'temperature' => 0.5,
        ]);
    }

    public function generateRelatedTopics(string $topic, int $count = 5): array
    {
        $prompt = "Generate {$count} related blog post topics for: {$topic}. ";
        $prompt .= "Return them as a numbered list.";

        $response = $this->sendRequest($prompt, [
            'max_tokens' => 500,
            'temperature' => 0.8,
        ]);

        return $this->parseHeadlines($response);
    }

    public function generateOutline(string $topic, int $sections = 5): array
    {
        $prompt = "Create a detailed outline for a blog post about: {$topic}. ";
        $prompt .= "Include {$sections} main sections with subsections. ";
        $prompt .= "Format as a numbered list with sub-items using letters.";

        $response = $this->sendRequest($prompt, [
            'max_tokens' => 1000,
            'temperature' => 0.7,
        ]);

        return $this->parseOutline($response);
    }

    public function analyzeSentiment(string $content): array
    {
        $prompt = "Analyze the sentiment of the following text. ";
        $prompt .= "Return a JSON object with 'sentiment' (positive/negative/neutral), ";
        $prompt .= "'confidence' (0-100), and 'emotions' array.\n\n";
        $prompt .= Str::limit(strip_tags($content), 2000);

        $response = $this->sendRequest($prompt, [
            'max_tokens' => 200,
            'temperature' => 0.2,
        ]);

        return $this->parseJsonResponse($response);
    }

    public function generateSocialMediaPosts(string $title, string $url, array $platforms = ['twitter', 'facebook', 'linkedin']): array
    {
        $posts = [];

        foreach ($platforms as $platform) {
            $limits = [
                'twitter' => 280,
                'facebook' => 500,
                'linkedin' => 700,
            ];

            $prompt = "Create an engaging social media post for {$platform} ";
            $prompt .= "({$limits[$platform]} characters max) about this article:\n\n";
            $prompt .= "Title: {$title}\n";
            $prompt .= "URL: {$url}\n\n";
            $prompt .= "Include relevant hashtags.";

            $posts[$platform] = $this->sendRequest($prompt, [
                'max_tokens' => 200,
                'temperature' => 0.8,
            ]);
        }

        return $posts;
    }

    protected function buildArticlePrompt(array $params): string
    {
        $prompt = "Write a comprehensive blog post";
        
        if (isset($params['title'])) {
            $prompt .= " titled: \"{$params['title']}\"";
        }
        
        if (isset($params['topic'])) {
            $prompt .= " about: {$params['topic']}";
        }
        
        if (isset($params['tone'])) {
            $prompt .= " with a {$params['tone']} tone";
        }
        
        if (isset($params['word_count'])) {
            $prompt .= " (approximately {$params['word_count']} words)";
        }
        
        if (isset($params['keywords'])) {
            $prompt .= "\n\nInclude these keywords: " . implode(', ', $params['keywords']);
        }
        
        if (isset($params['audience'])) {
            $prompt .= "\n\nTarget audience: {$params['audience']}";
        }
        
        $prompt .= "\n\nFormat with proper headings (H2, H3), paragraphs, and include an introduction and conclusion.";

        return $prompt;
    }

    protected function sendRequest(string $prompt, array $options = []): string
    {
        $config = $this->config[$this->provider] ?? [];

        try {
            return match ($this->provider) {
                'openai' => $this->sendOpenAIRequest($config, $prompt, $options),
                'anthropic' => $this->sendAnthropicRequest($config, $prompt, $options),
                'ollama' => $this->sendOllamaRequest($config, $prompt, $options),
                default => throw new Exception("Unknown AI provider: {$this->provider}"),
            };
        } catch (Exception $e) {
            Log::error('AI Content Assistant error: ' . $e->getMessage());
            throw $e;
        }
    }

    protected function sendOpenAIRequest(array $config, string $prompt, array $options): string
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . ($config['api_key'] ?? ''),
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => $config['model'] ?? 'gpt-4',
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'max_tokens' => $options['max_tokens'] ?? 2000,
            'temperature' => $options['temperature'] ?? 0.7,
        ]);

        return $response->json('choices.0.message.content', '');
    }

    protected function sendAnthropicRequest(array $config, string $prompt, array $options): string
    {
        $response = Http::withHeaders([
            'x-api-key' => ($config['api_key'] ?? ''),
            'anthropic-version' => '2023-06-01',
            'Content-Type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => $config['model'] ?? 'claude-3-opus-20240229',
            'max_tokens' => $options['max_tokens'] ?? 2000,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
        ]);

        return $response->json('content.0.text', '');
    }

    protected function sendOllamaRequest(array $config, string $prompt, array $options): string
    {
        $response = Http::post(($config['host'] ?? 'http://localhost:11434') . '/api/generate', [
            'model' => $config['model'] ?? 'llama2',
            'prompt' => $prompt,
            'stream' => false,
            'options' => [
                'num_predict' => $options['max_tokens'] ?? 2000,
                'temperature' => $options['temperature'] ?? 0.7,
            ],
        ]);

        return $response->json('response', '');
    }

    protected function extractTitle(string $content): string
    {
        if (preg_match('/^#\s+(.+)$/m', $content, $matches)) {
            return $matches[1];
        }
        
        return Str::limit(strip_tags($content), 50);
    }

    protected function parseHeadlines(string $response): array
    {
        $lines = explode("\n", trim($response));
        $headlines = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            $line = preg_replace('/^\d+\.\s*/', '', $line);
            $line = preg_replace('/^[-*]\s*/', '', $line);
            
            if (!empty($line)) {
                $headlines[] = $line;
            }
        }

        return $headlines;
    }

    protected function parseOutline(string $response): array
    {
        $lines = explode("\n", trim($response));
        $outline = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            if (preg_match('/^(\d+)\.\s+(.+)$/', $line, $matches)) {
                $outline[] = [
                    'level' => 1,
                    'number' => (int) $matches[1],
                    'title' => $matches[2],
                ];
            } elseif (preg_match('/^([a-z])\.\s+(.+)$/i', $line, $matches)) {
                $outline[] = [
                    'level' => 2,
                    'letter' => $matches[1],
                    'title' => $matches[2],
                ];
            }
        }

        return $outline;
    }

    protected function parseJsonResponse(string $response): array
    {
        if (preg_match('/\{[\s\S]*\}|\[[\s\S]*\]/m', $response, $matches)) {
            return json_decode($matches[0], true) ?? [];
        }
        
        return [];
    }
}
