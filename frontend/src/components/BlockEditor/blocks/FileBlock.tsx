import React from 'react';
import { Button, Typography } from 'antd';
import { DownloadOutlined, FileOutlined } from '@ant-design/icons';
import type { FileBlock as FileBlockType } from '../../../types/blocks';
import './BlockComponents.css';

interface FileBlockProps {
  block: FileBlockType;
}

const FileBlock: React.FC<FileBlockProps> = ({ block }) => {
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (!block.src) {
    return <div className="block-file-empty">Click to add file</div>;
  }

  return (
    <div className={`block-file align-${block.alignment || 'left'}`}>
      <FileOutlined style={{ fontSize: 32, marginRight: 12 }} />
      <div className="file-info">
        <Typography.Text strong>{block.fileName || 'Download file'}</Typography.Text>
        {block.fileSize && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatSize(block.fileSize)}
          </Typography.Text>
        )}
      </div>
      <Button icon={<DownloadOutlined />} href={block.src} download>
        Download
      </Button>
    </div>
  );
};

export default FileBlock;
