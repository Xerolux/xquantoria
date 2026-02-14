<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    protected string $provider;
    protected array $config;
    protected int $timeout = 120;
    protected int $maxTokens = 4096;

    public function __construct()
    {
        $this->provider = config('ai.default_provider', 'openai');
        $this->config = config("ai.providers.{$this->provider}", []);
    }

    public function setProvider(string $provider): self
    {
        $this->provider = $provider;
        $this->config = config("ai.providers.{$this->provider}", []);
        return $this;
    }

    public function generateText(string $prompt, array $options = []): array
    {
        return match ($this->provider) {
            'openai' => $this->generateOpenAI($prompt, $options),
            'anthropic' => $this->generateAnthropic($prompt, $options),
            'ollama' => $this->generateOllama($prompt, $options),
            default => ['error' => "Unknown provider: {$this->provider}"],
        };
    }

    public function generateChat(array $messages, array $options = []): array
    {
        return match ($this->provider) {
            'openai' => $this->chatOpenAI($messages, $options),
            'anthropic' => $this->chatAnthropic($messages, $options),
            'ollama' => $this->chatOllama($messages, $options),
            default => ['error' => "Unknown provider: {$this->provider}"],
        };
    }

    protected function generateOpenAI(string $prompt, array $options = []): array
    {
        $apiKey = $this->config['api_key'] ?? null;
        if (!$apiKey) {
            return ['error' => 'OpenAI API key not configured'];
        }

        $model = $options['model'] ?? $this->config['model'] ?? 'gpt-4-turbo-preview';

        try {
            $response = Http::timeout($this->timeout)
                ->withToken($apiKey)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'max_tokens' => $options['max_tokens'] ?? $this->maxTokens,
                    'temperature' => $options['temperature'] ?? 0.7,
                    'top_p' => $options['top_p'] ?? 1,
                    'frequency_penalty' => $options['frequency_penalty'] ?? 0,
                    'presence_penalty' => $options['presence_penalty'] ?? 0,
                ]);

            if (!$response->successful()) {
                return ['error' => $response->body()];
            }

            $data = $response->json();

            return [
                'success' => true,
                'content' => $data['choices'][0]['message']['content'] ?? '',
                'model' => $data['model'],
                'usage' => $data['usage'],
                'provider' => 'openai',
            ];
        } catch (\Exception $e) {
            Log::error('OpenAI generation failed', ['error' => $e->getMessage()]);
            return ['error' => $e->getMessage()];
        }
    }

    protected function generateAnthropic(string $prompt, array $options = []): array
    {
        $apiKey = $this->config['api_key'] ?? null;
        if (!$apiKey) {
            return ['error' => 'Anthropic API key not configured'];
        }

        $model = $options['model'] ?? $this->config['model'] ?? 'claude-3-opus-20240229';

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => '2023-06-01',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => $model,
                    'max_tokens' => $options['max_tokens'] ?? $this->maxTokens,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ]);

            if (!$response->successful()) {
                return ['error' => $response->body()];
            }

            $data = $response->json();

            return [
                'success' => true,
                'content' => $data['content'][0]['text'] ?? '',
                'model' => $data['model'],
                'usage' => $data['usage'],
                'provider' => 'anthropic',
            ];
        } catch (\Exception $e) {
            Log::error('Anthropic generation failed', ['error' => $e->getMessage()]);
            return ['error' => $e->getMessage()];
        }
    }

    protected function generateOllama(string $prompt, array $options = []): array
    {
        $baseUrl = $this->config['base_url'] ?? 'http://localhost:11434';
        $model = $options['model'] ?? $this->config['model'] ?? 'llama2';

        try {
            $response = Http::timeout($this->timeout)
                ->post("{$baseUrl}/api/generate", [
                    'model' => $model,
                    'prompt' => $prompt,
                    'stream' => false,
                    'options' => [
                        'temperature' => $options['temperature'] ?? 0.7,
                        'num_predict' => $options['max_tokens'] ?? $this->maxTokens,
                    ],
                ]);

            if (!$response->successful()) {
                return ['error' => $response->body()];
            }

            $data = $response->json();

            return [
                'success' => true,
                'content' => $data['response'] ?? '',
                'model' => $data['model'],
                'provider' => 'ollama',
            ];
        } catch (\Exception $e) {
            Log::error('Ollama generation failed', ['error' => $e->getMessage()]);
            return ['error' => $e->getMessage()];
        }
    }

    protected function chatOpenAI(array $messages, array $options = []): array
    {
        $apiKey = $this->config['api_key'] ?? null;
        if (!$apiKey) {
            return ['error' => 'OpenAI API key not configured'];
        }

        $model = $options['model'] ?? $this->config['model'] ?? 'gpt-4-turbo-preview';

        try {
            $response = Http::timeout($this->timeout)
                ->withToken($apiKey)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $model,
                    'messages' => $messages,
                    'max_tokens' => $options['max_tokens'] ?? $this->maxTokens,
                    'temperature' => $options['temperature'] ?? 0.7,
                ]);

            if (!$response->successful()) {
                return ['error' => $response->body()];
            }

            $data = $response->json();

            return [
                'success' => true,
                'content' => $data['choices'][0]['message']['content'] ?? '',
                'model' => $data['model'],
                'usage' => $data['usage'],
                'provider' => 'openai',
            ];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    protected function chatAnthropic(array $messages, array $options = []): array
    {
        $apiKey = $this->config['api_key'] ?? null;
        if (!$apiKey) {
            return ['error' => 'Anthropic API key not configured'];
        }

        $model = $options['model'] ?? $this->config['model'] ?? 'claude-3-opus-20240229';

        $formattedMessages = [];
        foreach ($messages as $msg) {
            $formattedMessages[] = [
                'role' => $msg['role'],
                'content' => $msg['content'],
            ];
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => '2023-06-01',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => $model,
                    'max_tokens' => $options['max_tokens'] ?? $this->maxTokens,
                    'messages' => $formattedMessages,
                ]);

            if (!$response->successful()) {
                return ['error' => $response->body()];
            }

            $data = $response->json();

            return [
                'success' => true,
                'content' => $data['content'][0]['text'] ?? '',
                'model' => $data['model'],
                'usage' => $data['usage'],
                'provider' => 'anthropic',
            ];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    protected function chatOllama(array $messages, array $options = []): array
    {
        $baseUrl = $this->config['base_url'] ?? 'http://localhost:11434';
        $model = $options['model'] ?? $this->config['model'] ?? 'llama2';

        try {
            $response = Http::timeout($this->timeout)
                ->post("{$baseUrl}/api/chat", [
                    'model' => $model,
                    'messages' => $messages,
                    'stream' => false,
                ]);

            if (!$response->successful()) {
                return ['error' => $response->body()];
            }

            $data = $response->json();

            return [
                'success' => true,
                'content' => $data['message']['content'] ?? '',
                'model' => $data['model'],
                'provider' => 'ollama',
            ];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function generateArticle(string $topic, array $options = []): array
    {
        $wordCount = $options['word_count'] ?? 1000;
        $tone = $options['tone'] ?? 'professional';
        $audience = $options['target_audience'] ?? 'general readers';
        $keywords = $options['keywords'] ?? [];
        $outline = $options['outline'] ?? null;

        $prompt = "Write a comprehensive, engaging article about: {$topic}

Requirements:
- Word count: approximately {$wordCount} words
- Tone: {$tone}
- Target audience: {$audience}
" . (!empty($keywords) ? "- Include these keywords naturally: " . implode(', ', $keywords) : '') .
($outline ? "\n- Follow this outline:\n{$outline}" : '') . "

Structure the article with:
1. A compelling introduction that hooks the reader
2. Clear sections with subheadings
3. Practical examples and insights
4. A strong conclusion with call-to-action

Format the output in clean Markdown.";

        return $this->generateText($prompt, ['max_tokens' => 4096]);
    }

    public function generateSEOContent(string $title, string $content, array $options = []): array
    {
        $targetKeywords = $options['keywords'] ?? [];
        $language = $options['language'] ?? 'en';

        $prompt = "Analyze and optimize this content for SEO:

Title: {$title}

Content:
{$content}

" . (!empty($targetKeywords) ? "Target keywords: " . implode(', ', $targetKeywords) : '') . "

Please provide:
1. **SEO Score** (0-100)
2. **Improved Title** (optimized for search, under 60 characters)
3. **Meta Description** (compelling, under 160 characters)
4. **Suggested Keywords** (primary + secondary)
5. **Content Improvements** (specific suggestions)
6. **Heading Structure** (H1-H3 recommendations)
7. **Internal Linking Suggestions**
8. **Readability Score** and improvements

Format the response as JSON.";

        return $this->generateText($prompt);
    }

    public function generateSummary(string $content, int $maxLength = 160): array
    {
        $prompt = "Summarize the following content in approximately {$maxLength} characters. Make it compelling and informative:

{$content}

Provide only the summary, nothing else.";

        return $this->generateText($prompt);
    }

    public function generateTags(string $title, string $content, int $count = 5): array
    {
        $prompt = "Generate {$count} relevant tags for this article. Return only a JSON array of tag strings.

Title: {$title}

Content excerpt:
" . substr($content, 0, 1000);

        $result = $this->generateText($prompt);

        if (isset($result['content'])) {
            $tags = json_decode($result['content'], true);
            if (is_array($tags)) {
                $result['tags'] = $tags;
            }
        }

        return $result;
    }

    public function suggestHeadlines(string $topic, string $content = '', int $count = 5): array
    {
        $prompt = "Generate {$count} compelling, SEO-friendly headlines for this topic:

Topic: {$topic}
" . ($content ? "\nContent excerpt:\n" . substr($content, 0, 500) : '') . "

Requirements:
- Under 60 characters
- Include power words
- Create urgency or curiosity
- Optimize for click-through rate

Return as a JSON array of headline strings.";

        $result = $this->generateText($prompt);

        if (isset($result['content'])) {
            $headlines = json_decode($result['content'], true);
            if (is_array($headlines)) {
                $result['headlines'] = $headlines;
            }
        }

        return $result;
    }

    public function translate(string $content, string $targetLanguage, ?string $sourceLanguage = null): array
    {
        $prompt = "Translate the following content to {$targetLanguage}" .
            ($sourceLanguage ? " from {$sourceLanguage}" : '') . ".

Maintain the original tone, style, and formatting. Return only the translated content.

Content:
{$content}";

        return $this->generateText($prompt);
    }

    public function proofread(string $content): array
    {
        $prompt = "Proofread and improve the following content. Check for:
1. Grammar and spelling errors
2. Sentence structure
3. Clarity and conciseness
4. Word choice
5. Punctuation

Provide:
1. Corrected version
2. List of changes made
3. Writing quality score (0-100)

Content:
{$content}

Format the response as JSON with keys: corrected_content, changes, score";

        $result = $this->generateText($prompt);

        if (isset($result['content'])) {
            $analysis = json_decode($result['content'], true);
            if (is_array($analysis)) {
                $result['analysis'] = $analysis;
            }
        }

        return $result;
    }

    public function analyzeSentiment(string $content): array
    {
        $prompt = "Analyze the sentiment of this content:

{$content}

Provide:
1. Overall sentiment (positive/negative/neutral)
2. Sentiment score (-100 to 100)
3. Emotion breakdown (joy, sadness, anger, fear, surprise, trust)
4. Key phrases affecting sentiment

Format as JSON.";

        $result = $this->generateText($prompt);

        if (isset($result['content'])) {
            $sentiment = json_decode($result['content'], true);
            if (is_array($sentiment)) {
                $result['sentiment'] = $sentiment;
            }
        }

        return $result;
    }

    public function suggestRelated(string $title, string $content, int $count = 5): array
    {
        $prompt = "Based on this article, suggest {$count} related article topics:

Title: {$title}

Content:
" . substr($content, 0, 1000) . "

Return as a JSON array of topic objects with 'title' and 'description' fields.";

        $result = $this->generateText($prompt);

        if (isset($result['content'])) {
            $topics = json_decode($result['content'], true);
            if (is_array($topics)) {
                $result['topics'] = $topics;
            }
        }

        return $result;
    }

    public function isAvailable(): bool
    {
        return !empty($this->config['api_key']) || $this->provider === 'ollama';
    }

    public function getProviders(): array
    {
        return [
            'openai' => [
                'name' => 'OpenAI',
                'models' => ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
                'configured' => !empty(config('ai.providers.openai.api_key')),
            ],
            'anthropic' => [
                'name' => 'Anthropic Claude',
                'models' => ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
                'configured' => !empty(config('ai.providers.anthropic.api_key')),
            ],
            'ollama' => [
                'name' => 'Ollama (Local)',
                'models' => ['llama2', 'mistral', 'codellama', 'phi'],
                'configured' => !empty(config('ai.providers.ollama.base_url')),
            ],
        ];
    }
}
