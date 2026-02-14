export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'image'
  | 'gallery'
  | 'list'
  | 'quote'
  | 'code'
  | 'embed'
  | 'divider'
  | 'spacer'
  | 'table'
  | 'columns'
  | 'button'
  | 'file'
  | 'audio'
  | 'video'
  | 'html'
  | 'callout'
  | 'accordion'
  | 'tabs';

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type ListStyle = 'unordered' | 'ordered' | 'checklist';
export type QuoteStyle = 'default' | 'pull' | 'boxed';

export interface BlockBase {
  id: string;
  type: BlockType;
  order: number;
  settings?: Record<string, any>;
  locked?: boolean;
  hidden?: boolean;
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph';
  content: string;
  alignment?: TextAlignment;
  fontSize?: 'small' | 'normal' | 'large' | 'xl';
  dropCap?: boolean;
}

export interface HeadingBlock extends BlockBase {
  type: 'heading';
  content: string;
  level: HeadingLevel;
  alignment?: TextAlignment;
  anchor?: string;
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  src: string;
  alt: string;
  caption?: string;
  linkUrl?: string;
  linkTarget?: '_self' | '_blank';
  size?: 'thumbnail' | 'medium' | 'large' | 'full' | 'custom';
  width?: number;
  height?: number;
  alignment?: TextAlignment;
  borderRadius?: number;
}

export interface GalleryBlock extends BlockBase {
  type: 'gallery';
  images: Array<{
    id: string;
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns: number;
  layout?: 'grid' | 'masonry' | 'carousel';
  linkTo?: 'media' | 'attachment' | 'none';
  borderRadius?: number;
}

export interface ListBlock extends BlockBase {
  type: 'list';
  items: string[];
  style: ListStyle;
  startNumber?: number;
  reversed?: boolean;
}

export interface QuoteBlock extends BlockBase {
  type: 'quote';
  content: string;
  author?: string;
  source?: string;
  style?: QuoteStyle;
  alignment?: TextAlignment;
}

export interface CodeBlock extends BlockBase {
  type: 'code';
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  fileName?: string;
  theme?: 'light' | 'dark';
}

export interface EmbedBlock extends BlockBase {
  type: 'embed';
  provider: 'youtube' | 'vimeo' | 'twitter' | 'instagram' | 'facebook' | 'spotify' | 'soundcloud' | 'custom';
  url: string;
  embedCode?: string;
  width?: number;
  height?: number;
  alignment?: TextAlignment;
  caption?: string;
}

export interface DividerBlock extends BlockBase {
  type: 'divider';
  style: 'solid' | 'dashed' | 'dotted' | 'gradient';
  width?: 'full' | 'wide' | 'centered';
  color?: string;
  thickness?: number;
}

export interface SpacerBlock extends BlockBase {
  type: 'spacer';
  height: number;
  showDivider?: boolean;
}

export interface TableBlock extends BlockBase {
  type: 'table';
  rows: string[][];
  hasHeader: boolean;
  hasFooter: boolean;
  caption?: string;
  striped?: boolean;
  bordered?: boolean;
}

export interface ColumnsBlock extends BlockBase {
  type: 'columns';
  columns: number;
  layout?: 'equal' | 'sidebar-left' | 'sidebar-right' | 'custom';
  gap?: number;
  innerBlocks: Block[][];
}

export interface ButtonBlock extends BlockBase {
  type: 'button';
  text: string;
  url: string;
  target?: '_self' | '_blank';
  style?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  alignment?: TextAlignment;
  icon?: string;
  iconPosition?: 'left' | 'right';
  borderRadius?: number;
}

export interface FileBlock extends BlockBase {
  type: 'file';
  src: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  showDownloadCount?: boolean;
  alignment?: TextAlignment;
}

export interface AudioBlock extends BlockBase {
  type: 'audio';
  src: string;
  title?: string;
  artist?: string;
  album?: string;
  autoplay?: boolean;
  loop?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
}

export interface VideoBlock extends BlockBase {
  type: 'video';
  src: string;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  width?: number;
  height?: number;
  caption?: string;
}

export interface HtmlBlock extends BlockBase {
  type: 'html';
  content: string;
}

export interface CalloutBlock extends BlockBase {
  type: 'callout';
  content: string;
  title?: string;
  icon?: string;
  variant: 'info' | 'warning' | 'error' | 'success' | 'neutral';
  dismissible?: boolean;
}

export interface AccordionBlock extends BlockBase {
  type: 'accordion';
  items: Array<{
    id: string;
    title: string;
    content: string;
    open?: boolean;
  }>;
  allowMultiple?: boolean;
}

export interface TabsBlock extends BlockBase {
  type: 'tabs';
  tabs: Array<{
    id: string;
    label: string;
    content: string;
    icon?: string;
  }>;
  activeTab?: string;
  position?: 'top' | 'left' | 'right';
}

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | GalleryBlock
  | ListBlock
  | QuoteBlock
  | CodeBlock
  | EmbedBlock
  | DividerBlock
  | SpacerBlock
  | TableBlock
  | ColumnsBlock
  | ButtonBlock
  | FileBlock
  | AudioBlock
  | VideoBlock
  | HtmlBlock
  | CalloutBlock
  | AccordionBlock
  | TabsBlock;

export interface BlockTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  blocks: Block[];
  preview?: string;
}

