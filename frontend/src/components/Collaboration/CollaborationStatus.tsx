import React from 'react';
import { Badge, Space, Typography, Tooltip, Button, Switch } from 'antd';
import {
  WifiOutlined,
  DisconnectOutlined,
  TeamOutlined,
  SyncOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import './CollaborationUI.css';

const { Text } = Typography;

interface CollaborationStatusProps {
  isConnected: boolean;
  userCount: number;
  isSyncing?: boolean;
  hasConflict?: boolean;
  onReconnect?: () => void;
  readOnly?: boolean;
  onToggleReadOnly?: (readOnly: boolean) => void;
}

const CollaborationStatus: React.FC<CollaborationStatusProps> = ({
  isConnected,
  userCount,
  isSyncing = false,
  hasConflict = false,
  onReconnect,
  readOnly = false,
  onToggleReadOnly,
}) => {
  return (
    <div className="collaboration-status">
      <Space size={16}>
        {isConnected ? (
          <Tooltip title={`Connected - ${userCount} user${userCount !== 1 ? 's' : ''} editing`}>
            <Space size={4}>
              <Badge status="success" />
              <WifiOutlined style={{ color: '#52c41a' }} />
              <TeamOutlined />
              <Text>{userCount}</Text>
            </Space>
          </Tooltip>
        ) : (
          <Tooltip title="Disconnected - Changes not synced">
            <Space size={4}>
              <Badge status="error" />
              <DisconnectOutlined style={{ color: '#ff4d4f' }} />
              {onReconnect && (
                <Button size="small" onClick={onReconnect}>
                  Reconnect
                </Button>
              )}
            </Space>
          </Tooltip>
        )}

        {isSyncing && (
          <Tooltip title="Syncing changes...">
            <SyncOutlined spin style={{ color: '#1890ff' }} />
          </Tooltip>
        )}

        {hasConflict && (
          <Tooltip title="Conflict detected - Document was modified by another user">
            <Text type="danger">⚠️ Conflict</Text>
          </Tooltip>
        )}

        {onToggleReadOnly && (
          <Tooltip title={readOnly ? 'View mode - Click to edit' : 'Edit mode - Click to view only'}>
            <Space size={4}>
              {readOnly ? <EyeOutlined /> : <EditOutlined />}
              <Switch
                size="small"
                checked={!readOnly}
                onChange={(checked) => onToggleReadOnly(!checked)}
              />
            </Space>
          </Tooltip>
        )}
      </Space>
    </div>
  );
};

export default CollaborationStatus;
