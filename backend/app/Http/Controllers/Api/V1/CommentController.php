<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CommentController extends Controller
{
    public function index(Request $request)
    {
        $query = Comment::with(['user', 'parent', 'replies'])
            ->orderBy('created_at', 'desc');

        // Filter by post
        if ($request->has('post_id')) {
            $query->where('post_id', $request->post_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Only approved comments for public
        if (!Auth::check()) {
            $query->approved();
        }

        $comments = $query->paginate(20);

        return response()->json($comments);
    }

    public function store(Request $request)
    {
        // Authenticated user
        if (Auth::check()) {
            $validated = $request->validate([
                'post_id' => 'required|exists:posts,id',
                'parent_id' => 'nullable|exists:comments,id',
                'content' => 'required|string|min:1|max:5000',
            ]);
        } else {
            // Guest user - require name and email
            $validated = $request->validate([
                'post_id' => 'required|exists:posts,id',
                'parent_id' => 'nullable|exists:comments,id',
                'content' => 'required|string|min:1|max:5000',
                'author_name' => 'required|string|max:255',
                'author_email' => 'required|email|max:255',
            ]);
        }

        // Sanitize content to prevent XSS
        $sanitizedContent = $this->sanitizeContent($validated['content']);

        // Spam detection (basic)
        $spamScore = $this->detectSpam($request, $validated);

        $comment = Comment::create([
            'post_id' => $validated['post_id'],
            'user_id' => Auth::id(),
            'parent_id' => $validated['parent_id'] ?? null,
            'author_name' => Auth::check() ? null : ($validated['author_name'] ?? null),
            'author_email' => Auth::check() ? null : ($validated['author_email'] ?? null),
            'author_ip' => $request->ip(),
            'content' => $sanitizedContent,
            'status' => $spamScore > 5 ? 'spam' : 'pending',
        ]);

        return response()->json($comment, 201);
    }

    public function show($id)
    {
        $comment = Comment::with(['user', 'parent', 'replies', 'post'])
            ->findOrFail($id);

        return response()->json($comment);
    }

    public function update(Request $request, $id)
    {
        $comment = Comment::findOrFail($id);

        $validated = $request->validate([
            'content' => 'sometimes|required|string|min:1|max:5000',
            'status' => 'sometimes|in:pending,approved,rejected,spam',
        ]);

        $comment->update($validated);

        return response()->json($comment);
    }

    public function approve($id)
    {
        $comment = Comment::findOrFail($id);
        $comment->approve();

        return response()->json(['message' => 'Comment approved']);
    }

    public function reject($id)
    {
        $comment = Comment::findOrFail($id);
        $comment->reject();

        return response()->json(['message' => 'Comment rejected']);
    }

    public function markAsSpam($id)
    {
        $comment = Comment::findOrFail($id);
        $comment->markAsSpam();

        return response()->json(['message' => 'Comment marked as spam']);
    }

    public function destroy($id)
    {
        $comment = Comment::findOrFail($id);
        $comment->delete();

        return response()->json(null, 204);
    }

    /**
     * Sanitize comment content to prevent XSS
     */
    protected function sanitizeContent(string $content): string
    {
        // Remove all HTML tags except safe ones
        $allowedTags = '<p><br><strong><em><u><ol><ul><li><blockquote><code>';
        $sanitized = strip_tags($content, $allowedTags);

        // Remove any remaining script tags or event handlers
        $sanitized = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $sanitized);
        $sanitized = preg_replace('/on\w+\s*=\s*["\'].*?["\']/i', '', $sanitized);
        $sanitized = preg_replace('/javascript:/i', '', $sanitized);

        // Convert special characters to HTML entities
        $sanitized = htmlspecialchars($sanitized, ENT_QUOTES, 'UTF-8', false);

        return trim($sanitized);
    }

    /**
     * Einfache Spam-Erkennung
     */
    protected function detectSpam(Request $request, array $data): int
    {
        $score = 0;

        // Check for excessive links
        $linkCount = preg_match_all('/http/', $data['content']);
        if ($linkCount > 2) {
            $score += 3;
        }

        // Check for excessive caps
        $capsRatio = preg_match_all('/[A-Z]/', $data['content']) / strlen($data['content']);
        if ($capsRatio > 0.7) {
            $score += 2;
        }

        // Check for repetitive words
        $words = explode(' ', strtolower($data['content']));
        $uniqueWords = array_unique($words);
        if (count($words) > 10 && count($uniqueWords) / count($words) < 0.3) {
            $score += 2;
        }

        // Check length
        if (strlen($data['content']) < 10) {
            $score += 1;
        }

        return $score;
    }
}
