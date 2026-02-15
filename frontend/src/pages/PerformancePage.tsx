import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Tabs,
  Alert,
  Tooltip,
  message,
  Popconfirm,
  Descriptions,
  Modal,
  List,
} from 'antd';
import {
  DatabaseOutlined,
  CloudOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  ClearOutlined,
  DashboardOutlined,
  MemoryOutlined,
  HddOutlined,
} from '@ant-design/icons';
import { performanceService } from '../../services/api';

const { Title, Text } = Typography;

interface PerformanceData {
  overview: {
    database_size: string;
    cache_hit_rate: number;
    queue_size: number;
    avg_response_time: number;
    memory_usage: { used: string; limit: string; percent: number };
    cpu_usage: { '1min': number; '5min': number; '15min': number } | null;
    disk_usage: { total: string; used: string; free: string; percent: number };
    uptime: { seconds: number; formatted: string } | null;
  };
  database: any;
  cache: any;
  queue: any;
  php: any;
  slow_queries: any[];
  recommendations: any[];
}

const PerformancePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [opcacheData, setOpcacheData] = useState<any>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await performanceService.getIndex();
      setData(response.data);
      
      const opcacheResponse = await performanceService.getOpcache();
      setOpcacheData(opcacheResponse.data);
    } catch (error) {
      message.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async (type: string = 'all') => {
    try {
      await performanceService.clearCache(type);
      message.success(`${type} cache cleared`);
    } catch (error) {
      message.error('Failed to clear cache');
    }
  };

  const handleOptimize = async () => {
    try {
      await performanceService.optimize();
      message.success('Application optimized');
      fetchData();
    } catch (error) {
      message.error('Failed to optimize');
    }
  };

  const handleResetOpcache = async () => {
    try {
      await performanceService.resetOpcache();
      message.success('OPcache reset');
      fetchData();
    } catch (error) {
      message.error('Failed to reset OPcache');
    }
  };

  const getRecommendationColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const slowQueriesColumns = [
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query',
      ellipsis: true,
      render: (query: string) => <Text code>{query?.substring(0, 100)}...</Text>,
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => <Tag color={duration > 1000 ? 'red' : 'orange'}>{duration}ms</Tag>,
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
    },
  ];

  return (
    <div>
      <Title level={2}>Performance Dashboard</Title>

      {data?.recommendations && data.recommendations.length > 0 && (
        <Alert
          message="Performance Recommendations"
          description={
            <List
              dataSource={data.recommendations}
              renderItem={(item: any) => (
                <List.Item>
                  <Tag color={getRecommendationColor(item.severity)}>{item.type}</Tag>
                  {item.message}
                </List.Item>
              )}
            />
          }
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Database Size"
              value={data?.overview.database_size || 'N/A'}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Cache Hit Rate"
              value={data?.overview.cache_hit_rate || 0}
              suffix="%"
              prefix={<CloudOutlined />}
              valueStyle={{ color: (data?.overview.cache_hit_rate || 0) > 80 ? '#52c41a' : '#faad14' }}
            />
            <Progress percent={data?.overview.cache_hit_rate || 0} showInfo={false} size="small" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Response Time"
              value={data?.overview.avg_response_time || 0}
              suffix="ms"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: (data?.overview.avg_response_time || 0) < 100 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Queue Size"
              value={data?.overview.queue_size || 0}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: (data?.overview.queue_size || 0) > 100 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card title={<><MemoryOutlined /> Memory Usage</>}>
            <Progress
              type="dashboard"
              percent={data?.overview.memory_usage?.percent || 0}
              status={data?.overview.memory_usage?.percent > 80 ? 'exception' : 'normal'}
            />
            <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Used">{data?.overview.memory_usage?.used}</Descriptions.Item>
              <Descriptions.Item label="Limit">{data?.overview.memory_usage?.limit}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={<><HddOutlined /> Disk Usage</>}>
            <Progress
              type="dashboard"
              percent={data?.overview.disk_usage?.percent || 0}
              status={data?.overview.disk_usage?.percent > 80 ? 'exception' : 'normal'}
            />
            <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Used">{data?.overview.disk_usage?.used}</Descriptions.Item>
              <Descriptions.Item label="Free">{data?.overview.disk_usage?.free}</Descriptions.Item>
              <Descriptions.Item label="Total">{data?.overview.disk_usage?.total}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="PHP Configuration">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="PHP Version">{data?.php?.version}</Descriptions.Item>
              <Descriptions.Item label="Memory Limit">{data?.php?.memory_limit}</Descriptions.Item>
              <Descriptions.Item label="Max Execution">{data?.php?.max_execution_time}s</Descriptions.Item>
              <Descriptions.Item label="Upload Max">{data?.php?.upload_max_filesize}</Descriptions.Item>
              <Descriptions.Item label="OPcache">
                {data?.php?.opcache_enabled ? <Tag color="green">Enabled</Tag> : <Tag color="red">Disabled</Tag>}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'database',
            label: 'Database',
            icon: <DatabaseOutlined />,
            children: (
              <Card>
                <Descriptions title="Database Stats" bordered column={2}>
                  <Descriptions.Item label="Driver">{data?.database?.driver}</Descriptions.Item>
                  <Descriptions.Item label="Size">{data?.database?.size}</Descriptions.Item>
                  <Descriptions.Item label="Tables">{data?.database?.tables_count}</Descriptions.Item>
                  <Descriptions.Item label="Connections">{data?.database?.connections}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'cache',
            label: 'Cache',
            icon: <CloudOutlined />,
            children: (
              <Card
                extra={
                  <Space>
                    <Popconfirm title="Clear application cache?" onConfirm={() => handleClearCache('application')}>
                      <Button icon={<ClearOutlined />}>Clear Cache</Button>
                    </Popconfirm>
                    <Popconfirm title="Clear config cache?" onConfirm={() => handleClearCache('config')}>
                      <Button>Clear Config</Button>
                    </Popconfirm>
                    <Popconfirm title="Clear route cache?" onConfirm={() => handleClearCache('route')}>
                      <Button>Clear Routes</Button>
                    </Popconfirm>
                    <Popconfirm title="Clear view cache?" onConfirm={() => handleClearCache('view')}>
                      <Button>Clear Views</Button>
                    </Popconfirm>
                  </Space>
                }
              >
                <Descriptions title="Cache Stats" bordered column={2}>
                  <Descriptions.Item label="Driver">{data?.cache?.driver}</Descriptions.Item>
                  <Descriptions.Item label="Hit Rate">{data?.cache?.hit_rate}%</Descriptions.Item>
                  <Descriptions.Item label="Keys">{data?.cache?.keys}</Descriptions.Item>
                  <Descriptions.Item label="Memory">{data?.cache?.memory}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'opcache',
            label: 'OPcache',
            icon: <ThunderboltOutlined />,
            children: (
              <Card
                extra={
                  <Space>
                    <Popconfirm title="Reset OPcache?" onConfirm={handleResetOpcache}>
                      <Button danger icon={<ReloadOutlined />}>Reset OPcache</Button>
                    </Popconfirm>
                  </Space>
                }
              >
                {opcacheData?.enabled ? (
                  <Descriptions title="OPcache Status" bordered column={2}>
                    <Descriptions.Item label="Enabled">
                      <Tag color="green">Yes</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Memory Used">
                      {opcacheData?.memory_usage?.used_memory_percentage?.toFixed(1)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="Cached Scripts">
                      {opcacheData?.opcache_statistics?.num_cached_scripts}
                    </Descriptions.Item>
                    <Descriptions.Item label="Hit Rate">
                      {opcacheData?.opcache_statistics?.opcache_hit_rate?.toFixed(1)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="Cached Keys">
                      {opcacheData?.opcache_statistics?.num_cached_keys}
                    </Descriptions.Item>
                    <Descriptions.Item label="Max Keys">
                      {opcacheData?.opcache_statistics?.max_cached_keys}
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Alert message="OPcache is not enabled" type="info" />
                )}
              </Card>
            ),
          },
          {
            key: 'slow_queries',
            label: 'Slow Queries',
            icon: <WarningOutlined />,
            children: (
              <Card title="Recent Slow Queries">
                <Table
                  columns={slowQueriesColumns}
                  dataSource={data?.slow_queries || []}
                  rowKey={(record, index) => `query-${index}`}
                  pagination={false}
                  locale={{ emptyText: 'No slow queries recorded' }}
                />
              </Card>
            ),
          },
          {
            key: 'actions',
            label: 'Optimization',
            icon: <DashboardOutlined />,
            children: (
              <Card title="Quick Actions">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert
                    message="Optimize Application"
                    description="Cache config, routes and views for better performance. Do this after updating configuration."
                    type="info"
                    action={
                      <Popconfirm title="Optimize application?" onConfirm={handleOptimize}>
                        <Button type="primary">Optimize</Button>
                      </Popconfirm>
                    }
                  />
                  <Alert
                    message="Clear All Cache"
                    description="Clear all cached data including application, config, route and view cache."
                    type="warning"
                    action={
                      <Popconfirm title="Clear all cache?" onConfirm={() => handleClearCache('all')}>
                        <Button danger>Clear All</Button>
                      </Popconfirm>
                    }
                  />
                </Space>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default PerformancePage;
