import React from 'react';
import { Typography } from 'antd';
import type { AudioBlock as AudioBlockType } from '../../../types/blocks';
import './BlockComponents.css';

interface AudioBlockProps {
  block: AudioBlockType;
}

const AudioBlock: React.FC<AudioBlockProps> = ({ block }) => {
  if (!block.src) {
    return <div className="block-audio-empty">Click to add audio source</div>;
  }

  return (
    <div className="block-audio">
      {block.title && <Typography.Title level={5}>{block.title}</Typography.Title>}
      {block.artist && <Typography.Text type="secondary">{block.artist}</Typography.Text>}
      <audio
        src={block.src}
        controls
        autoPlay={block.autoplay}
        loop={block.loop}
        preload={block.preload || 'metadata'}
        style={{ width: '100%' }}
      />
    </div>
  );
};

export default AudioBlock;
