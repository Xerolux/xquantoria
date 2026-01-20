<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Download;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DownloadController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', Download::class);

        $downloads = Download::with(['uploader:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($downloads);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Download::class);

        $validated = $request->validate([
            'file' => 'required|file|max:102400',
            'description' => 'nullable|string',
            'access_level' => 'in:public,registered,premium',
            'expires_at' => 'nullable|date',
        ]);

        $file = $request->file('file');
        $filename = time() . '_' . Str::random(20) . '.' . $file->getClientOriginalExtension();
        $filepath = 'downloads/' . date('Y/m');

        $path = $file->storeAs($filepath, $filename, 'local');

        $download = Download::create([
            'filename' => $filename,
            'original_filename' => $file->getClientOriginalName(),
            'filepath' => $path,
            'mime_type' => $file->getMimeType(),
            'filesize' => $file->getSize(),
            'description' => $validated['description'] ?? null,
            'access_level' => $validated['access_level'] ?? 'public',
            'expires_at' => $validated['expires_at'] ?? null,
            'uploaded_by' => auth()->id(),
        ]);

        return response()->json($download, 201);
    }

    public function show($id)
    {
        $download = Download::with(['uploader:id,name,email'])->findOrFail($id);

        $this->authorize('view', $download);

        return response()->json($download);
    }

    public function download($token)
    {
        $tokenModel = \App\Models\DownloadToken::with('download')
            ->where('token', $token)
            ->where('is_valid', true)
            ->where('expires_at', '>', now())
            ->whereNull('used_at')
            ->firstOrFail();

        $download = $tokenModel->download;

        // Check if download has expired
        if ($download->expires_at && $download->expires_at < now()) {
            abort(403, 'This download has expired');
        }

        // If user is authenticated, check access level permissions
        if (auth()->check()) {
            $this->authorize('view', $download);
        } elseif ($download->access_level !== 'public') {
            // Non-authenticated users can only access public downloads
            abort(403, 'Authentication required for this download');
        }

        $tokenModel->markAsUsed();
        $download->incrementDownloadCount();

        return Storage::download($download->filepath, $download->original_filename);
    }

    public function destroy($id)
    {
        $download = Download::findOrFail($id);

        $this->authorize('delete', $download);

        Storage::disk('local')->delete($download->filepath);
        $download->delete();

        return response()->json(null, 204);
    }
}
