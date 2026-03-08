import React from 'react';
import { Input, List, Button } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useBlockEditorStore } from '../../../store/blockEditorStore';
import { ListBlock, ListStyle } from '../../../types/blocks';
import './BlockComponents.css';

interface ListBlockProps {
  block: ListBlockType;
}

const ListBlock: React.FC<ListBlockProps> = ({ block }) => {
  const { updateBlock, selectedBlockId } = useBlockEditorStore();
  const isSelected = selectedBlockId === block.id;

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...block.items];
    newItems[index] = value;
    updateBlock(block.id, { items: newItems });
  };

  const handleAddItem = () => {
    updateBlock(block.id, { items: [...block.items, ''] });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = block.items.filter((_, i) => i !== index);
    updateBlock(block.id, { items: newItems.length > 0 ? newItems : [''] });
  };

  const ListTag = block.style === 'ordered' ? 'ol' : 'ul';

  if (!isSelected) {
    return (
      <ListTag className={`block-list list-${block.style}`} start={block.style === 'ordered' ? block.startNumber : undefined}>
        {block.items.map((item, index) => (
          <li key={index}>{item || 'Empty item'}</li>
        ))}
      </ListTag>
    );
  }

  return (
    <div className="block-list-editor">
      <List
        dataSource={block.items}
        renderItem={(item, index) => (
          <List.Item>
            <Input
              value={item}
              onChange={(e) => handleItemChange(index, e.target.value)}
              placeholder={`List item ${index + 1}`}
              style={{ flex: 1 }}
            />
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveItem(index)}
              disabled={block.items.length <= 1}
            />
          </List.Item>
        )}
      />
      <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem} block>
        Add Item
      </Button>
    </div>
  );
};

export default ListBlock;
