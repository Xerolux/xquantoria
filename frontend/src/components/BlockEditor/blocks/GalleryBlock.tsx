import React from 'react';
import { Row, Col, Image, Empty } from 'antd';
import type { GalleryBlock as GalleryBlockType } from '../../../types/blocks';
import './BlockComponents.css';

interface GalleryBlockProps {
  block: GalleryBlockType;
}

const GalleryBlock: React.FC<GalleryBlockProps> = ({ block }) => {
  if (!block.images || block.images.length === 0) {
    return (
      <div className="block-gallery-empty">
        <Empty description="No images in gallery" />
      </div>
    );
  }

  return (
    <div className="block-gallery">
      <Row gutter={[16, 16]}>
        {block.images.map((image) => (
          <Col key={image.id} xs={24} sm={12} md={24 / block.columns}>
            <Image
              src={image.src}
              alt={image.alt}
              style={{ borderRadius: block.borderRadius || 0 }}
            />
            {image.caption && (
              <p className="gallery-caption">{image.caption}</p>
            )}
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default GalleryBlock;
