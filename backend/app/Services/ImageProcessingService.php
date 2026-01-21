<?php

namespace App\Services;

use App\Models\Media;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ImageProcessingService
{
    protected ImageManager $manager;
    protected array $thumbnailSizes = [
        'thumbnail' => [150, 150],
        'small' => [300, 200],
        'medium' => [600, 400],
        'large' => [1200, 800],
        'xlarge' => [1920, 1080],
    ];

    public function __construct()
    {
        $this->manager = new ImageManager(new Driver());
    }

    /**
     * Generate all thumbnail sizes for an image.
     */
    public function generateThumbnails(Media $media): array
    {
        if (!$media->isImage() || $media->file_path === null) {
            return [];
        }

        $thumbnails = [];
        $originalPath = $media->file_path;

        // Get the image
        try {
            $image = $this->manager->read(Storage::disk('public')->path($originalPath));
        } catch (\Exception $e) {
            return [];
        }

        foreach ($this->thumbnailSizes as $sizeName => $dimensions) {
            try {
                [$width, $height] = $dimensions;

                // Resize image (maintain aspect ratio)
                $resized = $image->resize($width, $height, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                });

                // Generate thumbnail path
                $thumbnailPath = $this->getThumbnailPath($originalPath, $sizeName);

                // Save thumbnail
                $resized->toJpeg(85)->save(Storage::disk('public')->path($thumbnailPath));

                // Get file size
                $fileSize = filesize(Storage::disk('public')->path($thumbnailPath));

                $thumbnails[$sizeName] = [
                    'path' => $thumbnailPath,
                    'url' => Storage::disk('public')->url($thumbnailPath),
                    'width' => $width,
                    'height' => $height,
                    'size' => $fileSize,
                ];
            } catch (\Exception $e) {
                \Log::error("Failed to generate {$sizeName} thumbnail for media {$media->id}: " . $e->getMessage());
            }
        }

        // Update media with thumbnails metadata
        $media->update([
            'thumbnails' => $thumbnails,
        ]);

        return $thumbnails;
    }

    /**
     * Crop an image.
     */
    public function cropImage(Media $media, int $x, int $y, int $width, int $height): Media
    {
        $image = $this->manager->read(Storage::disk('public')->path($media->file_path));

        // Crop
        $cropped = $image->crop($width, $height, $x, $y);

        // Generate new filename
        $pathInfo = pathinfo($media->file_path);
        $newFilename = $pathInfo['filename'] . '_cropped.' . $pathInfo['extension'];
        $newPath = $pathInfo['dirname'] . '/' . $newFilename;

        // Save
        $cropped->save(Storage::disk('public')->path($newPath));

        // Get new dimensions
        $imageData = getimagesize(Storage::disk('public')->path($newPath));

        // Update media
        $media->update([
            'file_path' => $newPath,
            'width' => $imageData[0],
            'height' => $imageData[1],
        ]);

        return $media->fresh();
    }

    /**
     * Resize an image.
     */
    public function resizeImage(Media $media, int $width, int $height, bool $maintainAspect = true): Media
    {
        $image = $this->manager->read(Storage::disk('public')->path($media->file_path));

        if ($maintainAspect) {
            $resized = $image->resize($width, $height, function ($constraint) {
                $constraint->aspectRatio();
                $constraint->upsize();
            });
        } else {
            $resized = $image->resize($width, $height);
        }

        // Generate new filename
        $pathInfo = pathinfo($media->file_path);
        $newFilename = $pathInfo['filename'] . "_{$width}x{$height}." . $pathInfo['extension'];
        $newPath = $pathInfo['dirname'] . '/' . $newFilename;

        // Save
        $resized->save(Storage::disk('public')->path($newPath));

        // Get new dimensions
        $imageData = getimagesize(Storage::disk('public')->path($newPath));

        // Update media
        $media->update([
            'file_path' => $newPath,
            'width' => $imageData[0],
            'height' => $imageData[1],
        ]);

        return $media->fresh();
    }

    /**
     * Rotate an image.
     */
    public function rotateImage(Media $media, int $degrees): Media
    {
        $image = $this->manager->read(Storage::disk('public')->path($media->file_path));

        // Rotate
        $rotated = $image->rotate($degrees);

        // Save
        $rotated->save(Storage::disk('public')->path($media->file_path));

        // Get new dimensions
        $imageData = getimagesize(Storage::disk('public')->path($media->file_path));

        // Update media
        $media->update([
            'width' => $imageData[0],
            'height' => $imageData[1],
        ]);

        return $media->fresh();
    }

    /**
     * Flip an image.
     */
    public function flipImage(Media $media, string $direction): Media
    {
        $image = $this->manager->read(Storage::disk('public')->path($media->file_path));

        if ($direction === 'horizontal') {
            $flipped = $image->flipHorizontal();
        } else {
            $flipped = $image->flipVertical();
        }

        $flipped->save(Storage::disk('public')->path($media->file_path));

        return $media->fresh();
    }

    /**
     * Get thumbnail path.
     */
    protected function getThumbnailPath(string $originalPath, string $size): string
    {
        $pathInfo = pathinfo($originalPath);
        $thumbnailPath = $pathInfo['dirname'] . '/thumbnails/' . $size;

        if (!Storage::disk('public')->exists($thumbnailPath)) {
            Storage::disk('public')->makeDirectory($thumbnailPath, 0755, true);
        }

        return $thumbnailPath . '/' . $pathInfo['basename'];
    }

    /**
     * Get responsive srcset for an image.
     */
    public function getSrcset(Media $media): string
    {
        if (empty($media->thumbnails)) {
            // Return only original
            return $media->url . ' ' . $media->width . 'w';
        }

        $srcset = [];
        foreach ($media->thumbnails as $size => $thumb) {
            $srcset[] = $thumb['url'] . ' ' . $thumb['width'] . 'w';
        }

        // Add original image at the end
        $srcset[] = $media->url . ' ' . $media->width . 'w';

        return implode(', ', $srcset);
    }

    /**
     * Optimize image quality.
     */
    public function optimizeImage(Media $media, int $quality = 85): bool
    {
        if (!$media->isImage()) {
            return false;
        }

        try {
            $image = $this->manager->read(Storage::disk('public')->path($media->file_path));
            $image->toJpeg($quality)->save(Storage::disk('public')->path($media->file_path));

            // Update file size
            $newFileSize = filesize(Storage::disk('public')->path($media->file_path));
            $media->update(['file_size' => $newFileSize]);

            return true;
        } catch (\Exception $e) {
            \Log::error("Failed to optimize image {$media->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Convert image to WebP format.
     */
    public function convertToWebP(Media $media, int $quality = 85): ?string
    {
        if (!$media->isImage()) {
            return null;
        }

        try {
            $image = $this->manager->read(Storage::disk('public')->path($media->file_path));

            $pathInfo = pathinfo($media->file_path);
            $webpPath = $pathInfo['dirname'] . '/' . $pathInfo['filename'] . '.webp';

            // Save as WebP
            $image->toWebp($quality)->save(Storage::disk('public')->path($webpPath));

            // Get file size
            $fileSize = filesize(Storage::disk('public')->path($webpPath));

            return $webpPath;
        } catch (\Exception $e) {
            \Log::error("Failed to convert image {$media->id} to WebP: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get image dimensions.
     */
    public function getImageDimensions(string $path): array
    {
        $fullPath = Storage::disk('public')->path($path);

        if (!file_exists($fullPath)) {
            return [0, 0];
        }

        try {
            $imageData = getimagesize($fullPath);
            return [$imageData[0], $imageData[1]];
        } catch (\Exception $e) {
            return [0, 0];
        }
    }

    /**
     * Batch process multiple images.
     */
    public function batchProcess(array $mediaIds, callable $callback): array
    {
        $results = [];

        foreach ($mediaIds as $mediaId) {
            $media = Media::find($mediaId);

            if (!$media) {
                $results[$mediaId] = ['success' => false, 'error' => 'Media not found'];
                continue;
            }

            try {
                $result = $callback($media);
                $results[$mediaId] = ['success' => true, 'data' => $result];
            } catch (\Exception $e) {
                $results[$mediaId] = ['success' => false, 'error' => $e->getMessage()];
            }
        }

        return $results;
    }
}
