import React from 'react';
import { Input } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import type { HtmlBlock as HtmlBlockType } from '../../../types/blocks';
import './BlockComponents.css';

interface HtmlBlockProps {
  block: HtmlBlockType;
}

const HtmlBlock: React.FC<HtmlBlockProps> = ({ block }) => {
  const { updateBlock, selectedBlockId } = useBlockEditorStore();
  const isSelected = selectedBlockId === block.id;

  if (isSelected) {
    return (
      <div className="block-html-editor">
        <Input.TextArea
          value={block.content}
          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
          placeholder="<div>Your HTML here...</div>"
          rows={8}
          style={{ fontFamily: 'monospace' }}
        />
      </div>
    );
  }

  return (
    <div 
      className="block-html"
      dangerouslySetInnerHTML={{ __html: block.content || '<p>Click to add HTML...</p>' }}
    />
  );
};

export default HtmlBlock;
