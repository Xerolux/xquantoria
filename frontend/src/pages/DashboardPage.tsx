import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Divider, Typography, Space, Skeleton } from 'antd';
import {
  FileTextOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  FallOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { postService, dashboardService } from '../services/api';
import type { Post } from '../types';
import { useAuthStore } from '../store/authStore';
import DashboardStatsWidget from '../components/DashboardStatsWidget';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
  });
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullStats, setShowFullStats] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const postsData = await postService.getAll({ per_page: 10, sort: 'created_at,desc' });

      setStats({
        totalPosts: postsData.total || 0,
        publishedPosts: postsData.data?.filter((p: Post) => p.status === 'published').length || 0,
        draftPosts: postsData.data?.filter((p: Post) => p.status === 'draft').length || 0,
        totalViews: postsData.data?.reduce((sum: number, p: Post) => sum + p.view_count, 0) || 0,
      });

      setRecentPosts(postsData.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Post) => (
        <a href={`/posts/${record.id}`}>{text}</a>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          published: 'green',
          draft: 'default',
          scheduled: 'blue',
          archived: 'red',
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Views',
      dataIndex: 'view_count',
      key: 'view_count',
      render: (count: number) => <Statistic value={count} valueStyle={{ fontSize: 14 }} />,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <Title level={2}>Dashboard</Title>
      <Text type="secondary">Welcome back, {user?.display_name || user?.name}!</Text>

      <Divider />

      {showFullStats ? (
        <DashboardStatsWidget />
      ) : (
        <>
          <Row gutter={16} style={{ marginTop: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Posts"
                  value={stats.totalPosts}
                  prefix={<FileTextOutlined />}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Published"
                  value={stats.publishedPosts}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Drafts"
                  value={stats.draftPosts}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Views"
                  value={stats.totalViews}
                  prefix={<EyeOutlined />}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Divider />

      <Card title="Recent Posts">
        <Table
          columns={columns}
          dataSource={recentPosts}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
