<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Services\SvgSanitizerService;

class FileValidationService
{
    protected SvgSanitizerService $svgSanitizer;

    public function __construct(SvgSanitizerService $svgSanitizer)
    {
        $this->svgSanitizer = $svgSanitizer;
    }

    /**
     * Erlaubte MIME-Types für Bilder
     */
    protected array $allowedImageMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
    ];

    /**
     * Erlaubte MIME-Types für Videos
     */
    protected array $allowedVideoMimeTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
    ];

    /**
     * Erlaubte MIME-Types für Dokumente
     */
    protected array $allowedDocumentMimeTypes = [
        'application/pdf',
    ];

    /**
     * Magic Bytes für Datei-Typ Erkennung
     */
    protected array $magicBytes = [
        'image/jpeg' => ['FF D8 FF'],
        'image/png' => ['89 50 4E 47'],
        'image/webp' => ['52 49 46 46'],
        'image/gif' => ['47 49 46 38'],
        'image/svg+xml' => ['3C 3F 78 6D 6C', '3C 73 76 67'], // XML/SVG
        'application/pdf' => ['25 50 44 46'],
        'video/mp4' => ['66 74 79 70'], // ftyp
        'video/webm' => ['1A 45 DF A3'], // EBML
    ];

    /**
     * Maximale Dateigrößen in Bytes
     */
    protected array $maxFileSizes = [
        'image' => 52428800,   // 50 MB
        'video' => 104857600,  // 100 MB
        'document' => 52428800, // 50 MB
    ];

    /**
     * Validiert eine hochgeladene Datei
     */
    public function validateFile(UploadedFile $file, string $type = 'image'): array
    {
        $errors = [];

        // 1. MIME-Type Validierung
        $mimeType = $file->getMimeType();
        if (!$this->isValidMimeType($mimeType, $type)) {
            $errors[] = "Invalid file type: {$mimeType}. Allowed types: " .
                implode(', ', $this->getAllowedTypes($type));
        }

        // 2. Magic Bytes Validierung
        if (!$this->validateMagicBytes($file, $mimeType)) {
            $errors[] = "File content does not match the file extension. The file may be corrupted or renamed.";
            Log::warning('Potential file upload attack', [
                'filename' => $file->getClientOriginalName(),
                'mime_type' => $mimeType,
                'ip' => request()->ip(),
            ]);
        }

        // 3. Dateigrößen-Validierung
        if (!$this->validateFileSize($file, $type)) {
            $errors[] = "File size exceeds maximum allowed size of " .
                $this->getMaxFileSizeText($type);
        }

        // 4. Dateiendungs-Validierung
        if (!$this->validateFileExtension($file)) {
            $errors[] = "Invalid file extension";
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Prüft ob MIME-Type erlaubt ist
     */
    protected function isValidMimeType(string $mimeType, string $type): bool
    {
        return match($type) {
            'image' => in_array($mimeType, $this->allowedImageMimeTypes),
            'video' => in_array($mimeType, $this->allowedVideoMimeTypes),
            'document' => in_array($mimeType, $this->allowedDocumentMimeTypes),
            default => false,
        };
    }

    /**
     * Validiert Magic Bytes der Datei
     */
    protected function validateMagicBytes(UploadedFile $file, string $mimeType): bool
    {
        // Für SVG: Sanitize statt nur Check
        if ($mimeType === 'image/svg+xml') {
            $sanitizedContent = $this->svgSanitizer->sanitizeFile($file->getRealPath());

            if ($sanitizedContent === false) {
                Log::warning('SVG sanitization failed', [
                    'filename' => $file->getClientOriginalName(),
                    'ip' => request()->ip(),
                ]);
                return false;
            }

            // Schreibe sanitized content zurück
            file_put_contents($file->getRealPath(), $sanitizedContent);
            return true;
        }

        if (!isset($this->magicBytes[$mimeType])) {
            return true; // Keine Magic Bytes definiert, erlaube
        }

        $fileHandle = fopen($file->getRealPath(), 'rb');
        $bytes = fread($fileHandle, 16);
        fclose($fileHandle);

        $hexBytes = strtoupper(bin2hex($bytes));
        $hexBytes = implode(' ', str_split($hexBytes, 2));

        $expectedBytes = $this->magicBytes[$mimeType];

        foreach ($expectedBytes as $expected) {
            if (str_starts_with($hexBytes, $expected)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validiert Dateigröße
     */
    protected function validateFileSize(UploadedFile $file, string $type): bool
    {
        return $file->getSize() <= $this->maxFileSizes[$type];
    }

    /**
     * Validiert Dateiendung
     */
    protected function validateFileExtension(UploadedFile $file): bool
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $allowedExtensions = [
            'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg',
            'mp4', 'webm', 'ogg',
            'pdf',
        ];

        return in_array($extension, $allowedExtensions);
    }

    /**
     * Gibt erlaubte MIME-Types zurück
     */
    protected function getAllowedTypes(string $type): array
    {
        return match($type) {
            'image' => $this->allowedImageMimeTypes,
            'video' => $this->allowedVideoMimeTypes,
            'document' => $this->allowedDocumentMimeTypes,
            default => [],
        };
    }

    /**
     * Gibt maximale Dateigröße als Text zurück
     */
    protected function getMaxFileSizeText(string $type): string
    {
        $bytes = $this->maxFileSizes[$type];
        $mb = round($bytes / 1048576, 1);
        return "{$mb} MB";
    }

    /**
     * Bereinigt Dateiname
     */
    public function sanitizeFilename(string $filename): string
    {
        // Entferne gefährliche Zeichen
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);

        // Entferne doppelte Unterstriche
        $filename = preg_replace('/_+/', '_', $filename);

        // Vermeide Dateinamen die mit . starten
        if (str_starts_with($filename, '.')) {
            $filename = '_' . $filename;
        }

        // Begrenze Länge
        if (strlen($filename) > 255) {
            $filename = substr($filename, 0, 255);
        }

        return $filename;
    }

    /**
     * Prüft auf verdächtige Muster im Dateinamen
     */
    public function isSuspiciousFilename(string $filename): bool
    {
        $suspiciousPatterns = [
            '\.php',
            '\.phtml',
            '\.php3',
            '\.php4',
            '\.php5',
            '\.cgi',
            '\.pl',
            '\.sh',
            '\.exe',
            '\.bat',
            '\.cmd',
            '\.js',
            '\.vbs',
            '\.htaccess',
            '\.htpasswd',
        ];

        foreach ($suspiciousPatterns as $pattern) {
            if (preg_match('/' . $pattern . '/i', $filename)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generiert sicheren Dateinamen
     */
    public function generateSecureFilename(string $originalFilename): string
    {
        $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
        return uniqid() . '_' . hash('sha256', $originalFilename . time()) . '.' . $extension;
    }
}
