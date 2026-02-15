import React, { useState, useEffect, useRef } from 'react';
import { Badge, Popover, List, Button, Empty, Spin, Typography, Tag, Space, Tabs, Divider } from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  DeleteOutlined,
  CheckOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  data?: Record<string, unknown>;
  action_url?: string;
}

interface NotificationBellProps {
  onOpen?: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onOpen }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        params: { limit: 20 },
      });
      setNotifications(data.data || data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    pollingRef.current = setInterval(fetchNotifications, 60000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleVisibleChange = (v: boolean) => {
    setVisible(v);
    if (v) {
      onOpen?.();
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await axios.post(`${API_BASE_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/notifications/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      info: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
      success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      warning: <WarningOutlined style={{ color: '#faad14' }} />,
      error: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
    };
    return icons[type] || icons.info;
  };

  const getTypeTag = (type: string) => {
    const colors: Record<string, string> = {
      info: 'blue',
      success: 'green',
      warning: 'orange',
      error: 'red',
    };
    return <Tag color={colors[type]} style={{ marginLeft: 8 }}>{type}</Tag>;
  };

  const content = (
    <div style={{ width: 380, maxHeight: 500, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text strong>Benachrichtigungen</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead}>
            Alle als gelesen
          </Button>
        )}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <Empty description="Keine Benachrichtigungen" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={notifications}
          style={{ maxHeight: 400, overflow: 'auto' }}
          renderItem={(item) => (
            <List.Item
              style={{
                backgroundColor: item.read_at ? 'transparent' : '#f6ffed',
                padding: '12px 8px',
                cursor: 'pointer',
              }}
              actions={[
                !item.read_at && (
                  <Button
                    key="read"
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(item.id);
                    }}
                  />
                ),
                <Button
                  key="delete"
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(item.id);
                  }}
                />,
              ].filter(Boolean)}
              onClick={() => {
                if (!item.read_at) {
                  markAsRead(item.id);
                }
                if (item.action_url) {
                  window.location.href = item.action_url;
                }
              }}
            >
              <List.Item.Meta
                avatar={getIcon(item.type)}
                title={
                  <Space>
                    <Text strong={!item.read_at}>{item.title}</Text>
                    {getTypeTag(item.type)}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.message}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(item.created_at).fromNow()}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Divider style={{ margin: '12px 0 8px' }} />

      <div style={{ textAlign: 'center' }}>
        <Button type="link" size="small" href="/admin/notifications">
          Alle anzeigen
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={visible}
      onOpenChange={handleVisibleChange}
      placement="bottomRight"
      arrow={false}
    >
      <Badge count={unreadCount} overflowCount={99} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ color: 'inherit' }}
        />
      </Badge>
    </Popover>
  );
};

export default NotificationBell;
