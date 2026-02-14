import React from 'react';
import { Input } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { HtmlBlock } from '../../../types/blocks';

interface HtmlSettingsProps {
  block: HtmlBlock;
}

const HtmlSettings: React.FC<HtmlSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>HTML Code</label>
        <Input.TextArea
          value={block.content}
          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
          placeholder="<div>Your HTML here...</div>"
          rows={10}
          style={{ fontFamily: 'monospace' }}
        />
      </div>
    </div>
  );
};

export default HtmlSettings;
