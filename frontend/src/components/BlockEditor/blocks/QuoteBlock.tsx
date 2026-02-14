import React from 'react';
import { Typography } from 'antd';
import { QuoteBlock } from '../../../types/blocks';
import './BlockComponents.css';

interface QuoteBlockProps {
  block: QuoteBlock;
}

const QuoteBlock: React.FC<QuoteBlockProps> = ({ block }) => {
  return (
    <blockquote className={`block-quote quote-${block.style || 'default'} align-${block.alignment || 'left'}`}>
      <p>{block.content || 'Click to add quote...'}</p>
      {block.author && (
        <cite>
          {block.author}
          {block.source && `, ${block.source}`}
        </cite>
      )}
    </blockquote>
  );
};

export default QuoteBlock;
