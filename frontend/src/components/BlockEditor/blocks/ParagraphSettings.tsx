import React, { useCallback } from 'react';
import { Input, Select, Switch, Divider } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { ParagraphBlock, TextAlignment } from '../../../types/blocks';

const ALIGNMENT_OPTIONS: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small (14px)' },
  { value: 'normal', label: 'Normal (16px)' },
  { value: 'large', label: 'Large (18px)' },
  { value: 'xl', label: 'Extra Large (20px)' },
];

interface ParagraphSettingsProps {
  block: ParagraphBlock;
}

const ParagraphSettings: React.FC<ParagraphSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  const handleAlignmentChange = (alignment: TextAlignment) => {
    updateBlock(block.id, { alignment });
  };

  const handleFontSizeChange = (fontSize: 'small' | 'normal' | 'large' | 'xl') => {
    updateBlock(block.id, { fontSize });
  };

  const handleDropCapChange = (dropCap: boolean) => {
    updateBlock(block.id, { dropCap });
  };

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Alignment</label>
        <Select
          value={block.alignment || 'left'}
          onChange={handleAlignmentChange}
          options={ALIGNMENT_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      <div className="settings-field">
        <label>Font Size</label>
        <Select
          value={block.fontSize || 'normal'}
          onChange={handleFontSizeChange}
          options={FONT_SIZE_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className="settings-field">
        <label>Drop Cap</label>
        <Switch
          checked={block.dropCap || false}
          onChange={handleDropCapChange}
        />
      </div>
    </div>
  );
};

export default ParagraphSettings;
