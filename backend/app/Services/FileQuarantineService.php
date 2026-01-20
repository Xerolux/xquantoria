<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class FileQuarantineService
{
    /**
     * Quarantine directory
     */
    protected string $quarantineDir = 'quarantine';

    /**
     * Scan and quarantine suspicious files
     *
     * @param UploadedFile $file
     * @return array ['safe' => bool, 'reason' => string|null]
     */
    public function scanFile(UploadedFile $file): array
    {
        $suspiciousPatterns = [
            // PHP code patterns
            '/<\?php/i',
            '/<\?=/i',
            '/eval\s*\(/i',
            '/base64_decode/i',
            '/system\s*\(/i',
            '/exec\s*\(/i',
            '/shell_exec/i',
            '/passthru/i',
            '/proc_open/i',

            // JavaScript/HTML patterns in uploads
            '/<script/i',
            '/javascript:/i',
            '/onerror\s*=/i',
            '/onload\s*=/i',

            // SQL injection patterns
            '/union\s+select/i',
            '/drop\s+table/i',
            '/--\s*$/m',
        ];

        // Read file content
        $content = file_get_contents($file->getRealPath());

        // Check for suspicious patterns
        foreach ($suspiciousPatterns as $pattern) {
            if (preg_match($pattern, $content)) {
                $this->quarantineFile($file, "Suspicious pattern detected: {$pattern}");

                return [
                    'safe' => false,
                    'reason' => 'File contains potentially malicious content'
                ];
            }
        }

        // Check file size (prevent zip bombs)
        if ($file->getSize() > 100 * 1024 * 1024) { // 100MB
            return [
                'safe' => false,
                'reason' => 'File size exceeds maximum allowed'
            ];
        }

        // Additional checks for executable files
        $dangerousExtensions = [
            'exe', 'bat', 'cmd', 'sh', 'com', 'app',
            'msi', 'dll', 'so', 'dylib', 'jar'
        ];

        $extension = strtolower($file->getClientOriginalExtension());
        if (in_array($extension, $dangerousExtensions)) {
            $this->quarantineFile($file, "Dangerous file extension: {$extension}");

            return [
                'safe' => false,
                'reason' => 'File type not allowed'
            ];
        }

        return ['safe' => true, 'reason' => null];
    }

    /**
     * Move file to quarantine
     *
     * @param UploadedFile $file
     * @param string $reason
     * @return void
     */
    protected function quarantineFile(UploadedFile $file, string $reason): void
    {
        $quarantinePath = $this->quarantineDir . '/' . date('Y-m-d');
        $filename = time() . '_' . $file->getClientOriginalName();

        // Store in quarantine
        Storage::put($quarantinePath . '/' . $filename, file_get_contents($file->getRealPath()));

        // Log the quarantine
        Log::warning('File quarantined', [
            'original_name' => $file->getClientOriginalName(),
            'quarantine_path' => $quarantinePath . '/' . $filename,
            'reason' => $reason,
            'ip' => request()->ip(),
            'user_id' => auth()->id()
        ]);
    }

    /**
     * Check if file has valid image content
     *
     * @param UploadedFile $file
     * @return bool
     */
    public function isValidImage(UploadedFile $file): bool
    {
        $imageInfo = @getimagesize($file->getRealPath());

        if ($imageInfo === false) {
            return false;
        }

        // Check if dimensions are reasonable
        list($width, $height) = $imageInfo;

        // Prevent decompression bombs
        if ($width * $height > 50000000) { // 50 megapixels
            return false;
        }

        return true;
    }
}
