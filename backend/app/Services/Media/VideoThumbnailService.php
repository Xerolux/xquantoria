<?php

namespace App\Services\Media;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use FFMpeg\FFMpeg;
use FFMpeg\Coordinate\TimeCode;

class VideoThumbnailService
{
    protected FFMpeg $ffmpeg;
    protected string $disk;
    protected array $thumbnailSizes = [
        'small' => [320, 180],
        'medium' => [640, 360],
        'large' => [1280, 720],
    ];

    public function __construct()
    {
        $this->ffmpeg = FFMpeg::create([
            'ffmpeg.binaries' => config('media.ffmpeg_path', env('FFMPEG_PATH', 'ffmpeg')),
            'ffprobe.binaries' => config('media.ffprobe_path', env('FFPROBE_PATH', 'ffprobe')),
            'timeout' => config('media.ffmpeg_timeout', 3600),
        ]);
        
        $this->disk = config('media.disk', 'public');
    }

    public function generateThumbnails(string $videoPath, int $mediaId): array
    {
        $thumbnails = [];
        $fullPath = Storage::disk($this->disk)->path($videoPath);

        try {
            $video = $this->ffmpeg->open($fullPath);
            $duration = $this->getVideoDuration($fullPath);

            $timePositions = $this->calculateThumbnailPositions($duration);

            foreach ($this->thumbnailSizes as $sizeName => $dimensions) {
                foreach ($timePositions as $index => $time) {
                    $thumbnailPath = $this->generateSingleThumbnail(
                        $video,
                        $time,
                        $dimensions[0],
                        $dimensions[1],
                        $videoPath,
                        $sizeName,
                        $index
                    );

                    if ($thumbnailPath) {
                        $thumbnails[] = [
                            'size' => $sizeName,
                            'width' => $dimensions[0],
                            'height' => $dimensions[1],
                            'time' => $time,
                            'path' => $thumbnailPath,
                            'url' => Storage::disk($this->disk)->url($thumbnailPath),
                        ];
                    }
                }
            }

            return $thumbnails;
        } catch (\Exception $e) {
            Log::error('Video thumbnail generation failed', [
                'video_path' => $videoPath,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    public function generateSingleThumbnail(
        $video,
        float $time,
        int $width,
        int $height,
        string $originalPath,
        string $sizeName,
        int $index
    ): ?string {
        try {
            $directory = dirname($originalPath);
            $filename = pathinfo($originalPath, PATHINFO_FILENAME);
            $thumbnailFilename = "{$filename}_{$sizeName}_{$index}.jpg";
            $thumbnailPath = "{$directory}/thumbnails/{$thumbnailFilename}";

            Storage::disk($this->disk)->makeDirectory("{$directory}/thumbnails");

            $outputPath = Storage::disk($this->disk)->path($thumbnailPath);

            $frame = $video->frame(TimeCode::fromSeconds($time));
            $frame->save($outputPath);

            if (file_exists($outputPath)) {
                $this->resizeImage($outputPath, $width, $height);
                return $thumbnailPath;
            }

            return null;
        } catch (\Exception $e) {
            Log::warning('Single thumbnail generation failed', [
                'time' => $time,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    public function getVideoDuration(string $videoPath): float
    {
        try {
            $ffprobe = \FFMpeg\FFProbe::create([
                'ffprobe.binaries' => config('media.ffprobe_path', env('FFPROBE_PATH', 'ffprobe')),
            ]);

            return (float) $ffprobe->format($videoPath)->get('duration', 0);
        } catch (\Exception $e) {
            Log::warning('Failed to get video duration', ['error' => $e->getMessage()]);
            return 0;
        }
    }

    protected function calculateThumbnailPositions(float $duration): array
    {
        if ($duration <= 0) {
            return [0];
        }

        if ($duration <= 10) {
            return [$duration * 0.5];
        }

        if ($duration <= 30) {
            return [
                $duration * 0.1,
                $duration * 0.5,
                $duration * 0.9,
            ];
        }

        return [
            $duration * 0.1,
            $duration * 0.25,
            $duration * 0.5,
            $duration * 0.75,
            $duration * 0.9,
        ];
    }

    protected function resizeImage(string $path, int $width, int $height): bool
    {
        try {
            $image = imagecreatefromjpeg($path);
            
            if (!$image) {
                return false;
            }

            $origWidth = imagesx($image);
            $origHeight = imagesy($image);

            $ratio = min($width / $origWidth, $height / $origHeight);
            $newWidth = (int) ($origWidth * $ratio);
            $newHeight = (int) ($origHeight * $ratio);

            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);

            imagejpeg($resized, $path, 85);

            imagedestroy($image);
            imagedestroy($resized);

            return true;
        } catch (\Exception $e) {
            Log::warning('Image resize failed', ['path' => $path, 'error' => $e->getMessage()]);
            return false;
        }
    }

    public function extractFrameAt(string $videoPath, float $time): ?string
    {
        $fullPath = Storage::disk($this->disk)->path($videoPath);

        try {
            $video = $this->ffmpeg->open($fullPath);
            
            $directory = dirname($videoPath);
            $filename = pathinfo($videoPath, PATHINFO_FILENAME);
            $thumbnailFilename = "{$filename}_frame_{$time}.jpg";
            $thumbnailPath = "{$directory}/frames/{$thumbnailFilename}";

            Storage::disk($this->disk)->makeDirectory("{$directory}/frames");

            $outputPath = Storage::disk($this->disk)->path($thumbnailPath);

            $frame = $video->frame(TimeCode::fromSeconds($time));
            $frame->save($outputPath);

            if (file_exists($outputPath)) {
                return $thumbnailPath;
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Frame extraction failed', [
                'video_path' => $videoPath,
                'time' => $time,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    public function getVideoMetadata(string $videoPath): array
    {
        $fullPath = Storage::disk($this->disk)->path($videoPath);

        try {
            $ffprobe = \FFMpeg\FFProbe::create([
                'ffprobe.binaries' => config('media.ffprobe_path', env('FFPROBE_PATH', 'ffprobe')),
            ]);

            $format = $ffprobe->format($fullPath);
            $streams = $ffprobe->streams($fullPath);

            $videoStream = $streams->videos()->first();
            $audioStream = $streams->audios()->first();

            return [
                'duration' => (float) $format->get('duration', 0),
                'bitrate' => (int) $format->get('bit_rate', 0),
                'format' => $format->get('format_name'),
                'size' => (int) $format->get('size', 0),
                'video' => $videoStream ? [
                    'width' => $videoStream->get('width'),
                    'height' => $videoStream->get('height'),
                    'codec' => $videoStream->get('codec_name'),
                    'fps' => $videoStream->get('r_frame_rate'),
                    'aspect_ratio' => $videoStream->get('display_aspect_ratio'),
                ] : null,
                'audio' => $audioStream ? [
                    'codec' => $audioStream->get('codec_name'),
                    'sample_rate' => $audioStream->get('sample_rate'),
                    'channels' => $audioStream->get('channels'),
                ] : null,
            ];
        } catch (\Exception $e) {
            Log::error('Video metadata extraction failed', [
                'video_path' => $videoPath,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }
}
