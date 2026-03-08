import React from 'react';
import { Form, Switch, Select } from 'antd';
import { Block } from '../../../types/blocks';

interface TabsSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

const TabsSettings: React.FC<TabsSettingsProps> = ({ block, onUpdate }) => {
  return (
    <div>
      <Form.Item label="Tab Position">
        <Select
          value={(block as any).tabPosition || 'top'}
          onChange={(value) => onUpdate({ tabPosition: value } as Partial<Block>)}
          options={[
            { value: 'top', label: 'Top' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'bottom', label: 'Bottom' },
          ]}
        />
      </Form.Item>
      <Form.Item label="Animated">
        <Switch
          checked={(block as any).animated !== false}
          onChange={(checked) => onUpdate({ animated: checked } as Partial<Block>)}
        />
      </Form.Item>
    </div>
  );
};

export default TabsSettings;
