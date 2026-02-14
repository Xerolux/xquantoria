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
}

const BlockSettings: React.FC<BlockSettingsProps> = ({ block }) => {
  switch (block.type) {
    case 'paragraph':
      return <ParagraphSettings block={block} />;
    case 'heading':
      return <HeadingSettings block={block} />;
    case 'image':
      return <ImageSettings block={block} />;
    case 'gallery':
      return <GallerySettings block={block} />;
    case 'quote':
      return <QuoteSettings block={block} />;
    case 'code':
      return <CodeSettings block={block} />;
    case 'list':
      return <ListSettings block={block} />;
    case 'divider':
      return <DividerSettings block={block} />;
    case 'spacer':
      return <SpacerSettings block={block} />;
    case 'button':
      return <ButtonSettings block={block} />;
    case 'callout':
      return <CalloutSettings block={block} />;
    case 'embed':
      return <EmbedSettings block={block} />;
    case 'html':
      return <HtmlSettings block={block} />;
    case 'table':
      return <TableSettings block={block} />;
    case 'video':
      return <VideoSettings block={block} />;
    case 'audio':
      return <AudioSettings block={block} />;
    case 'file':
      return <FileSettings block={block} />;
    case 'columns':
      return <ColumnsSettings block={block} />;
    case 'accordion':
      return <AccordionSettings block={block} />;
    case 'tabs':
      return <TabsSettings block={block} />;
    default:
      return <div>No settings available</div>;
  }
};

export default BlockSettings;
