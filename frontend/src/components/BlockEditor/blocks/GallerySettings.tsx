import React from 'react';
import { Form, Input, Select, Switch, Slider } from 'antd';
import { Block } from '../../../types/blocks';

interface GallerySettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

const GallerySettings: React.FC<GallerySettingsProps> = ({ block, onUpdate }) => {
  return (
    <div>
      <Form.Item label="Columns">
        <Slider
          min={1}
          max={6}
          value={(block as any).columns || 3}
          onChange={(value) => onUpdate({ columns: value } as Partial<Block>)}
        />
      </Form.Item>
      <Form.Item label="Gap">
        <Slider
          min={0}
          max={32}
          value={(block as any).gap || 16}
          onChange={(value) => onUpdate({ gap: value } as Partial<Block>)}
        />
      </Form.Item>
      <Form.Item label="Show Captions">
        <Switch
          checked={(block as any).showCaptions || false}
          onChange={(checked) => onUpdate({ showCaptions: checked } as Partial<Block>)}
        />
      </Form.Item>
    </div>
  );
};

export default GallerySettings;
