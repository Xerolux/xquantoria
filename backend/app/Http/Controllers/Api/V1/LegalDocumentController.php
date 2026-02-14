<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LegalDocument;
use App\Services\Legal\LegalDocumentGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LegalDocumentController extends Controller
{
    private LegalDocumentGenerator $generator;

    public function __construct(LegalDocumentGenerator $generator)
    {
        $this->generator = $generator;
    }

    public function index(Request $request): JsonResponse
    {
        $query = LegalDocument::with('creator')
            ->orderBy('created_at', 'desc');

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('is_published')) {
            $query->where('is_published', $request->boolean('is_published'));
        }

        $documents = $query->paginate($request->get('per_page', 15));

        return response()->json($documents);
    }

    public function types(): JsonResponse
    {
        return response()->json([
            'types' => LegalDocument::getTypes(),
        ]);
    }

    public function formFields(string $type): JsonResponse
    {
        $fields = $this->generator->getFormFields($type);

        return response()->json([
            'type' => $type,
            'fields' => $fields,
        ]);
    }

    public function preview(Request $request, string $type): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'owner_name' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'zip_code' => 'required|string|max:20',
            'city' => 'required|string|max:100',
            'email' => 'required|email|max:255',
        ]);

        $content = $this->generator->getPreview($type, $request->all());

        return response()->json([
            'content' => $content,
        ]);
    }

    public function generate(Request $request, string $type): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'owner_name' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'zip_code' => 'required|string|max:20',
            'city' => 'required|string|max:100',
            'email' => 'required|email|max:255',
        ]);

        $document = $this->generator->generate($type, $request->all());

        return response()->json([
            'message' => 'Dokument erfolgreich generiert',
            'document' => $document,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $document = LegalDocument::with('creator')->findOrFail($id);

        return response()->json($document);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $document = LegalDocument::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'is_published' => 'sometimes|boolean',
        ]);

        $document->update($validated);

        return response()->json([
            'message' => 'Dokument erfolgreich aktualisiert',
            'document' => $document->fresh(),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $document = LegalDocument::findOrFail($id);
        $document->delete();

        return response()->json([
            'message' => 'Dokument erfolgreich gelöscht',
        ]);
    }

    public function publish(int $id): JsonResponse
    {
        $document = LegalDocument::findOrFail($id);
        $document->update(['is_published' => true]);

        return response()->json([
            'message' => 'Dokument veröffentlicht',
            'document' => $document->fresh(),
        ]);
    }

    public function unpublish(int $id): JsonResponse
    {
        $document = LegalDocument::findOrFail($id);
        $document->update(['is_published' => false]);

        return response()->json([
            'message' => 'Dokument zurückgezogen',
            'document' => $document->fresh(),
        ]);
    }

    public function duplicate(int $id): JsonResponse
    {
        $original = LegalDocument::findOrFail($id);

        $duplicate = LegalDocument::create([
            'type' => $original->type,
            'title' => $original->title . ' (Kopie)',
            'content' => $original->content,
            'slug' => $original->slug . '-copy-' . time(),
            'form_data' => $original->form_data,
            'language' => $original->language,
            'version' => $original->version,
            'generated_at' => now(),
            'valid_until' => now()->addYear(),
            'is_published' => false,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Dokument dupliziert',
            'document' => $duplicate,
        ], 201);
    }

    public function export(int $id, string $format = 'html'): JsonResponse
    {
        $document = LegalDocument::findOrFail($id);

        return response()->json([
            'document' => $document,
            'export' => $document->content,
            'format' => $format,
        ]);
    }
}
