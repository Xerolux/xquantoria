import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, List, Typography, Tag, Space, Skeleton, Empty } from 'antd';
import {
  FileTextOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  EyeOutlined,
  CommentOutlined,
  MailOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface DashboardStats {
  posts: {
    total: number;
    published: number;
    draft: number;
    scheduled: number;
    thisMonth: number;
    change: number;
  };
  products: {
    total: number;
    active: number;
    lowStock: number;
    thisMonth: number;
    change: number;
  };
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    change: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    revenue: number;
    revenueChange: number;
  };
  comments: {
    total: number;
    pending: number;
    approved: number;
    spam: number;
  };
  newsletter: {
    total: number;
    active: number;
    thisMonth: number;
  };
  recentActivity: Array<{
    id: number;
    type: string;
    description: string;
    created_at: string;
  }>;
  popularContent: Array<{
    id: number;
    title: string;
    views: number;
    type: string;
  }>;
}

const DashboardStatsWidget: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (!stats) {
    return <Empty description="Keine Daten verfügbar" />;
  }

  const getChangeTag = (change: number) => {
    if (change > 0) {
      return (
        <Tag icon={<RiseOutlined />} color="success">
          +{change}%
        </Tag>
      );
    }
    if (change < 0) {
      return (
        <Tag icon={<FallOutlined />} color="error">
          {change}%
        </Tag>
      );
    }
    return <Tag color="default">0%</Tag>;
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Posts"
              value={stats.posts.total}
              prefix={<FileTextOutlined />}
              suffix={getChangeTag(stats.posts.change)}
            />
            <Space style={{ marginTop: 8 }}>
              <Tag color="green">{stats.posts.published} veröffentlicht</Tag>
              <Tag color="orange">{stats.posts.draft} Entwürfe</Tag>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Umsatz (Monat)"
              value={stats.orders.revenue}
              prefix={<DollarOutlined />}
              precision={2}
              suffix={getChangeTag(stats.orders.revenueChange)}
            />
            <Space style={{ marginTop: 8 }}>
              <Tag color="blue">{stats.orders.total} Bestellungen</Tag>
              <Tag color="orange">{stats.orders.pending} Offen</Tag>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Benutzer"
              value={stats.users.total}
              prefix={<UserOutlined />}
              suffix={getChangeTag(stats.users.change)}
            />
            <Space style={{ marginTop: 8 }}>
              <Tag color="green">{stats.users.active} Aktiv</Tag>
              <Tag color="blue">+{stats.users.newThisMonth} diesen Monat</Tag>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Produkte"
              value={stats.products.total}
              prefix={<ShoppingCartOutlined />}
              suffix={getChangeTag(stats.products.change)}
            />
            <Space style={{ marginTop: 8 }}>
              <Tag color="green">{stats.products.active} Aktiv</Tag>
              {stats.products.lowStock > 0 && (
                <Tag color="red">{stats.products.lowStock} Niedrigbestand</Tag>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Kommentare" size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="Gesamt" value={stats.comments.total} prefix={<CommentOutlined />} />
              </Col>
              <Col span={6}>
                <Statistic title="Ausstehend" value={stats.comments.pending} valueStyle={{ color: '#fa8c16' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Genehmigt" value={stats.comments.approved} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Spam" value={stats.comments.spam} valueStyle={{ color: '#ff4d4f' }} />
              </Col>
            </Row>
            {stats.comments.pending > 0 && (
              <Progress
                percent={(stats.comments.approved / (stats.comments.total - stats.comments.spam)) * 100}
                size="small"
                format={() => `${stats.comments.pending} zur Moderation`}
                status="active"
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Newsletter" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="Abonnenten" value={stats.newsletter.total} prefix={<MailOutlined />} />
              </Col>
              <Col span={12}>
                <Statistic title="Aktiv" value={stats.newsletter.active} valueStyle={{ color: '#52c41a' }} />
              </Col>
            </Row>
            <Progress
              percent={(stats.newsletter.active / stats.newsletter.total) * 100}
              size="small"
              format={(percent) => `${percent?.toFixed(0)}% Aktivitätsrate`}
              strokeColor="#52c41a"
              style={{ marginTop: 16 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Beliebte Inhalte" size="small" extra={<Tag icon={<EyeOutlined />}>Views</Tag>}>
            <List
              size="small"
              dataSource={stats.popularContent}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Tag color="blue">{item.type}</Tag>}
                    title={item.title}
                    description={`${item.views.toLocaleString()} Aufrufe`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Letzte Aktivität" size="small">
            <List
              size="small"
              dataSource={stats.recentActivity}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Tag
                        color={
                          item.type === 'post' ? 'blue' :
                          item.type === 'user' ? 'green' :
                          item.type === 'order' ? 'gold' : 'default'
                        }
                      >
                        {item.type}
                      </Tag>
                    }
                    title={item.description}
                    description={
                      <Space>
                        <ClockCircleOutlined />
                        {dayjs(item.created_at).fromNow()}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardStatsWidget;
