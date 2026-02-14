<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Theme;
use App\Models\ThemeTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ThemeController extends Controller
{
    public function index(): JsonResponse
    {
        $themes = Theme::with(['settings', 'parent'])->get();
        return response()->json($themes);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:themes,slug',
            'version' => 'nullable|string',
            'description' => 'nullable|string',
            'author' => 'nullable|string',
            'author_url' => 'nullable|url',
            'screenshot' => 'nullable|string',
            'preview_url' => 'nullable|url',
            'parent_theme' => 'nullable|string|exists:themes,slug',
            'colors' => 'nullable|array',
            'fonts' => 'nullable|array',
            'settings' => 'nullable|array',
        ]);

        $theme = Theme::create($validated);

        return response()->json([
            'message' => 'Theme erfolgreich erstellt',
            'theme' => $theme,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $theme = Theme::with(['settings', 'modifications', 'themeTemplates', 'parent', 'children'])
            ->findOrFail($id);

        $theme->generated_css = $theme->getGeneratedCss();

        return response()->json($theme);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $theme = Theme::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'version' => 'sometimes|string',
            'description' => 'nullable|string',
            'author' => 'nullable|string',
            'author_url' => 'nullable|url',
            'screenshot' => 'nullable|string',
            'preview_url' => 'nullable|url',
            'colors' => 'nullable|array',
            'fonts' => 'nullable|array',
            'layouts' => 'nullable|array',
            'custom_css' => 'nullable|array',
        ]);

        $theme->update($validated);

        return response()->json([
            'message' => 'Theme aktualisiert',
            'theme' => $theme->fresh(),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $theme = Theme::findOrFail($id);

        if ($theme->is_active) {
            return response()->json(['message' => 'Aktives Theme kann nicht gelöscht werden'], 400);
        }

        $theme->delete();

        return response()->json(['message' => 'Theme gelöscht']);
    }

    public function activate(int $id): JsonResponse
    {
        $theme = Theme::findOrFail($id);
        $theme->activate();

        return response()->json([
            'message' => 'Theme aktiviert',
            'theme' => $theme->fresh(),
        ]);
    }

    public function duplicate(int $id): JsonResponse
    {
        $original = Theme::findOrFail($id);

        $duplicate = Theme::create([
            'name' => $original->name . ' (Kopie)',
            'slug' => $original->slug . '-copy-' . time(),
            'version' => $original->version,
            'description' => $original->description,
            'author' => $original->author,
            'colors' => $original->colors,
            'fonts' => $original->fonts,
            'layouts' => $original->layouts,
            'custom_css' => $original->custom_css,
            'parent_theme' => $original->slug,
            'is_child_theme' => true,
        ]);

        foreach ($original->settings as $setting) {
            $duplicate->settings()->create($setting->toArray());
        }

        return response()->json([
            'message' => 'Theme dupliziert',
            'theme' => $duplicate->load('settings'),
        ], 201);
    }

    public function getActive(): JsonResponse
    {
        $theme = Theme::with(['settings', 'modifications'])
            ->where('is_active', true)
            ->first();

        if (!$theme) {
            return response()->json(['message' => 'Kein aktives Theme'], 404);
        }

        return response()->json([
            'theme' => $theme,
            'css' => $theme->getGeneratedCss(),
        ]);
    }

    public function updateSetting(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'key' => 'required|string',
            'value' => 'required',
        ]);

        $theme = Theme::findOrFail($id);
        $theme->setSetting($request->key, $request->value);

        return response()->json([
            'message' => 'Einstellung gespeichert',
            'css' => $theme->getGeneratedCss(),
        ]);
    }

    public function getSettings(int $id): JsonResponse
    {
        $theme = Theme::with('settings')->findOrFail($id);

        $settings = [];
        foreach ($theme->settings as $setting) {
            $settings[$setting->key] = [
                'value' => $theme->getSetting($setting->key),
                'default' => $setting->value,
                'type' => $setting->type,
                'label' => $setting->label,
                'group' => $setting->group,
            ];
        }

        return response()->json([
            'settings' => $settings,
        ]);
    }

    public function resetSettings(int $id): JsonResponse
    {
        $theme = Theme::findOrFail($id);
        $theme->modifications()->delete();

        return response()->json([
            'message' => 'Einstellungen zurückgesetzt',
            'css' => $theme->getGeneratedCss(),
        ]);
    }

    public function templates(int $id): JsonResponse
    {
        $theme = Theme::findOrFail($id);
        return response()->json($theme->themeTemplates);
    }

    public function storeTemplate(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'name' => 'required|string',
            'slug' => 'required|string',
            'type' => 'required|string',
            'content' => 'required|string',
            'settings' => 'nullable|array',
        ]);

        $theme = Theme::findOrFail($id);

        $template = $theme->themeTemplates()->create([
            'name' => $request->name,
            'slug' => $request->slug,
            'type' => $request->type,
            'content' => $request->content,
            'settings' => $request->settings,
            'is_custom' => true,
        ]);

        return response()->json([
            'message' => 'Template erstellt',
            'template' => $template,
        ], 201);
    }

    public function updateTemplate(Request $request, int $id, int $templateId): JsonResponse
    {
        $template = ThemeTemplate::where('theme_id', $id)
            ->where('id', $templateId)
            ->firstOrFail();

        $request->validate([
            'name' => 'sometimes|string',
            'content' => 'sometimes|string',
            'settings' => 'nullable|array',
        ]);

        $template->update($request->only(['name', 'content', 'settings']));

        return response()->json([
            'message' => 'Template aktualisiert',
            'template' => $template,
        ]);
    }

    public function destroyTemplate(int $id, int $templateId): JsonResponse
    {
        $template = ThemeTemplate::where('theme_id', $id)
            ->where('id', $templateId)
            ->where('is_custom', true)
            ->firstOrFail();

        $template->delete();

        return response()->json(['message' => 'Template gelöscht']);
    }

    public function export(int $id): JsonResponse
    {
        $theme = Theme::with(['settings', 'themeTemplates'])->findOrFail($id);

        return response()->json([
            'theme' => $theme,
            'export' => json_encode($theme->toArray(), JSON_PRETTY_PRINT),
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'theme_data' => 'required|json',
        ]);

        $data = json_decode($request->theme_data, true);

        $theme = Theme::create([
            'name' => $data['name'] . ' (Imported)',
            'slug' => $data['slug'] . '-import-' . time(),
            'version' => $data['version'] ?? '1.0.0',
            'description' => $data['description'] ?? null,
            'colors' => $data['colors'] ?? null,
            'fonts' => $data['fonts'] ?? null,
            'layouts' => $data['layouts'] ?? null,
            'custom_css' => $data['custom_css'] ?? null,
        ]);

        if (!empty($data['settings'])) {
            foreach ($data['settings'] as $setting) {
                $theme->settings()->create($setting);
            }
        }

        return response()->json([
            'message' => 'Theme importiert',
            'theme' => $theme->load('settings'),
        ], 201);
    }
}
