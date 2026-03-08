import React from 'react';
import { Form, Switch, Input } from 'antd';
import { Block } from '../../../types/blocks';

interface AccordionSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

const AccordionSettings: React.FC<AccordionSettingsProps> = ({ block, onUpdate }) => {
  return (
    <div>
      <Form.Item label="Allow Multiple Open">
        <Switch
          checked={(block as any).allowMultiple || false}
          onChange={(checked) => onUpdate({ allowMultiple: checked } as Partial<Block>)}
        />
      </Form.Item>
      <Form.Item label="Default Expanded">
        <Switch
          checked={(block as any).defaultExpanded || false}
          onChange={(checked) => onUpdate({ defaultExpanded: checked } as Partial<Block>)}
        />
      </Form.Item>
    </div>
  );
};

export default AccordionSettings;
