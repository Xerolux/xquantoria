import React from 'react';
import { Card, Typography, Divider, Empty, Tabs } from 'antd';
import { useBlockEditorStore } from '../../store/blockEditorStore';
import { Block } from '../../types/blocks';
import BlockSettings from './blocks/BlockSettings';
import './BlockSettingsPanel.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface BlockSettingsPanelProps {
  blockId: string;
}

const BlockSettingsPanel: React.FC<BlockSettingsPanelProps> = ({ blockId }) => {
  const { blocks } = useBlockEditorStore();
  const block = blocks.find(b => b.id === blockId);

  if (!block) {
    return (
      <Card className="block-settings-panel">
        <Empty description="No block selected" />
      </Card>
    );
  }

  return (
    <Card className="block-settings-panel" size="small">
      <div className="block-settings-header">
        <Title level={5} style={{ margin: 0, textTransform: 'capitalize' }}>
          {block.type} Block
        </Title>
        <Text type="secondary" style={{ fontSize: 11 }}>
          ID: {block.id.slice(-8)}
        </Text>
      </div>
      
      <Divider style={{ margin: '12px 0' }} />

      <Tabs defaultActiveKey="settings" size="small">
        <TabPane tab="Settings" key="settings">
          <BlockSettings block={block} />
        </TabPane>
        <TabPane tab="Advanced" key="advanced">
          <div className="block-advanced-settings">
            <Text type="secondary">
              Advanced settings like custom CSS classes, 
              animations, and conditional visibility.
            </Text>
          </div>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default BlockSettingsPanel;
