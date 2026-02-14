import React from 'react';
import { Tabs, Typography } from 'antd';
import { TabsBlock } from '../../../types/blocks';
import './BlockComponents.css';

interface TabsBlockProps {
  block: TabsBlock;
}

const TabsBlock: React.FC<TabsBlockProps> = ({ block }) => {
  if (!block.tabs || block.tabs.length === 0) {
    return <div className="block-tabs-empty">Click to add tabs</div>;
  }

  const items = block.tabs.map((tab) => ({
    key: tab.id,
    label: tab.label,
    children: <Typography.Text>{tab.content}</Typography.Text>,
  }));

  return (
    <div className="block-tabs">
      <Tabs
        defaultActiveKey={block.activeTab || block.tabs[0]?.id}
        tabPosition={block.position || 'top'}
        items={items}
      />
    </div>
  );
};

export default TabsBlock;
