import React from 'react';
import { Button, Space, Tooltip, Dropdown, Popconfirm } from 'antd';
import {
  DragOutlined,
  DeleteOutlined,
  CopyOutlined,
  MoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { Block } from '../../types/blocks';
import { useBlockEditorStore } from '../../store/blockEditorStore';
import './BlockToolbar.css';

interface BlockToolbarProps {
  block: Block;
  dragHandleProps: any;
  onDelete: () => void;
  onDuplicate: () => void;
}

const BlockToolbar: React.FC<BlockToolbarProps> = ({ 
  block, 
  dragHandleProps, 
  onDelete, 
  onDuplicate 
}) => {
  const { 
    moveBlock, 
    updateBlock, 
    blocks,
    copyBlock,
    pasteBlock,
  } = useBlockEditorStore();

  const currentIndex = blocks.findIndex(b => b.id === block.id);
  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex < blocks.length - 1;

  const handleMoveUp = () => {
    if (canMoveUp) {
      moveBlock(currentIndex, currentIndex - 1);
    }
  };

  const handleMoveDown = () => {
    if (canMoveDown) {
      moveBlock(currentIndex, currentIndex + 1);
    }
  };

  const handleToggleLock = () => {
    updateBlock(block.id, { locked: !block.locked });
  };

  const handleToggleVisibility = () => {
    updateBlock(block.id, { hidden: !block.hidden });
  };

  const moreMenuItems = [
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Copy',
      onClick: () => copyBlock(block.id),
    },
    {
      key: 'paste',
      icon: <CopyOutlined />,
      label: 'Paste After',
      disabled: !useBlockEditorStore.getState().clipboard,
      onClick: () => pasteBlock(block.id),
    },
    { type: 'divider' as const },
    {
      key: 'lock',
      icon: <LockOutlined />,
      label: block.locked ? 'Unlock' : 'Lock',
      onClick: handleToggleLock,
    },
    {
      key: 'hide',
      icon: <EyeInvisibleOutlined />,
      label: block.hidden ? 'Show' : 'Hide',
      onClick: handleToggleVisibility,
    },
    { type: 'divider' as const },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: onDelete,
    },
  ];

  return (
    <div className="block-toolbar">
      <div className="block-toolbar-left">
        <Tooltip title="Drag to reorder">
          <Button
            type="text"
            size="small"
            icon={<DragOutlined />}
            className="drag-handle"
            {...dragHandleProps}
          />
        </Tooltip>
        <span className="block-type-label">{block.type}</span>
      </div>
      
      <div className="block-toolbar-right">
        <Space size={0}>
          <Tooltip title="Move up">
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={handleMoveUp}
              disabled={!canMoveUp}
            />
          </Tooltip>
          <Tooltip title="Move down">
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={handleMoveDown}
              disabled={!canMoveDown}
            />
          </Tooltip>
          <Tooltip title="Duplicate">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={onDuplicate}
            />
          </Tooltip>
          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']} placement="bottomRight">
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      </div>
    </div>
  );
};

export default BlockToolbar;
