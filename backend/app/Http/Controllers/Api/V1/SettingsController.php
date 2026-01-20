<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SettingsController extends Controller
{
    /**
     * Get all settings grouped by group.
     */
    public function index(Request $request)
    {
        $group = $request->query('group');

        $query = Setting::query();

        if ($group) {
            $query->where('group', $group);
        }

        $settings = $query->ordered()->get();

        // Group settings by group name
        $grouped = $settings->groupBy('group')->map(function ($group) {
            return $group->map(function ($setting) {
                return [
                    'id' => $setting->id,
                    'key' => $setting->key,
                    'value' => $setting->typed_value,
                    'type' => $setting->type,
                    'display_name' => $setting->display_name,
                    'description' => $setting->description,
                    'options' => $setting->options,
                    'is_public' => $setting->is_public,
                    'sort_order' => $setting->sort_order,
                ];
            });
        });

        return response()->json([
            'settings' => $grouped,
            'groups' => Setting::getGroups(),
            'types' => Setting::getTypes(),
        ]);
    }

    /**
     * Get a specific setting by key (cached for 1 hour).
     */
    public function show($key)
    {
        $setting = Cache::remember("setting_{$key}", 3600, function () use ($key) {
            return Setting::where('key', $key)->firstOrFail();
        });

        return response()->json([
            'setting' => [
                'id' => $setting->id,
                'key' => $setting->key,
                'value' => $setting->typed_value,
                'type' => $setting->type,
                'group' => $setting->group,
                'display_name' => $setting->display_name,
                'description' => $setting->description,
                'options' => $setting->options,
                'is_public' => $setting->is_public,
            ],
        ]);
    }

    /**
     * Update a setting.
     */
    public function update(Request $request, $key)
    {
        $setting = Setting::where('key', $key)->firstOrFail();

        // Validate based on setting type
        $rules = $setting->getValidationRules();

        // For image/file uploads, handle file upload
        if (in_array($setting->type, ['image', 'file']) && $request->hasFile('value')) {
            $rules = ['value' => 'required|file'];
        }

        $validated = $request->validate($rules);

        // Handle file upload
        if (in_array($setting->type, ['image', 'file']) && $request->hasFile('value')) {
            $file = $request->file('value');

            // Delete old file if exists
            if ($setting->value) {
                $oldPath = storage_path('app/public/' . $setting->value);
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }

            // Store new file
            $path = $file->store('settings', 'public');
            $validated['value'] = $path;
        }

        // Update setting
        $setting->update([
            'value' => $validated['value'],
            'updated_by' => auth()->id(),
        ]);

        // Clear cache for this specific setting
        Cache::forget("setting_{$key}");

        // Clear general cache
        $this->clearCache();

        return response()->json([
            'message' => 'Setting updated successfully',
            'setting' => [
                'id' => $setting->id,
                'key' => $setting->key,
                'value' => $setting->typed_value,
                'type' => $setting->type,
                'group' => $setting->group,
                'display_name' => $setting->display_name,
            ],
        ]);
    }

    /**
     * Update multiple settings at once.
     */
    public function updateBulk(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'required',
        ]);

        $updated = [];

        foreach ($validated['settings'] as $settingData) {
            $setting = Setting::where('key', $settingData['key'])->first();

            if ($setting) {
                $setting->update([
                    'value' => $settingData['value'],
                    'updated_by' => auth()->id(),
                ]);

                $updated[] = [
                    'key' => $setting->key,
                    'value' => $setting->typed_value,
                ];
            }
        }

        // Clear cache
        $this->clearCache();

        return response()->json([
            'message' => 'Settings updated successfully',
            'updated' => $updated,
        ]);
    }

    /**
     * Reset a setting to its default value.
     */
    public function reset($key)
    {
        $setting = Setting::where('key', $key)->firstOrFail();

        // Get default value from migration or reset to null
        $setting->update([
            'value' => null,
            'updated_by' => auth()->id(),
        ]);

        // Clear cache
        $this->clearCache();

        return response()->json([
            'message' => 'Setting reset to default',
            'setting' => [
                'key' => $setting->key,
                'value' => $setting->typed_value,
            ],
        ]);
    }

    /**
     * Get all public settings (accessible without auth).
     */
    public function public()
    {
        $settings = Setting::public()
            ->ordered()
            ->get()
            ->pluck('typed_value', 'key');

        return response()->json($settings);
    }

    /**
     * Clear settings cache.
     */
    protected function clearCache(): void
    {
        Cache::forget('settings.public');
        Cache::forget('settings.all');
    }
}
