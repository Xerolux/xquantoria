import React, { useEffect, useState } from 'react';
import './CollaborationUI.css';

interface CursorData {
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

interface CursorOverlayProps {
  cursors: Map<number, CursorData>;
  currentUserId?: number;
  containerRef?: React.RefObject<HTMLElement>;
}

interface CursorPosition {
  x: number;
  y: number;
  visible: boolean;
}

const CursorOverlay: React.FC<CursorOverlayProps> = ({
  cursors,
  currentUserId,
  containerRef,
}) => {
  const [positions, setPositions] = useState<Map<number, CursorPosition>>(new Map());

  useEffect(() => {
    const newPositions = new Map<number, CursorPosition>();

    cursors.forEach((cursor, userId) => {
      if (userId === currentUserId) return;

      if (cursor.x !== undefined && cursor.y !== undefined) {
        newPositions.set(userId, {
          x: cursor.x,
          y: cursor.y,
          visible: true,
        });
      }
    });

    setPositions(newPositions);
  }, [cursors, currentUserId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isCursorStale = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    return diff > 30000; // 30 seconds
  };

  return (
    <div className="cursor-overlay">
      {Array.from(cursors.entries()).map(([userId, cursor]) => {
        if (userId === currentUserId) return null;
        if (isCursorStale(cursor.timestamp)) return null;
        if (cursor.x === undefined || cursor.y === undefined) return null;

        return (
          <div
            key={userId}
            className="remote-cursor"
            style={{
              left: cursor.x,
              top: cursor.y,
              '--cursor-color': cursor.userColor,
            } as React.CSSProperties}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="cursor-svg"
            >
              <path
                d="M5.65376 12.456H16.3443L11.9392 2.34062L5.65376 12.456Z"
                fill={cursor.userColor}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className="cursor-label"
              style={{ backgroundColor: cursor.userColor }}
            >
              {cursor.userName}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CursorOverlay;
