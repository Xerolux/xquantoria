<?php

namespace App\Services\Security;

use App\Models\SecurityAlert;
use App\Models\SecurityEvent;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IpReputationService
{
    protected int $cacheTtl = 3600;
    protected string $cachePrefix = 'ip_reputation:';

    public function check(string $ip): array
    {
        $cacheKey = $this->cachePrefix . $ip;

        return Cache::remember($cacheKey, $this->cacheTtl, function () use ($ip) {
            return $this->performCheck($ip);
        });
    }

    protected function performCheck(string $ip): array
    {
        $result = [
            'ip' => $ip,
            'score' => 100,
            'risk_level' => 'low',
            'factors' => [],
            'recommendations' => [],
            'checked_at' => now()->toIso8601String(),
        ];

        if ($this->isPrivateIp($ip)) {
            $result['risk_level'] = 'none';
            $result['factors'][] = 'Private IP address';
            return $result;
        }

        $factors = [];

        if ($torCheck = $this->checkTor($ip)) {
            $factors[] = $torCheck;
            $result['score'] -= 50;
        }

        if ($proxyCheck = $this->checkProxy($ip)) {
            $factors[] = $proxyCheck;
            $result['score'] -= 30;
        }

        if ($vpnCheck = $this->checkVpn($ip)) {
            $factors[] = $vpnCheck;
            $result['score'] -= 20;
        }

        if ($spamCheck = $this->checkSpamList($ip)) {
            $factors[] = $spamCheck;
            $result['score'] -= 40;
        }

        if ($abuseCheck = $this->checkAbuseScore($ip)) {
            $factors[] = $abuseCheck;
            $result['score'] -= $abuseCheck['score_penalty'] ?? 0;
        }

        if ($geoCheck = $this->checkGeoRisk($ip)) {
            $factors[] = $geoCheck;
            $result['score'] -= $geoCheck['score_penalty'] ?? 0;
        }

        $localCheck = $this->checkLocalHistory($ip);
        if (!empty($localCheck)) {
            $factors[] = $localCheck;
            $result['score'] -= $localCheck['score_penalty'] ?? 0;
        }

        $result['factors'] = $factors;
        $result['score'] = max(0, min(100, $result['score']));

        if ($result['score'] >= 70) {
            $result['risk_level'] = 'low';
            $result['recommendations'][] = 'Allow with standard monitoring';
        } elseif ($result['score'] >= 40) {
            $result['risk_level'] = 'medium';
            $result['recommendations'][] = 'Apply additional rate limiting';
            $result['recommendations'][] = 'Enable CAPTCHA for sensitive actions';
        } elseif ($result['score'] >= 20) {
            $result['risk_level'] = 'high';
            $result['recommendations'][] = 'Require authentication for all requests';
            $result['recommendations'][] = 'Consider temporary ban';
        } else {
            $result['risk_level'] = 'critical';
            $result['recommendations'][] = 'Block IP address';
            $result['recommendations'][] = 'Add to blacklist';
        }

        return $result;
    }

    protected function isPrivateIp(string $ip): bool
    {
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
    }

    protected function checkTor(string $ip): ?array
    {
        try {
            $cacheKey = 'tor_exit_nodes';
            $exitNodes = Cache::remember($cacheKey, 3600, function () {
                $response = Http::timeout(5)->get('https://check.torproject.org/exit-addresses');
                if (!$response->successful()) {
                    return [];
                }
                preg_match_all('/ExitAddress ([\d.]+)/', $response->body(), $matches);
                return $matches[1] ?? [];
            });

            if (in_array($ip, $exitNodes)) {
                return [
                    'type' => 'tor',
                    'status' => 'detected',
                    'message' => 'IP is a known Tor exit node',
                    'score_penalty' => 50,
                ];
            }
        } catch (\Exception $e) {
            Log::warning('Tor check failed', ['ip' => $ip, 'error' => $e->getMessage()]);
        }

        return null;
    }

    protected function checkProxy(string $ip): ?array
    {
        try {
            $apiKey = config('services.ipqualityscore.key');
            if (!$apiKey) {
                return null;
            }

            $response = Http::timeout(5)->get("https://ipqualityscore.com/api/json/ip/{$apiKey}/{$ip}");

            if ($response->successful() && $response->json('proxy', false)) {
                return [
                    'type' => 'proxy',
                    'status' => 'detected',
                    'message' => 'IP is using a proxy',
                    'proxy_type' => $response->json('proxy_type'),
                    'score_penalty' => 30,
                ];
            }
        } catch (\Exception $e) {
            Log::debug('Proxy check failed', ['ip' => $ip, 'error' => $e->getMessage()]);
        }

        return null;
    }

    protected function checkVpn(string $ip): ?array
    {
        try {
            $apiKey = config('services.ipqualityscore.key');
            if (!$apiKey) {
                return null;
            }

            $response = Http::timeout(5)->get("https://ipqualityscore.com/api/json/ip/{$apiKey}/{$ip}");

            if ($response->successful() && $response->json('vpn', false)) {
                return [
                    'type' => 'vpn',
                    'status' => 'detected',
                    'message' => 'IP is using a VPN',
                    'vpn_service' => $response->json('vpn_service'),
                    'score_penalty' => 20,
                ];
            }
        } catch (\Exception $e) {
            Log::debug('VPN check failed', ['ip' => $ip, 'error' => $e->getMessage()]);
        }

        return null;
    }

    protected function checkSpamList(string $ip): ?array
    {
        $spamLists = [
            'zen.spamhaus.org',
            'bl.spamcop.net',
            'dnsbl.sorbs.net',
        ];

        foreach ($spamLists as $list) {
            $reverseIp = implode('.', array_reverse(explode('.', $ip)));
            $host = $reverseIp . '.' . $list;

            if (checkdnsrr($host, 'A')) {
                return [
                    'type' => 'spam_list',
                    'status' => 'listed',
                    'message' => "IP is listed on {$list}",
                    'list' => $list,
                    'score_penalty' => 40,
                ];
            }
        }

        return null;
    }

    protected function checkAbuseScore(string $ip): ?array
    {
        try {
            $apiKey = config('services.abuseipdb.key');
            if (!$apiKey) {
                return null;
            }

            $response = Http::timeout(5)
                ->withHeaders(['Key' => $apiKey])
                ->get('https://api.abuseipdb.com/api/v2/check', [
                    'ipAddress' => $ip,
                    'maxAgeInDays' => 30,
                ]);

            if ($response->successful()) {
                $data = $response->json('data');
                $abuseScore = $data['abuseConfidenceScore'] ?? 0;

                if ($abuseScore > 0) {
                    return [
                        'type' => 'abuse_score',
                        'status' => 'detected',
                        'message' => "Abuse score: {$abuseScore}%",
                        'score' => $abuseScore,
                        'reports' => $data['totalReports'] ?? 0,
                        'score_penalty' => min(50, $abuseScore / 2),
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::debug('Abuse check failed', ['ip' => $ip, 'error' => $e->getMessage()]);
        }

        return null;
    }

    protected function checkGeoRisk(string $ip): ?array
    {
        $highRiskCountries = config('security.high_risk_countries', [
            'CN', 'RU', 'KP', 'IR', 'SY', 'AF', 'VE',
        ]);

        try {
            $geo = $this->getGeoInfo($ip);
            if (!$geo || empty($geo['country_code'])) {
                return null;
            }

            if (in_array($geo['country_code'], $highRiskCountries)) {
                return [
                    'type' => 'geo_risk',
                    'status' => 'high_risk_country',
                    'message' => "IP originates from high-risk country: {$geo['country_name']}",
                    'country_code' => $geo['country_code'],
                    'country_name' => $geo['country_name'],
                    'score_penalty' => 20,
                ];
            }
        } catch (\Exception $e) {
            Log::debug('Geo check failed', ['ip' => $ip, 'error' => $e->getMessage()]);
        }

        return null;
    }

    protected function checkLocalHistory(string $ip): ?array
    {
        $blockedCount = Cache::get("waf:blocked:{$ip}", 0);
        $failedLogins = Cache::get("auth:failed:{$ip}", 0);

        $penalty = ($blockedCount * 5) + ($failedLogins * 2);

        if ($penalty > 0) {
            return [
                'type' => 'local_history',
                'status' => 'suspicious_activity',
                'message' => "Local history shows suspicious activity",
                'blocked_requests' => $blockedCount,
                'failed_logins' => $failedLogins,
                'score_penalty' => min(40, $penalty),
            ];
        }

        return null;
    }

    protected function getGeoInfo(string $ip): ?array
    {
        try {
            $response = Http::timeout(5)->get("http://ip-api.com/json/{$ip}");

            if ($response->successful() && $response->json('status') === 'success') {
                return [
                    'country_code' => $response->json('countryCode'),
                    'country_name' => $response->json('country'),
                    'city' => $response->json('city'),
                    'region' => $response->json('regionName'),
                    'isp' => $response->json('isp'),
                    'org' => $response->json('org'),
                    'timezone' => $response->json('timezone'),
                    'lat' => $response->json('lat'),
                    'lon' => $response->json('lon'),
                ];
            }
        } catch (\Exception $e) {
            Log::debug('Geo lookup failed', ['ip' => $ip, 'error' => $e->getMessage()]);
        }

        return null;
    }

    public function reportAbuse(string $ip, string $category, string $comment = ''): bool
    {
        try {
            $apiKey = config('services.abuseipdb.key');
            if (!$apiKey) {
                return false;
            }

            $response = Http::timeout(5)
                ->withHeaders(['Key' => $apiKey])
                ->post('https://api.abuseipdb.com/api/v2/report', [
                    'ip' => $ip,
                    'categories' => $category,
                    'comment' => $comment,
                ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Failed to report abuse', ['ip' => $ip, 'error' => $e->getMessage()]);
            return false;
        }
    }

    public function clearCache(string $ip): void
    {
        Cache::forget($this->cachePrefix . $ip);
    }

    public function getStats(): array
    {
        return [
            'total_checks' => Cache::get('ip_reputation:total_checks', 0),
            'blocked_ips' => count(Cache::get('waf:banned_ips', [])),
            'high_risk_ips' => count(Cache::get('ip_reputation:high_risk', [])),
        ];
    }
}
