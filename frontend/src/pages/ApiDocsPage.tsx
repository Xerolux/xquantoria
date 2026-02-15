import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Tabs,
  Table,
  Tag,
  Space,
  Collapse,
  Button,
  Input,
  Divider,
  Empty,
  Spin,
  message,
  Descriptions,
} from 'antd';
import {
  ApiOutlined,
  PlayCircleOutlined,
  CodeOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface Endpoint {
  method: string;
  path: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  response?: Record<string, unknown>;
  authRequired: boolean;
}

interface ApiGroup {
  name: string;
  endpoints: Endpoint[];
}

const ApiDocsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apiGroups, setApiGroups] = useState<ApiGroup[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [testResponse, setTestResponse] = useState<string>('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchApiDocs();
  }, []);

  const fetchApiDocs = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api-docs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      setApiGroups(data.groups || []);
    } catch (error) {
      generateMockDocs();
    } finally {
      setLoading(false);
    }
  };

  const generateMockDocs = () => {
    setApiGroups([
      {
        name: 'Authentication',
        endpoints: [
          {
            method: 'POST',
            path: '/api/v1/auth/login',
            description: 'User login with email and password',
            parameters: [
              { name: 'email', type: 'string', required: true, description: 'User email' },
              { name: 'password', type: 'string', required: true, description: 'User password' },
              { name: 'remember_me', type: 'boolean', required: false, description: 'Remember login' },
            ],
            response: { token: 'jwt_token', user: {} },
            authRequired: false,
          },
          {
            method: 'POST',
            path: '/api/v1/auth/logout',
            description: 'Logout current user',
            authRequired: true,
          },
          {
            method: 'GET',
            path: '/api/v1/auth/me',
            description: 'Get current authenticated user',
            authRequired: true,
          },
        ],
      },
      {
        name: 'Posts',
        endpoints: [
          {
            method: 'GET',
            path: '/api/v1/posts',
            description: 'List all posts with pagination',
            parameters: [
              { name: 'page', type: 'integer', required: false, description: 'Page number' },
              { name: 'per_page', type: 'integer', required: false, description: 'Items per page' },
              { name: 'status', type: 'string', required: false, description: 'Filter by status' },
              { name: 'category_id', type: 'integer', required: false, description: 'Filter by category' },
            ],
            authRequired: true,
          },
          {
            method: 'POST',
            path: '/api/v1/posts',
            description: 'Create a new post',
            parameters: [
              { name: 'title', type: 'string', required: true, description: 'Post title' },
              { name: 'content', type: 'string', required: true, description: 'Post content' },
              { name: 'status', type: 'string', required: false, description: 'draft, published, scheduled' },
            ],
            authRequired: true,
          },
          {
            method: 'GET',
            path: '/api/v1/posts/{id}',
            description: 'Get a single post by ID',
            authRequired: true,
          },
          {
            method: 'PUT',
            path: '/api/v1/posts/{id}',
            description: 'Update an existing post',
            authRequired: true,
          },
          {
            method: 'DELETE',
            path: '/api/v1/posts/{id}',
            description: 'Delete a post',
            authRequired: true,
          },
        ],
      },
      {
        name: 'Media',
        endpoints: [
          {
            method: 'GET',
            path: '/api/v1/media',
            description: 'List all media files',
            authRequired: true,
          },
          {
            method: 'POST',
            path: '/api/v1/media',
            description: 'Upload a new media file',
            authRequired: true,
          },
          {
            method: 'DELETE',
            path: '/api/v1/media/{id}',
            description: 'Delete a media file',
            authRequired: true,
          },
        ],
      },
      {
        name: 'Users',
        endpoints: [
          {
            method: 'GET',
            path: '/api/v1/users',
            description: 'List all users (admin only)',
            authRequired: true,
          },
          {
            method: 'POST',
            path: '/api/v1/users',
            description: 'Create a new user (admin only)',
            authRequired: true,
          },
          {
            method: 'PUT',
            path: '/api/v1/users/{id}',
            description: 'Update user information',
            authRequired: true,
          },
        ],
      },
      {
        name: 'Webhooks',
        endpoints: [
          {
            method: 'GET',
            path: '/api/v1/webhooks',
            description: 'List all webhooks',
            authRequired: true,
          },
          {
            method: 'POST',
            path: '/api/v1/webhooks',
            description: 'Create a new webhook',
            authRequired: true,
          },
          {
            method: 'POST',
            path: '/api/v1/webhooks/{id}/test',
            description: 'Test a webhook',
            authRequired: true,
          },
        ],
      },
      {
        name: 'Elasticsearch',
        endpoints: [
          {
            method: 'GET',
            path: '/api/v1/elasticsearch/search',
            description: 'Search across all indices',
            parameters: [
              { name: 'q', type: 'string', required: true, description: 'Search query' },
              { name: 'index', type: 'string', required: false, description: 'Index to search' },
              { name: 'size', type: 'integer', required: false, description: 'Results per page' },
            ],
            authRequired: true,
          },
          {
            method: 'GET',
            path: '/api/v1/elasticsearch/suggest',
            description: 'Get search suggestions',
            authRequired: true,
          },
        ],
      },
    ]);
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'green',
      POST: 'blue',
      PUT: 'orange',
      PATCH: 'orange',
      DELETE: 'red',
    };
    return colors[method] || 'default';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  };

  const columns = [
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method: string) => (
        <Tag color={getMethodColor(method)} style={{ width: 60, textAlign: 'center' }}>
          {method}
        </Tag>
      ),
    },
    {
      title: 'Path',
      dataIndex: 'path',
      key: 'path',
      render: (path: string) => <Text code>{path}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Auth',
      dataIndex: 'authRequired',
      key: 'auth',
      width: 60,
      render: (required: boolean) => (
        <Tag color={required ? 'blue' : 'default'}>
          {required ? 'Required' : 'Public'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: Endpoint) => (
        <Button type="link" size="small" onClick={() => setSelectedEndpoint(record)}>
          Details
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <ApiOutlined /> API Documentation
      </Title>
      <Text type="secondary">REST API endpoints and usage guide</Text>

      <Divider />

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Base URL</Title>
        <Paragraph copyable>
          <code>{API_BASE_URL}</code>
        </Paragraph>
        <Title level={4}>Authentication</Title>
        <Text>
          Most endpoints require Bearer token authentication. Include the token in the
          Authorization header:
        </Text>
        <Paragraph copyable style={{ marginTop: 8 }}>
          <code>Authorization: Bearer {'{your_token}'}</code>
        </Paragraph>
      </Card>

      <Collapse defaultActiveKey={apiGroups.map((g) => g.name)}>
        {apiGroups.map((group) => (
          <Panel
            header={
              <Space>
                <ApiOutlined />
                <strong>{group.name}</strong>
                <Tag>{group.endpoints.length} endpoints</Tag>
              </Space>
            }
            key={group.name}
          >
            <Table
              columns={columns}
              dataSource={group.endpoints}
              rowKey="path"
              pagination={false}
              size="small"
            />
          </Panel>
        ))}
      </Collapse>

      {selectedEndpoint && (
        <Card
          title={
            <Space>
              <Tag color={getMethodColor(selectedEndpoint.method)}>
                {selectedEndpoint.method}
              </Tag>
              <Text code>{selectedEndpoint.path}</Text>
            </Space>
          }
          style={{ marginTop: 24 }}
          extra={
            <Button onClick={() => setSelectedEndpoint(null)}>Schließen</Button>
          }
        >
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Beschreibung">
              {selectedEndpoint.description}
            </Descriptions.Item>
            <Descriptions.Item label="Auth Required">
              <Tag color={selectedEndpoint.authRequired ? 'blue' : 'default'}>
                {selectedEndpoint.authRequired ? 'Ja' : 'Nein'}
              </Tag>
            </Descriptions.Item>
            {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
              <Descriptions.Item label="Parameter">
                <Table
                  size="small"
                  dataSource={selectedEndpoint.parameters}
                  rowKey="name"
                  pagination={false}
                  columns={[
                    { title: 'Name', dataIndex: 'name' },
                    { title: 'Type', dataIndex: 'type' },
                    {
                      title: 'Required',
                      dataIndex: 'required',
                      render: (v: boolean) => <Tag color={v ? 'red' : 'default'}>{v ? 'Yes' : 'No'}</Tag>,
                    },
                    { title: 'Description', dataIndex: 'description' },
                  ]}
                />
              </Descriptions.Item>
            )}
            {selectedEndpoint.response && (
              <Descriptions.Item label="Response Example">
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                  {JSON.stringify(selectedEndpoint.response, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}
    </div>
  );
};

export default ApiDocsPage;
