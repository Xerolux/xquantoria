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
  DatePicker,
  Select,
  Tabs,
  Spin,
  Empty,
  Progress,
  List,
  Divider,
} from 'antd';
import {
  EyeOutlined,
  UserOutlined,
  FileTextOutlined,
  CommentOutlined,
  MailOutlined,
  RiseOutlined,
  FallOutlined,
  GlobalOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Line, Column, Pie, Area } from '@ant-design/charts';
import dayjs from 'dayjs';
import axios from 'axios';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface AnalyticsData {
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    avgSessionDuration: number;
    bounceRate: number;
    viewsChange: number;
    visitorsChange: number;
  };
  topPages: Array<{
    path: string;
    views: number;
    avgTime: number;
  }>;
  topPosts: Array<{
    id: number;
    title: string;
    views: number;
  }>;
  trafficSources: Array<{
    source: string;
    visits: number;
    percentage: number;
  }>;
  dailyViews: Array<{
    date: string;
    views: number;
    visitors: number;
  }>;
  deviceStats: Array<{
    device: string;
    count: number;
    percentage: number;
  }>;
  countryStats: Array<{
    country: string;
    code: string;
    visits: number;
  }>;
  recentActivity: Array<{
    path: string;
    timestamp: string;
    referrer: string;
    device: string;
  }>;
}

const AnalyticsDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: response } = await axios.get(`${API_BASE_URL}/analytics/dashboard`, {
        params: {
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD'),
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      setData(response);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const lineConfig = {
    data: data?.dailyViews || [],
    xField: 'date',
    yField: 'views',
    smooth: true,
    point: { size: 3 },
    color: '#1890ff',
  };

  const pieConfig = {
    data: data?.trafficSources || [],
    angleField: 'visits',
    colorField: 'source',
    radius: 0.8,
    label: { type: 'inner', offset: '-30%' },
  };

  const columnConfig = {
    data: data?.topPages?.slice(0, 10) || [],
    xField: 'path',
    yField: 'views',
    color: '#52c41a',
    label: { position: 'top' },
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return <Empty description="Keine Analysedaten verfügbar" />;
  }

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Analytics Dashboard</Title>
          <Text type="secondary">Website Traffic & Performance</Text>
        </Col>
        <Col>
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              allowClear={false}
            />
          </Space>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Seitenaufrufe"
              value={data.overview.totalViews}
              prefix={<EyeOutlined />}
              suffix={
                <Tag color={data.overview.viewsChange >= 0 ? 'green' : 'red'}>
                  {data.overview.viewsChange >= 0 ? <RiseOutlined /> : <FallOutlined />}
                  {Math.abs(data.overview.viewsChange)}%
                </Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Einzigartige Besucher"
              value={data.overview.uniqueVisitors}
              prefix={<UserOutlined />}
              suffix={
                <Tag color={data.overview.visitorsChange >= 0 ? 'green' : 'red'}>
                  {data.overview.visitorsChange >= 0 ? <RiseOutlined /> : <FallOutlined />}
                  {Math.abs(data.overview.visitorsChange)}%
                </Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Ø Sitzungsdauer"
              value={data.overview.avgSessionDuration}
              suffix="s"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Bounce Rate"
              value={data.overview.bounceRate}
              suffix="%"
              precision={1}
              valueStyle={{ color: data.overview.bounceRate > 50 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Traffic Verlauf">
            <Line {...lineConfig} height={300} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Traffic Quellen">
            <Pie {...pieConfig} height={300} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Top Seiten">
            <Table
              size="small"
              dataSource={data.topPages}
              rowKey="path"
              pagination={false}
              columns={[
                {
                  title: 'Pfad',
                  dataIndex: 'path',
                  ellipsis: true,
                },
                {
                  title: 'Aufrufe',
                  dataIndex: 'views',
                  width: 80,
                  render: (v) => <Tag color="blue">{v}</Tag>,
                },
                {
                  title: 'Ø Zeit',
                  dataIndex: 'avgTime',
                  width: 80,
                  render: (v) => `${v}s`,
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top Posts">
            <Table
              size="small"
              dataSource={data.topPosts}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Titel',
                  dataIndex: 'title',
                  ellipsis: true,
                  render: (text, record) => (
                    <a href={`/admin/posts/${record.id}`}>{text}</a>
                  ),
                },
                {
                  title: 'Aufrufe',
                  dataIndex: 'views',
                  width: 80,
                  render: (v) => <Tag color="green">{v}</Tag>,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Geräte">
            <List
              dataSource={data.deviceStats}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<DesktopOutlined />}
                    title={item.device}
                    description={
                      <Progress
                        percent={item.percentage}
                        size="small"
                        format={() => `${item.count.toLocaleString()}`}
                      />
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Länder">
            <List
              dataSource={data.countryStats?.slice(0, 10) || []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<GlobalOutlined />}
                    title={item.country}
                    description={`${item.visits.toLocaleString()} Besuche`}
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

export default AnalyticsDashboardPage;
