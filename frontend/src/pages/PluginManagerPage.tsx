import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Switch,
  Row,
  Col,
  Typography,
  List,
  Descriptions,
  Tabs,
  Upload,
  message,
  Input,
  Tooltip,
  Badge,
  Progress,
  Statistic,
  Drawer,
  Form,
  Select,
  Spin,
  Empty,
  Popconfirm,
  Alert,
  Divider,
  Image,
  Rate,
} from 'antd';
import {
  AppstoreOutlined,
  UploadOutlined,
  CloudDownloadOutlined,
  ReloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  SearchOutlined,
  ShopOutlined,
  StarOutlined,
  DownloadOutlined,
  SafetyOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  GlobalOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd/es/upload';
import { pluginService } from '../services/api';

const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;

interface Plugin {
  id: number;
  slug: string;
  name: string;
  namespace: string;
  version: string;
  author: string;
  author_url?: string;
  description: string;
  path: string;
  entry_point: string;
  config?: Record<string, any>;
  default_config?: Record<string, any>;
  dependencies?: Record<string, string>;
  compatibility?: Record<string, string>;
  license: string;
  icon?: string;
  tags?: string[];
  is_system: boolean;
  is_premium: boolean;
  auto_update: boolean;
  status: 'inactive' | 'active' | 'error' | 'updating' | 'disabled';
  installed_at?: string;
  activated_at?: string;
  last_error?: string;
  hooks?: PluginHook[];
  hooks_count?: number;
}

interface PluginHook {
  id: number;
  hook: string;
  handler: string;
  type: 'action' | 'filter';
  priority: number;
  execution_count: number;
  avg_execution_time: number;
}

interface MarketplacePlugin {
  id: string;
  slug: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  cover_image?: string;
  tags: string[];
  downloads: number;
  rating: number;
  reviews_count: number;
  is_premium: boolean;
  price?: number;
  screenshots?: string[];
}

const PluginManagerPage: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [marketplacePlugins, setMarketplacePlugins] = useState<MarketplacePlugin[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('installed');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [updatesAvailable, setUpdatesAvailable] = useState<any[]>([]);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [marketplaceCategory, setMarketplaceCategory] = useState('');
  const [hooks, setHooks] = useState<any[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPlugins();
    fetchStats();
    fetchHooks();
    checkUpdates();
  }, []);

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const response = await pluginService.getAll();
      setPlugins(response.data.data || response.data);
    } catch (error) {
      message.error('Failed to load plugins');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await pluginService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const fetchHooks = async () => {
    try {
      const response = await pluginService.getHooks();
      setHooks(response.data.hooks || []);
    } catch (error) {
      console.error('Failed to load hooks:', error);
    }
  };

  const fetchMarketplace = async (search = '', category = '') => {
    setMarketplaceLoading(true);
    try {
      const response = await pluginService.marketplaceSearch({ search, category });
      setMarketplacePlugins(response.data.data || []);
    } catch (error) {
      message.error('Failed to load marketplace');
    } finally {
      setMarketplaceLoading(false);
    }
  };

  const checkUpdates = async () => {
    try {
      const response = await pluginService.checkUpdates();
      setUpdatesAvailable(response.data.updates || []);
    } catch (error) {
      console.error('Failed to check updates:', error);
    }
  };

  const handleActivate = async (plugin: Plugin) => {
    try {
      await pluginService.activate(plugin.id);
      message.success(`Plugin "${plugin.name}" activated`);
      fetchPlugins();
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to activate plugin');
    }
  };

  const handleDeactivate = async (plugin: Plugin) => {
    try {
      await pluginService.deactivate(plugin.id);
      message.success(`Plugin "${plugin.name}" deactivated`);
      fetchPlugins();
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to deactivate plugin');
    }
  };

  const handleUninstall = async (plugin: Plugin) => {
    Modal.confirm({
      title: 'Uninstall Plugin?',
      content: (
        <div>
          <Paragraph>Are you sure you want to uninstall "{plugin.name}"?</Paragraph>
          <Alert
            type="warning"
            message="This will remove all plugin data and settings."
            showIcon
            style={{ marginTop: 8 }}
          />
        </div>
      ),
      okText: 'Uninstall',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await pluginService.uninstall(plugin.id, { delete_data: true });
          message.success('Plugin uninstalled successfully');
          fetchPlugins();
          fetchStats();
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to uninstall plugin');
        }
      },
    });
  };

  const handleUpload: UploadProps['customRequest'] = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const formData = new FormData();
      formData.append('file', file);
      await pluginService.upload(formData);
      message.success('Plugin installed successfully');
      fetchPlugins();
      fetchStats();
      onSuccess?.();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to install plugin');
      onError?.(error);
    }
  };

  const handleInstallFromMarketplace = async (marketplaceId: string) => {
    try {
      await pluginService.installFromMarketplace(marketplaceId);
      message.success('Plugin installed successfully');
      setActiveTab('installed');
      fetchPlugins();
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to install plugin');
    }
  };

  const handleUpdate = async (plugin: Plugin) => {
    try {
      await pluginService.update(plugin.id);
      message.success('Plugin updated successfully');
      fetchPlugins();
      checkUpdates();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to update plugin');
    }
  };

  const handleToggleAutoUpdate = async (plugin: Plugin) => {
    try {
      await pluginService.toggleAutoUpdate(plugin.id);
      message.success('Auto-update setting changed');
      fetchPlugins();
    } catch (error: any) {
      message.error('Failed to change auto-update setting');
    }
  };

  const handleConfigSave = async (values: any) => {
    if (!selectedPlugin) return;
    try {
      await pluginService.updateConfig(selectedPlugin.id, values);
      message.success('Configuration saved');
      setConfigModalVisible(false);
      fetchPlugins();
    } catch (error: any) {
      message.error('Failed to save configuration');
    }
  };

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      active: { color: 'success', icon: <CheckCircleOutlined /> },
      inactive: { color: 'default', icon: <ExclamationCircleOutlined /> },
      error: { color: 'error', icon: <ExclamationCircleOutlined /> },
      updating: { color: 'processing', icon: <SyncOutlined spin /> },
      disabled: { color: 'warning', icon: <ExclamationCircleOutlined /> },
    };
    const { color, icon } = config[status] || config.inactive;
    return (
      <Tag color={color} icon={icon}>
        {status.toUpperCase()}
      </Tag>
    );
  };

  const columns: ColumnsType<Plugin> = [
    {
      title: 'Plugin',
      key: 'plugin',
      width: 300,
      render: (_: unknown, record: Plugin) => (
        <Space>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: record.is_system ? '#e6f7ff' : '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {record.icon ? (
              <img src={record.icon} alt={record.name} style={{ width: 32, height: 32 }} />
            ) : (
              <AppstoreOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />
            )}
          </div>
          <Space direction="vertical" size={0}>
            <Space>
              <Text strong>{record.name}</Text>
              {record.is_system && <Tag color="blue">System</Tag>}
              {record.is_premium && <Tag color="gold">Premium</Tag>}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              v{record.version} by {record.author}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
        { text: 'Error', value: 'error' },
      ],
      onFilter: (value: unknown, record: Plugin) => record.status === value,
    },
    {
      title: 'Hooks',
      dataIndex: 'hooks_count',
      width: 80,
      render: (count: number) => <Badge count={count} showZero color="blue" />,
    },
    {
      title: 'Auto-Update',
      dataIndex: 'auto_update',
      width: 100,
      render: (auto: boolean, record: Plugin) => (
        <Switch
          size="small"
          checked={auto}
          onChange={() => handleToggleAutoUpdate(record)}
          disabled={record.is_system}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Plugin) => (
        <Space size="small">
          <Tooltip title="Details">
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={() => {
                setSelectedPlugin(record);
                setDetailDrawerVisible(true);
              }}
            />
          </Tooltip>
          {record.status === 'active' ? (
            <Tooltip title="Deactivate">
              <Button
                type="text"
                icon={<StopOutlined />}
                onClick={() => handleDeactivate(record)}
                disabled={record.is_system}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Activate">
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => handleActivate(record)}
                disabled={record.status === 'error'}
              />
            </Tooltip>
          )}
          <Tooltip title="Settings">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => {
                setSelectedPlugin(record);
                form.setFieldsValue(record.config || {});
                setConfigModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Uninstall">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleUninstall(record)}
              disabled={record.is_system}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const marketplaceColumns: ColumnsType<MarketplacePlugin> = [
    {
      title: 'Plugin',
      key: 'plugin',
      width: 300,
      render: (_: unknown, record: MarketplacePlugin) => (
        <Space>
          <Image
            src={record.icon}
            width={48}
            height={48}
            style={{ borderRadius: 8, objectFit: 'cover' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            preview={false}
          />
          <Space direction="vertical" size={0}>
            <Space>
              <Text strong>{record.name}</Text>
              {record.is_premium && <Tag color="gold">Premium</Tag>}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              v{record.version} by {record.author}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      width: 150,
      render: (rating: number, record: MarketplacePlugin) => (
        <Space direction="vertical" size={0}>
          <Rate disabled defaultValue={rating} allowHalf style={{ fontSize: 12 }} />
          <Text type="secondary" style={{ fontSize: 11 }}>
            ({record.reviews_count} reviews)
          </Text>
        </Space>
      ),
    },
    {
      title: 'Downloads',
      dataIndex: 'downloads',
      width: 100,
      render: (downloads: number) => (
        <Text>
          <DownloadOutlined /> {downloads?.toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: MarketplacePlugin) => {
        const isInstalled = plugins.some((p) => p.slug === record.slug);
        return (
          <Button
            type={isInstalled ? 'default' : 'primary'}
            size="small"
            icon={isInstalled ? <CheckCircleOutlined /> : <CloudDownloadOutlined />}
            onClick={() => !isInstalled && handleInstallFromMarketplace(record.id)}
            disabled={isInstalled}
          >
            {isInstalled ? 'Installed' : 'Install'}
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Plugins"
              value={stats.total_plugins || 0}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active"
              value={stats.active_plugins || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Hooks"
              value={stats.total_hooks || 0}
              prefix={<CodeOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Updates Available"
              value={updatesAvailable.length}
              valueStyle={{ color: updatesAvailable.length > 0 ? '#faad14' : undefined }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === 'marketplace') {
              fetchMarketplace();
            }
          }}
          tabBarExtraContent={
            <Space>
              {activeTab === 'installed' && updatesAvailable.length > 0 && (
                <Badge count={updatesAvailable.length}>
                  <Button icon={<SyncOutlined />} onClick={() => {}}>
                    Update All
                  </Button>
                </Badge>
              )}
              <Button icon={<ReloadOutlined />} onClick={fetchPlugins}>
                Refresh
              </Button>
              <Upload
                accept=".zip"
                showUploadList={false}
                customRequest={handleUpload}
              >
                <Button type="primary" icon={<UploadOutlined />}>
                  Upload Plugin
                </Button>
              </Upload>
            </Space>
          }
        >
          <TabPane
            tab={
              <span>
                <AppstoreOutlined />
                Installed
              </span>
            }
            key="installed"
          >
            <Table
              columns={columns}
              dataSource={plugins}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <ShopOutlined />
                Marketplace
              </span>
            }
            key="marketplace"
          >
            <Space style={{ marginBottom: 16 }}>
              <Search
                placeholder="Search plugins..."
                style={{ width: 300 }}
                onSearch={(value) => fetchMarketplace(value, marketplaceCategory)}
                onChange={(e) => setMarketplaceSearch(e.target.value)}
                allowClear
              />
              <Select
                placeholder="Category"
                style={{ width: 150 }}
                allowClear
                onChange={(value) => {
                  setMarketplaceCategory(value);
                  fetchMarketplace(marketplaceSearch, value);
                }}
              >
                <Select.Option value="seo">SEO</Select.Option>
                <Select.Option value="analytics">Analytics</Select.Option>
                <Select.Option value="security">Security</Select.Option>
                <Select.Option value="social">Social Media</Select.Option>
                <Select.Option value="ecommerce">E-Commerce</Select.Option>
              </Select>
            </Space>
            <Table
              columns={marketplaceColumns}
              dataSource={marketplacePlugins}
              rowKey="id"
              loading={marketplaceLoading}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: <Empty description="No plugins found" /> }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <ThunderboltOutlined />
                Updates
              </span>
            }
            key="updates"
          >
            {updatesAvailable.length === 0 ? (
              <Empty description="All plugins are up to date" />
            ) : (
              <List
                dataSource={updatesAvailable}
                renderItem={(update: any) => (
                  <List.Item
                    actions={[
                      <Button
                        type="primary"
                        icon={<CloudDownloadOutlined />}
                        onClick={() => {
                          const plugin = plugins.find((p) => p.slug === update.slug);
                          if (plugin) handleUpdate(plugin);
                        }}
                      >
                        Update
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          {update.name}
                          <Tag color="blue">
                            {update.current_version} → {update.new_version}
                          </Tag>
                        </Space>
                      }
                      description={update.changelog?.substring(0, 200)}
                    />
                  </List.Item>
                )}
              />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <CodeOutlined />
                Hooks
              </span>
            }
            key="hooks"
          >
            <Table
              dataSource={Object.entries(hooks).flatMap(([hook, items]: [string, any]) =>
                items.map((item: any) => ({ ...item, hook_name: hook }))
              )}
              rowKey="id"
              columns={[
                { title: 'Hook', dataIndex: 'hook_name', width: 200 },
                {
                  title: 'Type',
                  dataIndex: 'type',
                  width: 80,
                  render: (type: string) => (
                    <Tag color={type === 'filter' ? 'blue' : 'green'}>{type}</Tag>
                  ),
                },
                { title: 'Handler', dataIndex: 'handler', ellipsis: true },
                { title: 'Priority', dataIndex: 'priority', width: 80 },
                {
                  title: 'Executions',
                  dataIndex: 'execution_count',
                  width: 100,
                  render: (count: number) => count?.toLocaleString(),
                },
                {
                  title: 'Avg Time',
                  dataIndex: 'avg_execution_time',
                  width: 100,
                  render: (time: number) => (time ? `${(time * 1000).toFixed(2)}ms` : '-'),
                },
              ]}
              pagination={{ pageSize: 20 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Drawer
        title={
          <Space>
            <AppstoreOutlined />
            {selectedPlugin?.name}
          </Space>
        }
        placement="right"
        width={600}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        {selectedPlugin && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Slug">{selectedPlugin.slug}</Descriptions.Item>
              <Descriptions.Item label="Version">{selectedPlugin.version}</Descriptions.Item>
              <Descriptions.Item label="Author">
                {selectedPlugin.author_url ? (
                  <a href={selectedPlugin.author_url} target="_blank" rel="noopener noreferrer">
                    {selectedPlugin.author}
                  </a>
                ) : (
                  selectedPlugin.author
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Namespace">{selectedPlugin.namespace}</Descriptions.Item>
              <Descriptions.Item label="Status">{getStatusTag(selectedPlugin.status)}</Descriptions.Item>
              <Descriptions.Item label="License">{selectedPlugin.license}</Descriptions.Item>
              <Descriptions.Item label="Installed">
                {selectedPlugin.installed_at
                  ? new Date(selectedPlugin.installed_at).toLocaleString()
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Activated">
                {selectedPlugin.activated_at
                  ? new Date(selectedPlugin.activated_at).toLocaleString()
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5}>Description</Title>
              <Paragraph>{selectedPlugin.description}</Paragraph>
            </div>

            {selectedPlugin.dependencies && Object.keys(selectedPlugin.dependencies).length > 0 && (
              <div>
                <Title level={5}>Dependencies</Title>
                <Space wrap>
                  {Object.entries(selectedPlugin.dependencies).map(([slug, version]) => (
                    <Tag key={slug}>
                      {slug}: {version as string}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {selectedPlugin.tags && selectedPlugin.tags.length > 0 && (
              <div>
                <Title level={5}>Tags</Title>
                <Space wrap>
                  {selectedPlugin.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            )}

            {selectedPlugin.last_error && (
              <Alert
                type="error"
                message="Error"
                description={selectedPlugin.last_error}
                showIcon
              />
            )}
          </Space>
        )}
      </Drawer>

      <Modal
        title={
          <Space>
            <SettingOutlined />
            Plugin Configuration: {selectedPlugin?.name}
          </Space>
        }
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleConfigSave}>
          {selectedPlugin?.default_config &&
            Object.entries(selectedPlugin.default_config).map(([key, defaultValue]) => (
              <Form.Item
                key={key}
                name={key}
                label={key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              >
                <Input />
              </Form.Item>
            ))}
          {(!selectedPlugin?.default_config ||
            Object.keys(selectedPlugin.default_config).length === 0) && (
            <Alert
              type="info"
              message="This plugin has no configurable options."
              showIcon
            />
          )}
        </Form>
      </Modal>
    </div>
  );
};

function StopOutlined(props: any) {
  return <ExclamationCircleOutlined {...props} />;
}

export default PluginManagerPage;
