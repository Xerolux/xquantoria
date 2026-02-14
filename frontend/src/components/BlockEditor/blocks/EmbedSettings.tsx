import React from 'react';
import { Input, Select, InputNumber } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { EmbedBlock } from '../../../types/blocks';

const PROVIDER_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'custom', label: 'Custom Embed' },
];

interface EmbedSettingsProps {
  block: EmbedBlock;
}

const EmbedSettings: React.FC<EmbedSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Provider</label>
        <Select
          value={block.provider || 'youtube'}
          onChange={(provider) => updateBlock(block.id, { provider })}
          options={PROVIDER_OPTIONS}
          style={{ width: '100%' }}
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

      <div className="settings-field">
        <label>Custom Embed Code (optional)</label>
        <Input.TextArea
          value={block.embedCode || ''}
          onChange={(e) => updateBlock(block.id, { embedCode: e.target.value })}
          placeholder="<iframe>..."
          rows={3}
        />
      </div>

      <div className="settings-row">
        <div className="settings-field">
          <label>Width</label>
          <InputNumber
            value={block.width || 640}
            onChange={(width) => updateBlock(block.id, { width })}
            min={100}
          />
        </div>
        <div className="settings-field">
          <label>Height</label>
          <InputNumber
            value={block.height || 360}
            onChange={(height) => updateBlock(block.id, { height })}
            min={100}
          />
        </div>
      </div>

      <div className="settings-field">
        <label>Caption</label>
        <Input
          value={block.caption || ''}
          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
          placeholder="Embed caption..."
        />
      </div>
    </div>
  );
};

export default EmbedSettings;
