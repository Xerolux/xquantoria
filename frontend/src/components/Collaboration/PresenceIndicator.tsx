import React from 'react';
import { Avatar, Tooltip, Badge, Space, Typography } from 'antd';
import {
  UserOutlined,
  CrownOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import './CollaborationUI.css';

const { Text } = Typography;

interface CollaborationUser {
  sessionId: string;
  userId: number;
  userName: string;
  userColor: string;
  joinedAt: string;
  lastActivity: string;
  isEditing?: boolean;
  isSelected?: boolean;
}

interface PresenceIndicatorProps {
  users: CollaborationUser[];
  currentUserId?: number;
  maxVisible?: number;
  showStatus?: boolean;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  users,
  currentUserId,
  maxVisible = 4,
  showStatus = false,
}) => {
  const visibleUsers = users.slice(0, maxVisible);
  const hiddenUsers = users.slice(maxVisible);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastActivity = (lastActivity: string) => {
    const diff = Date.now() - new Date(lastActivity).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Active now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="presence-indicator">
      <Space size={4}>
        {visibleUsers.map((user) => (
          <Tooltip
            key={user.sessionId}
            title={
              <div>
                <div style={{ fontWeight: 600 }}>{user.userName}</div>
                {showStatus && (
                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                    {formatLastActivity(user.lastActivity)}
                  </div>
                )}
                {user.userId === currentUserId && (
                  <div style={{ fontSize: 11, color: '#1890ff' }}>(You)</div>
                )}
              </div>
            }
          >
            <Badge
              dot
              color={user.isEditing ? '#52c41a' : user.userColor}
              offset={[-4, 28]}
              style={{
                boxShadow: '0 0 0 2px #fff',
              }}
            >
              <Avatar
                size={32}
                style={{
                  backgroundColor: user.userColor,
                  border:
                    user.userId === currentUserId
                      ? '2px solid #1890ff'
                      : '2px solid #fff',
                  cursor: 'pointer',
                }}
              >
                {getInitials(user.userName)}
              </Avatar>
            </Badge>
          </Tooltip>
        ))}

        {hiddenUsers.length > 0 && (
          <Tooltip
            title={
              <div>
                {hiddenUsers.map((user) => (
                  <div key={user.sessionId}>{user.userName}</div>
                ))}
              </div>
            }
          >
            <Avatar size={32} style={{ backgroundColor: '#8c8c8c' }}>
              +{hiddenUsers.length}
            </Avatar>
          </Tooltip>
        )}

        {users.length > 1 && (
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            {users.length} {users.length === 1 ? 'editor' : 'editors'}
          </Text>
        )}
      </Space>
    </div>
  );
};

export default PresenceIndicator;
