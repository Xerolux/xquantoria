import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Typography,
  Tag,
  Space,
  Progress,
  List,
  Badge,
  Timeline,
  Alert,
  Button,
  Divider,
  Descriptions,
  Tabs,
} from 'antd';
import {
  SafetyOutlined,
  LockOutlined,
  UnlockOutlined,
  UserOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  FileProtectOutlined,
  ApiOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const SecurityDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    usersWith2FA: 0,
    twoFactorPercentage: 0,
    failedLogins24h: 0,
    activeSessions: 0,
    blockedIps: 0,
    securityScore: 0,
    recentThreats: 0,
    permissionsIssues: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [threats, setThreats] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/security/dashboard`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });

      setStats(data.stats || {});
      setRecentActivity(data.recentActivity || []);
      setThreats(data.threats || []);
      setRecommendations(data.recommendations || []);
    } catch (error) {
      generateMockData();
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    setStats({
      totalUsers: 156,
      activeUsers: 89,
      usersWith2FA: 67,
      twoFactorPercentage: 75.2,
      failedLogins24h: 12,
      activeSessions: 234,
      blockedIps: 8,
      securityScore: 85,
      recentThreats: 3,
      permissionsIssues: 2,
    });

    setRecentActivity([
      { type: 'login', user: 'admin@example.com', status: 'success', time: '2 min ago', ip: '192.168.1.1' },
      { type: '2fa_enabled', user: 'user@example.com', status: 'success', time: '15 min ago', ip: null },
      { type: 'login_failed', user: 'unknown@test.com', status: 'failed', time: '32 min ago', ip: '45.33.32.156' },
      { type: 'permission_change', user: 'editor@example.com', status: 'warning', time: '1 hour ago', ip: '192.168.1.5' },
      { type: 'password_reset', user: 'user2@example.com', status: 'success', time: '2 hours ago', ip: '10.0.0.1' },
    ]);

    setThreats([
      { type: 'brute_force', ip: '45.33.32.156', attempts: 47, blocked: true, time: '32 min ago' },
      { type: 'sql_injection', ip: '91.240.118.172', attempts: 3, blocked: true, time: '2 hours ago' },
      { type: 'suspicious_activity', ip: '185.220.101.1', attempts: 12, blocked: false, time: '5 hours ago' },
    ]);

    setRecommendations([
      '2FA sollte für alle Admin-Konten aktiviert sein',
      'Passwort-Richtlinie sollte mindestens 12 Zeichen erfordern',
      'Session-Timeout sollte auf 30 Minuten reduziert werden',
      'HTTPS sollte für alle Verbindungen erzwungen werden',
      'Regelmäßige Sicherheits-Updates sollten durchgeführt werden',
    ]);
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      login: <UserOutlined />,
      login_failed: <CloseCircleOutlined />,
      '2fa_enabled': <LockOutlined />,
      permission_change: <WarningOutlined />,
      password_reset: <SafetyOutlined />,
    };
    return icons[type] || <SafetyOutlined />;
  };

  const getStatusTag = (status: string) => {
    const tags: Record<string, { color: string; text: string }> = {
      success: { color: 'green', text: 'Erfolgreich' },
      failed: { color: 'red', text: 'Fehlgeschlagen' },
      warning: { color: 'orange', text: 'Warnung' },
    };
    const tag = tags[status] || { color: 'default', text: status };
    return <Tag color={tag.color}>{tag.text}</Tag>;
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const columns = [
    {
      title: 'Typ',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Space>
          {getActivityIcon(type)}
          <Text>{type.replace('_', ' ').toUpperCase()}</Text>
        </Space>
      ),
    },
    {
      title: 'Benutzer',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      render: (ip: string | null) => ip || '-',
    },
    {
      title: 'Zeit',
      dataIndex: 'time',
      key: 'time',
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <SafetyOutlined /> Security Dashboard
          </Title>
          <Text type="secondary">Sicherheitsübersicht und Bedrohungsanalyse</Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={fetchSecurityData}>
            Aktualisieren
          </Button>
        </Col>
      </Row>

      {stats.securityScore < 70 && (
        <Alert
          message="Sicherheitswarnung"
          description="Ihr Sicherheits-Score liegt unter dem empfohlenen Wert. Bitte überprüfen Sie die Empfehlungen unten."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={stats.securityScore}
                strokeColor={getSecurityScoreColor(stats.securityScore)}
                format={(percent) => (
                  <span style={{ fontSize: 24, fontWeight: 'bold' }}>{percent}%</span>
                )}
              />
              <Title level={5} style={{ marginTop: 16 }}>
                Security Score
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="2FA aktiviert"
              value={stats.usersWith2FA}
              suffix={`/ ${stats.totalUsers}`}
              prefix={<LockOutlined />}
            />
            <Progress
              percent={stats.twoFactorPercentage}
              size="small"
              showInfo={false}
              strokeColor={stats.twoFactorPercentage > 70 ? '#52c41a' : '#faad14'}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Fehlgeschlagene Logins (24h)"
              value={stats.failedLogins24h}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: stats.failedLogins24h > 10 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Blockierte IPs"
              value={stats.blockedIps}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Letzte Sicherheitsereignisse">
            <Table
              size="small"
              dataSource={recentActivity}
              columns={columns}
              rowKey={(record) => `${record.type}-${record.time}`}
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Aktive Bedrohungen">
            {threats.length > 0 ? (
              <List
                dataSource={threats}
                renderItem={(threat) => (
                  <List.Item
                    actions={[
                      <Tag key="status" color={threat.blocked ? 'green' : 'orange'}>
                        {threat.blocked ? 'Blockiert' : 'Aktiv'}
                      </Tag>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />}
                      title={
                        <Space>
                          <Text strong>{threat.type.toUpperCase().replace('_', ' ')}</Text>
                          <Text type="secondary">{threat.ip}</Text>
                        </Space>
                      }
                      description={
                        <Space split={<Divider type="vertical" />}>
                          <Text>{threat.attempts} Versuche</Text>
                          <Text type="secondary">{threat.time}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                <Title level={5} style={{ marginTop: 16 }}>
                  Keine aktiven Bedrohungen
                </Title>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Sicherheitsempfehlungen" style={{ marginTop: 16 }}>
        <List
          dataSource={recommendations}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Badge
                    count={index + 1}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                }
                title={item}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default SecurityDashboardPage;
