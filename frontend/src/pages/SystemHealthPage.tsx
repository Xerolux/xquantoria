import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Progress,
  Button,
  Space,
  Alert,
  Typography,
  List,
  Spin,
  Descriptions,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  HddOutlined,
  CodeOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { systemHealthService } from '../services/api';
import type { SystemHealth } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const SystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchHealth();

    let interval: number | null = null;
    if (autoRefresh) {
      interval = window.setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await systemHealthService.getHealth();
      setHealth(data);
    } catch (error) {
      console.error('Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
      case 'connected':
      case 'available':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'critical':
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
      case 'connected':
      case 'available':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (!health) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={2}>System Health</Title>
            <Text type="secondary">Monitor your system status and performance</Text>
          </div>
          <Space>
            <Button
              type={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              Auto-Refresh: {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchHealth} loading={loading}>
              Refresh
            </Button>
          </Space>
        </Space>
      </div>

      {/* Overall Status */}
      <Alert
        message={
          <Space>
            <Text strong>System Status: </Text>
            <Tag
              icon={getStatusIcon(health.status)}
              color={getStatusColor(health.status)}
              style={{ fontSize: 16 }}
            >
              {health.status.toUpperCase()}
            </Tag>
            <Text type="secondary">
              Last updated: {dayjs(health.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            </Text>
          </Space>
        }
        type={health.status === 'healthy' ? 'success' : health.status === 'warning' ? 'warning' : 'error'}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Quick Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Uptime"
              value={health.uptime}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Environment"
              value={health.environment.app_env.toUpperCase()}
              valueStyle={{
                color: health.environment.app_env === 'production' ? '#ff4d4f' : '#52c41a'
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="PHP Version"
              value={health.php.version}
              prefix={<CodeOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Laravel"
              value={health.laravel.version}
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Services Status */}
      <Card title={<Space><SafetyOutlined /> Services Status</Space>} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          {Object.entries(health.services).map(([key, service]) => (
            <Col key={key} span={8} style={{ marginBottom: 16 }}>
              <Card size="small" style={{ height: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    {getStatusIcon(service.status)}
                    <Text strong>{service.name}</Text>
                    <Tag color={getStatusColor(service.status)}>
                      {service.status.toUpperCase()}
                    </Tag>
                  </Space>
                  <Text type="secondary">{service.message}</Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={16}>
        {/* Database */}
        <Col span={12}>
          <Card
            title={<Space><DatabaseOutlined /> Database</Space>}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Status">
                <Tag
                  icon={getStatusIcon(health.database.status)}
                  color={getStatusColor(health.database.status)}
                >
                  {health.database.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Connection">
                {health.database.connection}
              </Descriptions.Item>
              {health.database.version && (
                <Descriptions.Item label="Version">
                  {health.database.version}
                </Descriptions.Item>
              )}
              {health.database.database && (
                <Descriptions.Item label="Database">
                  {health.database.database}
                </Descriptions.Item>
              )}
              {health.database.size_mb && (
                <Descriptions.Item label="Size">
                  {health.database.size_mb.toFixed(2)} MB
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* Cache */}
        <Col span={12}>
          <Card
            title={<Space><CloudServerOutlined /> Cache</Space>}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Default Store">
                <Tag color="blue">{health.cache.default}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Text strong>Stores:</Text>
              <List
                size="small"
                dataSource={Object.entries(health.cache.stores)}
                renderItem={([name, store]: [string, { driver: string; status: string }]) => (
                  <List.Item>
                    <Space>
                      <Tag color="blue">{name}</Tag>
                      <Text>{store.driver}</Text>
                      <Tag
                        color={getStatusColor(store.status)}
                        icon={getStatusIcon(store.status)}
                      >
                        {store.status.toUpperCase()}
                      </Tag>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Storage */}
      <Card
        title={<Space><HddOutlined /> Storage</Space>}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          {Object.entries(health.storage).map(([name, disk]: [string, {
            driver: string;
            status: string;
            usage?: {
              total_gb: number;
              used_gb: number;
              free_gb: number;
              usage_percent: number;
            };
          }]) => (
            <Col key={name} span={12} style={{ marginBottom: 16 }}>
              <Card size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Tag color="blue">{name}</Tag>
                    <Tag
                      color={getStatusColor(disk.status)}
                      icon={getStatusIcon(disk.status)}
                    >
                      {disk.status.toUpperCase()}
                    </Tag>
                    <Text type="secondary">{disk.driver}</Text>
                  </Space>

                  {disk.usage && (
                    <div style={{ width: '100%' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Progress
                          percent={disk.usage.usage_percent}
                          status={disk.usage.usage_percent > 80 ? 'exception' : 'normal'}
                          strokeColor={disk.usage.usage_percent > 80 ? '#ff4d4f' : '#52c41a'}
                        />
                        <Row gutter={16}>
                          <Col span={8}>
                            <Text type="secondary">Total:</Text>{' '}
                            <Text>{disk.usage.total_gb} GB</Text>
                          </Col>
                          <Col span={8}>
                            <Text type="secondary">Used:</Text>{' '}
                            <Text>{disk.usage.used_gb} GB</Text>
                          </Col>
                          <Col span={8}>
                            <Text type="secondary">Free:</Text>{' '}
                            <Text>{disk.usage.free_gb} GB</Text>
                          </Col>
                        </Row>
                      </Space>
                    </div>
                  )}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={16}>
        {/* PHP Info */}
        <Col span={12}>
          <Card
            title={<Space><CodeOutlined /> PHP Configuration</Space>}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Version">
                {health.php.version}
              </Descriptions.Item>
              <Descriptions.Item label="Memory Limit">
                {health.php.memory_limit}
              </Descriptions.Item>
              <Descriptions.Item label="Max Execution Time">
                {health.php.max_execution_time}s
              </Descriptions.Item>
              <Descriptions.Item label="Upload Max Filesize">
                {health.php.upload_max_filesize}
              </Descriptions.Item>
              <Descriptions.Item label="Post Max Size">
                {health.php.post_max_size}
              </Descriptions.Item>
              <Descriptions.Item label="OPcache">
                <Tag color={health.php.opcache === 'enabled' ? 'success' : 'default'}>
                  {health.php.opcache.toUpperCase()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Text strong>Loaded Extensions:</Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  {health.php.extensions.slice(0, 20).map((ext: string) => (
                    <Tag key={ext} color="blue">{ext}</Tag>
                  ))}
                  {health.php.extensions.length > 20 && (
                    <Tag>+{health.php.extensions.length - 20} more</Tag>
                  )}
                </Space>
              </div>
            </div>
          </Card>
        </Col>

        {/* Environment */}
        <Col span={12}>
          <Card
            title={<Space><CloudServerOutlined /> Environment</Space>}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="App Environment">
                <Tag
                  color={health.environment.app_env === 'production' ? 'error' : 'success'}
                >
                  {health.environment.app_env.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Debug Mode">
                <Tag color={health.environment.app_debug ? 'warning' : 'success'}>
                  {health.environment.app_debug ? 'ENABLED' : 'DISABLED'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="App URL">
                {health.environment.app_url}
              </Descriptions.Item>
              <Descriptions.Item label="Timezone">
                {health.environment.timezone}
              </Descriptions.Item>
              <Descriptions.Item label="Locale">
                {health.environment.locale}
              </Descriptions.Item>
              <Descriptions.Item label="Server OS">
                {health.server.os} ({health.server.os_family})
              </Descriptions.Item>
              <Descriptions.Item label="Hostname">
                {health.server.hostname}
              </Descriptions.Item>
              <Descriptions.Item label="PHP SAPI">
                {health.server.php_sapi}
              </Descriptions.Item>
              <Descriptions.Item label="Server Software">
                {health.server.server_software}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemHealthPage;