export interface BlockCategory {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export const BLOCK_CATEGORIES: BlockCategory[] = [
  { id: 'text', name: 'Text', icon: 'FontSizeOutlined', description: 'Text blocks' },
  { id: 'media', name: 'Media', icon: 'PictureOutlined', description: 'Images, videos, audio' },
  { id: 'design', name: 'Design', icon: 'BgColorsOutlined', description: 'Layout and visual elements' },
  { id: 'widgets', name: 'Widgets', icon: 'AppstoreOutlined', description: 'Interactive elements' },
  { id: 'embed', name: 'Embeds', icon: 'LinkOutlined', description: 'External content' },
  { id: 'reusable', name: 'Reusable', icon: 'CopyOutlined', description: 'Saved blocks' },
];

export const DEFAULT_BLOCK_SETTINGS: Record<BlockType, Partial<Block>> = {
  paragraph: { type: 'paragraph', content: '', alignment: 'left', fontSize: 'normal' },
  heading: { type: 'heading', content: '', level: 2, alignment: 'left' },
  image: { type: 'image', src: '', alt: '', size: 'large', alignment: 'center' },
  gallery: { type: 'gallery', images: [], columns: 3, layout: 'grid' },
  list: { type: 'list', items: [''], style: 'unordered' },
  quote: { type: 'quote', content: '', style: 'default' },
  code: { type: 'code', code: '', language: 'javascript', showLineNumbers: true, theme: 'dark' },
  embed: { type: 'embed', provider: 'youtube', url: '', alignment: 'center' },
  divider: { type: 'divider', style: 'solid', width: 'full' },
  spacer: { type: 'spacer', height: 30 },
  table: { type: 'table', rows: [['', ''], ['', '']], hasHeader: true, striped: true },
  columns: { type: 'columns', columns: 2, layout: 'equal', gap: 24, innerBlocks: [[], []] },
  button: { type: 'button', text: 'Button', url: '#', style: 'primary', size: 'medium', alignment: 'left' },
  file: { type: 'file', src: '', fileName: '', alignment: 'left' },
  audio: { type: 'audio', src: '', controls: true },
  video: { type: 'video', src: '', controls: true, width: 640 },
  html: { type: 'html', content: '' },
  callout: { type: 'callout', content: '', variant: 'info', icon: 'InfoCircleOutlined' },
  accordion: { type: 'accordion', items: [{ id: '1', title: 'Section', content: '' }] },
  tabs: { type: 'tabs', tabs: [{ id: '1', label: 'Tab 1', content: '' }], position: 'top' },
};

export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createBlock<T extends BlockType>(type: T, overrides?: Partial<Block>): Block {
  const defaults = DEFAULT_BLOCK_SETTINGS[type] as Partial<Block>;
  return {
    ...defaults,
    ...overrides,
    id: generateBlockId(),
    type,
    order: 0,
  } as Block;
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks.map(block => blockToHtml(block)).join('\n');
}

export function blockToHtml(block: Block): string {
  switch (block.type) {
    case 'paragraph':
      return `<p style="text-align:${block.alignment || 'left'}">${block.content}</p>`;
    case 'heading':
      return `<h${block.level} style="text-align:${block.alignment || 'left'}"${block.anchor ? ` id="${block.anchor}"` : ''}>${block.content}</h${block.level}>`;
    case 'image':
      const img = `<img src="${block.src}" alt="${block.alt}"${block.width ? ` width="${block.width}"` : ''}${block.height ? ` height="${block.height}"` : ''} />`;
      const captioned = block.caption ? `<figure>${img}<figcaption>${block.caption}</figcaption></figure>` : img;
      return block.linkUrl ? `<a href="${block.linkUrl}" target="${block.linkTarget || '_self'}">${captioned}</a>` : captioned;
    case 'quote':
      return `<blockquote class="quote-${block.style || 'default'}"><p>${block.content}</p>${block.author ? `<cite>${block.author}</cite>` : ''}</blockquote>`;
    case 'code':
      return `<pre class="language-${block.language || 'text'}${block.showLineNumbers ? ' line-numbers' : ''}"><code>${block.code}</code></pre>`;
    case 'list':
      const tag = block.style === 'ordered' ? 'ol' : 'ul';
      const items = block.items.map(item => `<li>${item}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    case 'divider':
      return `<hr class="divider-${block.style}" />`;
    case 'spacer':
      return `<div style="height:${block.height}px"></div>`;
    case 'button':
      return `<div style="text-align:${block.alignment || 'left'}"><a href="${block.url}" class="btn btn-${block.style}" target="${block.target || '_self'}">${block.text}</a></div>`;
    case 'callout':
      return `<div class="callout callout-${block.variant}">${block.content}</div>`;
    case 'embed':
      return `<div class="embed embed-${block.provider}">${block.embedCode || ''}</div>`;
    case 'html':
      return block.content;
    default:
      return '';
  }
}
