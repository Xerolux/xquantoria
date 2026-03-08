import React from 'react';
import { Form, Input, Select } from 'antd';
import { Block } from '../../../types/blocks';

interface FileSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

const FileSettings: React.FC<FileSettingsProps> = ({ block, onUpdate }) => {
  return (
    <div>
      <Form.Item label="Download Text">
        <Input
          value={(block as any).downloadText || 'Download'}
          onChange={(e) => onUpdate({ downloadText: e.target.value } as Partial<Block>)}
        />
      </Form.Item>
      <Form.Item label="Open In">
        <Select
          value={(block as any).target || '_blank'}
          onChange={(value) => onUpdate({ target: value } as Partial<Block>)}
          options={[
            { value: '_blank', label: 'New Tab' },
            { value: '_self', label: 'Same Tab' },
          ]}
        />
      </Form.Item>
    </div>
  );
};

export default FileSettings;
