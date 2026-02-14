<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class WebApplicationFirewall
{
    protected array $sqlInjectionPatterns = [
        '/(\bunion\b.*\bselect\b)/i',
        '/(\bselect\b.*\bfrom\b)/i',
        '/(\binsert\b.*\binto\b)/i',
        '/(\bdelete\b.*\bfrom\b)/i',
        '/(\bupdate\b.*\bset\b)/i',
        '/(\bdrop\b.*\btable\b)/i',
        '/(\btruncate\b.*\btable\b)/i',
        '/(\balter\b.*\btable\b)/i',
        '/(\bexec\b.*\bxp_)/i',
        '/(--|\#|\/\*|\*\/)/',
        '/(\bor\b\s+\'?\d+\'?\s*=\s*\'?\d+\'?)/i',
        '/(\band\b\s+\'?\d+\'?\s*=\s*\'?\d+\'?)/i',
        '/(\bor\b\s+["\'].*["\']\s*=\s*["\'].*["\'])/i',
        '/(\bconcat\s*\()/i',
        '/(\bgroup_concat\s*\()/i',
        '/(\binformation_schema\b)/i',
        '/(\bsysobjects\b)/i',
        '/(\bsyscolumns\b)/i',
        '/(\bload_file\s*\()/i',
        '/(\binto\s+outfile\b)/i',
        '/(\binto\s+dumpfile\b)/i',
        '/(\bbenchmark\s*\()/i',
        '/(\bsleep\s*\()/i',
        '/(\bwaitfor\b.*\bdelay\b)/i',
    ];

    protected array $xssPatterns = [
        '/<script\b[^>]*>(.*?)<\/script>/is',
        '/<iframe\b[^>]*>/i',
        '/<object\b[^>]*>/i',
        '/<embed\b[^>]*>/i',
        '/<applet\b[^>]*>/i',
        '/javascript\s*:/i',
        '/vbscript\s*:/i',
        '/on(load|unload|change|submit|reset|select|blur|focus|abort|error|click|dblclick|keydown|keypress|keyup|mouseover|mouseout|mousemove|resize|scroll)\s*=/i',
        '/<img\b[^>]*\bon\w+\s*=/i',
        '/<svg\b[^>]*\bon\w+\s*=/i',
        '/<body\b[^>]*\bon\w+\s*=/i',
        '/<input\b[^>]*\bon\w+\s*=/i',
        '/<form\b[^>]*\bon\w+\s*=/i',
        '/<a\b[^>]*\bon\w+\s*=/i',
        '/<div\b[^>]*\bon\w+\s*=/i',
        '/<span\b[^>]*\bon\w+\s*=/i',
        '/<meta\b[^>]*\bhttp-equiv\s*=/i',
        '/<base\b[^>]*\bhref\s*=/i',
        '/<link\b[^>]*\bhref\s*=/i',
        '/data\s*:\s*text\/html/i',
        '/expression\s*\(/i',
        '/@import\s+/i',
        '/behavior\s*:/i',
        '/-moz-binding\s*:/i',
    ];

    protected array $pathTraversalPatterns = [
        '/\.\.\//',
        '/\.\.\\\/',
        '/%2e%2e%2f/i',
        '/%2e%2e\//i',
        '/\.\.%2f/i',
        '/%2e%2e%5c/i',
        '/%2e%2e\\/i',
        '/\.\.%5c/i',
        '/%252e%252e%252f/i',
        '/%252e%252e\//i',
        '/\.\.%252f/i',
        '/\.\.%c0%af/i',
        '/\.\.%c1%9c/i',
    ];

    protected array $commandInjectionPatterns = [
        '/[;&|`$]/',
        '/\$\(/',
        '/\$\{/',
        '/`.*`/',
        '/\|.*\|/',
        '/&&.*&&/',
        '/\|\|.*\|\|/',
        '/\b(cat|ls|pwd|whoami|id|uname|wget|curl|nc|netcat|bash|sh|cmd|powershell|python|perl|ruby|php)\b\s+/',
        '/\b(exec|system|passthru|shell_exec|popen|proc_open)\s*\(/i',
        '/>\s*\/(dev|etc|proc|sys|var)\//i',
        '/<\s*\/(dev|etc|proc|sys|var)\//i',
    ];

    protected array $fileInclusionPatterns = [
        '/(php|data|file|expect|zip|rar|tar|gz|bz2|z):\/\//i',
        '/\binclude\s*\(/i',
        '/\brequire\s*\(/i',
        '/\binclude_once\s*\(/i',
        '/\brequire_once\s*\(/i',
        '/\bget_defined_functions\s*\(/i',
        '/\bget_declared_classes\s*\(/i',
    ];

    protected array $protocolsPatterns = [
        '/^javascript:/i',
        '/^vbscript:/i',
        '/^data:/i',
        '/^file:/i',
        '/^php:/i',
        '/^expect:/i',
    ];

    protected array $blockedUserAgents = [
        '/sqlmap/i',
        '/nmap/i',
        '/nikto/i',
        '/nessus/i',
        '/metasploit/i',
        '/burp/i',
        '/acunetix/i',
        '/netsparker/i',
        '/openvas/i',
        '/w3af/i',
        '/dirbuster/i',
        '/gobuster/i',
        '/wfuzz/i',
        '/ffuf/i',
        '/masscan/i',
        '/zgrab/i',
        '/nuclei/i',
        '/censys/i',
        '/shodan/i',
    ];

    protected array $allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

    protected int $maxRequestSize = 10485760;

    protected int $maxUrlLength = 2048;

    protected int $maxHeaderLength = 8192;

    protected bool $logBlockedRequests = true;

    protected bool $blockMode = true;

    public function handle(Request $request, Closure $next): Response
    {
        if (!config('waf.enabled', true)) {
            return $next($request);
        }

        $violations = [];

        if (!$this->checkMethod($request)) {
            $violations[] = 'Invalid HTTP method';
        }

        if (!$this->checkUrlLength($request)) {
            $violations[] = 'URL too long';
        }

        if (!$this->checkRequestSize($request)) {
            $violations[] = 'Request too large';
        }

        if (!$this->checkUserAgent($request)) {
            $violations[] = 'Blocked user agent';
        }

        if ($sqlViolations = $this->detectSqlInjection($request)) {
            $violations = array_merge($violations, $sqlViolations);
        }

        if ($xssViolations = $this->detectXss($request)) {
            $violations = array_merge($violations, $xssViolations);
        }

        if ($pathViolations = $this->detectPathTraversal($request)) {
            $violations = array_merge($violations, $pathViolations);
        }

        if ($cmdViolations = $this->detectCommandInjection($request)) {
            $violations = array_merge($violations, $cmdViolations);
        }

        if ($fileViolations = $this->detectFileInclusion($request)) {
            $violations = array_merge($violations, $fileViolations);
        }

        if (!$this->checkHeaders($request)) {
            $violations[] = 'Invalid or malicious headers';
        }

        if (!empty($violations)) {
            $this->logViolation($request, $violations);

            if ($this->blockMode) {
                return $this->blockRequest($violations);
            }
        }

        $response = $next($request);

        $response->headers->set('X-WAF-Status', 'Protected');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        return $response;
    }

    protected function checkMethod(Request $request): bool
    {
        return in_array($request->method(), $this->allowedMethods);
    }

    protected function checkUrlLength(Request $request): bool
    {
        return strlen($request->fullUrl()) <= $this->maxUrlLength;
    }

    protected function checkRequestSize(Request $request): bool
    {
        $contentLength = $request->header('Content-Length');
        if ($contentLength && $contentLength > $this->maxRequestSize) {
            return false;
        }
        return true;
    }

    protected function checkUserAgent(Request $request): bool
    {
        $userAgent = $request->userAgent();
        if (!$userAgent) {
            return true;
        }

        foreach ($this->blockedUserAgents as $pattern) {
            if (preg_match($pattern, $userAgent)) {
                return false;
            }
        }

        return true;
    }

    protected function checkHeaders(Request $request): bool
    {
        foreach ($request->headers->all() as $name => $values) {
            if (strlen($name) > $this->maxHeaderLength) {
                return false;
            }

            foreach ($values as $value) {
                if (strlen($value) > $this->maxHeaderLength) {
                    return false;
                }

                foreach ($this->xssPatterns as $pattern) {
                    if (preg_match($pattern, $value)) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    protected function detectSqlInjection(Request $request): array
    {
        $violations = [];
        $inputs = $this->getAllInputs($request);

        foreach ($inputs as $source => $values) {
            foreach ($values as $key => $value) {
                if (!is_string($value)) {
                    continue;
                }

                $decoded = $this->deepDecode($value);

                foreach ($this->sqlInjectionPatterns as $pattern) {
                    if (preg_match($pattern, $decoded)) {
                        $violations[] = "SQL Injection detected in {$source}.{$key}";
                        break;
                    }
                }
            }
        }

        return $violations;
    }

    protected function detectXss(Request $request): array
    {
        $violations = [];
        $inputs = $this->getAllInputs($request);

        foreach ($inputs as $source => $values) {
            foreach ($values as $key => $value) {
                if (!is_string($value)) {
                    continue;
                }

                $decoded = $this->deepDecode($value);

                foreach ($this->xssPatterns as $pattern) {
                    if (preg_match($pattern, $decoded)) {
                        $violations[] = "XSS detected in {$source}.{$key}";
                        break;
                    }
                }
            }
        }

        return $violations;
    }

    protected function detectPathTraversal(Request $request): array
    {
        $violations = [];
        $inputs = $this->getAllInputs($request);

        foreach ($inputs as $source => $values) {
            foreach ($values as $key => $value) {
                if (!is_string($value)) {
                    continue;
                }

                $decoded = $this->deepDecode($value);

                foreach ($this->pathTraversalPatterns as $pattern) {
                    if (preg_match($pattern, $decoded)) {
                        $violations[] = "Path traversal detected in {$source}.{$key}";
                        break;
                    }
                }
            }
        }

        return $violations;
    }

    protected function detectCommandInjection(Request $request): array
    {
        $violations = [];
        $inputs = $this->getAllInputs($request);

        foreach ($inputs as $source => $values) {
            foreach ($values as $key => $value) {
                if (!is_string($value)) {
                    continue;
                }

                $decoded = $this->deepDecode($value);

                foreach ($this->commandInjectionPatterns as $pattern) {
                    if (preg_match($pattern, $decoded)) {
                        $violations[] = "Command injection detected in {$source}.{$key}";
                        break;
                    }
                }
            }
        }

        return $violations;
    }

    protected function detectFileInclusion(Request $request): array
    {
        $violations = [];
        $inputs = $this->getAllInputs($request);

        foreach ($inputs as $source => $values) {
            foreach ($values as $key => $value) {
                if (!is_string($value)) {
                    continue;
                }

                $decoded = $this->deepDecode($value);

                foreach ($this->fileInclusionPatterns as $pattern) {
                    if (preg_match($pattern, $decoded)) {
                        $violations[] = "File inclusion detected in {$source}.{$key}";
                        break;
                    }
                }
            }
        }

        return $violations;
    }

    protected function getAllInputs(Request $request): array
    {
        return [
            'query' => $request->query->all(),
            'post' => $request->request->all(),
            'cookies' => $request->cookies->all(),
            'headers' => collect($request->headers->all())->map(fn($v) => is_array($v) ? implode(', ', $v) : $v)->all(),
        ];
    }

    protected function deepDecode(string $value): string
    {
        $decoded = $value;
        $previous = '';

        while ($decoded !== $previous) {
            $previous = $decoded;
            $decoded = rawurldecode($decoded);
            $decoded = urldecode($decoded);
            $decoded = html_entity_decode($decoded, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $decoded = base64_decode($decoded, true) ?: $decoded;
        }

        return $decoded;
    }

    protected function logViolation(Request $request, array $violations): void
    {
        if (!$this->logBlockedRequests) {
            return;
        }

        $ip = $request->ip();
        $userAgent = $request->userAgent();
        $url = $request->fullUrl();
        $method = $request->method();

        $this->incrementBlockCount($ip);

        Log::channel('security')->warning('WAF: Request blocked', [
            'ip' => $ip,
            'user_agent' => $userAgent,
            'method' => $method,
            'url' => $url,
            'violations' => $violations,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    protected function incrementBlockCount(string $ip): void
    {
        $key = "waf:blocked:{$ip}";
        $count = Cache::increment($key);
        Cache::put($key, $count, 3600);

        if ($count >= 10) {
            Cache::put("waf:banned:{$ip}", true, 86400);
        }
    }

    protected function blockRequest(array $violations): Response
    {
        return response()->json([
            'error' => 'Request blocked by Web Application Firewall',
            'code' => 'WAF_BLOCKED',
            'violations' => $violations,
        ], 403);
    }
}
