import React from 'react';
import { Button as AntButton } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import type { ButtonBlock as ButtonBlockType } from '../../../types/blocks';
import './BlockComponents.css';

interface ButtonBlockProps {
  block: ButtonBlockType;
}

const ButtonBlock: React.FC<ButtonButtonBlockProps> = ({ block }) => {
  return (
    <div className={`block-button align-${block.alignment || 'left'}`}>
      <AntButton
        type={block.style === 'primary' ? 'primary' : block.style === 'ghost' ? 'ghost' : 'default'}
        href={block.url}
        target={block.target}
        size={block.size}
        style={{ borderRadius: block.borderRadius || 4 }}
      >
        {block.icon && block.iconPosition === 'left' && <span className="btn-icon">{block.icon}</span>}
        {block.text || 'Button'}
        {block.icon && block.iconPosition === 'right' && <span className="btn-icon">{block.icon}</span>}
      </AntButton>
    </div>
  );
};

export default ButtonBlock;
