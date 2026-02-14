import React from 'react';
import { Select, Input, Divider, Typography } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { HeadingBlock, HeadingLevel, TextAlignment } from '../../../types/blocks';

const LEVEL_OPTIONS = [
  { value: 1, label: 'H1 - Main Title' },
  { value: 2, label: 'H2 - Section' },
  { value: 3, label: 'H3 - Subsection' },
  { value: 4, label: 'H4 - Sub-subsection' },
  { value: 5, label: 'H5 - Minor heading' },
  { value: 6, label: 'H6 - Smallest heading' },
];

const ALIGNMENT_OPTIONS: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

interface HeadingSettingsProps {
  block: HeadingBlock;
}

const HeadingSettings: React.FC<HeadingSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Level</label>
        <Select
          value={block.level}
          onChange={(level) => updateBlock(block.id, { level })}
          options={LEVEL_OPTIONS}
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

      <Divider style={{ margin: '12px 0' }} />

      <div className="settings-field">
        <label>Anchor ID</label>
        <Input
          value={block.anchor || ''}
          onChange={(e) => updateBlock(block.id, { anchor: e.target.value })}
          placeholder="my-anchor"
        />
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          Used for deep linking to this heading
        </Typography.Text>
      </div>
    </div>
  );
};

export default HeadingSettings;
