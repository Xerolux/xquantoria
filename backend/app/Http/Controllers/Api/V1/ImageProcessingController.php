<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\BlurhashService;
use App\Services\ImageOptimizationService;
use App\Services\ImageProcessingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImageProcessingController extends Controller
{
    protected ImageProcessingService $processingService;
    protected ImageOptimizationService $optimizationService;
    protected BlurhashService $blurhashService;

    public function __construct(
        ImageProcessingService $processingService,
        ImageOptimizationService $optimizationService,
        BlurhashService $blurhashService
    ) {
        $this->processingService = $processingService;
        $this->optimizationService = $optimizationService;
        $this->blurhashService = $blurhashService;
    }

    /**
     * Generate thumbnails for an image.
     */
    public function generateThumbnails(Request $request, int $id)
    {
        $media = \App\Models\Media::findOrFail($id);

        $this->authorize('update', $media);

        if (!$media->isImage()) {
            return response()->json(['error' => 'Not an image'], 400);
        }

        $thumbnails = $this->processingService->generateThumbnails($media);

        return response()->json([
            'message' => 'Thumbnails generated successfully',
            'thumbnails' => $thumbnails,
            'media' => $media->fresh(),
        ]);
    }

    /**
     * Crop an image.
     */
    public function crop(Request $request, int $id)
    {
        $validated = $request->validate([
            'x' => 'required|integer|min:0',
            'y' => 'required|integer|min:0',
            'width' => 'required|integer|min:1',
            'height' => 'required|integer|min:1',
        ]);

        $media = \App\Models\Media::findOrFail($id);

        $this->authorize('update', $media);

        if (!$media->isImage()) {
            return response()->json(['error' => 'Not an image'], 400);
        }

        $croppedMedia = $this->processingService->cropImage(
            $media,
            $validated['x'],
            $validated['y'],
            $validated['width'],
            $validated['height']
        );

        return response()->json([
            'message' => 'Image cropped successfully',
            'media' => $croppedMedia,
        ]);
    }

    /**
     * Resize an image.
     */
    public function resize(Request $request, int $id)
    {
        $validated = $request->validate([
            'width' => 'required|integer|min:1',
            'height' => 'required|integer|min:1',
            'maintain_aspect' => 'boolean',
        ]);

        $media = \App\Models\Media::findOrFail($id);

        $this->authorize('update', $media);

        if (!$media->isImage()) {
            return response()->json(['error' => 'Not an image'], 400);
        }

        $resizedMedia = $this->processingService->resizeImage(
            $media,
            $validated['width'],
            $validated['height'],
            $request->boolean('maintain_aspect', true)
        );

        return response()->json([
            'message' => 'Image resized successfully',
            'media' => $resizedMedia,
        ]);
    }

    /**
     * Rotate an image.
     */
    public function rotate(Request $request, int $id)
    {
        $validated = $request->validate([
            'degrees' => 'required|integer|in:-270,-180,-90,90,180,270',
        ]);

        $media = \App\Models\Media::findOrFail($id);

        $this->authorize('update', $media);

        if (!$media->isImage()) {
            return response()->json(['error' => 'Not an image'], 400);
        }

        $rotatedMedia = $this->processingService->rotateImage($media, $validated['degrees']);

        return response()->json([
            'message' => 'Image rotated successfully',
            'media' => $rotatedMedia,
        ]);
    }

    /**
     * Flip an image.
     */
    public function flip(Request $request, int $id)
    {
        $validated = $request->validate([
            'direction' => 'required|in:horizontal,vertical',
        ]);

        $media = \App\Models\Media::findOrFail($id);

        $this->authorize('update', $media);

        if (!$media->isImage()) {
            return response()->json(['error' => 'Not an image'], 400);
        }

        $flippedMedia = $this->processingService->flipImage($media, $validated['direction']);

        return response()->json([
            'message' => 'Image flipped successfully',
            'media' => $flippedMedia,
        ]);
    }

    /**
     * Optimize an image.
     */
    public function optimize(Request $request, int $id)
    {
        $media = \App\Models\Media::findOrFail($id);

        $this->authorize('update', $media);

        if (!$media->isImage()) {
            return response()->json(['error' => 'Not an image'], 400);
        }

        $result = $this->optimizationService->optimizeWithTinyPNG($media);

        if (!$result) {
            // Fall back to local optimization
            $result = $this->optimizationService->localOptimize($media);
        }

        return response()->json([
            'message' => 'Image optimized successfully',
            'result' => $result,
            'media' => $media->fresh(),
        ]);
    }

    /**
     * Batch optimize multiple images.
     */
    public function batchOptimize(Request $request)
    {
        $validated = $request->validate([
            'media_ids' => 'required|array',
            'media_ids.*' => 'exists:media,id',
        ]);

        $this->authorize('bulkUpdate', \App\Models\Media::class);

        $results = $this->optimizationService->batchOptimize($validated['media_ids']);

        return response()->json([
            'message' => 'Batch optimization completed',
            'results' => $results,
        ]);
    }

    /**
     * Generate blurhash for an image.
     */
    public function generateBlurhash(int $id)
    {
        $media = \App\Models\Media::findOrFail($id);

        $this->authorize('update', $media);

        if (!$media->isImage()) {
            return response()->json(['error' => 'Not an image'], 400);
        }

        $hash = $this->blurhashService->generateForMedia($media);

        if (!$hash) {
            return response()->json(['error' => 'Failed to generate blurhash'], 500);
        }

        return response()->json([
            'message' => 'Blurhash generated successfully',
            'hash' => $hash,
            'placeholder_url' => $this->blurhashService->getPlaceholderDataUrl($hash),
            'media' => $media->fresh(),
        ]);
    }

    /**
     * Get image srcset.
     */
    public function getSrcset(int $id)
    {
        $media = \App\Models\Media::findOrFail($id);

        if (!$media->isImage()) {
            return response()->json(['error' => 'Not an image'], 400);
        }

        $srcset = $this->processingService->getSrcset($media);

        return response()->json([
            'srcset' => $srcset,
            'sizes' => '(max-width: 600px) 100vw, 600px',
        ]);
    }

    /**
     * Convert to WebP.
     */
    public function convertToWebP(Request $request, int $id)
    {
        $validated = $request->validate([
            'quality' => 'integer|min:1|max:100',
        ]);

        $media = \App\Models\Media::findOrFail($id);

        $this->authorize('update', $media);

        if (!$media->isImage()) {
            return response()->json(['error' => 'Not an image'], 400);
        }

        $webpPath = $this->processingService->convertToWebP(
            $media,
            $validated['quality'] ?? 85
        );

        if (!$webpPath) {
            return response()->json(['error' => 'Failed to convert to WebP'], 500);
        }

        $media->update(['webp_path' => $webpPath]);

        return response()->json([
            'message' => 'Image converted to WebP successfully',
            'webp_path' => $webpPath,
            'webp_url' => Storage::disk('public')->url($webpPath),
            'media' => $media->fresh(),
        ]);
    }

    /**
     * Get optimization statistics.
     */
    public function stats()
    {
        $this->authorize('viewAny', \App\Models\Media::class);

        $stats = $this->optimizationService->getOptimizationStats();

        return response()->json($stats);
    }

    /**
     * Generate blurhash for all missing images.
     */
    public function generateAllBlurhashes()
    {
        $this->authorize('admin', \App\Models\User::class);

        $count = $this->blurhashService->generateMissing();

        return response()->json([
            'message' => "Generated {$count} blurhashes",
            'count' => $count,
        ]);
    }

    /**
     * Auto-optimize all images (admin).
     */
    public function autoOptimizeAll()
    {
        $this->authorize('admin', \App\Models\User::class);

        $mediaIds = \App\Models\Media::where('mime_type', 'like', 'image/%')
            ->pluck('id')
            ->toArray();

        $results = $this->optimizationService->batchOptimize($mediaIds);

        // Generate thumbnails for all images
        foreach ($mediaIds as $mediaId) {
            $media = \App\Models\Media::find($mediaId);
            if ($media) {
                $this->processingService->generateThumbnails($media);
                $this->blurhashService->generateForMedia($media);
            }
        }

        return response()->json([
            'message' => 'Auto-optimization completed',
            'results' => $results,
        ]);
    }
}
