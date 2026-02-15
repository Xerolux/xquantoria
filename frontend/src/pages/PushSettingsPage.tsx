import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Switch,
  Button,
  List,
  Typography,
  Space,
  Tag,
  Empty,
  Spin,
  message,
  Modal,
  Descriptions,
  Alert,
  Divider,
  Tooltip,
  Badge,
  Popconfirm,
} from 'antd';
import {
  BellOutlined,
  BellFilled,
  DeleteOutlined,
  GlobalOutlined,
  BrowserOutlined,
  MobileOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface PushSubscription {
  id: number;
  endpoint: string;
  user_agent: string;
  enabled: boolean;
  subscribed_at: string;
  last_notified_at: string | null;
}

interface NotificationHistory {
  id: number;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

const PushSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidKey, setVapidKey] = useState<string>('');
  const [selectedNotification, setSelectedNotification] = useState<NotificationHistory | null>(null);
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    enabledSubscriptions: 0,
    unreadNotifications: 0,
    totalNotifications: 0,
  });

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
  });

  const checkSupport = useCallback(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    return supported;
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, notifRes, statsRes, vapidRes] = await Promise.all([
        api.get('/push/subscriptions'),
        api.get('/push/history'),
        api.get('/push/stats'),
        api.get('/push/vapid-public-key'),
      ]);

      setSubscriptions(subsRes.data);
      setNotifications(notifRes.data.data || []);
      setStats(statsRes.data);
      setVapidKey(vapidRes.data.public_key);

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setIsSubscribed(!!existing);
    } catch (error) {
      console.error('Failed to fetch push data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkSupport()) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [checkSupport]);

  const subscribeToPush = async () => {
    if (!isSupported) {
      message.error('Push-Benachrichtigungen werden von diesem Browser nicht unterstützt');
      return;
    }

    setSubscribing(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        message.error('Push-Berechtigung abgelehnt');
        setSubscribing(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await api.post('/push/subscribe', subscription.toJSON());

      message.success('Push-Benachrichtigungen erfolgreich aktiviert!');
      setIsSubscribed(true);
      fetchData();
    } catch (error) {
      console.error('Failed to subscribe:', error);
      message.error('Fehler beim Aktivieren der Push-Benachrichtigungen');
    } finally {
      setSubscribing(false);
    }
  };

  const unsubscribeFromPush = async (endpoint?: string) => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/push/unsubscribe', { endpoint: endpoint || subscription.endpoint });
      }

      message.success('Push-Benachrichtigungen deaktiviert');
      setIsSubscribed(false);
      fetchData();
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      message.error('Fehler beim Deaktivieren');
    }
  };

  const toggleSubscription = async (id: number, enabled: boolean) => {
    try {
      await api.post(`/push/subscriptions/${id}/toggle`);
      message.success(enabled ? 'Benachrichtigungen deaktiviert' : 'Benachrichtigungen aktiviert');
      fetchData();
    } catch (error) {
      message.error('Fehler beim Ändern des Status');
    }
  };

  const deleteSubscription = async (id: number) => {
    try {
      await api.delete(`/push/subscriptions/${id}`);
      message.success('Gerät entfernt');
      fetchData();
    } catch (error) {
      message.error('Fehler beim Entfernen');
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/push/notifications/${id}/read`);
      fetchData();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/push/notifications/read-all');
      message.success('Alle als gelesen markiert');
      fetchData();
    } catch (error) {
      message.error('Fehler beim Markieren');
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <MobileOutlined />;
    }
    return <BrowserOutlined />;
  };

  const getDeviceName = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    return 'Browser';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <BellOutlined /> Push-Benachrichtigungen
      </Title>
      <Paragraph type="secondary">
        Verwalte deine Push-Benachrichtigungen und registrierten Geräte.
      </Paragraph>

      {!isSupported && (
        <Alert
          message="Nicht unterstützt"
          description="Push-Benachrichtigungen werden von diesem Browser nicht unterstützt. Verwende Chrome, Firefox oder Edge."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Card>
          <Statistic
            title="Registrierte Geräte"
            value={stats.totalSubscriptions}
            icon={<GlobalOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="Aktive Geräte"
            value={stats.enabledSubscriptions}
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          />
        </Card>
        <Card>
          <Statistic
            title="Ungelesene"
            value={stats.unreadNotifications}
            icon={<BellFilled style={{ color: '#faad14' }} />}
          />
        </Card>
        <Card>
          <Statistic
            title="Benachrichtigungen"
            value={stats.totalNotifications}
            icon={<ThunderboltOutlined />}
          />
        </Card>
      </div>

      <Card
        title="Push-Status"
        extra={
          isSupported && (
            <Space>
              <Badge status={isSubscribed ? 'success' : 'default'} />
              <Text>{isSubscribed ? 'Aktiviert' : 'Deaktiviert'}</Text>
            </Space>
          )
        }
        style={{ marginBottom: 24 }}
      >
        {isSupported ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message={isSubscribed ? 'Push-Benachrichtigungen sind aktiviert' : 'Push-Benachrichtigungen sind deaktiviert'}
              description={
                isSubscribed
                  ? 'Du erhältst Benachrichtigungen für neue Artikel und wichtige Updates.'
                  : 'Aktiviere Push-Benachrichtigungen um über neue Inhalte informiert zu werden.'
              }
              type={isSubscribed ? 'success' : 'info'}
              showIcon
            />
            <Space>
              {isSubscribed ? (
                <Popconfirm
                  title="Push-Benachrichtigungen deaktivieren?"
                  onConfirm={() => unsubscribeFromPush()}
                >
                  <Button danger icon={<CloseCircleOutlined />}>
                    Deaktivieren
                  </Button>
                </Popconfirm>
              ) : (
                <Button
                  type="primary"
                  icon={<BellOutlined />}
                  loading={subscribing}
                  onClick={subscribeToPush}
                >
                  Aktivieren
                </Button>
              )}
              <Button icon={<SyncOutlined />} onClick={fetchData}>
                Aktualisieren
              </Button>
            </Space>
          </Space>
        ) : (
          <Empty description="Push-Benachrichtigungen werden nicht unterstützt" />
        )}
      </Card>

      <Card title="Registrierte Geräte" style={{ marginBottom: 24 }}>
        {subscriptions.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={subscriptions}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Switch
                    key="toggle"
                    checked={item.enabled}
                    onChange={() => toggleSubscription(item.id, item.enabled)}
                    size="small"
                  />,
                  <Tooltip key="delete" title="Entfernen">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => deleteSubscription(item.id)}
                    />
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  avatar={getDeviceIcon(item.user_agent || '')}
                  title={
                    <Space>
                      {getDeviceName(item.user_agent || '')}
                      {!item.enabled && <Tag color="red">Deaktiviert</Tag>}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Registriert: {formatDate(item.subscribed_at)}
                      </Text>
                      {item.last_notified_at && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Letzte Benachrichtigung: {formatDate(item.last_notified_at)}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="Keine Geräte registriert" />
        )}
      </Card>

      <Card
        title="Benachrichtigungsverlauf"
        extra={
          notifications.some((n) => !n.read_at) && (
            <Button type="link" onClick={markAllAsRead}>
              Alle als gelesen markieren
            </Button>
          )
        }
      >
        {notifications.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                style={{
                  backgroundColor: item.read_at ? 'transparent' : '#f6ffed',
                  padding: '12px 16px',
                  borderRadius: 4,
                  marginBottom: 8,
                }}
                actions={[
                  !item.read_at && (
                    <Button key="read" type="link" size="small" onClick={() => markAsRead(item.id)}>
                      Als gelesen markieren
                    </Button>
                  ),
                  <Button
                    key="view"
                    type="link"
                    size="small"
                    onClick={() => setSelectedNotification(item)}
                  >
                    Details
                  </Button>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <Badge dot={!item.read_at}>
                      <BellOutlined style={{ fontSize: 20 }} />
                    </Badge>
                  }
                  title={
                    <Space>
                      {item.title}
                      {!item.read_at && <Tag color="green">Neu</Tag>}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text ellipsis style={{ maxWidth: 400 }}>
                        {item.body}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(item.created_at)}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="Keine Benachrichtigungen" />
        )}
      </Card>

      <Modal
        title="Benachrichtigungsdetails"
        open={!!selectedNotification}
        onCancel={() => setSelectedNotification(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedNotification(null)}>
            Schließen
          </Button>,
        ]}
      >
        {selectedNotification && (
          <Descriptions column={1}>
            <Descriptions.Item label="Titel">{selectedNotification.title}</Descriptions.Item>
            <Descriptions.Item label="Inhalt">{selectedNotification.body}</Descriptions.Item>
            <Descriptions.Item label="Empfangen">
              {formatDate(selectedNotification.created_at)}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {selectedNotification.read_at ? (
                <Tag color="green">Gelesen am {formatDate(selectedNotification.read_at)}</Tag>
              ) : (
                <Tag color="blue">Ungelesen</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

const Statistic: React.FC<{
  title: string;
  value: number;
  icon?: React.ReactNode;
}> = ({ title, value, icon }) => (
  <div style={{ textAlign: 'center' }}>
    {icon && <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>}
    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>{value}</div>
    <div style={{ color: '#666', fontSize: 12 }}>{title}</div>
  </div>
);

export default PushSettingsPage;
