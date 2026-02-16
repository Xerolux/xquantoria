<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Media;
use App\Services\ImageService;
use App\Services\FileValidationService;
use App\Traits\Cacheable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Bus\Batch;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;

class MediaController extends Controller
{
    use Cacheable;

    protected ImageService $imageService;
    protected FileValidationService $fileValidation;

    public function __construct(ImageService $imageService, FileValidationService $fileValidation)
    {
        $this->imageService = $imageService;
        $this->fileValidation = $fileValidation;
    }

    public function index(Request $request)
    {
        $cacheKey = $this->getCacheKey('media', 'list', $request->type ?? 'all', $request->page ?? 1, $request->per_page ?? 20);
        
        if (!$request->has('search')) {
            return $this->cacheQuery($cacheKey, function () use ($request) {
                return $this->buildMediaQuery($request);
            }, 300);
        }

        return $this->buildMediaQuery($request);
    }

    private function buildMediaQuery(Request $request)
    {
        $query = Media::with(['uploader:id,name,email'])->orderBy('created_at', 'desc');

        if ($request->has('type')) {
            $mimeType = $request->type === 'image' ? 'image/%' : $request->type;
            $query->where('mime_type', 'LIKE', $mimeType);
        }

        if ($request->has('search')) {
            $query->where('original_filename', 'LIKE', '%' . $request->search . '%');
        }

        $media = $query->paginate($request->input('per_page', 20));

        return response()->json($media);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|max:102400', // 100MB max
            'alt_text' => 'nullable|string|max:255',
            'caption' => 'nullable|string|max:500',
        ]);

        $file = $request->file('file');

        // Datei-Validierung mit Magic Bytes
        $fileType = str_starts_with($file->getMimeType(), 'image/') ? 'image' : 'document';
        $validation = $this->fileValidation->validateFile($file, $fileType);

        if (!$validation['valid']) {
            return response()->json([
                'error' => 'File validation failed',
                'messages' => $validation['errors'],
            ], 422);
        }

        // Prüfe auf verdächtige Dateinamen
        if ($this->fileValidation->isSuspiciousFilename($file->getClientOriginalName())) {
            Log::warning('Suspicious filename detected', [
                'filename' => $file->getClientOriginalName(),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'error' => 'Invalid filename',
            ], 422);
        }

        // Bild-Verarbeitung mit ImageService
        if (str_starts_with($file->getMimeType(), 'image/')) {
            $imageData = $this->imageService->processImage($file, $file->getClientOriginalName());

            $mediaData = [
                'filename' => $imageData['filename'],
                'original_filename' => $imageData['original_filename'],
                'filepath' => $imageData['filepath'],
                'url' => $imageData['url'],
                'mime_type' => $imageData['mime_type'],
                'filesize' => $imageData['filesize'],
                'width' => $imageData['width'],
                'height' => $imageData['height'],
                'alt_text' => $validated['alt_text'] ?? null,
                'caption' => $validated['caption'] ?? null,
                'uploaded_by' => auth()->id(),
                'thumbnails' => $imageData['thumbnails'],
                'webp_url' => $imageData['webp_url'] ?? null,
            ];
        } else {
            // Non-Image Files (Videos, PDFs, etc.)
            $filename = uniqid() . '_' . time() . '.' . $file->getClientOriginalExtension();
            $filepath = 'media/' . date('Y/m');
            $path = $file->storeAs($filepath, $filename, 'public');

            $mediaData = [
                'filename' => $filename,
                'original_filename' => $file->getClientOriginalName(),
                'filepath' => $path,
                'url' => Storage::disk('public')->url($path),
                'mime_type' => $file->getMimeType(),
                'filesize' => $file->getSize(),
                'alt_text' => $validated['alt_text'] ?? null,
                'caption' => $validated['caption'] ?? null,
                'uploaded_by' => auth()->id(),
            ];
        }

        $media = Media::create($mediaData);

        $this->invalidateMediaCache();

        return response()->json($media, 201);
    }

    public function show($id)
    {
        $cacheKey = $this->getCacheKey('media', 'single', $id);
        
        return $this->cacheQuery($cacheKey, function () use ($id) {
            $media = Media::with(['uploader:id,name,email'])->findOrFail($id);
            return response()->json($media);
        }, 3600);
    }

    public function update(Request $request, $id)
    {
        $media = Media::findOrFail($id);

        $validated = $request->validate([
            'alt_text' => 'nullable|string|max:255',
            'caption' => 'nullable|string|max:500',
        ]);

        $media->update($validated);

        return response()->json($media);
    }

    public function destroy($id)
    {
        $media = Media::findOrFail($id);

        // Bild und Thumbnails löschen
        if ($media->thumbnails) {
            $this->imageService->deleteImage($media->filepath, $media->thumbnails);
        } else {
            Storage::disk('public')->delete($media->filepath);
        }

        $media->delete();

        $this->invalidateMediaCache();

        return response()->json(null, 204);
    }

    public function bulkUpload(Request $request)
    {
        $validated = $request->validate([
            'files.*' => 'required|file|mimes:jpg,jpeg,png,webp,gif,svg,mp4,webm,pdf|max:51200',
        ]);

        $files = $request->file('files');
        $uploaded = [];
        $errors = [];

        collect($files)->chunk(5)->each(function ($chunk) use (&$uploaded, &$errors) {
            foreach ($chunk as $file) {
                try {
                    if (str_starts_with($file->getMimeType(), 'image/')) {
                        $imageData = $this->imageService->processImage($file, $file->getClientOriginalName());

                        $uploaded[] = Media::create([
                            'filename' => $imageData['filename'],
                            'original_filename' => $imageData['original_filename'],
                            'filepath' => $imageData['filepath'],
                            'url' => $imageData['url'],
                            'mime_type' => $imageData['mime_type'],
                            'filesize' => $imageData['filesize'],
                            'width' => $imageData['width'],
                            'height' => $imageData['height'],
                            'uploaded_by' => auth()->id(),
                            'thumbnails' => $imageData['thumbnails'],
                            'webp_url' => $imageData['webp_url'] ?? null,
                        ]);
                    } else {
                        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
                        $filepath = 'media/' . date('Y/m');
                        $path = $file->storeAs($filepath, $filename, 'public');

                        $uploaded[] = Media::create([
                            'filename' => $filename,
                            'original_filename' => $file->getClientOriginalName(),
                            'filepath' => $path,
                            'url' => Storage::disk('public')->url($path),
                            'mime_type' => $file->getMimeType(),
                            'filesize' => $file->getSize(),
                            'uploaded_by' => auth()->id(),
                        ]);
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'file' => $file->getClientOriginalName(),
                        'error' => $e->getMessage(),
                    ];
                }
            }
        });

        $this->invalidateMediaCache();

        return response()->json([
            'uploaded' => $uploaded,
            'count' => count($uploaded),
            'errors' => $errors,
        ], 201);
    }

    protected function invalidateMediaCache(): void
    {
        $this->clearCache('media');
    }
}
