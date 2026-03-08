import React from 'react';
import { Typography } from 'antd';
import type { VideoBlock as VideoBlockType } from '../../../types/blocks';
import './BlockComponents.css';

interface VideoBlockProps {
  block: VideoBlockType;
}

const VideoBlock: React.FC<VideoBlockProps> = ({ block }) => {
  if (!block.src) {
    return <div className="block-video-empty">Click to add video source</div>;
  }

  return (
    <div className="block-video">
      <video
        src={block.src}
        poster={block.poster}
        controls={block.controls !== false}
        autoPlay={block.autoplay}
        muted={block.muted}
        loop={block.loop}
        width={block.width || '100%'}
        height={block.height}
      />
      {block.caption && <p className="video-caption">{block.caption}</p>}
    </div>
  );
};

export default VideoBlock;
