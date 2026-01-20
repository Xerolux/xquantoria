<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Newsletter;
use App\Models\NewsletterSubscriber;
use App\Models\NewsletterSent;
use App\Jobs\SendNewsletterEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NewsletterController extends Controller
{
    // ==================== NEWSLETTERS ====================

    public function index(Request $request)
    {
        $query = Newsletter::with('creator')
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $newsletters = $query->paginate(20);

        return response()->json($newsletters);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'preview_text' => 'nullable|string|max:255',
            'content' => 'required|string',
            'scheduled_at' => 'nullable|date|after:now',
        ]);

        $newsletter = Newsletter::create([
            ...$validated,
            'status' => 'draft',
            'created_by' => Auth::id(),
        ]);

        return response()->json($newsletter, 201);
    }

    public function show($id)
    {
        $newsletter = Newsletter::with(['creator', 'sent.subscriber'])
            ->findOrFail($id);

        return response()->json($newsletter);
    }

    public function update(Request $request, $id)
    {
        $newsletter = Newsletter::findOrFail($id);

        $validated = $request->validate([
            'subject' => 'sometimes|required|string|max:255',
            'preview_text' => 'nullable|string|max:255',
            'content' => 'sometimes|required|string',
            'status' => 'sometimes|in:draft,scheduled,sending,sent',
            'scheduled_at' => 'nullable|date|after:now',
        ]);

        $newsletter->update($validated);

        return response()->json($newsletter);
    }

    public function destroy($id)
    {
        $newsletter = Newsletter::findOrFail($id);
        $newsletter->delete();

        return response()->json(null, 204);
    }

    public function send($id)
    {
        $newsletter = Newsletter::findOrFail($id);

        if ($newsletter->status === 'sent' || $newsletter->status === 'sending') {
            return response()->json(['message' => 'Newsletter already sent or sending'], 400);
        }

        $newsletter->update(['status' => 'sending']);

        $activeSubscribers = NewsletterSubscriber::active()->get();
        $recipientsCount = $activeSubscribers->count();

        foreach ($activeSubscribers as $subscriber) {
            SendNewsletterEmail::dispatch($newsletter, $subscriber);
        }

        $newsletter->update([
            'status' => 'sent', // Will be marked 'sent' immediately here, but jobs process in background
            'sent_at' => now(),
            'recipients_count' => $recipientsCount,
        ]);

        return response()->json([
            'message' => 'Newsletter queued for sending',
            'recipients_count' => $recipientsCount,
        ]);
    }

    public function getStats()
    {
        $totalNewsletters = Newsletter::count();
        $sentNewsletters = Newsletter::sent()->count();
        $draftNewsletters = Newsletter::draft()->count();
        $totalSubscribers = NewsletterSubscriber::active()->count();
        $pendingSubscribers = NewsletterSubscriber::pending()->count();

        $totalSent = NewsletterSent::count();
        $totalOpened = NewsletterSent::opened()->count();
        $totalClicked = NewsletterSent::clicked()->count();

        $avgOpenRate = $totalSent > 0
            ? round(($totalOpened / $totalSent) * 100, 2)
            : 0;

        $avgClickRate = $totalSent > 0
            ? round(($totalClicked / $totalSent) * 100, 2)
            : 0;

        return response()->json([
            'total_newsletters' => $totalNewsletters,
            'sent_newsletters' => $sentNewsletters,
            'draft_newsletters' => $draftNewsletters,
            'total_subscribers' => $totalSubscribers,
            'pending_subscribers' => $pendingSubscribers,
            'total_sent' => $totalSent,
            'total_opened' => $totalOpened,
            'total_clicked' => $totalClicked,
            'avg_open_rate' => $avgOpenRate,
            'avg_click_rate' => $avgClickRate,
        ]);
    }

    // ==================== SUBSCRIBERS ====================

    public function subscribers(Request $request)
    {
        $query = NewsletterSubscriber::with('user')
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search by email or name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        $subscribers = $query->paginate(20);

        return response()->json($subscribers);
    }

    public function showSubscriber($id)
    {
        $subscriber = NewsletterSubscriber::with(['user', 'sent.newsletter'])
            ->findOrFail($id);

        return response()->json($subscriber);
    }

    public function updateSubscriber(Request $request, $id)
    {
        $subscriber = NewsletterSubscriber::findOrFail($id);

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:pending,active,unsubscribed,bounced',
        ]);

        $subscriber->update($validated);

        return response()->json($subscriber);
    }

    public function deleteSubscriber($id)
    {
        $subscriber = NewsletterSubscriber::findOrFail($id);
        $subscriber->delete();

        return response()->json(null, 204);
    }

    public function exportSubscribers()
    {
        $subscribers = NewsletterSubscriber::active()->get();

        $csvData = [];
        $csvData[] = ['Email', 'First Name', 'Last Name', 'Confirmed At', 'Emails Sent', 'Emails Opened', 'Emails Clicked'];

        foreach ($subscribers as $subscriber) {
            $csvData[] = [
                $subscriber->email,
                $subscriber->first_name,
                $subscriber->last_name,
                $subscriber->confirmed_at?->format('Y-m-d H:i:s'),
                $subscriber->emails_sent,
                $subscriber->emails_opened,
                $subscriber->emails_clicked,
            ];
        }

        $filename = 'subscribers_' . date('Y-m-d_H-i-s') . '.csv';

        return response()->streamDownload(function () use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        }, $filename);
    }
}
