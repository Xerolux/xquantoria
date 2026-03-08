import React, { useCallback } from 'react';
import { Input } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { ParagraphBlock, TextAlignment } from '../../../types/blocks';
import './BlockComponents.css';

const { TextArea } = Input;

interface ParagraphBlockProps {
  block: ParagraphBlockType;
}

const ParagraphBlock: React.FC<ParagraphBlockProps> = ({ block }) => {
  const { updateBlock, selectedBlockId } = useBlockEditorStore();
  const isSelected = selectedBlockId === block.id;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateBlock(block.id, { content: e.target.value });
  }, [block.id, updateBlock]);

  const alignmentClass = `align-${block.alignment || 'left'}`;
  const fontSizeClass = `font-${block.fontSize || 'normal'}`;

  return (
    <div className={`block-paragraph ${alignmentClass} ${fontSizeClass}`}>
      {isSelected ? (
        <TextArea
          value={block.content}
          onChange={handleChange}
          placeholder="Write your paragraph..."
          autoSize={{ minRows: 2 }}
          bordered={false}
          className="paragraph-input"
        />
      ) : (
        <p 
          dangerouslySetInnerHTML={{ __html: block.content || 'Click to add text...' }}
          className={block.content ? '' : 'placeholder'}
        />
      )}
    </div>
  );
};

export default ParagraphBlock;
