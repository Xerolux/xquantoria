import React from 'react';
import { Form, Switch, Slider } from 'antd';
import { Block } from '../../../types/blocks';

interface AudioSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({ block, onUpdate }) => {
  return (
    <div>
      <Form.Item label="Autoplay">
        <Switch
          checked={(block as any).autoplay || false}
          onChange={(checked) => onUpdate({ autoplay: checked } as Partial<Block>)}
        />
      </Form.Item>
      <Form.Item label="Loop">
        <Switch
          checked={(block as any).loop || false}
          onChange={(checked) => onUpdate({ loop: checked } as Partial<Block>)}
        />
      </Form.Item>
      <Form.Item label="Controls">
        <Switch
          checked={(block as any).controls !== false}
          onChange={(checked) => onUpdate({ controls: checked } as Partial<Block>)}
        />
      </Form.Item>
    </div>
  );
};

export default AudioSettings;
