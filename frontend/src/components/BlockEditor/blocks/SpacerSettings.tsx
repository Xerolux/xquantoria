import React from 'react';
import { InputNumber, Switch } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { SpacerBlock } from '../../../types/blocks';

interface SpacerSettingsProps {
  block: SpacerBlock;
}

const SpacerSettings: React.FC<SpacerSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Height (px)</label>
        <InputNumber
          value={block.height || 30}
          onChange={(height) => updateBlock(block.id, { height })}
          min={0}
          max={500}
          style={{ width: '100%' }}
        />
      </div>

      <div className="settings-field inline">
        <label>Show Divider</label>
        <Switch
          checked={block.showDivider || false}
          onChange={(showDivider) => updateBlock(block.id, { showDivider })}
        />
      </div>
    </div>
  );
};

export default SpacerSettings;
