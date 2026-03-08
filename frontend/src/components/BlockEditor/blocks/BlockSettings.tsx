import React from 'react';
import { Block } from '../../../types/blocks';
import ParagraphSettings from './ParagraphSettings';
import HeadingSettings from './HeadingSettings';
import ImageSettings from './ImageSettings';
import QuoteSettings from './QuoteSettings';
import CodeSettings from './CodeSettings';
import ListSettings from './ListSettings';
import DividerSettings from './DividerSettings';
import SpacerSettings from './SpacerSettings';
import ButtonSettings from './ButtonSettings';
import CalloutSettings from './CalloutSettings';
import EmbedSettings from './EmbedSettings';
import HtmlSettings from './HtmlSettings';
import TableSettings from './TableSettings';
import GallerySettings from './GallerySettings';
import VideoSettings from './VideoSettings';
import AudioSettings from './AudioSettings';
import FileSettings from './FileSettings';
import ColumnsSettings from './ColumnsSettings';
import AccordionSettings from './AccordionSettings';
import TabsSettings from './TabsSettings';

interface BlockSettingsProps {
  block: Block;
  onUpdate?: (updates: Partial<Block>) => void;
}

const BlockSettings: React.FC<BlockSettingsProps> = ({ block, onUpdate }) => {
  const handleUpdate = onUpdate || (() => {});

  switch (block.type) {
    case 'paragraph':
      return <ParagraphSettings block={block} onUpdate={handleUpdate} />;
    case 'heading':
      return <HeadingSettings block={block} onUpdate={handleUpdate} />;
    case 'image':
      return <ImageSettings block={block} onUpdate={handleUpdate} />;
    case 'gallery':
      return <GallerySettings block={block} onUpdate={handleUpdate} />;
    case 'quote':
      return <QuoteSettings block={block} onUpdate={handleUpdate} />;
    case 'code':
      return <CodeSettings block={block} onUpdate={handleUpdate} />;
    case 'list':
      return <ListSettings block={block} onUpdate={handleUpdate} />;
    case 'divider':
      return <DividerSettings block={block} onUpdate={handleUpdate} />;
    case 'spacer':
      return <SpacerSettings block={block} onUpdate={handleUpdate} />;
    case 'button':
      return <ButtonSettings block={block} onUpdate={handleUpdate} />;
    case 'callout':
      return <CalloutSettings block={block} onUpdate={handleUpdate} />;
    case 'embed':
      return <EmbedSettings block={block} onUpdate={handleUpdate} />;
    case 'html':
      return <HtmlSettings block={block} onUpdate={handleUpdate} />;
    case 'table':
      return <TableSettings block={block} onUpdate={handleUpdate} />;
    case 'video':
      return <VideoSettings block={block} onUpdate={handleUpdate} />;
    case 'audio':
      return <AudioSettings block={block} onUpdate={handleUpdate} />;
    case 'file':
      return <FileSettings block={block} onUpdate={handleUpdate} />;
    case 'columns':
      return <ColumnsSettings block={block} onUpdate={handleUpdate} />;
    case 'accordion':
      return <AccordionSettings block={block} onUpdate={handleUpdate} />;
    case 'tabs':
      return <TabsSettings block={block} onUpdate={handleUpdate} />;
    default:
      return <div>No settings available</div>;
  }
};

export default BlockSettings;
