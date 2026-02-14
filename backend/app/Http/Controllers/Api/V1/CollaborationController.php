<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Collaboration\CollaborationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollaborationController extends Controller
{
    protected CollaborationService $collaborationService;

    public function __construct(CollaborationService $collaborationService)
    {
        $this->collaborationService = $collaborationService;
    }

    public function join(Request $request, string $documentId): JsonResponse
    {
        $userId = $request->user()->id;

        $result = $this->collaborationService->joinDocument($documentId, $userId);

        return response()->json($result);
    }

    public function leave(Request $request, string $documentId): JsonResponse
    {
        $request->validate([
            'sessionId' => 'required|string',
        ]);

        $userId = $request->user()->id;
        $sessionId = $request->sessionId;

        $this->collaborationService->leaveDocument($documentId, $userId, $sessionId);

        return response()->json(['success' => true]);
    }

    public function cursor(Request $request, string $documentId): JsonResponse
    {
        $request->validate([
            'blockId' => 'nullable|string',
            'offset' => 'nullable|integer|min:0',
            'x' => 'nullable|integer',
            'y' => 'nullable|integer',
            'selection' => 'nullable|string',
        ]);

        $userId = $request->user()->id;

        $this->collaborationService->updateCursor(
            $documentId,
            $userId,
            $request->blockId,
            $request->offset,
            $request->x,
            $request->y,
            $request->selection
        );

        return response()->json(['success' => true]);
    }

    public function block(Request $request, string $documentId): JsonResponse
    {
        $request->validate([
            'blockId' => 'required|string',
            'operation' => 'required|string|in:create,update,delete,move,duplicate',
            'data' => 'required|array',
            'version' => 'nullable|integer|min:0',
        ]);

        $userId = $request->user()->id;
        $clientVersion = $request->version ?? 0;

        $conflict = $this->collaborationService->checkConflict($documentId, $clientVersion);

        if ($conflict) {
            return response()->json([
                'success' => false,
                'conflict' => $conflict,
            ], 409);
        }

        $result = $this->collaborationService->updateBlock(
            $documentId,
            $userId,
            $request->blockId,
            $request->operation,
            $request->data
        );

        return response()->json($result);
    }

    public function selection(Request $request, string $documentId): JsonResponse
    {
        $request->validate([
            'blockIds' => 'nullable|array',
            'blockIds.*' => 'string',
            'textSelection' => 'nullable|string',
        ]);

        $userId = $request->user()->id;

        $this->collaborationService->updateSelection(
            $documentId,
            $userId,
            $request->blockIds ?? [],
            $request->textSelection
        );

        return response()->json(['success' => true]);
    }

    public function sync(Request $request, string $documentId): JsonResponse
    {
        $request->validate([
            'blocks' => 'required|array',
            'version' => 'required|integer|min:0',
        ]);

        $this->collaborationService->syncDocument(
            $documentId,
            $request->blocks,
            $request->version
        );

        return response()->json(['success' => true]);
    }

    public function heartbeat(string $documentId): JsonResponse
    {
        $userId = auth()->id();

        $this->collaborationService->heartbeat($documentId, $userId);

        return response()->json([
            'success' => true,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function users(string $documentId): JsonResponse
    {
        $users = $this->collaborationService->getActiveUsers($documentId);

        return response()->json([
            'users' => $users,
            'count' => count($users),
        ]);
    }

    public function state(string $documentId): JsonResponse
    {
        $state = $this->collaborationService->getDocumentState($documentId);

        return response()->json($state);
    }
}
