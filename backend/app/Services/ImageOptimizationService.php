<?php

namespace App\Services;

use App\Models\Media;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ImageOptimizationService
{
    protected string $tinyPngApiKey;
    protected bool $useTinyPng;

    public function __construct()
    {
        $this->tinyPngApiKey = config('services.tinypng.api_key');
        $this->useTinyPng = !empty($this->tinyPngApiKey);
    }

    /**
     * Optimize image using TinyPNG API.
     */
    public function optimizeWithTinyPNG(Media $media): ?array
    {
        if (!$this->useTinyPng || !$media->isImage()) {
            return null;
        }

        try {
            $imagePath = Storage::disk('public')->path($media->file_path);
            $imageData = file_get_contents($imagePath);

            // Upload to TinyPNG
            $response = Http::withHeaders([
                'Auth' => $this->tinyPngApiKey,
            ])->asMultipart()->post('https://api.tinify.com/shrink', [
                'file' => $imageData,
            ]);

            if (!$response->successful()) {
                \Log::error("TinyPNG API error: " . $response->body());
                return null;
            }

            $data = $response->json();
            $outputUrl = $data['output']['url'];
            $originalSize = $data['input']['size'];
            $optimizedSize = $data['output']['size'];
            $compressionRatio = (($originalSize - $optimizedSize) / $originalSize) * 100;

            // Download optimized image
            $optimizedImage = Http::get($outputUrl);
            Storage::disk('public')->put($media->file_path, $optimizedImage);

            // Update media file size
            $media->update(['file_size' => $optimizedSize]);

            return [
                'original_size' => $originalSize,
                'optimized_size' => $optimizedSize,
                'saved_bytes' => $originalSize - $optimizedSize,
                'compression_ratio' => round($compressionRatio, 2),
            ];
        } catch (\Exception $e) {
            \Log::error("Failed to optimize with TinyPNG: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Batch optimize multiple images using TinyPNG.
     */
    public function batchOptimize(array $mediaIds): array
    {
        $results = [];
        $totalSaved = 0;

        foreach ($mediaIds as $mediaId) {
            $media = Media::find($mediaId);

            if (!$media || !$media->isImage()) {
                $results[$mediaId] = ['success' => false, 'error' => 'Not an image'];
                continue;
            }

            $result = $this->optimizeWithTinyPNG($media);

            if ($result) {
                $totalSaved += $result['saved_bytes'];
                $results[$mediaId] = ['success' => true, 'data' => $result];
            } else {
                $results[$mediaId] = ['success' => false, 'error' => 'Optimization failed'];
            }

            // TinyPNG has a rate limit, so we add a small delay
            usleep(200000); // 200ms
        }

        return [
            'results' => $results,
            'total_saved_bytes' => $totalSaved,
            'total_saved_mb' => round($totalSaved / 1024 / 1024, 2),
        ];
    }

    /**
     * Get TinyPNG API usage.
     */
    public function getTinyPngUsage(): ?array
    {
        if (!$this->useTinyPng) {
            return null;
        }

        try {
            $response = Http::withHeaders([
                'Auth' => $this->tinyPngApiKey,
            ])->get('https://api.tinify.com/shrink');

            // The API returns compression count in headers
            $compressionCount = $response->header('Compression-Count', 0);

            return [
                'api_key_configured' => true,
                'compressions_this_month' => (int) $compressionCount,
            ];
        } catch (\Exception $e) {
            return [
                'api_key_configured' => true,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Check if TinyPNG is available.
     */
    public function isTinyPngAvailable(): bool
    {
        return $this->useTinyPng;
    }

    /**
     * Local image optimization (without TinyPNG).
     */
    public function localOptimize(Media $media, int $quality = 85): array
    {
        if (!$media->isImage()) {
            return ['success' => false, 'error' => 'Not an image'];
        }

        $processingService = app(ImageProcessingService::class);

        $originalSize = $media->file_size;

        // Optimize
        $processingService->optimizeImage($media, $quality);

        // Convert to WebP
        $webpPath = $processingService->convertToWebP($media, $quality);

        $media->fresh();

        $savedBytes = $originalSize - $media->file_size;
        $compressionRatio = ($savedBytes / $originalSize) * 100;

        $result = [
            'success' => true,
            'original_size' => $originalSize,
            'optimized_size' => $media->file_size,
            'saved_bytes' => $savedBytes,
            'compression_ratio' => round($compressionRatio, 2),
            'webp_path' => $webpPath,
        ];

        return $result;
    }

    /**
     * Auto-optimize on upload.
     */
    public function autoOptimizeOnUpload(Media $media): void
    {
        if (!$media->isImage()) {
            return;
        }

        // Try TinyPNG first, fall back to local optimization
        $result = $this->optimizeWithTinyPNG($media);

        if (!$result) {
            $this->localOptimize($media, 85);
        }

        // Generate WebP version
        $processingService = app(ImageProcessingService::class);
        $webpPath = $processingService->convertToWebP($media);

        // Update media with WebP path
        if ($webpPath) {
            $media->update(['webp_path' => $webpPath]);
        }

        // Generate thumbnails
        $processingService->generateThumbnails($media);
    }

    /**
     * Get optimization statistics.
     */
    public function getOptimizationStats(): array
    {
        $totalImages = Media::where('mime_type', 'like', 'image/%')->count();
        $totalSize = Media::where('mime_type', 'like', 'image/%')->sum('file_size');

        return [
            'total_images' => $totalImages,
            'total_size' => $totalSize,
            'total_size_mb' => round($totalSize / 1024 / 1024, 2),
            'tinypng_available' => $this->isTinyPngAvailable(),
            'tinypng_usage' => $this->getTinyPngUsage(),
        ];
    }
}
