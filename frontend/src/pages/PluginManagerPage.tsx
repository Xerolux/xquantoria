import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Tag,
  Modal,
  Input,
  Switch,
  Progress,
  Row,
  Col,
  Typography,
  Alert,
  List,
  Descriptions,
} from 'antd';

const { Text } = Typography;
import {
  AppstoreOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Plugin {
  id: number;
  name: string;
  version: string;
  author: string;
  description: string;
  path: string;
  is_active: boolean;
  installed_at: string;
  config?: Record<string, any>;
}

interface PluginHook {
  id: number;
  name: string;
  hook: string;
  description: string;
  priority: number;
}

const PluginManagerPage: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    setLoading(true);
    // Mock data for now
    setPlugins([
      {
        id: 1,
        name: 'SEO Booster',
        version: '1.0.0',
        author: 'DevTeam',
        description: 'Automatically optimize posts for SEO with meta tags and sitemaps',
        path: '/plugins/seo-booster',
        is_active: true,
        installed_at: '2024-01-15T10:00:00Z',
        config: { auto_optimize: true, keywords_limit: 10 },
      },
      {
        id: 2,
        name: 'Social Share',
        version: '2.1.0',
        author: 'SocialTech',
        description: 'Add social sharing buttons to all posts',
        path: '/plugins/social-share',
        is_active: true,
        installed_at: '2024-01-10T14:30:00Z',
      },
      {
        id: 3,
        name: 'Analytics Pro',
        version: '1.5.2',
        author: 'Analytics Inc',
        description: 'Advanced analytics with custom dashboards',
        path: '/plugins/analytics-pro',
        is_active: false,
        installed_at: '2024-01-05T09:00:00Z',
      },
    ]);
    setLoading(false);
  };

  const handleTogglePlugin = async (plugin: Plugin) => {
    try {
      // Mock toggle
      setPlugins(plugins.map(p =>
        p.id === plugin.id ? { ...p, is_active: !p.is_active } : p
      ));
      message.success(`Plugin "${plugin.name}" ${plugin.is_active ? 'deactivated' : 'activated'}`);
    } catch (error) {
      message.error('Failed to toggle plugin');
    }
  };

  const handleDeletePlugin = async (plugin: Plugin) => {
    Modal.confirm({
      title: 'Delete Plugin?',
      content: `Are you sure you want to delete "${plugin.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setPlugins(plugins.filter(p => p.id !== plugin.id));
          message.success('Plugin deleted successfully');
        } catch (error) {
          message.error('Failed to delete plugin');
        }
      },
    });
  };

  const handleViewDetails = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    setDetailModalVisible(true);
  };

  const columns: ColumnsType<Plugin> = [
    {
      title: 'Plugin',
      key: 'plugin',
      render: (_: unknown, record: Plugin) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            v{record.version} by {record.author}
          </div>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean, record: Plugin) => (
        <Switch
          checked={isActive}
          onChange={() => handleTogglePlugin(record)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value: unknown, record: Plugin) => record.is_active === value,
    },
    {
      title: 'Installed',
      dataIndex: 'installed_at',
      key: 'installed_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.installed_at).getTime() - new Date(b.installed_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Plugin) => (
        <Space size="small">
          <Button
            type="link"
            icon={<InfoCircleOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            Details
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeletePlugin(record)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const availableHooks = [
    { name: 'post.created', description: 'When a post is created' },
    { name: 'post.updated', description: 'When a post is updated' },
    { name: 'post.deleted', description: 'When a post is deleted' },
    { name: 'user.login', description: 'When a user logs in' },
    { name: 'user.logout', description: 'When a user logs out' },
    { name: 'comment.created', description: 'When a comment is created' },
    { name: 'media.uploaded', description: 'When media is uploaded' },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <AppstoreOutlined />
            <span>Plugin Manager</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchPlugins}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              Install Plugin
            </Button>
          </Space>
        }
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#52c41a' }}>
                {plugins.filter(p => p.is_active).length}
              </div>
              <div style={{ color: '#999' }}>Active Plugins</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#faad14' }}>
                {plugins.filter(p => !p.is_active).length}
              </div>
              <div style={{ color: '#999' }}>Inactive Plugins</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold' }}>
                {availableHooks.length}
              </div>
              <div style={{ color: '#999' }}>Available Hooks</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Installed Plugins">
        <Table
          columns={columns}
          dataSource={plugins}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Card title="Available Hooks" style={{ marginTop: 16 }}>
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 4 }}
          dataSource={availableHooks}
          renderItem={(hook) => (
            <List.Item>
              <Card size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text code>{hook.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {hook.description}
                  </Text>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Card>

      {/* Plugin Details Modal */}
      <Modal
        title={
          <Space>
            <AppstoreOutlined />
            {selectedPlugin?.name}
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          <Button key="configure" icon={<SettingOutlined />}>
            Configure
          </Button>,
        ]}
        width={700}
      >
        {selectedPlugin && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Version">{selectedPlugin.version}</Descriptions.Item>
              <Descriptions.Item label="Author">{selectedPlugin.author}</Descriptions.Item>
              <Descriptions.Item label="Path">{selectedPlugin.path}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedPlugin.is_active ? 'success' : 'default'}>
                  {selectedPlugin.is_active ? 'Active' : 'Inactive'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Installed">
                {new Date(selectedPlugin.installed_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>Description:</Text>
              <p style={{ marginTop: 8 }}>{selectedPlugin.description}</p>
            </div>

            {selectedPlugin.config && (
              <div>
                <Text strong>Configuration:</Text>
                <pre style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                  {JSON.stringify(selectedPlugin.config, null, 2)}
                </pre>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default PluginManagerPage;
