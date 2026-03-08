import React from 'react';
import { Row, Col, Divider } from 'antd';
import { ColumnsBlock, Block } from '../../../types/blocks';
import BlockContent from './BlockContent';
import './BlockComponents.css';

interface ColumnsBlockProps {
  block: ColumnsBlockType;
}

const ColumnsBlock: React.FC<ColumnsBlockProps> = ({ block }) => {
  const colSpan = Math.floor(24 / block.columns);

  return (
    <div className="block-columns">
      <Row gutter={block.gap || 24}>
        {block.innerBlocks.map((innerBlocks, colIndex) => (
          <Col key={colIndex} span={colSpan}>
            <div className="column-content">
              {innerBlocks.map((innerBlock) => (
                <BlockContent key={innerBlock.id} block={innerBlock} />
              ))}
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ColumnsBlock;
