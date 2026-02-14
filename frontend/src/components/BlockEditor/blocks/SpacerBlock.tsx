import React from 'react';
import { InputNumber, Switch, Divider } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { SpacerBlock } from '../../../types/blocks';
import './BlockComponents.css';

interface SpacerBlockProps {
  block: SpacerBlock;
}

const SpacerBlock: React.FC<SpacerBlockProps> = ({ block }) => {
  return (
    <div 
      className="block-spacer"
      style={{ 
        height: block.height || 30,
        position: 'relative',
      }}
    >
      {block.showDivider && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          borderTop: '1px dashed #d9d9d9',
        }} />
      )}
    </div>
  );
};

export default SpacerBlock;
