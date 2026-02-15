<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

class CDNService
{
    protected string $provider;
    protected array $config;
    protected bool $enabled;

    public function __construct()
    {
        $this->provider = config('cdn.provider', 'local');
        $this->config = config("cdn.providers.{$this->provider}", []);
        $this->enabled = config('cdn.enabled', false);
    }

    public function upload(UploadedFile $file, string $path, array $options = []): array
    {
        if (!$this->enabled) {
            return $this->uploadLocal($file, $path);
        }

        return match ($this->provider) {
            'cloudflare' => $this->uploadToCloudflare($file, $path, $options),
            'aws' => $this->uploadToAWS($file, $path, $options),
            'digitalocean' => $this->uploadToDigitalOcean($file, $path, $options),
            'bunny' => $this->uploadToBunny($file, $path, $options),
            default => $this->uploadLocal($file, $path),
        };
    }

    public function delete(string $path): bool
    {
        if (!$this->enabled) {
            return Storage::disk('public')->delete($path);
        }

        return match ($this->provider) {
            'cloudflare' => $this->deleteFromCloudflare($path),
            'aws' => $this->deleteFromAWS($path),
            'digitalocean' => $this->deleteFromDigitalOcean($path),
            'bunny' => $this->deleteFromBunny($path),
            default => Storage::disk('public')->delete($path),
        };
    }

    public function getUrl(string $path): string
    {
        if (!$this->enabled) {
            return Storage::disk('public')->url($path);
        }

        $baseUrl = $this->config['url'] ?? config('app.url');
        return rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
    }

    public function purgeCache(array $paths): bool
    {
        if (!$this->enabled) {
            return true;
        }

        return match ($this->provider) {
            'cloudflare' => $this->purgeCloudflareCache($paths),
            'bunny' => $this->purgeBunnyCache($paths),
            default => true,
        };
    }

    public function getSignedUrl(string $path, int $expiration = 3600): string
    {
        if (!$this->enabled) {
            return $this->getUrl($path);
        }

        return match ($this->provider) {
            'aws' => $this->getAWSSignedUrl($path, $expiration),
            'digitalocean' => $this->getDigitalOceanSignedUrl($path, $expiration),
            default => $this->getUrl($path),
        };
    }

    protected function uploadLocal(UploadedFile $file, string $path): array
    {
        $filename = $this->generateFilename($file);
        $fullPath = rtrim($path, '/') . '/' . $filename;

        Storage::disk('public')->putFileAs($path, $file, $filename);

        return [
            'path' => $fullPath,
            'url' => Storage::disk('public')->url($fullPath),
            'provider' => 'local',
        ];
    }

    protected function uploadToCloudflare(UploadedFile $file, string $path, array $options): array
    {
        $accountId = $this->config['account_id'];
        $namespaceId = $this->config['namespace_id'] ?? '';
        $apiToken = $this->config['api_token'];

        $filename = $this->generateFilename($file);
        $fullPath = rtrim($path, '/') . '/' . $filename;

        $response = Http::withToken($apiToken)
            ->attach('file', file_get_contents($file), $filename)
            ->post("https://api.cloudflare.com/client/v4/accounts/{$accountId}/storage/kv/namespaces/{$namespaceId}/values/{$fullPath}");

        if ($response->failed()) {
            throw new InvalidArgumentException('Cloudflare upload failed: ' . $response->body());
        }

        return [
            'path' => $fullPath,
            'url' => $this->getUrl($fullPath),
            'provider' => 'cloudflare',
        ];
    }

    protected function uploadToAWS(UploadedFile $file, string $path, array $options): array
    {
        $s3 = Storage::createS3Driver([
            'region' => $this->config['region'],
            'bucket' => $this->config['bucket'],
            'key' => $this->config['key'],
            'secret' => $this->config['secret'],
        ]);

        $filename = $this->generateFilename($file);
        $fullPath = rtrim($path, '/') . '/' . $filename;

        $s3->put($fullPath, file_get_contents($file), $options['visibility'] ?? 'public');

        return [
            'path' => $fullPath,
            'url' => $this->getUrl($fullPath),
            'provider' => 'aws',
        ];
    }

    protected function uploadToDigitalOcean(UploadedFile $file, string $path, array $options): array
    {
        $region = $this->config['region'] ?? 'fra1';
        $bucket = $this->config['bucket'];
        $key = $this->config['key'];
        $secret = $this->config['secret'];

        $s3 = Storage::createS3Driver([
            'region' => $region,
            'bucket' => $bucket,
            'key' => $key,
            'secret' => $secret,
            'endpoint' => "https://{$region}.digitaloceanspaces.com",
        ]);

        $filename = $this->generateFilename($file);
        $fullPath = rtrim($path, '/') . '/' . $filename;

        $s3->put($fullPath, file_get_contents($file), $options['visibility'] ?? 'public');

        return [
            'path' => $fullPath,
            'url' => $this->getUrl($fullPath),
            'provider' => 'digitalocean',
        ];
    }

