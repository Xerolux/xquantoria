import React from 'react';
import { Select, InputNumber, ColorPicker, Divider } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { DividerBlock } from '../../../types/blocks';

const STYLE_OPTIONS = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'gradient', label: 'Gradient' },
];

const WIDTH_OPTIONS = [
  { value: 'full', label: 'Full Width' },
  { value: 'wide', label: 'Wide (80%)' },
  { value: 'centered', label: 'Centered (50%)' },
];

interface DividerSettingsProps {
  block: DividerBlock;
}

const DividerSettings: React.FC<DividerSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Style</label>
        <Select
          value={block.style || 'solid'}
          onChange={(style) => updateBlock(block.id, { style })}
          options={STYLE_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      <div className="settings-field">
        <label>Width</label>
        <Select
          value={block.width || 'full'}
          onChange={(width) => updateBlock(block.id, { width })}
          options={WIDTH_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      <div className="settings-field">
        <label>Thickness (px)</label>
        <InputNumber
          value={block.thickness || 1}
          onChange={(thickness) => updateBlock(block.id, { thickness })}
          min={1}
          max={10}
          style={{ width: '100%' }}
        />
      </div>

      <div className="settings-field">
        <label>Color</label>
        <input 
          type="color" 
          value={block.color || '#d9d9d9'}
          onChange={(e) => updateBlock(block.id, { color: e.target.value })}
          style={{ width: '100%', height: 32 }}
        />
      </div>
    </div>
  );
};

export default DividerSettings;
