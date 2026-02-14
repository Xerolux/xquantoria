import React from 'react';
import { Card, Typography, Button, Space, Divider } from 'antd';
import { EyeInvisibleOutlined } from '@ant-design/icons';
import { Block, blockToHtml } from '../../types/blocks';
import './BlockPreview.css';

const { Title, Text } = Typography;

interface BlockPreviewProps {
  blocks: Block[];
  onExit: () => void;
}

const BlockPreview: React.FC<BlockPreviewProps> = ({ blocks, onExit }) => {
  const renderBlock = (block: Block) => {
    if (block.hidden) return null;

    const htmlContent = blockToHtml(block);
    
    return (
      <div 
        key={block.id} 
        className="preview-block"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  };

  const fullHtml = blocks
    .filter(b => !b.hidden)
    .map(blockToHtml)
    .join('\n');

  return (
    <div className="block-preview">
      <div className="preview-toolbar">
        <Space>
          <Text strong>Preview Mode</Text>
          <Divider type="vertical" />
          <Text type="secondary">{blocks.length} blocks</Text>
        </Space>
        <Button icon={<EyeInvisibleOutlined />} onClick={onExit}>
          Exit Preview
        </Button>
      </div>
      
      <div className="preview-content">
        {blocks.length === 0 ? (
          <div className="preview-empty">
            <Text type="secondary">No content to preview</Text>
          </div>
        ) : (
          <div className="preview-article">
            {blocks.map(renderBlock)}
          </div>
        )}
      </div>

      <div className="preview-html-toggle">
        <details>
          <summary>View Raw HTML</summary>
          <pre className="preview-html-code">{fullHtml}</pre>
        </details>
      </div>
    </div>
  );
};

export default BlockPreview;
