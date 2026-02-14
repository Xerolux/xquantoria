import React from 'react';
import { Input, Select, InputNumber, Divider } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { ImageBlock, TextAlignment } from '../../../types/blocks';

const SIZE_OPTIONS = [
  { value: 'thumbnail', label: 'Thumbnail (150px)' },
  { value: 'medium', label: 'Medium (300px)' },
  { value: 'large', label: 'Large (1024px)' },
  { value: 'full', label: 'Full Size' },
  { value: 'custom', label: 'Custom' },
];

const ALIGNMENT_OPTIONS: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

interface ImageSettingsProps {
  block: ImageBlock;
}

const ImageSettings: React.FC<ImageSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Image URL</label>
        <Input
          value={block.src}
          onChange={(e) => updateBlock(block.id, { src: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="settings-field">
        <label>Alt Text</label>
        <Input
          value={block.alt}
          onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
          placeholder="Describe the image..."
        />
      </div>

      <div className="settings-field">
        <label>Caption</label>
        <Input
          value={block.caption || ''}
          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
          placeholder="Image caption..."
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className="settings-field">
        <label>Size</label>
        <Select
          value={block.size || 'large'}
          onChange={(size) => updateBlock(block.id, { size })}
          options={SIZE_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      {block.size === 'custom' && (
        <div className="settings-row">
          <div className="settings-field">
            <label>Width (px)</label>
            <InputNumber
              value={block.width}
              onChange={(width) => updateBlock(block.id, { width })}
              min={1}
            />
          </div>
          <div className="settings-field">
            <label>Height (px)</label>
            <InputNumber
              value={block.height}
              onChange={(height) => updateBlock(block.id, { height })}
              min={1}
            />
          </div>
        </div>
      )}

      <div className="settings-field">
        <label>Alignment</label>
        <Select
          value={block.alignment || 'center'}
          onChange={(alignment) => updateBlock(block.id, { alignment })}
          options={ALIGNMENT_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className="settings-field">
        <label>Link URL</label>
        <Input
          value={block.linkUrl || ''}
          onChange={(e) => updateBlock(block.id, { linkUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="settings-field">
        <label>Border Radius (px)</label>
        <InputNumber
          value={block.borderRadius || 0}
          onChange={(borderRadius) => updateBlock(block.id, { borderRadius })}
          min={0}
          max={50}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default ImageSettings;
