import React from 'react';
import { Input, Select, Divider } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { QuoteBlock, QuoteStyle, TextAlignment } from '../../../types/blocks';

const STYLE_OPTIONS: { value: QuoteStyle; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'pull', label: 'Pull Quote' },
  { value: 'boxed', label: 'Boxed' },
];

const ALIGNMENT_OPTIONS: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

interface QuoteSettingsProps {
  block: QuoteBlock;
}

const QuoteSettings: React.FC<QuoteSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Quote Text</label>
        <Input.TextArea
          value={block.content}
          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
          placeholder="Enter quote..."
          rows={3}
        />
      </div>

      <div className="settings-field">
        <label>Author</label>
        <Input
          value={block.author || ''}
          onChange={(e) => updateBlock(block.id, { author: e.target.value })}
          placeholder="Author name..."
        />
      </div>

      <div className="settings-field">
        <label>Source</label>
        <Input
          value={block.source || ''}
          onChange={(e) => updateBlock(block.id, { source: e.target.value })}
          placeholder="Book, Article, etc..."
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className="settings-field">
        <label>Style</label>
        <Select
          value={block.style || 'default'}
          onChange={(style) => updateBlock(block.id, { style })}
          options={STYLE_OPTIONS}
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
    </div>
  );
};

export default QuoteSettings;
