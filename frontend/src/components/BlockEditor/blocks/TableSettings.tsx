import React from 'react';
import { Input, Switch, Divider } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { TableBlock } from '../../../types/blocks';

interface TableSettingsProps {
  block: TableBlock;
}

const TableSettings: React.FC<TableSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Caption</label>
        <Input
          value={block.caption || ''}
          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
          placeholder="Table caption..."
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className="settings-field inline">
        <label>Has Header Row</label>
        <Switch
          checked={block.hasHeader}
          onChange={(hasHeader) => updateBlock(block.id, { hasHeader })}
        />
      </div>

      <div className="settings-field inline">
        <label>Striped Rows</label>
        <Switch
          checked={block.striped}
          onChange={(striped) => updateBlock(block.id, { striped })}
        />
      </div>

      <div className="settings-field inline">
        <label>Bordered</label>
        <Switch
          checked={block.bordered}
          onChange={(bordered) => updateBlock(block.id, { bordered })}
        />
      </div>
    </div>
  );
};

export default TableSettings;
