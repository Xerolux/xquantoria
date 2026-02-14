import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Block } from '../../types/blocks';
import { useBlockEditorStore } from '../../store/blockEditorStore';
import BlockContent from './blocks/BlockContent';
import BlockToolbar from './BlockToolbar';
import './BlockWrapper.css';

interface BlockWrapperProps {
  block: Block;
  isSelected: boolean;
  isDragging: boolean;
  readOnly?: boolean;
}

const BlockWrapper: React.FC<BlockWrapperProps> = ({ 
  block, 
  isSelected, 
  isDragging: globalDragging,
  readOnly = false 
}) => {
  const { selectBlock, hoverBlock, removeBlock, duplicateBlock } = useBlockEditorStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: block.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!readOnly) {
      selectBlock(block.id);
    }
  };

  const handleMouseEnter = () => {
    if (!readOnly) {
      hoverBlock(block.id);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      hoverBlock(null);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-wrapper ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${block.locked ? 'locked' : ''} ${block.hidden ? 'hidden' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!readOnly && isSelected && !globalDragging && (
        <BlockToolbar 
          block={block} 
          dragHandleProps={{ ...attributes, ...listeners }}
          onDelete={() => removeBlock(block.id)}
          onDuplicate={() => duplicateBlock(block.id)}
        />
      )}
      
      <div className="block-content-wrapper">
        <BlockContent block={block} />
      </div>
      
      {block.locked && (
        <div className="block-locked-indicator">
          🔒
        </div>
      )}
    </div>
  );
};

export default BlockWrapper;
