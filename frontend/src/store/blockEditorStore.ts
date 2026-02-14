import { create } from 'zustand';
import { Block, BlockType, createBlock, generateBlockId, blocksToHtml } from '../types/blocks';

interface BlockEditorState {
  blocks: Block[];
  selectedBlockId: string | null;
  hoveredBlockId: string | null;
  isDragging: boolean;
  isPreviewMode: boolean;
  history: Block[][];
  historyIndex: number;
  clipboard: Block | null;

  setBlocks: (blocks: Block[]) => void;
  addBlock: (type: BlockType, afterId?: string) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  selectBlock: (id: string | null) => void;
  hoverBlock: (id: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  togglePreviewMode: () => void;
  copyBlock: (id: string) => void;
  pasteBlock: (afterId?: string) => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  getHtml: () => string;
  loadFromHtml: (html: string) => void;
  reset: () => void;
}

const parseHtmlToBlocks = (html: string): Block[] => {
  if (!html || html.trim() === '') {
    return [];
  }

  const blocks: Block[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const processNode = (node: Node): Block | null => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return {
            id: generateBlockId(),
            type: 'heading',
            content: element.textContent || '',
            level: parseInt(tagName[1]) as 1 | 2 | 3 | 4 | 5 | 6,
            order: blocks.length,
          } as Block;
        
        case 'p':
          return {
            id: generateBlockId(),
            type: 'paragraph',
            content: element.innerHTML,
            order: blocks.length,
          } as Block;
        
        case 'blockquote':
          return {
            id: generateBlockId(),
            type: 'quote',
            content: element.innerHTML,
            order: blocks.length,
          } as Block;
        
        case 'pre':
          return {
            id: generateBlockId(),
            type: 'code',
            code: element.textContent || '',
            order: blocks.length,
          } as Block;
        
        case 'ul':
        case 'ol':
          const items = Array.from(element.querySelectorAll('li')).map(li => li.textContent || '');
          return {
            id: generateBlockId(),
            type: 'list',
            items,
            style: tagName === 'ol' ? 'ordered' : 'unordered',
            order: blocks.length,
          } as Block;
        
        case 'hr':
          return {
            id: generateBlockId(),
            type: 'divider',
            style: 'solid',
            order: blocks.length,
          } as Block;
        
        case 'img':
          return {
            id: generateBlockId(),
            type: 'image',
            src: element.getAttribute('src') || '',
            alt: element.getAttribute('alt') || '',
            order: blocks.length,
          } as Block;
        
        default:
          if (element.textContent?.trim()) {
            return {
              id: generateBlockId(),
              type: 'paragraph',
              content: element.innerHTML,
              order: blocks.length,
            } as Block;
          }
      }
    }
    return null;
  };

  const walkNodes = (nodes: NodeList) => {
    nodes.forEach(node => {
      const block = processNode(node);
      if (block) {
        blocks.push(block);
      }
      if (node.childNodes.length > 0) {
        walkNodes(node.childNodes);
      }
    });
  };

  walkNodes(doc.body.childNodes);
  return blocks.map((block, index) => ({ ...block, order: index }));
};

export const useBlockEditorStore = create<BlockEditorState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  hoveredBlockId: null,
  isDragging: false,
  isPreviewMode: false,
  history: [[]],
  historyIndex: 0,
  clipboard: null,

  setBlocks: (blocks) => {
    get().saveToHistory();
    set({ blocks: blocks.map((b, i) => ({ ...b, order: i })) });
  },

  addBlock: (type, afterId) => {
    get().saveToHistory();
    const newBlock = createBlock(type);
    const blocks = [...get().blocks];
    
    if (afterId) {
      const index = blocks.findIndex(b => b.id === afterId);
      blocks.splice(index + 1, 0, newBlock);
    } else {
      blocks.push(newBlock);
    }
    
    set({ 
      blocks: blocks.map((b, i) => ({ ...b, order: i })),
      selectedBlockId: newBlock.id 
    });
  },

  updateBlock: (id, updates) => {
    get().saveToHistory();
    set({
      blocks: get().blocks.map(block =>
        block.id === id ? { ...block, ...updates } : block
      ),
    });
  },

  removeBlock: (id) => {
    get().saveToHistory();
    const blocks = get().blocks.filter(block => block.id !== id);
    set({ 
      blocks: blocks.map((b, i) => ({ ...b, order: i })),
      selectedBlockId: null 
    });
  },

  duplicateBlock: (id) => {
    get().saveToHistory();
    const blocks = get().blocks;
    const index = blocks.findIndex(b => b.id === id);
    if (index !== -1) {
      const block = blocks[index];
      const duplicated = { 
        ...JSON.parse(JSON.stringify(block)), 
        id: generateBlockId() 
      };
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, duplicated);
      set({ 
        blocks: newBlocks.map((b, i) => ({ ...b, order: i })),
        selectedBlockId: duplicated.id 
      });
    }
  },

  moveBlock: (fromIndex, toIndex) => {
    get().saveToHistory();
    const blocks = [...get().blocks];
    const [removed] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, removed);
    set({ blocks: blocks.map((b, i) => ({ ...b, order: i })) });
  },

  selectBlock: (id) => set({ selectedBlockId: id }),
  hoverBlock: (id) => set({ hoveredBlockId: id }),
  setDragging: (isDragging) => set({ isDragging }),

  togglePreviewMode: () => set(state => ({ isPreviewMode: !state.isPreviewMode })),

  copyBlock: (id) => {
    const block = get().blocks.find(b => b.id === id);
    if (block) {
      set({ clipboard: JSON.parse(JSON.stringify(block)) });
    }
  },

  pasteBlock: (afterId) => {
    const clipboard = get().clipboard;
    if (clipboard) {
      get().saveToHistory();
      const newBlock = { ...JSON.parse(JSON.stringify(clipboard)), id: generateBlockId() };
      const blocks = [...get().blocks];
      
      if (afterId) {
        const index = blocks.findIndex(b => b.id === afterId);
        blocks.splice(index + 1, 0, newBlock);
      } else {
        blocks.push(newBlock);
      }
      
      set({ 
        blocks: blocks.map((b, i) => ({ ...b, order: i })),
        selectedBlockId: newBlock.id 
      });
    }
  },

  saveToHistory: () => {
    const { blocks, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(blocks)));
    set({ 
      history: newHistory.slice(-50), // Keep last 50 states
      historyIndex: Math.min(newHistory.length - 1, 49)
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({ 
        historyIndex: historyIndex - 1,
        blocks: JSON.parse(JSON.stringify(history[historyIndex - 1]))
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({ 
        historyIndex: historyIndex + 1,
        blocks: JSON.parse(JSON.stringify(history[historyIndex + 1]))
      });
    }
  },

  getHtml: () => blocksToHtml(get().blocks),

  loadFromHtml: (html) => {
    const blocks = parseHtmlToBlocks(html);
    set({ blocks, history: [blocks], historyIndex: 0 });
  },

  reset: () => set({ 
    blocks: [], 
    selectedBlockId: null, 
    history: [[]], 
    historyIndex: 0 
  }),
}));
