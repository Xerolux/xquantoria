import React from 'react';
import { Form, Slider } from 'antd';
import { Block } from '../../../types/blocks';

interface ColumnsSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

const ColumnsSettings: React.FC<ColumnsSettingsProps> = ({ block, onUpdate }) => {
  return (
    <div>
      <Form.Item label="Number of Columns">
        <Slider
          min={2}
          max={6}
          value={(block as any).columnCount || 2}
          onChange={(value) => onUpdate({ columnCount: value } as Partial<Block>)}
        />
      </Form.Item>
      <Form.Item label="Gap">
        <Slider
          min={0}
          max={48}
          value={(block as any).gap || 24}
          onChange={(value) => onUpdate({ gap: value } as Partial<Block>)}
        />
      </Form.Item>
    </div>
  );
};

export default ColumnsSettings;
