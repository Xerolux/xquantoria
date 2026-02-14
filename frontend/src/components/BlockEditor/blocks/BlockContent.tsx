import React from 'react';
import { Block } from '../../types/blocks';
import ParagraphBlock from './ParagraphBlock';
import HeadingBlock from './HeadingBlock';
import ImageBlock from './ImageBlock';
import QuoteBlock from './QuoteBlock';
import CodeBlock from './CodeBlock';
import ListBlock from './ListBlock';
import DividerBlock from './DividerBlock';
import SpacerBlock from './SpacerBlock';
import ButtonBlock from './ButtonBlock';
import CalloutBlock from './CalloutBlock';
import EmbedBlock from './EmbedBlock';
import HtmlBlock from './HtmlBlock';
import TableBlock from './TableBlock';
import GalleryBlock from './GalleryBlock';
import VideoBlock from './VideoBlock';
import AudioBlock from './AudioBlock';
import FileBlock from './FileBlock';
import ColumnsBlock from './ColumnsBlock';
import AccordionBlock from './AccordionBlock';
import TabsBlock from './TabsBlock';

interface BlockContentProps {
  block: Block;
}

const BlockContent: React.FC<BlockContentProps> = ({ block }) => {
  switch (block.type) {
    case 'paragraph':
      return <ParagraphBlock block={block} />;
    case 'heading':
      return <HeadingBlock block={block} />;
    case 'image':
      return <ImageBlock block={block} />;
    case 'gallery':
      return <GalleryBlock block={block} />;
    case 'quote':
      return <QuoteBlock block={block} />;
    case 'code':
      return <CodeBlock block={block} />;
    case 'list':
      return <ListBlock block={block} />;
    case 'divider':
      return <DividerBlock block={block} />;
    case 'spacer':
      return <SpacerBlock block={block} />;
    case 'button':
      return <ButtonBlock block={block} />;
    case 'callout':
      return <CalloutBlock block={block} />;
    case 'embed':
      return <EmbedBlock block={block} />;
    case 'html':
      return <HtmlBlock block={block} />;
    case 'table':
      return <TableBlock block={block} />;
    case 'video':
      return <VideoBlock block={block} />;
    case 'audio':
      return <AudioBlock block={block} />;
    case 'file':
      return <FileBlock block={block} />;
    case 'columns':
      return <ColumnsBlock block={block} />;
    case 'accordion':
      return <AccordionBlock block={block} />;
    case 'tabs':
      return <TabsBlock block={block} />;
    default:
      return <div className="block-unknown">Unknown block type: {(block as any).type}</div>;
  }
};

export default BlockContent;
