import React from 'react';
import { Select, InputNumber, Switch, Divider } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { ListBlock, ListStyle } from '../../../types/blocks';

const STYLE_OPTIONS: { value: ListStyle; label: string }[] = [
  { value: 'unordered', label: 'Bulleted' },
  { value: 'ordered', label: 'Numbered' },
  { value: 'checklist', label: 'Checklist' },
];

interface ListSettingsProps {
  block: ListBlock;
}

const ListSettings: React.FC<ListSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>List Style</label>
        <Select
          value={block.style}
          onChange={(style) => updateBlock(block.id, { style })}
          options={STYLE_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      {block.style === 'ordered' && (
        <>
          <div className="settings-field">
            <label>Start Number</label>
            <InputNumber
              value={block.startNumber || 1}
              onChange={(startNumber) => updateBlock(block.id, { startNumber })}
              min={1}
              style={{ width: '100%' }}
            />
          </div>

          <div className="settings-field inline">
            <label>Reversed</label>
            <Switch
              checked={block.reversed || false}
              onChange={(reversed) => updateBlock(block.id, { reversed })}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ListSettings;
