import React, { useEffect, useCallback, useState } from 'react';
import { Button, Space, Tooltip, Divider, Empty, message } from 'antd';
import {
  EyeOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { DndContext, DragEndEvent, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useBlockEditorStore } from '../../store/blockEditorStore';
import { Block, BlockType } from '../../types/blocks';
import BlockWrapper from './BlockWrapper';
import BlockInserter from './BlockInserter';
import BlockSettingsPanel from './BlockSettingsPanel';
import BlockPreview from './BlockPreview';
import { useCollaboration } from '../../hooks/collaboration/useCollaboration';
import PresenceIndicator from '../Collaboration/PresenceIndicator';
import CollaborationStatus from '../Collaboration/CollaborationStatus';
import CursorOverlay from '../Collaboration/CursorOverlay';
import ConflictResolver from '../Collaboration/ConflictResolver';
import './BlockEditor.css';

interface BlockEditorProps {
  initialContent?: string;
  onChange?: (html: string, blocks: Block[]) => void;
  readOnly?: boolean;
  documentId?: string;
  enableCollaboration?: boolean;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ 
  initialContent, 
  onChange, 
  readOnly = false,
  documentId,
  enableCollaboration = false,
}) => {
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);

  const {
    blocks,
    selectedBlockId,
    isDragging,
    isPreviewMode,
    history,
    historyIndex,
    addBlock,
    selectBlock,
    moveBlock,
    removeBlock,
    duplicateBlock,
    copyBlock,
    pasteBlock,
    undo,
    redo,
    setDragging,
    togglePreviewMode,
    getHtml,
    loadFromHtml,
    updateBlock,
  } = useBlockEditorStore();

  const {
    isConnected,
    users,
    cursors,
    session,
    updateCursor,
    updateBlock: collabUpdateBlock,
    updateSelection,
  } = useCollaboration({
    documentId: documentId || '',
    enabled: enableCollaboration && !!documentId,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    if (initialContent) {
      loadFromHtml(initialContent);
    }
  }, [initialContent]);

  useEffect(() => {
    if (onChange) {
      onChange(getHtml(), blocks);
    }
  }, [blocks]);

  useEffect(() => {
    if (enableCollaboration && isConnected && selectedBlockId) {
      updateCursor({ blockId: selectedBlockId });
    }
  }, [selectedBlockId, isConnected, enableCollaboration]);

  const handleBlockUpdate = useCallback(async (blockId: string, operation: string, data: any) => {
    if (!enableCollaboration || !isConnected) return;

    try {
      await collabUpdateBlock(blockId, operation, data);
    } catch (error: any) {
      if (error.message?.includes('Conflict')) {
        setHasConflict(true);
        setConflictData({ blockId, operation, data });
        message.warning('Conflict detected - another user modified this block');
      }
    }
  }, [enableCollaboration, isConnected, collabUpdateBlock]);

  const handleResolveConflict = useCallback((resolution: 'keep' | 'overwrite' | 'merge') => {
    if (resolution === 'overwrite' && conflictData) {
      collabUpdateBlock(conflictData.blockId, conflictData.operation, conflictData.data);
    }
    setHasConflict(false);
    setConflictData(null);
  }, [conflictData, collabUpdateBlock]);

  const handleDragStart = (event: DragStartEvent) => {
    setDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragging(false);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      moveBlock(oldIndex, newIndex);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (readOnly) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    if (cmdKey && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    }

    if (cmdKey && e.key === 'y') {
      e.preventDefault();
      redo();
    }

    if (cmdKey && e.key === 'c' && selectedBlockId) {
      e.preventDefault();
      copyBlock(selectedBlockId);
    }

    if (cmdKey && e.key === 'v' && selectedBlockId) {
      e.preventDefault();
      pasteBlock(selectedBlockId);
    }

    if (cmdKey && e.key === 'd' && selectedBlockId) {
      e.preventDefault();
      duplicateBlock(selectedBlockId);
    }

    if (e.key === 'Delete' && selectedBlockId) {
      e.preventDefault();
      removeBlock(selectedBlockId);
    }

    if (e.key === 'Escape') {
      selectBlock(null);
    }
  }, [readOnly, selectedBlockId, undo, redo, copyBlock, pasteBlock, duplicateBlock, removeBlock, selectBlock]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleAddBlock = (type: BlockType, afterId?: string) => {
    addBlock(type, afterId);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  if (isPreviewMode) {
    return <BlockPreview blocks={blocks} onExit={togglePreviewMode} />;
  }

  return (
    <div className="block-editor">
      {!readOnly && (
        <div className="block-editor-toolbar">
          <Space>
            <Tooltip title="Undo (Ctrl+Z)">
              <Button icon={<UndoOutlined />} onClick={undo} disabled={!canUndo} />
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)">
              <Button icon={<RedoOutlined />} onClick={redo} disabled={!canRedo} />
            </Tooltip>
            <Divider type="vertical" />
            <Tooltip title="Preview">
              <Button icon={<EyeOutlined />} onClick={togglePreviewMode} />
            </Tooltip>
          </Space>
          
          {enableCollaboration && (
            <>
              <Divider type="vertical" />
              <CollaborationStatus
                isConnected={isConnected}
                userCount={users.length}
                hasConflict={hasConflict}
              />
              <PresenceIndicator
                users={users}
                currentUserId={session?.userId}
                maxVisible={3}
              />
            </>
          )}
          
          <Space>
            <span className="block-count">{blocks.length} blocks</span>
          </Space>
        </div>
      )}

      <div className="block-editor-content">
        <div className="block-editor-canvas" style={{ position: 'relative' }}>
          {blocks.length === 0 ? (
            <div className="block-editor-empty">
              <Empty description="No blocks yet">
                <BlockInserter onAdd={handleAddBlock} />
              </Empty>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block, index) => (
                  <React.Fragment key={block.id}>
                    {!readOnly && index === 0 && (
                      <BlockInserter onAdd={(type) => handleAddBlock(type)} position="top" />
                    )}
                    <BlockWrapper
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      isDragging={isDragging}
                      readOnly={readOnly}
                    />
                    {!readOnly && (
                      <BlockInserter onAdd={(type) => handleAddBlock(type, block.id)} />
                    )}
                  </React.Fragment>
                ))}
              </SortableContext>
            </DndContext>
          )}
          
          {enableCollaboration && isConnected && (
            <CursorOverlay cursors={cursors} />
          )}
        </div>

        {!readOnly && selectedBlockId && (
          <div className="block-editor-sidebar">
            <BlockSettingsPanel blockId={selectedBlockId} />
          </div>
        )}
      </div>

      {hasConflict && conflictData && (
        <ConflictResolver
          conflict={conflictData}
          onResolve={handleResolveConflict}
          onCancel={() => {
            setHasConflict(false);
            setConflictData(null);
          }}
        />
      )}
    </div>
  );
};

export default BlockEditor;
