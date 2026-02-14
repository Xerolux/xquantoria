import React from 'react';
import { Input, Select, InputNumber, Divider } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { ButtonBlock, TextAlignment } from '../../../types/blocks';

const STYLE_OPTIONS = [
  { value: 'primary', label: 'Primary (Solid)' },
  { value: 'secondary', label: 'Secondary (Default)' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const ALIGNMENT_OPTIONS: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

interface ButtonSettingsProps {
  block: ButtonBlock;
}

const ButtonSettings: React.FC<ButtonSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Button Text</label>
        <Input
          value={block.text}
          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
          placeholder="Click me..."
        />
      </div>

      <div className="settings-field">
        <label>URL</label>
        <Input
          value={block.url}
          onChange={(e) => updateBlock(block.id, { url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className="settings-field">
        <label>Style</label>
        <Select
          value={block.style || 'primary'}
          onChange={(style) => updateBlock(block.id, { style })}
          options={STYLE_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      <div className="settings-field">
        <label>Size</label>
        <Select
          value={block.size || 'medium'}
          onChange={(size) => updateBlock(block.id, { size })}
          options={SIZE_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      <div className="settings-field">
        <label>Alignment</label>
        <Select
          value={block.alignment || 'left'}
          onChange={(alignment) => updateBlock(block.id, { alignment })}
          options={ALIGNMENT_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      <div className="settings-field">
        <label>Border Radius (px)</label>
        <InputNumber
          value={block.borderRadius ?? 4}
          onChange={(borderRadius) => updateBlock(block.id, { borderRadius })}
          min={0}
          max={50}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default ButtonSettings;
