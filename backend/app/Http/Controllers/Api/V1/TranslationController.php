<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\TranslationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TranslationController extends Controller
{
    protected TranslationService $translationService;

    public function __construct(TranslationService $translationService)
    {
        $this->translationService = $translationService;
    }

    /**
     * Get supported languages for translation.
     */
    public function languages()
    {
        return response()->json([
            'languages' => $this->translationService->getSupportedLanguages(),
        ]);
    }

    /**
     * Translate a post to target language.
     */
    public function translate(Request $request, $id)
    {
        $post = Post::findOrFail($id);

        $this->authorize('update', $post);

        $validated = $request->validate([
            'target_lang' => 'required|string|in:de,en,fr,es,it,pt,ru,ja,zh',
        ]);

        try {
            $result = $this->translationService->translatePost(
                $post,
                $validated['target_lang'],
                Auth::id()
            );

            return response()->json($result, 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'translation_failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all translations of a post.
     */
    public function translations($id)
    {
        $post = Post::findOrFail($id);

        $translations = Post::where('original_post_id', $id)
            ->orWhere('id', $post->original_post_id)
            ->with(['author', 'categories', 'tags'])
            ->get()
            ->filter(fn ($p) => $p->id !== $post->id)
            ->values();

        return response()->json([
            'original' => $post,
            'translations' => $translations,
        ]);
    }

    /**
     * Link two posts as translations.
     */
    public function link(Request $request)
    {
        $validated = $request->validate([
            'original_post_id' => 'required|exists:posts,id',
            'translation_post_id' => 'required|exists:posts,id|different:original_post_id',
        ]);

        $original = Post::findOrFail($validated['original_post_id']);
        $translation = Post::findOrFail($validated['translation_post_id']);

        $this->authorize('update', $original);
        $this->authorize('update', $translation);

        $translation->update([
            'original_post_id' => $original->id,
            'translation_status' => 'completed',
            'translated_at' => now(),
            'translated_by' => Auth::id(),
        ]);

        return response()->json([
            'message' => 'Posts linked as translations',
            'original' => $original,
            'translation' => $translation,
        ]);
    }

    /**
     * Detect language of post content.
     */
    public function detect(Request $request, $id)
    {
        $post = Post::findOrFail($id);

        $this->authorize('view', $post);

        $detectedLang = $this->translationService->detectLanguage($post->content);

        return response()->json([
            'detected_language' => $detectedLang,
            'current_language' => $post->language,
        ]);
    }
}
