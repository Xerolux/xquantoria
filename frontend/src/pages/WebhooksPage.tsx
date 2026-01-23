import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Typography,
  Tag,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tabs,
  Tooltip,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { webhooksService } from '../services/api';
import type { Webhook, WebhookLog, WebhookEvent } from '../types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph, Badge } = Typography;
const { Option } = Select;

const WebhooksPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<Record<string, WebhookEvent[]>>({});
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('webhooks');

  useEffect(() => {
    fetchWebhooks();
    fetchEvents();
  }, []);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await webhooksService.getAll();
      setWebhooks(response.data);
    } catch (error) {
      message.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await webhooksService.getEvents();
      setEvents(response.events);
    } catch (error) {
      message.error('Failed to load events');
    }
  };

  const handleCreate = () => {
    setSelectedWebhook(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    form.setFieldsValue({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      headers: webhook.headers,
      is_active: webhook.is_active,
    });
    setIsModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (selectedWebhook) {
        await webhooksService.update(selectedWebhook.id, values);
        message.success('Webhook updated successfully');
      } else {
        await webhooksService.create(values);
        message.success('Webhook created successfully');
      }

      setIsModalVisible(false);
      fetchWebhooks();
    } catch (error) {
      message.error('Failed to save webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await webhooksService.delete(id);
      message.success('Webhook deleted successfully');
      fetchWebhooks();
    } catch (error) {
      message.error('Failed to delete webhook');
    }
  };

  const handleTest = async (webhook: Webhook) => {
    setTestingWebhook(webhook.id);
    try {
      const result = await webhooksService.test(webhook.id);
      if (result.success) {
        message.success('Webhook test successful');
      } else {
        message.error(`Webhook test failed: ${result.error_message}`);
      }
    } catch (error) {
      message.error('Failed to test webhook');
    } finally {
      setTestingWebhook(null);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      await webhooksService.toggle(webhook.id);
      message.success('Webhook status updated');
      fetchWebhooks();
    } catch (error) {
      message.error('Failed to toggle webhook');
    }
  };

  const handleViewLogs = async (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    try {
      const [logsResponse, statsResponse] = await Promise.all([
        webhooksService.getLogs(webhook.id),
        webhooksService.getStats(webhook.id),
      ]);
      setLogs(logsResponse.data);
      setStats(statsResponse.data);
      setIsLogModalVisible(true);
    } catch (error) {
      message.error('Failed to load webhook logs');
    }
  };

  const handleRetry = async (webhook: Webhook) => {
    try {
      const result = await webhooksService.retry(webhook.id);
      message.success(`Queued ${result.data.retry_count} failed webhooks for retry`);
    } catch (error) {
      message.error('Failed to retry webhooks');
    }
  };

  const handleRegenerateSecret = async (webhook: Webhook) => {
    try {
      const result = await webhooksService.regenerateSecret(webhook.id);
      message.success('Secret regenerated. Save it securely: ' + result.data.secret);
    } catch (error) {
      message.error('Failed to regenerate secret');
    }
  };

  const webhookColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Webhook) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.url}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Events',
      dataIndex: 'events',
      key: 'events',
      render: (events: string[]) => (
        <Space size={[4, 4]} wrap>
          {events.slice(0, 3).map((event) => (
            <Tag key={event} color="blue">
              {event}
            </Tag>
          ))}
          {events.length > 3 && (
            <Tag>+{events.length - 3} more</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Badge
          status={isActive ? 'success' : 'default'}
          text={isActive ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      title: 'Statistics',
      key: 'stats',
      render: (_: any, record: Webhook) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Success: <Text style={{ color: '#52c41a' }}>{record.success_count}</Text>
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Failed: <Text style={{ color: '#ff4d4f' }}>{record.failure_count}</Text>
          </Text>
        </Space>
      ),
    },
    {
      title: 'Last Triggered',
      dataIndex: 'last_triggered_at',
      key: 'last_triggered_at',
      render: (date: string) => (
        date ? dayjs(date).fromNow() : 'Never'
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Webhook) => (
        <Space size="small">
          <Tooltip title="Test">
            <Button
              type="text"
              icon={<SendOutlined />}
              loading={testingWebhook === record.id}
              onClick={() => handleTest(record)}
            />
          </Tooltip>
          <Tooltip title="View Logs">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewLogs(record)}
            />
          </Tooltip>
          <Tooltip title="Toggle">
            <Button
              type="text"
              icon={record.is_active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              onClick={() => handleToggle(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this webhook?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const logColumns = [
    {
      title: 'Event',
      dataIndex: 'event_type',
      key: 'event_type',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'success',
      key: 'success',
      render: (success: boolean, record: WebhookLog) => (
        <Space>
          {success ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Success ({record.status_code})
            </Tag>
          ) : (
            <Tag color="error" icon={<CloseCircleOutlined />}>
              Failed
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Attempt',
      dataIndex: 'attempt',
      key: 'attempt',
      render: (attempt: number) => <Tag>#{attempt}</Tag>,
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => <Text>{duration}ms</Text>,
    },
    {
      title: 'Delivered At',
      dataIndex: 'delivered_at',
      key: 'delivered_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  const renderEventGroups = () => {
    return Object.entries(events).map(([category, categoryEvents]) => (
      <Card
        key={category}
        title={category}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Space size={[8, 8]} wrap>
          {categoryEvents.map(([eventName, _eventInfo]: [string, any]) => (
            <Tag key={eventName} color="blue">
              {eventName}
            </Tag>
          ))}
        </Space>
      </Card>
    ));
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col flex="auto">
          <Title level={2}>Webhooks</Title>
          <Text type="secondary">Manage webhooks for real-time event notifications</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Create Webhook
          </Button>
        </Col>
      </Row>

      <Divider />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'webhooks',
            label: 'Webhooks',
            children: (
              <Card>
                <Table
                  columns={webhookColumns}
                  dataSource={webhooks}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} webhooks`,
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'events',
            label: 'Available Events',
            children: renderEventGroups(),
          },
        ]}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={selectedWebhook ? 'Edit Webhook' : 'Create Webhook'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter webhook name' }]}
          >
            <Input placeholder="My Webhook" />
          </Form.Item>

          <Form.Item
            label="URL"
            name="url"
            rules={[
              { required: true, message: 'Please enter webhook URL' },
              { type: 'url', message: 'Please enter a valid URL' },
            ]}
          >
            <Input placeholder="https://your-server.com/webhook" />
          </Form.Item>

          <Form.Item
            label="Events"
            name="events"
            rules={[{ required: true, message: 'Please select at least one event' }]}
            tooltip="Select which events should trigger this webhook"
          >
            <Select
              mode="multiple"
              placeholder="Select events"
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {Object.entries(events).map(([category, categoryEvents]) => (
                <Select.OptGroup key={category} label={category}>
                  {categoryEvents.map(([eventName, _eventInfo]: [string, any]) => (
                    <Option
                      key={eventName}
                      value={eventName}
                      label={eventName}
                    >
                      {eventName}
                      <span style={{ color: '#8c8c8c', marginLeft: 8 }}>
                        - {_eventInfo.description}
                      </span>
                    </Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Secret (Optional)"
            name="secret"
            tooltip="Leave empty to auto-generate a secret"
          >
            <Input.Password placeholder="Auto-generated if empty" />
          </Form.Item>

          <Form.Item
            label="Active"
            name="is_active"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Logs Modal */}
      <Modal
        title={`Webhook Logs - ${selectedWebhook?.name}`}
        open={isLogModalVisible}
        onCancel={() => setIsLogModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsLogModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="retry"
            icon={<ReloadOutlined />}
            onClick={() => selectedWebhook && handleRetry(selectedWebhook)}
          >
            Retry Failed
          </Button>,
          <Button
            key="secret"
            icon={<KeyOutlined />}
            onClick={() => selectedWebhook && handleRegenerateSecret(selectedWebhook)}
          >
            Regenerate Secret
          </Button>,
        ]}
        width={1000}
      >
        {stats && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Statistic
                title="Total Deliveries"
                value={stats.total_deliveries}
                prefix={<SendOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Success Rate"
                value={stats.success_rate}
                suffix="%"
                valueStyle={{ color: stats.success_rate > 80 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Successful"
                value={stats.successful_deliveries}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Failed"
                value={stats.failed_deliveries}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
          </Row>
        )}

        <Divider />

        <Table
          columns={logColumns}
          dataSource={logs}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} logs`,
          }}
          expandable={{
            expandedRowRender: (record) => (
              <Card size="small" title="Details">
                <Paragraph>
                  <Text strong>Response:</Text>
                  <br />
                  <Text code>{record.response_body || 'No response body'}</Text>
                </Paragraph>
                {record.error_message && (
                  <Paragraph>
                    <Text strong type="danger">Error:</Text>
                    <br />
                    <Text type="danger">{record.error_message}</Text>
                  </Paragraph>
                )}
                <Paragraph>
                  <Text strong>Payload:</Text>
                  <br />
                  <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                    {JSON.stringify(record.payload, null, 2)}
                  </pre>
                </Paragraph>
              </Card>
            ),
          }}
        />
      </Modal>
    </div>
  );
};

export default WebhooksPage;
