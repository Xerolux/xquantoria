import React from 'react';
import { DividerBlock } from '../../../types/blocks';
import './BlockComponents.css';

interface DividerBlockProps {
  block: DividerBlock;
}

const DividerBlock: React.FC<DividerBlockProps> = ({ block }) => {
  const widthStyle = {
    full: '100%',
    wide: '80%',
    centered: '50%',
  };

  return (
    <hr 
      className={`block-divider divider-${block.style || 'solid'} width-${block.width || 'full'}`}
      style={{
        borderTopStyle: block.style || 'solid',
        borderTopColor: block.color || '#d9d9d9',
        borderTopWidth: block.thickness || 1,
        width: widthStyle[block.width || 'full'],
        marginLeft: block.width === 'centered' ? 'auto' : undefined,
        marginRight: block.width === 'centered' ? 'auto' : undefined,
      }}
    />
  );
};

export default DividerBlock;