    protected function uploadToBunny(UploadedFile $file, string $path, array $options): array
    {
        $storageZone = $this->config['storage_zone'];
        $apiKey = $this->config['api_key'];
        $region = $this->config['region'] ?? 'de';

        $filename = $this->generateFilename($file);
        $fullPath = rtrim($path, '/') . '/' . $filename;

        $response = Http::withHeaders([
            'AccessKey' => $apiKey,
        ])
            ->attach('file', file_get_contents($file), $filename)
            ->put("https://{$region}.storage.bunnycdn.com/{$storageZone}/{$fullPath}");

        if ($response->failed()) {
            throw new InvalidArgumentException('Bunny upload failed: ' . $response->body());
        }

        return [
            'path' => $fullPath,
            'url' => $this->getUrl($fullPath),
            'provider' => 'bunny',
        ];
    }

    protected function deleteFromCloudflare(string $path): bool
    {
        $accountId = $this->config['account_id'];
        $namespaceId = $this->config['namespace_id'] ?? '';
        $apiToken = $this->config['api_token'];

        $response = Http::withToken($apiToken)
            ->delete("https://api.cloudflare.com/client/v4/accounts/{$accountId}/storage/kv/namespaces/{$namespaceId}/values/{$path}");

        return $response->successful();
    }

    protected function deleteFromAWS(string $path): bool
    {
        $s3 = Storage::createS3Driver([
            'region' => $this->config['region'],
            'bucket' => $this->config['bucket'],
            'key' => $this->config['key'],
            'secret' => $this->config['secret'],
        ]);

        return $s3->delete($path);
    }

    protected function deleteFromDigitalOcean(string $path): bool
    {
        $region = $this->config['region'] ?? 'fra1';
        $s3 = Storage::createS3Driver([
            'region' => $region,
            'bucket' => $this->config['bucket'],
            'key' => $this->config['key'],
            'secret' => $this->config['secret'],
            'endpoint' => "https://{$region}.digitaloceanspaces.com",
        ]);

        return $s3->delete($path);
    }

    protected function deleteFromBunny(string $path): bool
    {
        $storageZone = $this->config['storage_zone'];
        $apiKey = $this->config['api_key'];
        $region = $this->config['region'] ?? 'de';

        $response = Http::withHeaders([
            'AccessKey' => $apiKey,
        ])->delete("https://{$region}.storage.bunnycdn.com/{$storageZone}/{$path}");

        return $response->successful();
    }

    protected function purgeCloudflareCache(array $paths): bool
    {
        $zoneId = $this->config['zone_id'];
        $apiToken = $this->config['api_token'];

        $response = Http::withToken($apiToken)
            ->post("https://api.cloudflare.com/client/v4/zones/{$zoneId}/purge_cache", [
                'files' => array_map([$this, 'getUrl'], $paths),
            ]);

        return $response->successful();
    }

    protected function purgeBunnyCache(array $paths): bool
    {
        $pullZoneId = $this->config['pull_zone_id'];
        $apiKey = $this->config['api_key'];

        foreach ($paths as $path) {
            Http::withHeaders([
                'AccessKey' => $apiKey,
            ])->post("https://api.bunny.net/pullzone/{$pullZoneId}/purgeCache");
        }

        return true;
    }

    protected function getAWSSignedUrl(string $path, int $expiration): string
    {
        $s3 = Storage::createS3Driver([
            'region' => $this->config['region'],
            'bucket' => $this->config['bucket'],
            'key' => $this->config['key'],
            'secret' => $this->config['secret'],
        ]);

        return $s3->temporaryUrl($path, now()->addSeconds($expiration));
    }

    protected function getDigitalOceanSignedUrl(string $path, int $expiration): string
    {
        $region = $this->config['region'] ?? 'fra1';
        $s3 = Storage::createS3Driver([
            'region' => $region,
            'bucket' => $this->config['bucket'],
            'key' => $this->config['key'],
            'secret' => $this->config['secret'],
            'endpoint' => "https://{$region}.digitaloceanspaces.com",
        ]);

        return $s3->temporaryUrl($path, now()->addSeconds($expiration));
    }

    protected function generateFilename(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension();
        return Str::uuid() . '.' . $extension;
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }
}
