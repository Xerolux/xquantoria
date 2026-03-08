import React, { useRef } from 'react';
import { Input, Button, Upload, message } from 'antd';
import { PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import type { ImageBlock as ImageBlockType } from '../../../types/blocks';
import { mediaService } from '../../../services/api';
import './BlockComponents.css';

const { TextArea } = Input;

interface ImageBlockProps {
  block: ImageBlockType;
}

const ImageBlock: React.FC<ImageBlockProps> = ({ block }) => {
  const { updateBlock, selectedBlockId } = useBlockEditorStore();
  const isSelected = selectedBlockId === block.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    try {
      const response = await mediaService.upload(file);
      updateBlock(block.id, { 
        src: response.url, 
        alt: response.alt_text || file.name 
      });
      message.success('Image uploaded successfully');
    } catch (error) {
      message.error('Failed to upload image');
    }
  };

  const handleUrlChange = (url: string) => {
    updateBlock(block.id, { src: url });
  };

  const handleAltChange = (alt: string) => {
    updateBlock(block.id, { alt });
  };

  const handleCaptionChange = (caption: string) => {
    updateBlock(block.id, { caption });
  };

  if (!block.src) {
    return (
      <div className="block-image-empty">
        {isSelected ? (
          <div className="image-upload-area">
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                handleUpload(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>Upload Image</Button>
            </Upload>
            <div className="image-url-input">
              <Input 
                placeholder="Or paste image URL..."
                onPressEnter={(e) => handleUrlChange((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
        ) : (
          <div className="image-placeholder">
            <PictureOutlined />
            <span>Click to add image</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <figure className={`block-image align-${block.alignment || 'center'}`}>
      <img 
        src={block.src} 
        alt={block.alt || ''} 
        style={{ 
          borderRadius: block.borderRadius || 0,
          maxWidth: block.size === 'full' ? '100%' : undefined,
          width: block.width ? block.width : undefined,
          height: block.height ? 'auto' : undefined,
        }}
      />
      {isSelected && (
        <div className="image-settings-quick">
          <Input 
            placeholder="Alt text..." 
            value={block.alt} 
            onChange={(e) => handleAltChange(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <Input 
            placeholder="Caption..." 
            value={block.caption || ''} 
            onChange={(e) => handleCaptionChange(e.target.value)}
          />
        </div>
      )}
      {block.caption && !isSelected && (
        <figcaption>{block.caption}</figcaption>
      )}
    </figure>
  );
};

export default ImageBlock;
