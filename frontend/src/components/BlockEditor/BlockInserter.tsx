import React, { useState } from 'react';
import { Popover, Button, Input, Tabs, Space, Typography, Card, Row, Col } from 'antd';
import {
  PlusOutlined,
  FontSizeOutlined,
  PictureOutlined,
  UnorderedListOutlined,
  CodeOutlined,
  MinusOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  TableOutlined,
  FolderOutlined,
  FileOutlined,
  SoundOutlined,
  VideoCameraOutlined,
  CodeFilled,
  MessageOutlined,
  MenuOutlined,
  AppstoreOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { BlockType, BLOCK_CATEGORIES } from '../../types/blocks';
import './BlockInserter.css';

const { TabPane } = Tabs;
const { Search } = Input;
const { Text } = Typography;

interface BlockInserterProps {
  onAdd: (type: BlockType) => void;
  afterId?: string;
  position?: 'top' | 'bottom';
}

const BLOCK_TYPES: Array<{
  type: BlockType;
  name: string;
  icon: React.ReactNode;
  category: string;
  description: string;
}> = [
  { type: 'paragraph', name: 'Paragraph', icon: <FontSizeOutlined />, category: 'text', description: 'Start with a paragraph' },
  { type: 'heading', name: 'Heading', icon: <FontSizeOutlined />, category: 'text', description: 'Add a heading' },
  { type: 'quote', name: 'Quote', icon: <MessageOutlined />, category: 'text', description: 'Insert a quote' },
  { type: 'list', name: 'List', icon: <UnorderedListOutlined />, category: 'text', description: 'Create a bulleted or numbered list' },
  { type: 'code', name: 'Code', icon: <CodeOutlined />, category: 'text', description: 'Add code snippets' },
  { type: 'table', name: 'Table', icon: <TableOutlined />, category: 'text', description: 'Insert a table' },
  
  { type: 'image', name: 'Image', icon: <PictureOutlined />, category: 'media', description: 'Insert an image' },
  { type: 'gallery', name: 'Gallery', icon: <AppstoreOutlined />, category: 'media', description: 'Create an image gallery' },
  { type: 'video', name: 'Video', icon: <VideoCameraOutlined />, category: 'media', description: 'Embed or upload a video' },
  { type: 'audio', name: 'Audio', icon: <SoundOutlined />, category: 'media', description: 'Embed or upload audio' },
  { type: 'file', name: 'File', icon: <FileOutlined />, category: 'media', description: 'Add a downloadable file' },
  
  { type: 'divider', name: 'Divider', icon: <MinusOutlined />, category: 'design', description: 'Add a horizontal line' },
  { type: 'spacer', name: 'Spacer', icon: <FolderOutlined />, category: 'design', description: 'Add vertical space' },
  { type: 'columns', name: 'Columns', icon: <AppstoreOutlined />, category: 'design', description: 'Create multi-column layout' },
  { type: 'button', name: 'Button', icon: <PlusOutlined />, category: 'design', description: 'Add a call-to-action button' },
  { type: 'html', name: 'Custom HTML', icon: <CodeFilled />, category: 'design', description: 'Add custom HTML code' },
  
  { type: 'embed', name: 'Embed', icon: <LinkOutlined />, category: 'embed', description: 'Embed external content' },
  { type: 'playcircle', name: 'Video Embed', icon: <PlayCircleOutlined />, category: 'embed', description: 'Embed YouTube, Vimeo, etc.' },
  
  { type: 'callout', name: 'Callout', icon: <MessageOutlined />, category: 'widgets', description: 'Add a highlighted notice' },
  { type: 'accordion', name: 'Accordion', icon: <MenuOutlined />, category: 'widgets', description: 'Create collapsible sections' },
  { type: 'tabs', name: 'Tabs', icon: <FolderOutlined />, category: 'widgets', description: 'Create tabbed content' },
];

const BlockInserter: React.FC<BlockInserterProps> = ({ onAdd, position = 'bottom' }) => {
  const [visible, setVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBlocks = BLOCK_TYPES.filter(block =>
    block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBlocks = BLOCK_CATEGORIES.reduce((acc, category) => {
    acc[category.id] = filteredBlocks.filter(block => block.category === category.id);
    return acc;
  }, {} as Record<string, typeof BLOCK_TYPES>);

  const handleAdd = (type: BlockType) => {
    onAdd(type);
    setVisible(false);
    setSearchTerm('');
  };

  const content = (
    <div className="block-inserter-content">
      <Search
        placeholder="Search blocks..."
        onChange={(e) => setSearchTerm(e.target.value)}
        value={searchTerm}
        className="block-search"
        autoFocus
      />
      
      <Tabs defaultActiveKey="text" size="small">
        {BLOCK_CATEGORIES.map(category => (
          <TabPane 
            tab={<span>{category.name}</span>} 
            key={category.id}
          >
            <Row gutter={[8, 8]}>
              {groupedBlocks[category.id]?.map(block => (
                <Col span={12} key={block.type}>
                  <Card
                    hoverable
                    size="small"
                    className="block-type-card"
                    onClick={() => handleAdd(block.type)}
                  >
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Space>
                        <span className="block-icon">{block.icon}</span>
                        <Text strong>{block.name}</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {block.description}
                      </Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>
        ))}
      </Tabs>
    </div>
  );

  return (
    <div className={`block-inserter block-inserter-${position}`}>
      <Popover
        content={content}
        trigger="click"
        placement="rightTop"
        open={visible}
        onOpenChange={setVisible}
        overlayClassName="block-inserter-popover"
      >
        <Button 
          type="text" 
          className="block-inserter-button"
          icon={<PlusOutlined />}
          shape="circle"
          size="small"
        />
      </Popover>
    </div>
  );
};

export default BlockInserter;
