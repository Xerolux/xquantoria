<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use App\Models\Post;
use App\Models\Comment;
use App\Models\User;

class ContentApprovalController extends Controller
{
    public function pending(Request $request)
    {
        $type = $request->input('type', 'all');
        $perPage = $request->input('per_page', 20);

        $result = [];

        if ($type === 'all' || $type === 'posts') {
            $posts = Post::with(['author:id,name,email', 'categories:id,name', 'tags:id,name'])
                ->whereIn('status', ['draft', 'pending_review'])
                ->orderBy('updated_at', 'desc')
                ->paginate($perPage, ['*'], 'posts_page');

            $result['posts'] = $posts->map(function ($post) {
                return [
                    'id' => $post->id,
                    'title' => $post->title,
                    'slug' => $post->slug,
                    'status' => $post->status,
                    'author' => $post->author,
                    'categories' => $post->categories,
                    'tags' => $post->tags,
                    'excerpt' => \Str::limit(strip_tags($post->content), 200),
                    'word_count' => str_word_count(strip_tags($post->content)),
                    'created_at' => $post->created_at,
                    'updated_at' => $post->updated_at,
                ];
            });
            $result['posts_meta'] = [
                'total' => $posts->total(),
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
            ];
        }

        if ($type === 'all' || $type === 'comments') {
            $comments = Comment::with(['user:id,name,email', 'post:id,title,slug'])
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage, ['*'], 'comments_page');

            $result['comments'] = $comments->map(function ($comment) {
                return [
                    'id' => $comment->id,
                    'content' => $comment->content,
                    'author_name' => $comment->author_name,
                    'author_email' => $comment->author_email,
                    'author_ip' => $comment->author_ip,
                    'user' => $comment->user,
                    'post' => $comment->post,
                    'is_spam' => $comment->is_spam,
                    'spam_score' => $comment->spam_score,
                    'created_at' => $comment->created_at,
                ];
            });
            $result['comments_meta'] = [
                'total' => $comments->total(),
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
            ];
        }

        return response()->json($result);
    }

    public function stats()
    {
        return response()->json([
            'posts_pending' => Post::whereIn('status', ['draft', 'pending_review'])->count(),
            'posts_approved_today' => Post::where('status', 'published')
                ->whereDate('updated_at', today())
                ->whereNotNull('approved_by')
                ->count(),
            'posts_rejected_today' => Post::where('status', 'rejected')
                ->whereDate('updated_at', today())
                ->count(),
            'comments_pending' => Comment::where('status', 'pending')->count(),
            'comments_spam' => Comment::where('is_spam', true)->count(),
            'comments_approved_today' => Comment::where('status', 'approved')
                ->whereDate('updated_at', today())
                ->count(),
            'avg_review_time_hours' => $this->calculateAverageReviewTime(),
        ]);
    }

    public function approve(Request $request, $id)
    {
        $post = Post::findOrFail($id);

        if (!in_array($post->status, ['draft', 'pending_review'])) {
            return response()->json([
                'message' => 'Post cannot be approved in its current status',
            ], 400);
        }

        $post->status = 'published';
        $post->published_at = $post->published_at ?? now();
        $post->approved_by = $request->user()->id;
        $post->approved_at = now();
        $post->save();

        $this->logApproval($post, 'approved', $request->input('feedback'));

        return response()->json([
            'message' => 'Post approved successfully',
            'post' => $post,
        ]);
    }

    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $post = Post::findOrFail($id);

        if (!in_array($post->status, ['draft', 'pending_review'])) {
            return response()->json([
                'message' => 'Post cannot be rejected in its current status',
            ], 400);
        }

        $post->status = 'rejected';
        $post->rejected_by = $request->user()->id;
        $post->rejected_at = now();
        $post->rejection_reason = $request->input('reason');
        $post->save();

        $this->logApproval($post, 'rejected', $request->input('reason'));

        return response()->json([
            'message' => 'Post rejected',
            'post' => $post,
        ]);
    }

    public function requestChanges(Request $request, $id)
    {
        $request->validate([
            'feedback' => 'required|string|max:1000',
        ]);

        $post = Post::findOrFail($id);

        $post->status = 'needs_revision';
        $post->revision_feedback = $request->input('feedback');
        $post->save();

        $this->logApproval($post, 'changes_requested', $request->input('feedback'));

        return response()->json([
            'message' => 'Changes requested',
            'post' => $post,
        ]);
    }

    public function approveComment(Request $request, $id)
    {
        $comment = Comment::findOrFail($id);

        $comment->status = 'approved';
        $comment->approved_by = $request->user()->id;
        $comment->approved_at = now();
        $comment->is_spam = false;
        $comment->save();

        $this->logCommentApproval($comment, 'approved');

        return response()->json([
            'message' => 'Comment approved',
            'comment' => $comment,
        ]);
    }

    public function rejectComment(Request $request, $id)
    {
        $comment = Comment::findOrFail($id);

        $comment->status = 'rejected';
        $comment->rejected_by = $request->user()->id;
        $comment->rejected_at = now();
        $comment->rejection_reason = $request->input('reason');
        $comment->save();

        $this->logCommentApproval($comment, 'rejected', $request->input('reason'));

        return response()->json([
            'message' => 'Comment rejected',
            'comment' => $comment,
        ]);
    }

    public function history(Request $request)
    {
        $type = $request->input('type', 'all');
        $perPage = $request->input('per_page', 20);

        $history = DB::table('activity_logs')
            ->where('action', 'LIKE', '%approval%')
            ->orWhere('action', 'LIKE', '%rejected%')
            ->orWhere('action', 'LIKE', '%approved%')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json($history);
    }

    private function logApproval($post, $action, $feedback = null)
    {
        DB::table('activity_logs')->insert([
            'user_id' => request()->user()->id,
            'action' => "post_{$action}",
            'model_type' => Post::class,
            'model_id' => $post->id,
            'description' => "Post '{$post->title}' was {$action}",
            'properties' => json_encode([
                'feedback' => $feedback,
                'previous_status' => $post->getOriginal('status'),
                'new_status' => $post->status,
            ]),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function logCommentApproval($comment, $action, $reason = null)
    {
        DB::table('activity_logs')->insert([
            'user_id' => request()->user()->id,
            'action' => "comment_{$action}",
            'model_type' => Comment::class,
            'model_id' => $comment->id,
            'description' => "Comment was {$action}",
            'properties' => json_encode([
                'reason' => $reason,
            ]),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function calculateAverageReviewTime()
    {
        $result = DB::table('posts')
            ->whereNotNull('approved_at')
            ->whereNotNull('created_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600) as avg_hours')
            ->first();

        return round($result->avg_hours ?? 0, 1);
    }
}
