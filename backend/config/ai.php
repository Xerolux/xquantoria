<?php

return [
    'enabled' => env('AI_ENABLED', true),

    'default_provider' => env('AI_PROVIDER', 'openai'),

    'providers' => [
        'openai' => [
            'api_key' => env('OPENAI_API_KEY'),
            'organization' => env('OPENAI_ORGANIZATION'),
            'model' => env('OPENAI_MODEL', 'gpt-4-turbo-preview'),
        ],

        'anthropic' => [
            'api_key' => env('ANTHROPIC_API_KEY'),
            'model' => env('ANTHROPIC_MODEL', 'claude-3-sonnet-20240229'),
        ],

        'ollama' => [
            'base_url' => env('OLLAMA_BASE_URL', 'http://localhost:11434'),
            'model' => env('OLLAMA_MODEL', 'llama2'),
        ],
    ],

    'features' => [
        'content_generation' => env('AI_CONTENT_GENERATION', true),
        'seo_optimization' => env('AI_SEO_OPTIMIZATION', true),
        'auto_tagging' => env('AI_AUTO_TAGGING', true),
        'summarization' => env('AI_SUMMARIZATION', true),
        'translation' => env('AI_TRANSLATION', true),
        'proofreading' => env('AI_PROOFREADING', true),
        'sentiment_analysis' => env('AI_SENTIMENT_ANALYSIS', true),
        'image_generation' => env('AI_IMAGE_GENERATION', false),
    ],

    'content_generation' => [
        'default_word_count' => env('AI_DEFAULT_WORD_COUNT', 1000),
        'max_word_count' => env('AI_MAX_WORD_COUNT', 5000),
        'default_tone' => env('AI_DEFAULT_TONE', 'professional'),
        'default_language' => env('AI_DEFAULT_LANGUAGE', 'de'),
    ],

    'seo' => [
        'auto_meta_description' => env('AI_AUTO_META_DESCRIPTION', true),
        'auto_title_suggestions' => env('AI_AUTO_TITLE_SUGGESTIONS', true),
        'keyword_suggestion_count' => env('AI_KEYWORD_COUNT', 10),
    ],

    'image_generation' => [
        'provider' => env('AI_IMAGE_PROVIDER', 'openai'),
        'default_size' => env('AI_IMAGE_SIZE', '1024x1024'),
        'default_style' => env('AI_IMAGE_STYLE', 'natural'),
    ],

    'rate_limits' => [
        'requests_per_minute' => env('AI_RATE_LIMIT_RPM', 60),
        'tokens_per_day' => env('AI_RATE_LIMIT_TPD', 100000),
    ],

    'cache' => [
        'enabled' => env('AI_CACHE_ENABLED', true),
        'ttl' => env('AI_CACHE_TTL', 3600),
    ],

    'logging' => [
        'enabled' => env('AI_LOGGING_ENABLED', true),
        'log_requests' => env('AI_LOG_REQUESTS', false),
        'log_responses' => env('AI_LOG_RESPONSES', false),
    ],
];
