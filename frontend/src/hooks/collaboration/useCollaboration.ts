import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';

interface CollaborationUser {
  sessionId: string;
  userId: number;
  userName: string;
  userColor: string;
  joinedAt: string;
  lastActivity: string;
}

interface CursorPosition {
  userId: number;
  userName: string;
  userColor: string;
  blockId?: string;
  offset?: number;
  x?: number;
  y?: number;
  selection?: string;
  timestamp: string;
}

interface BlockUpdate {
  userId: number;
  userName: string;
  blockId: string;
  operation: 'create' | 'update' | 'delete' | 'move' | 'duplicate';
  data: any;
  version: number;
  timestamp: string;
}

interface UseCollaborationOptions {
  documentId: string;
  enabled?: boolean;
}

interface UseCollaborationReturn {
  isConnected: boolean;
  users: CollaborationUser[];
  cursors: Map<number, CursorPosition>;
  session: CollaborationUser | null;
  join: () => Promise<void>;
  leave: () => Promise<void>;
  updateCursor: (position: Partial<CursorPosition>) => Promise<void>;
  updateBlock: (blockId: string, operation: string, data: any) => Promise<void>;
  updateSelection: (blockIds: string[], textSelection?: string) => Promise<void>;
  syncDocument: (blocks: any[], version: number) => Promise<void>;
  lastBlockUpdate: BlockUpdate | null;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CURSOR_THROTTLE = 100; // ms

export function useCollaboration({
  documentId,
  enabled = true,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [session, setSession] = useState<CollaborationUser | null>(null);
  const [lastBlockUpdate, setLastBlockUpdate] = useState<BlockUpdate | null>(null);
  const cursorsRef = useRef<Map<number, CursorPosition>>(new Map());
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const cursorThrottleRef = useRef<number>(0);
  const lastCursorRef = useRef<Partial<CursorPosition>>({});

  const { user } = useAuthStore();

  const cursors = cursorsRef.current;

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/v1/collaboration${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }, []);

  const join = useCallback(async () => {
    if (!enabled || !documentId) return;

    try {
      const result = await apiCall(`/${documentId}/join`, { method: 'POST' });
      setSession(result.session);
      setUsers(result.users);
      setIsConnected(true);

      heartbeatRef.current = setInterval(async () => {
        try {
          await apiCall(`/${documentId}/heartbeat`, { method: 'POST' });
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }, HEARTBEAT_INTERVAL);
    } catch (error) {
      console.error('Failed to join document:', error);
      setIsConnected(false);
    }
  }, [documentId, enabled, apiCall]);

  const leave = useCallback(async () => {
    if (!session || !documentId) return;

    try {
      await apiCall(`/${documentId}/leave`, {
        method: 'POST',
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
    } catch (error) {
      console.error('Failed to leave document:', error);
    } finally {
      setIsConnected(false);
      setSession(null);
      setUsers([]);
      cursorsRef.current.clear();
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    }
  }, [documentId, session, apiCall]);

  const updateCursor = useCallback(async (position: Partial<CursorPosition>) => {
    if (!isConnected || !documentId) return;

    const now = Date.now();
    if (now - cursorThrottleRef.current < CURSOR_THROTTLE) {
      lastCursorRef.current = position;
      return;
    }

    cursorThrottleRef.current = now;

    try {
      await apiCall(`/${documentId}/cursor`, {
        method: 'POST',
        body: JSON.stringify(position),
      });
    } catch (error) {
      console.error('Failed to update cursor:', error);
    }
  }, [documentId, isConnected, apiCall]);

  const updateBlock = useCallback(async (
    blockId: string,
    operation: string,
    data: any
  ) => {
    if (!isConnected || !documentId) return;

    try {
      const result = await apiCall(`/${documentId}/block`, {
        method: 'POST',
        body: JSON.stringify({ blockId, operation, data }),
      });

      if (result.conflict) {
        throw new Error('Conflict detected - document was modified by another user');
      }

      return result;
    } catch (error) {
      console.error('Failed to update block:', error);
      throw error;
    }
  }, [documentId, isConnected, apiCall]);

  const updateSelection = useCallback(async (
    blockIds: string[],
    textSelection?: string
  ) => {
    if (!isConnected || !documentId) return;

    try {
      await apiCall(`/${documentId}/selection`, {
        method: 'POST',
        body: JSON.stringify({ blockIds, textSelection }),
      });
    } catch (error) {
      console.error('Failed to update selection:', error);
    }
  }, [documentId, isConnected, apiCall]);

  const syncDocument = useCallback(async (blocks: any[], version: number) => {
    if (!documentId) return;

    try {
      await apiCall(`/${documentId}/sync`, {
        method: 'POST',
        body: JSON.stringify({ blocks, version }),
      });
    } catch (error) {
      console.error('Failed to sync document:', error);
    }
  }, [documentId, apiCall]);

  useEffect(() => {
    if (enabled && documentId) {
      join();
    }

    return () => {
      if (session) {
        leave();
      }
    };
  }, [documentId, enabled]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session) {
        navigator.sendBeacon(
          `/api/v1/collaboration/${documentId}/leave`,
          JSON.stringify({ sessionId: session.sessionId })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [documentId, session]);

  return {
    isConnected,
    users,
    cursors,
    session,
    join,
    leave,
    updateCursor,
    updateBlock,
    updateSelection,
    syncDocument,
    lastBlockUpdate,
  };
}
