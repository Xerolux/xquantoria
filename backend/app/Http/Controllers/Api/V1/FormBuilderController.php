<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\FormSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class FormBuilderController extends Controller
{
    public function index(): JsonResponse
    {
        $forms = Form::withCount(['submissions', 'submissions as unread_count' => function ($q) {
            $q->where('is_read', false);
        }])->orderBy('created_at', 'desc')->get();

        return response()->json($forms);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'fields' => 'required|array',
            'fields.*.type' => 'required|string',
            'fields.*.name' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.required' => 'boolean',
            'fields.*.options' => 'nullable|array',
            'settings' => 'nullable|array',
            'success_message' => 'nullable|string',
            'redirect_url' => 'nullable|url',
            'store_submissions' => 'boolean',
            'send_notification' => 'boolean',
            'notification_email' => 'nullable|email',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $form = Form::create($validated);

        return response()->json([
            'message' => 'Formular erstellt',
            'form' => $form,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $form = Form::with('submissions')->findOrFail($id);
        return response()->json($form);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $form = Form::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'fields' => 'sometimes|array',
            'settings' => 'nullable|array',
            'success_message' => 'nullable|string',
            'redirect_url' => 'nullable|url',
            'store_submissions' => 'boolean',
            'send_notification' => 'boolean',
            'notification_email' => 'nullable|email',
            'is_active' => 'boolean',
        ]);

        $form->update($validated);

        return response()->json([
            'message' => 'Formular aktualisiert',
            'form' => $form->fresh(),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $form = Form::findOrFail($id);
        $form->delete();

        return response()->json(['message' => 'Formular gelöscht']);
    }

    public function duplicate(int $id): JsonResponse
    {
        $original = Form::findOrFail($id);

        $duplicate = Form::create([
            'name' => $original->name . ' (Kopie)',
            'slug' => $original->slug . '-copy-' . time(),
            'description' => $original->description,
            'fields' => $original->fields,
            'settings' => $original->settings,
            'success_message' => $original->success_message,
            'redirect_url' => $original->redirect_url,
            'store_submissions' => $original->store_submissions,
            'send_notification' => $original->send_notification,
            'notification_email' => $original->notification_email,
        ]);

        return response()->json([
            'message' => 'Formular dupliziert',
            'form' => $duplicate,
        ], 201);
    }

    public function submit(Request $request, string $slug): JsonResponse
    {
        $form = Form::active()->where('slug', $slug)->firstOrFail();

        $rules = [];
        foreach ($form->fields as $field) {
            if ($field['required'] ?? false) {
                $rules[$field['name']] = 'required';
            }
            if ($field['type'] === 'email') {
                $rules[$field['name']] = ($rules[$field['name']] ?? '') . '|email';
            }
        }

        $validated = $request->validate($rules);

        if ($form->store_submissions) {
            FormSubmission::create([
                'form_id' => $form->id,
                'data' => $validated,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        }

        if ($form->send_notification && $form->notification_email) {
            // Send notification email
        }

        return response()->json([
            'message' => $form->success_message,
            'redirect' => $form->redirect_url,
        ]);
    }

    public function submissions(int $id, Request $request): JsonResponse
    {
        $form = Form::findOrFail($id);

        $query = $form->submissions()->orderBy('created_at', 'desc');

        if ($request->has('unread')) {
            $query->unread();
        }

        if ($request->has('not_spam')) {
            $query->notSpam();
        }

        $submissions = $query->paginate($request->get('per_page', 25));

        return response()->json($submissions);
    }

    public function getSubmission(int $formId, int $submissionId): JsonResponse
    {
        $submission = FormSubmission::where('form_id', $formId)
            ->findOrFail($submissionId);

        $submission->markAsRead();

        return response()->json($submission);
    }

    public function markSubmissionRead(int $formId, int $submissionId): JsonResponse
    {
        $submission = FormSubmission::where('form_id', $formId)
            ->findOrFail($submissionId);

        $submission->markAsRead();

        return response()->json(['message' => 'Als gelesen markiert']);
    }

    public function markSubmissionSpam(int $formId, int $submissionId): JsonResponse
    {
        $submission = FormSubmission::where('form_id', $formId)
            ->findOrFail($submissionId);

        $submission->markAsSpam();

        return response()->json(['message' => 'Als Spam markiert']);
    }

    public function deleteSubmission(int $formId, int $submissionId): JsonResponse
    {
        $submission = FormSubmission::where('form_id', $formId)
            ->findOrFail($submissionId);

        $submission->delete();

        return response()->json(['message' => 'Eintrag gelöscht']);
    }

    public function exportSubmissions(int $id, string $format = 'csv'): JsonResponse
    {
        $form = Form::with('submissions')->findOrFail($id);

        $data = [];
        $headers = [];

        if (!empty($form->fields)) {
            foreach ($form->fields as $field) {
                $headers[] = $field['label'];
            }
            $headers[] = 'Erstellt am';
        }

        foreach ($form->submissions as $submission) {
            $row = [];
            foreach ($form->fields as $field) {
                $row[] = $submission->data[$field['name']] ?? '';
            }
            $row[] = $submission->created_at->format('d.m.Y H:i');
            $data[] = $row;
        }

        return response()->json([
            'headers' => $headers,
            'data' => $data,
            'format' => $format,
        ]);
    }
}
