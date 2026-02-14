<?php

namespace App\Services\Security;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CrowdSecService
{
    protected string $apiUrl;
    protected ?string $apiKey;
    protected int $cacheTtl;

    public function __construct()
    {
        $this->apiUrl = config('waf.crowdsec.api_url', 'http://crowdsec:8080');
        $this->apiKey = config('waf.crowdsec.api_key');
        $this->cacheTtl = config('waf.crowdsec.cache_ttl', 60);
    }

    public function isEnabled(): bool
    {
        return config('waf.crowdsec.enabled', false) && $this->apiKey;
    }

    public function checkIp(string $ip): array
    {
        if (!$this->isEnabled()) {
            return ['status' => 'disabled', 'decision' => 'allow'];
        }

        $cacheKey = "crowdsec:ip:{$ip}";

        return Cache::remember($cacheKey, $this->cacheTtl, function () use ($ip) {
            try {
                $response = Http::timeout(5)
                    ->withHeaders(['X-Api-Key' => $this->apiKey])
                    ->get("{$this->apiUrl}/v1/decisions", [
                        'ip' => $ip,
                    ]);

                if (!$response->successful()) {
                    return ['status' => 'error', 'decision' => 'allow'];
                }

                $decisions = $response->json();

                if (empty($decisions)) {
                    return ['status' => 'clean', 'decision' => 'allow'];
                }

                $decision = $decisions[0] ?? null;
                return [
                    'status' => 'decision',
                    'decision' => $decision['type'] ?? 'allow',
                    'duration' => $decision['duration'] ?? null,
                    'origin' => $decision['origin'] ?? null,
                    'scenario' => $decision['scenario'] ?? null,
                    'reason' => $decision['reason'] ?? null,
                ];
            } catch (\Exception $e) {
                Log::error('CrowdSec check failed', [
                    'ip' => $ip,
                    'error' => $e->getMessage(),
                ]);
                return ['status' => 'error', 'decision' => 'allow'];
            }
        });
    }

    public function getDecisions(array $options = []): array
    {
        if (!$this->isEnabled()) {
            return [];
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders(['X-Api-Key' => $this->apiKey])
                ->get("{$this->apiUrl}/v1/decisions", $options);

            if (!$response->successful()) {
                return [];
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('CrowdSec get decisions failed', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function addDecision(array $data): bool
    {
        if (!$this->isEnabled()) {
            return false;
        }

        try {
            $response = Http::timeout(5)
                ->withHeaders(['X-Api-Key' => $this->apiKey])
                ->post("{$this->apiUrl}/v1/decisions", $data);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('CrowdSec add decision failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function deleteDecision(string $decisionId): bool
    {
        if (!$this->isEnabled()) {
            return false;
        }

        try {
            $response = Http::timeout(5)
                ->withHeaders(['X-Api-Key' => $this->apiKey])
                ->delete("{$this->apiUrl}/v1/decisions/{$decisionId}");

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('CrowdSec delete decision failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function getAlerts(array $options = []): array
    {
        if (!$this->isEnabled()) {
            return [];
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders(['X-Api-Key' => $this->apiKey])
                ->get("{$this->apiUrl}/v1/alerts", $options);

            if (!$response->successful()) {
                return [];
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('CrowdSec get alerts failed', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function getMetrics(): array
    {
        if (!$this->isEnabled()) {
            return [];
        }

        try {
            $response = Http::timeout(5)
                ->withHeaders(['X-Api-Key' => $this->apiKey])
                ->get("{$this->apiUrl}/v1/metrics");

            if (!$response->successful()) {
                return [];
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('CrowdSec get metrics failed', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function signal(array $data): bool
    {
        if (!$this->isEnabled()) {
            return false;
        }

        try {
            $response = Http::timeout(5)
                ->withHeaders(['X-Api-Key' => $this->apiKey])
                ->post("{$this->apiUrl}/v1/signals", $data);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('CrowdSec signal failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function reportAttack(string $ip, string $scenario, array $details = []): bool
    {
        return $this->signal([
            'source' => [
                'ip' => $ip,
            ],
            'scenario' => $scenario,
            'details' => $details,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function clearCache(string $ip): void
    {
        Cache::forget("crowdsec:ip:{$ip}");
    }

    public function getStats(): array
    {
        $metrics = $this->getMetrics();

        return [
            'enabled' => $this->isEnabled(),
            'total_decisions' => count($this->getDecisions()),
            'active_bans' => count($this->getDecisions(['type' => 'ban'])),
            'active_captchas' => count($this->getDecisions(['type' => 'captcha'])),
            'metrics' => $metrics,
        ];
    }
}
