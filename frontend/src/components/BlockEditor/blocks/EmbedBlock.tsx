import React from 'react';
import { Input } from 'antd';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import type { EmbedBlock as EmbedBlockType } from '../../../types/blocks';
import './BlockComponents.css';

interface EmbedBlockProps {
  block: EmbedBlockType;
}

const EmbedBlock: React.FC<EmbedBlockProps> = ({ block }) => {
  const { updateBlock, selectedBlockId } = useBlockEditorStore();
  const isSelected = selectedBlockId === block.id;

  if (!block.url && isSelected) {
    return (
      <div className="block-embed-empty">
        <Input
          placeholder="Paste YouTube, Vimeo, Twitter, etc. URL..."
          onPressEnter={(e) => {
            const url = (e.target as HTMLInputElement).value;
            updateBlock(block.id, { url });
          }}
          size="large"
        />
      </div>
    );
  }

  if (block.embedCode) {
    return (
      <div 
        className={`block-embed align-${block.alignment || 'center'}`}
        dangerouslySetInnerHTML={{ __html: block.embedCode }}
        style={{ width: block.width || '100%' }}
      />
    );
  }

  const getEmbedUrl = () => {
    if (block.provider === 'youtube') {
      const videoId = block.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (block.provider === 'vimeo') {
      const videoId = block.url.match(/vimeo\.com\/(\d+)/)?.[1];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return block.url;
  };

  return (
    <div className={`block-embed align-${block.alignment || 'center'}`}>
      {block.url ? (
        <iframe
          src={getEmbedUrl()}
          width={block.width || 640}
          height={block.height || 360}
          frameBorder="0"
          allowFullScreen
          title="Embedded content"
        />
      ) : (
        <div className="embed-placeholder">
          Click to add embed URL
        </div>
      )}
      {block.caption && <p className="embed-caption">{block.caption}</p>}
    </div>
  );
};

export default EmbedBlock;
