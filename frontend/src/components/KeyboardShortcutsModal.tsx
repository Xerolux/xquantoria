import React, { useState, useEffect } from 'react';
import { Modal, List, Typography, Tag, Input, Space, Divider, Typography as AntTypography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { defaultShortcuts, type Shortcut } from '../hooks/useKeyboardShortcuts';

const { Text } = Typography;

interface KeyboardShortcutsModalProps {
  visible: boolean;
  onClose: () => void;
  customShortcuts?: Shortcut[];
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  visible,
  onClose,
  customShortcuts,
}) => {
  const [search, setSearch] = useState('');
  const shortcuts = customShortcuts || defaultShortcuts;

  const filteredShortcuts = shortcuts.filter(
    (s) =>
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.key.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'Allgemein';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  const renderKey = (shortcut: Shortcut) => {
    const keys = [];
    if (shortcut.ctrl) keys.push('⌘/Ctrl');
    if (shortcut.shift) keys.push('⇧');
    if (shortcut.alt) keys.push('⌥');
    keys.push(shortcut.key.toUpperCase());

    return (
      <Space>
        {keys.map((key, index) => (
          <Tag key={index} style={{ fontFamily: 'monospace', margin: 0 }}>
            {key}
          </Tag>
        ))}
      </Space>
    );
  };

  return (
    <Modal
      title="Tastaturkürzel"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Input
        placeholder="Kürzel suchen..."
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {Object.entries(groupedShortcuts).map(([category, items]) => (
        <div key={category} style={{ marginBottom: 16 }}>
          <Text strong style={{ color: '#1890ff' }}>{category}</Text>
          <Divider style={{ margin: '8px 0' }} />
          <List
            size="small"
            dataSource={items}
            renderItem={(item) => (
              <List.Item style={{ justifyContent: 'space-between' }}>
                <Text>{item.description}</Text>
                {renderKey(item)}
              </List.Item>
            )}
          />
        </div>
      ))}

      <Divider />
      <Text type="secondary" style={{ fontSize: 12 }}>
        Tipp: Drücke <Tag style={{ fontFamily: 'monospace' }}>⌘/Ctrl</Tag> + <Tag style={{ fontFamily: 'monospace' }}>/</Tag> um diese Übersicht jederzeit zu öffnen.
      </Text>
    </Modal>
  );
};

export default KeyboardShortcutsModal;
