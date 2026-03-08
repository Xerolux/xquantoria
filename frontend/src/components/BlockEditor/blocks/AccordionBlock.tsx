import React from 'react';
import { Collapse, Typography } from 'antd';
import type { AccordionBlock as AccordionBlockType } from '../../../types/blocks';
import './BlockComponents.css';

interface AccordionBlockProps {
  block: AccordionBlockType;
}

const AccordionBlock: React.FC<AccordionBlockProps> = ({ block }) => {
  if (!block.items || block.items.length === 0) {
    return <div className="block-accordion-empty">Click to add accordion items</div>;
  }

  return (
    <div className="block-accordion">
      <Collapse
        accordion={!block.allowMultiple}
        defaultActiveKey={block.items.filter(i => i.open).map(i => i.id)}
      >
        {block.items.map((item) => (
          <Collapse.Panel key={item.id} header={item.title}>
            <Typography.Text>{item.content}</Typography.Text>
          </Collapse.Panel>
        ))}
      </Collapse>
    </div>
  );
};

export default AccordionBlock;
