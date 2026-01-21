<?php

namespace Tests\Unit;

use App\Models\Media;
use App\Models\User;
use App\Services\ImageProcessingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageProcessingServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ImageProcessingService $service;
    protected User $user;
    protected Media $media;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->service = new ImageProcessingService();
        $this->user = User::factory()->create();

        $file = UploadedFile::fake()->image('test.jpg', 800, 600);
        $this->media = Media::factory()->create([
            'filename' => $file->hashName(),
            'mime_type' => 'image/jpeg',
            'size' => 102400,
            'width' => 800,
            'height' => 600,
        ]);
    }

    public function test_generate_thumbnails(): void
    {
        $thumbnails = $this->service->generateThumbnails($this->media->id);

        $this->assertIsArray($thumbnails);
        $this->assertArrayHasKey('small', $thumbnails);
        $this->assertArrayHasKey('medium', $thumbnails);
        $this->assertArrayHasKey('large', $thumbnails);
    }

    public function test_resize_image(): void
    {
        $result = $this->service->resize($this->media->id, 400, 300);

        $this->assertNotNull($result);

        $media = Media::find($this->media->id);
        $this->assertEquals(400, $media->width);
        $this->assertEquals(300, $media->height);
    }

    public function test_rotate_image(): void
    {
        $result = $this->service->rotate($this->media->id, 90);

        $this->assertNotNull($result);

        $media = Media::find($this->media->id);
        // After 90 degree rotation, width and height swap
        $this->assertEquals(600, $media->width);
        $this->assertEquals(800, $media->height);
    }

    public function test_flip_image(): void
    {
        $result = $this->service->flip($this->media->id, 'horizontal');

        $this->assertNotNull($result);

        // Dimensions should remain the same
        $media = Media::find($this->media->id);
        $this->assertEquals(800, $media->width);
        $this->assertEquals(600, $media->height);
    }

    public function test_optimize_image(): void
    {
        $originalSize = $this->media->size;

        $result = $this->service->optimize($this->media->id);

        $this->assertNotNull($result);

        $media = Media::find($this->media->id);
        // Optimized image should be smaller
        $this->assertLessThan($originalSize, $media->size);
    }

    public function test_convert_to_webp(): void
    {
        $result = $this->service->convertToWebP($this->media->id);

        $this->assertNotNull($result);

        $media = Media::find($this->media->id);
        $this->assertEquals('image/webp', $media->mime_type);
    }

    public function test_generate_srcset(): void
    {
        $this->service->generateThumbnails($this->media->id);

        $srcset = $this->service->getSrcset($this->media->id);

        $this->assertIsArray($srcset);
        $this->assertArrayHasKey('small', $srcset);
        $this->assertArrayHasKey('medium', $srcset);
        $this->assertArrayHasKey('large', $srcset);
    }

    public function test_get_processing_stats(): void
    {
        Media::factory()->count(5)->create(['mime_type' => 'image/jpeg']);
        Media::factory()->count(3)->create(['mime_type' => 'image/png']);
        Media::factory()->count(2)->create(['mime_type' => 'application/pdf']);

        $stats = $this->service->getStats();

        $this->assertEquals(8, $stats['total_images']);
        $this->assertEquals(5, $stats['jpeg_count']);
        $this->assertEquals(3, $stats['png_count']);
    }

    public function test_cannot_process_non_image_media(): void
    {
        $pdfMedia = Media::factory()->create([
            'mime_type' => 'application/pdf',
        ]);

        $this->expectException(\Exception::class);

        $this->service->resize($pdfMedia->id, 400, 300);
    }
}
