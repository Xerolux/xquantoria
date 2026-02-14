import React from 'react';
import { Select, Switch, Input, Divider } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { CalloutBlock } from '../../../types/blocks';

const VARIANT_OPTIONS = [
  { value: 'info', label: 'Info (Blue)' },
  { value: 'warning', label: 'Warning (Yellow)' },
  { value: 'error', label: 'Error (Red)' },
  { value: 'success', label: 'Success (Green)' },
  { value: 'neutral', label: 'Neutral (Gray)' },
];

interface CalloutSettingsProps {
  block: CalloutBlock;
}

const CalloutSettings: React.FC<CalloutSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Title</label>
        <Input
          value={block.title || ''}
          onChange={(e) => updateBlock(block.id, { title: e.target.value })}
          placeholder="Callout title..."
        />
      </div>

      <div className="settings-field">
        <label>Content</label>
        <Input.TextArea
          value={block.content}
          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
          placeholder="Callout content..."
          rows={3}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className="settings-field">
        <label>Variant</label>
        <Select
          value={block.variant || 'info'}
          onChange={(variant) => updateBlock(block.id, { variant })}
          options={VARIANT_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      <div className="settings-field inline">
        <label>Dismissible</label>
        <Switch
          checked={block.dismissible || false}
          onChange={(dismissible) => updateBlock(block.id, { dismissible })}
        />
      </div>
    </div>
  );
};

export default CalloutSettings;
