<?php

namespace App\Services;

use App\Models\Media;
use Illuminate\Support\Facades\Storage;
use kornrunner\Blurhash\Blurhash;

class BlurhashService
{
    /**
     * Generate blurhash for an image.
     */
    public function generateForMedia(Media $media): ?string
    {
        if (!$media->isImage()) {
            return null;
        }

        try {
            $imagePath = Storage::disk('public')->path($media->file_path);

            if (!file_exists($imagePath)) {
                return null;
            }

            $image = imagecreatefromstring(file_get_contents($imagePath));
            if (!$image) {
                return null;
            }

            $width = imagesx($image);
            $height = imagesy($image);

            // Resize to max 32x32 for blurhash generation (performance)
            $maxDimension = 32;
            if ($width > $maxDimension || $height > $maxDimension) {
                $aspectRatio = $width / $height;
                if ($width > $height) {
                    $newWidth = $maxDimension;
                    $newHeight = (int) ($maxDimension / $aspectRatio);
                } else {
                    $newHeight = $maxDimension;
                    $newWidth = (int) ($maxDimension * $aspectRatio);
                }

                $resized = imagecreatetruecolor($newWidth, $newHeight);
                imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                imagedestroy($image);
                $image = $resized;
                $width = $newWidth;
                $height = $newHeight;
            }

            // Generate blurhash
            $hash = Blurhash::encode($image, 4, 3); // 4x3 components (good balance)

            imagedestroy($image);

            // Update media
            $media->update(['blurhash' => $hash]);

            return $hash;
        } catch (\Exception $e) {
            \Log::error("Failed to generate blurhash for media {$media->id}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Decode blurhash to image (for preview/debugging).
     */
    public function decodeToImage(string $hash, int $width = 32, int $height = 32): ?string
    {
        try {
            $image = Blurhash::decode($hash, $width, $height);

            if (!$image) {
                return null;
            }

            // Save to temp file
            $tempPath = sys_get_temp_dir() . '/blurhash_' . md5($hash) . '.png';
            imagepng($image, $tempPath);
            imagedestroy($image);

            return $tempPath;
        } catch (\Exception $e) {
            \Log::error("Failed to decode blurhash: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Batch generate blurhash for multiple images.
     */
    public function batchGenerate(array $mediaIds): array
    {
        $results = [];

        foreach ($mediaIds as $mediaId) {
            $media = Media::find($mediaId);

            if (!$media || !$media->isImage()) {
                $results[$mediaId] = ['success' => false, 'error' => 'Not an image'];
                continue;
            }

            try {
                $hash = $this->generateForMedia($media);
                $results[$mediaId] = ['success' => true, 'hash' => $hash];
            } catch (\Exception $e) {
                $results[$mediaId] = ['success' => false, 'error' => $e->getMessage()];
            }
        }

        return $results;
    }

    /**
     * Generate placeholder data URL.
     */
    public function getPlaceholderDataUrl(string $hash): ?string
    {
        try {
            $image = Blurhash::decode($hash, 32, 32);

            if (!$image) {
                return null;
            }

            ob_start();
            imagepng($image);
            $imageData = ob_get_clean();
            imagedestroy($image);

            return 'data:image/png;base64,' . base64_encode($imageData);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Generate blurhash for all images without one.
     */
    public function generateMissing(): int
    {
        $count = 0;

        Media::where('mime_type', 'like', 'image/%')
            ->whereNull('blurhash')
            ->chunk(100, function ($images) use (&$count) {
                foreach ($images as $media) {
                    if ($this->generateForMedia($media)) {
                        $count++;
                    }
                }
            });

        return $count;
    }
}
