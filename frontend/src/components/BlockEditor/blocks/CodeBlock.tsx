import React from 'react';
import { Typography } from 'antd';
import type { CodeBlock as CodeBlockType } from '../../../types/blocks';
import './BlockComponents.css';

interface CodeBlockProps {
  block: CodeBlockType;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ block }) => {
  return (
    <div className={`block-code theme-${block.theme || 'dark'}`}>
      {block.fileName && (
        <div className="code-filename">{block.fileName}</div>
      )}
      <pre className={`language-${block.language || 'text'} ${block.showLineNumbers ? 'line-numbers' : ''}`}>
        <code>{block.code || '// Click to add code...'}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
