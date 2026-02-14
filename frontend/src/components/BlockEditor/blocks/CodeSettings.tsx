import React from 'react';
import { Input, Select, Switch, Divider } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { CodeBlock } from '../../../types/blocks';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'php', 'ruby', 'go', 'rust',
  'java', 'csharp', 'cpp', 'c', 'swift', 'kotlin', 'scala',
  'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml',
  'sql', 'graphql', 'bash', 'shell', 'powershell', 'docker',
  'markdown', 'plaintext'
];

interface CodeSettingsProps {
  block: CodeBlock;
}

const CodeSettings: React.FC<CodeSettingsProps> = ({ block }) => {
  const { updateBlock } = useBlockEditorStore();

  return (
    <div className="block-settings-form">
      <div className="settings-field">
        <label>Code</label>
        <Input.TextArea
          value={block.code}
          onChange={(e) => updateBlock(block.id, { code: e.target.value })}
          placeholder="Paste your code..."
          rows={6}
          style={{ fontFamily: 'monospace' }}
        />
      </div>

      <div className="settings-field">
        <label>Language</label>
        <Select
          value={block.language || 'javascript'}
          onChange={(language) => updateBlock(block.id, { language })}
          options={LANGUAGES.map(lang => ({ value: lang, label: lang }))}
          style={{ width: '100%' }}
          showSearch
        />
      </div>

      <div className="settings-field">
        <label>File Name</label>
        <Input
          value={block.fileName || ''}
          onChange={(e) => updateBlock(block.id, { fileName: e.target.value })}
          placeholder="example.js"
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className="settings-field inline">
        <label>Show Line Numbers</label>
        <Switch
          checked={block.showLineNumbers !== false}
          onChange={(showLineNumbers) => updateBlock(block.id, { showLineNumbers })}
        />
      </div>

      <div className="settings-field">
        <label>Theme</label>
        <Select
          value={block.theme || 'dark'}
          onChange={(theme) => updateBlock(block.id, { theme })}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default CodeSettings;
