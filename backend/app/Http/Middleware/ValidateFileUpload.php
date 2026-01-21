<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateFileUpload
{
    /**
     * Allowed MIME types for file uploads.
     *
     * @var array
     */
    protected $allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-rar-compressed',
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'audio/mpeg',
        'audio/wav',
    ];

    /**
     * Maximum file size (in bytes) - default 50MB
     *
     * @var int
     */
    protected $maxFileSize = 52428800; // 50MB

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->hasFile('file') || $request->hasFile('upload')) {
            $file = $request->file('file') ?? $request->file('upload');

            // Validate file exists
            if (!$file || !$file->isValid()) {
                return response()->json([
                    'message' => 'File upload failed.',
                    'errors' => ['file' => ['The uploaded file is not valid.']],
                ], 400);
            }

            // Validate file size
            if ($file->getSize() > $this->maxFileSize) {
                return response()->json([
                    'message' => 'File is too large.',
                    'errors' => ['file' => ["Maximum file size is {$this->getMaxFileSizeInMB()}MB."]],
                ], 413);
            }

            // Validate MIME type
            $mimeType = $file->getMimeType();
            if (!in_array($mimeType, $this->allowedMimeTypes)) {
                return response()->json([
                    'message' => 'File type not allowed.',
                    'errors' => ['file' => ["File type '{$mimeType}' is not allowed."]],
                ], 415);
            }

            // Additional magic bytes validation for security
            if (!$this->validateMagicBytes($file)) {
                return response()->json([
                    'message' => 'Invalid file format.',
                    'errors' => ['file' => ['The file appears to be corrupted or has a false extension.']],
                ], 415);
            }

            // Check for malicious file patterns
            if ($this->isSuspiciousFile($file)) {
                return response()->json([
                    'message' => 'Suspicious file detected.',
                    'errors' => ['file' => ['This file contains suspicious patterns.']],
                ], 415);
            }
        }

        return $next($request);
    }

    /**
     * Validate file using magic bytes.
     *
     * @param  \Illuminate\Http\UploadedFile  $file
     * @return bool
     */
    protected function validateMagicBytes($file): bool
    {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $detectedType = finfo_file($finfo, $file->getPathname());
        finfo_close($finfo);

        // Check if detected type matches declared type
        $declaredType = $file->getMimeType();

        // Allow for some variation in MIME type detection
        $allowedVariations = [
            'image/jpeg' => ['image/jpeg', 'image/pjpeg'],
            'image/png' => ['image/png', 'image/x-png'],
            'text/plain' => ['text/plain', 'text/x-asm'],
        ];

        foreach ($allowedVariations as $base => $variations) {
            if (in_array($declaredType, $variations) && in_array($detectedType, $variations)) {
                return true;
            }
        }

        // For types without variations, do exact match
        if (!isset($allowedVariations[$declaredType])) {
            return $detectedType === $declaredType;
        }

        return true;
    }

    /**
     * Check if file contains suspicious patterns.
     *
     * @param  \Illuminate\Http\UploadedFile  $file
     * @return bool
     */
    protected function isSuspiciousFile($file): bool
    {
        // Check for PHP tags in non-PHP files
        $content = file_get_contents($file->getPathname());
        $suspiciousPatterns = [
            '<?php',
            '<?=' ,
            '<script',
            'javascript:',
            'eval(',
            'base64_decode',
            'system(',
            'exec(',
            'shell_exec(',
            'passthru(',
        ];

        $extension = strtolower($file->getClientOriginalExtension());

        // Only check text-based files
        $textExtensions = ['txt', 'csv', 'html', 'htm', 'xml', 'json', 'md'];
        if (in_array($extension, $textExtensions)) {
            foreach ($suspiciousPatterns as $pattern) {
                if (stripos($content, $pattern) !== false) {
                    return true;
                }
            }
        }

        // Check for double extensions
        $filename = $file->getClientOriginalName();
        if (substr_count($filename, '.') > 1) {
            $parts = explode('.', $filename);
            // Check for executable extensions mixed with safe extensions
            $executableExtensions = ['php', 'php5', 'php7', 'phtml', 'exe', 'sh', 'bat', 'cmd'];
            foreach ($parts as $part) {
                if (in_array(strtolower($part), $executableExtensions)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get max file size in MB.
     *
     * @return float
     */
    protected function getMaxFileSizeInMB(): float
    {
        return round($this->maxFileSize / 1048576, 1);
    }
}
