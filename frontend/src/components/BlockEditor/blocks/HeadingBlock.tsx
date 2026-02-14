import React, { useCallback } from 'react';
import { Input, Typography } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { HeadingBlock, HeadingLevel } from '../../../types/blocks';
import './BlockComponents.css';

const { Title } = Typography;

interface HeadingBlockProps {
  block: HeadingBlock;
}

const HeadingBlock: React.FC<HeadingBlockProps> = ({ block }) => {
  const { updateBlock, selectedBlockId } = useBlockEditorStore();
  const isSelected = selectedBlockId === block.id;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateBlock(block.id, { content: e.target.value });
  }, [block.id, updateBlock]);

  const alignmentStyle = { textAlign: block.alignment || 'left' };
  const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements;

  return (
    <div className={`block-heading align-${block.alignment || 'left'}`}>
      {isSelected ? (
        <Input
          value={block.content}
          onChange={handleChange}
          placeholder={`Heading ${block.level}...`}
          bordered={false}
          className={`heading-input h${block.level}`}
          style={alignmentStyle}
        />
      ) : (
        <HeadingTag 
          style={alignmentStyle}
          id={block.anchor || undefined}
          className={block.content ? '' : 'placeholder'}
        >
          {block.content || `Click to add heading ${block.level}...`}
        </HeadingTag>
      )}
    </div>
  );
};

export default HeadingBlock;
