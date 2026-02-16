<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class FullPageCacheService
{
    protected string $prefix = 'page';
    protected int $defaultTtl = 3600;
    protected array $supportedLocales = ['de', 'en'];

    public function __construct()
    {
        $this->defaultTtl = config('cache.page_ttl', 3600);
        $this->supportedLocales = config('app.supported_locales', ['de', 'en']);
    }

    public function generateKey(string $type, int|string $id = null, string $locale = 'de'): string
    {
        $parts = [$this->prefix, $type];
        
        if ($id !== null) {
            $parts[] = $id;
        }
        
        $parts[] = $locale;
        
        return implode(':', $parts);
    }

    public function getPost(int $postId, string $locale = 'de'): ?string
    {
        $key = $this->generateKey('post', $postId, $locale);
        return Cache::get($key);
    }

    public function cachePost(int $postId, string $html, string $locale = 'de', int $ttl = null): bool
    {
        $key = $this->generateKey('post', $postId, $locale);
        return Cache::put($key, $html, $ttl ?? $this->defaultTtl);
    }

    public function getHomepage(string $locale = 'de'): ?string
    {
        $key = $this->generateKey('homepage', null, $locale);
        return Cache::get($key);
    }

    public function cacheHomepage(string $html, string $locale = 'de', int $ttl = null): bool
    {
        $key = $this->generateKey('homepage', null, $locale);
        return Cache::put($key, $html, $ttl ?? $this->defaultTtl);
    }

    public function getCategory(int $categoryId, string $locale = 'de'): ?string
    {
        $key = $this->generateKey('category', $categoryId, $locale);
        return Cache::get($key);
    }

    public function cacheCategory(int $categoryId, string $html, string $locale = 'de', int $ttl = null): bool
    {
        $key = $this->generateKey('category', $categoryId, $locale);
        return Cache::put($key, $html, $ttl ?? $this->defaultTtl);
    }

    public function getTag(int $tagId, string $locale = 'de'): ?string
    {
        $key = $this->generateKey('tag', $tagId, $locale);
        return Cache::get($key);
    }

    public function cacheTag(int $tagId, string $html, string $locale = 'de', int $ttl = null): bool
    {
        $key = $this->generateKey('tag', $tagId, $locale);
        return Cache::put($key, $html, $ttl ?? $this->defaultTtl);
    }

    public function getArchive(string $year, string $month, string $locale = 'de'): ?string
    {
        $key = $this->generateKey('archive', "{$year}-{$month}", $locale);
        return Cache::get($key);
    }

    public function cacheArchive(string $year, string $month, string $html, string $locale = 'de', int $ttl = null): bool
    {
        $key = $this->generateKey('archive', "{$year}-{$month}", $locale);
        return Cache::put($key, $html, $ttl ?? $this->defaultTtl);
    }

    public function invalidatePost(int $postId): void
    {
        foreach ($this->supportedLocales as $locale) {
            Cache::forget($this->generateKey('post', $postId, $locale));
        }
        
        $this->invalidateHomepage();
        $this->invalidateArchive();
        
        Log::info("Cache invalidated for post {$postId}");
    }

    public function invalidateCategory(int $categoryId): void
    {
        foreach ($this->supportedLocales as $locale) {
            Cache::forget($this->generateKey('category', $categoryId, $locale));
        }
        
        $this->invalidateHomepage();
        
        Log::info("Cache invalidated for category {$categoryId}");
    }

    public function invalidateTag(int $tagId): void
    {
        foreach ($this->supportedLocales as $locale) {
            Cache::forget($this->generateKey('tag', $tagId, $locale));
        }
        
        Log::info("Cache invalidated for tag {$tagId}");
    }

    public function invalidateHomepage(): void
    {
        foreach ($this->supportedLocales as $locale) {
            Cache::forget($this->generateKey('homepage', null, $locale));
        }
        
        Log::info("Homepage cache invalidated");
    }

    public function invalidateArchive(): void
    {
        $currentYear = now()->year;
        $currentMonth = now()->month;
        
        foreach ($this->supportedLocales as $locale) {
            Cache::forget($this->generateKey('archive', "{$currentYear}-{$currentMonth}", $locale));
        }
        
        Log::info("Archive cache invalidated");
    }

    public function invalidateAll(): void
    {
        $this->clearAll();
        Log::info("All page cache invalidated");
    }

    public function clearAll(): void
    {
        if (config('cache.default') === 'redis') {
            $pattern = "{$this->prefix}:*";
            $keys = Cache::getRedis()->keys($pattern);
            
            foreach ($keys as $key) {
                Cache::forget($key);
            }
        } else {
            Cache::flush();
        }
        
        Log::info("All page cache cleared");
    }

    public function warmup(): array
    {
        $warmed = 0;
        $errors = 0;
        
        $this->invalidateHomepage();
        $warmed++;
        
        Log::info("Cache warmup completed: {$warmed} pages warmed, {$errors} errors");
        
        return [
            'warmed' => $warmed,
            'errors' => $errors,
        ];
    }

    public function getStatistics(): array
    {
        $stats = [
            'total_keys' => 0,
            'memory_usage' => 0,
            'hit_rate' => 0,
            'miss_rate' => 0,
            'locales' => [],
        ];
        
        if (config('cache.default') === 'redis') {
            try {
                $info = Cache::getRedis()->info();
                
                $stats['memory_usage'] = $info['used_memory_human'] ?? 'N/A';
                $stats['hit_rate'] = isset($info['keyspace_hits'], $info['keyspace_misses'])
                    ? round($info['keyspace_hits'] / ($info['keyspace_hits'] + $info['keyspace_misses']) * 100, 2)
                    : 0;
                $stats['miss_rate'] = 100 - $stats['hit_rate'];
                
                $pattern = "{$this->prefix}:*";
                $keys = Cache::getRedis()->keys($pattern);
                $stats['total_keys'] = count($keys);
                
                foreach ($this->supportedLocales as $locale) {
                    $localeKeys = Cache::getRedis()->keys("{$this->prefix}:*:{$locale}");
                    $stats['locales'][$locale] = count($localeKeys);
                }
            } catch (\Exception $e) {
                Log::error('Failed to get cache statistics: ' . $e->getMessage());
            }
        }
        
        return $stats;
    }

    public function has(string $type, int|string $id = null, string $locale = 'de'): bool
    {
        $key = $this->generateKey($type, $id, $locale);
        return Cache::has($key);
    }

    public function remember(string $type, int|string $id, string $locale, callable $callback, int $ttl = null): mixed
    {
        $key = $this->generateKey($type, $id, $locale);
        return Cache::remember($key, $ttl ?? $this->defaultTtl, $callback);
    }
}
