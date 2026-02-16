import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Typography,
  Drawer,
  Editor,
  Divider,
  Progress,
  List,
  Avatar,
  Tabs,
  Timeline,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  MailOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  CopyOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { newsletterService } from '../services/api';
import type { Newsletter, NewsletterCampaign, NewsletterSubscriber } from '../types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

interface Subscriber {
  id: number;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  subscribed_at: string;
  unsubscribed_at?: string;
  source?: string;
}

interface Campaign {
  id: number;
  subject: string;
  preheader?: string;
  content: string;
  template_id?: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at?: string;
  sent_at?: string;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  created_at: string;
}

interface Template {
  id: number;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  created_at: string;
}

const NewslettersPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    activeSubscribers: 0,
    totalCampaigns: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
  });

  const [subscriberModalVisible, setSubscriberModalVisible] = useState(false);
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [statsDrawerVisible, setStatsDrawerVisible] = useState(false);

  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');

  const [subscriberForm] = Form.useForm();
  const [campaignForm] = Form.useForm();
  const [templateForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subscribersData, campaignsData, templatesData, statsData] = await Promise.all([
        newsletterService.getSubscribers(),
        newsletterService.getCampaigns(),
        newsletterService.getTemplates(),
        newsletterService.getStats(),
      ]);

      setSubscribers(subscribersData.data || []);
      setCampaigns(campaignsData.data || []);
      setTemplates(templatesData.data || []);
      setStats(statsData);
    } catch (error) {
      message.error('Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscriber = async () => {
    try {
      const values = await subscriberForm.validateFields();
      if (editingSubscriber) {
        await newsletterService.updateSubscriber(editingSubscriber.id, values);
        message.success('Abonnent aktualisiert');
      } else {
        await newsletterService.createSubscriber(values);
        message.success('Abonnent hinzugefügt');
      }
      setSubscriberModalVisible(false);
      subscriberForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Fehler beim Speichern');
    }
  };

  const handleDeleteSubscriber = async (id: number) => {
    try {
      await newsletterService.deleteSubscriber(id);
      message.success('Abonnent gelöscht');
      fetchData();
    } catch (error) {
      message.error('Löschen fehlgeschlagen');
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const values = await campaignForm.validateFields();
      if (editingCampaign) {
        await newsletterService.updateCampaign(editingCampaign.id, values);
        message.success('Kampagne aktualisiert');
      } else {
        await newsletterService.createCampaign(values);
        message.success('Kampagne erstellt');
      }
      setCampaignModalVisible(false);
      campaignForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Fehler beim Speichern');
    }
  };

  const handleSendCampaign = async (id: number) => {
    try {
      await newsletterService.sendCampaign(id);
      message.success('Kampagne wird versendet...');
      fetchData();
    } catch (error) {
      message.error('Versand fehlgeschlagen');
    }
  };

  const handleDuplicateCampaign = async (id: number) => {
    try {
      await newsletterService.duplicateCampaign(id);
      message.success('Kampagne dupliziert');
      fetchData();
    } catch (error) {
      message.error('Duplizieren fehlgeschlagen');
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const values = await templateForm.validateFields();
      if (editingTemplate) {
        await newsletterService.updateTemplate(editingTemplate.id, values);
        message.success('Vorlage aktualisiert');
      } else {
        await newsletterService.createTemplate(values);
        message.success('Vorlage erstellt');
      }
      setTemplateModalVisible(false);
      templateForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Fehler beim Speichern');
    }
  };

  const handleExportSubscribers = async () => {
    try {
      const blob = await newsletterService.exportSubscribers();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers-${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      message.success('Export erfolgreich');
    } catch (error) {
      message.error('Export fehlgeschlagen');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      unsubscribed: 'default',
      bounced: 'red',
      draft: 'default',
      scheduled: 'blue',
      sending: 'processing',
      sent: 'success',
      failed: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      active: <CheckCircleOutlined />,
      unsubscribed: <CloseCircleOutlined />,
      bounced: <CloseCircleOutlined />,
      draft: <FileTextOutlined />,
      scheduled: <ClockCircleOutlined />,
      sending: <SendOutlined />,
      sent: <CheckCircleOutlined />,
      failed: <CloseCircleOutlined />,
    };
    return icons[status];
  };

  const subscriberColumns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string, record: Subscriber) => (
        <Space>
          <Avatar icon={<MailOutlined />} />
          <div>
            <div>{email}</div>
            {record.name && <Text type="secondary" style={{ fontSize: 12 }}>{record.name}</Text>}
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag icon={getStatusIcon(status)} color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Unsubscribed', value: 'unsubscribed' },
        { text: 'Bounced', value: 'bounced' },
      ],
      onFilter: (value: unknown, record: Subscriber) => record.status === value,
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => source ? <Tag>{source}</Tag> : '-',
    },
    {
      title: 'Subscribed',
      dataIndex: 'subscribed_at',
      key: 'subscribed_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a: Subscriber, b: Subscriber) =>
        new Date(a.subscribed_at).getTime() - new Date(b.subscribed_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Subscriber) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingSubscriber(record);
              subscriberForm.setFieldsValue(record);
              setSubscriberModalVisible(true);
            }}
          />
          <Popconfirm
            title="Abonnent löschen?"
            onConfirm={() => handleDeleteSubscriber(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const campaignColumns = [
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject: string, record: Campaign) => (
        <Space direction="vertical" size={0}>
          <Text strong>{subject}</Text>
          {record.preheader && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.preheader.substring(0, 50)}...
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag icon={getStatusIcon(status)} color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Recipients',
      dataIndex: 'total_recipients',
      key: 'total_recipients',
      render: (total: number, record: Campaign) => (
        <Text>
          {record.sent_count}/{total}
        </Text>
      ),
    },
    {
      title: 'Open Rate',
      key: 'open_rate',
      render: (_: unknown, record: Campaign) => {
        const rate = record.sent_count > 0
          ? Math.round((record.opened_count / record.sent_count) * 100)
          : 0;
        return (
          <Progress
            percent={rate}
            size="small"
            status={rate >= 20 ? 'success' : 'normal'}
            format={(p) => `${p}%`}
          />
        );
      },
    },
    {
      title: 'Click Rate',
      key: 'click_rate',
      render: (_: unknown, record: Campaign) => {
        const rate = record.sent_count > 0
          ? Math.round((record.clicked_count / record.sent_count) * 100)
          : 0;
        return (
          <Progress
            percent={rate}
            size="small"
            status={rate >= 5 ? 'success' : 'normal'}
            format={(p) => `${p}%`}
          />
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Campaign) => (
        <Space>
          <Tooltip title="Preview">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setPreviewContent(record.content);
                setPreviewModalVisible(true);
              }}
            />
          </Tooltip>
          {record.status === 'draft' && (
            <>
              <Tooltip title="Edit">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingCampaign(record);
                    campaignForm.setFieldsValue(record);
                    setCampaignModalVisible(true);
                  }}
                />
              </Tooltip>
              <Popconfirm
                title="Kampagne jetzt versenden?"
                onConfirm={() => handleSendCampaign(record.id)}
              >
                <Button type="text" icon={<SendOutlined />} style={{ color: '#52c41a' }} />
              </Popconfirm>
            </>
          )}
          <Tooltip title="Duplicate">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicateCampaign(record.id)}
            />
          </Tooltip>
          {record.status !== 'sending' && (
            <Popconfirm
              title="Kampagne löschen?"
              onConfirm={() => newsletterService.deleteCampaign(record.id).then(fetchData)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const templateColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Template) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Subject: {record.subject}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Variables',
      dataIndex: 'variables',
      key: 'variables',
      render: (variables: string[]) => (
        <Space wrap size={[4, 4]}>
          {variables?.map((v) => (
            <Tag key={v} color="blue">{`{{${v}}}`}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Template) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTemplate(record);
              templateForm.setFieldsValue(record);
              setTemplateModalVisible(true);
            }}
          />
          <Popconfirm
            title="Vorlage löschen?"
            onConfirm={() => newsletterService.deleteTemplate(record.id).then(fetchData)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="Total Subscribers"
              value={stats.totalSubscribers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Active"
              value={stats.activeSubscribers}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Total Campaigns"
              value={stats.totalCampaigns}
              prefix={<MailOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Avg. Open Rate"
              value={stats.avgOpenRate}
              suffix="%"
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Avg. Click Rate"
              value={stats.avgClickRate}
              suffix="%"
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Templates"
              value={templates.length}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs defaultActiveKey="subscribers">
          <TabPane
            tab={
              <span>
                <UserOutlined />
                Subscribers
              </span>
            }
            key="subscribers"
          >
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingSubscriber(null);
                    subscriberForm.resetFields();
                    setSubscriberModalVisible(true);
                  }}
                >
                  Add Subscriber
                </Button>
                <Button icon={<GlobalOutlined />} onClick={handleExportSubscribers}>
                  Export CSV
                </Button>
              </Space>
            </div>
            <Table
              columns={subscriberColumns}
              dataSource={subscribers}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <MailOutlined />
                Campaigns
              </span>
            }
            key="campaigns"
          >
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingCampaign(null);
                  campaignForm.resetFields();
                  setCampaignModalVisible(true);
                }}
              >
                New Campaign
              </Button>
            </div>
            <Table
              columns={campaignColumns}
              dataSource={campaigns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                Templates
              </span>
            }
            key="templates"
          >
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingTemplate(null);
                  templateForm.resetFields();
                  setTemplateModalVisible(true);
                }}
              >
                New Template
              </Button>
            </div>
            <Table
              columns={templateColumns}
              dataSource={templates}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SettingOutlined />
                Settings
              </span>
            }
            key="settings"
          >
            <Card title="Newsletter Settings">
              <Form layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Sender Name">
                      <Input placeholder="My Blog" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Sender Email">
                      <Input placeholder="newsletter@example.com" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Double Opt-In">
                      <Select defaultValue="enabled">
                        <Option value="enabled">Enabled (Recommended)</Option>
                        <Option value="disabled">Disabled</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Unsubscribe Link">
                      <Select defaultValue="required">
                        <Option value="required">Required</Option>
                        <Option value="optional">Optional</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="primary">Save Settings</Button>
              </Form>
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title={editingSubscriber ? 'Edit Subscriber' : 'Add Subscriber'}
        open={subscriberModalVisible}
        onOk={handleCreateSubscriber}
        onCancel={() => setSubscriberModalVisible(false)}
      >
        <Form form={subscriberForm} layout="vertical">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email required' },
              { type: 'email', message: 'Invalid email' },
            ]}
          >
            <Input placeholder="subscriber@example.com" />
          </Form.Item>
          <Form.Item name="name" label="Name">
            <Input placeholder="John Doe" />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="active">
            <Select>
              <Option value="active">Active</Option>
              <Option value="unsubscribed">Unsubscribed</Option>
            </Select>
          </Form.Item>
          <Form.Item name="source" label="Source">
            <Input placeholder="website, import, api" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingCampaign ? 'Edit Campaign' : 'New Campaign'}
        open={campaignModalVisible}
        onOk={handleCreateCampaign}
        onCancel={() => setCampaignModalVisible(false)}
        width={800}
      >
        <Form form={campaignForm} layout="vertical">
          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Subject required' }]}
          >
            <Input placeholder="Newsletter - January 2026" maxLength={100} showCount />
          </Form.Item>
          <Form.Item name="preheader" label="Preheader">
            <Input placeholder="Short preview text shown in inbox" maxLength={150} showCount />
          </Form.Item>
          <Form.Item name="template_id" label="Template">
            <Select allowClear placeholder="Select template or write custom content">
              {templates.map((t) => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="Content (HTML)"
            rules={[{ required: true, message: 'Content required' }]}
          >
            <TextArea rows={12} placeholder="<h1>Hello {{name}}</h1>..." />
          </Form.Item>
          <Divider>Available Variables</Divider>
          <Space wrap>
            <Tag color="blue">{'{{name}}'}</Tag>
            <Tag color="blue">{'{{email}}'}</Tag>
            <Tag color="blue">{'{{unsubscribe_url}}'}</Tag>
            <Tag color="blue">{'{{date}}'}</Tag>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={editingTemplate ? 'Edit Template' : 'New Template'}
        open={templateModalVisible}
        onOk={handleCreateTemplate}
        onCancel={() => setTemplateModalVisible(false)}
        width={800}
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name required' }]}
          >
            <Input placeholder="Monthly Newsletter" />
          </Form.Item>
          <Form.Item
            name="subject"
            label="Default Subject"
            rules={[{ required: true, message: 'Subject required' }]}
          >
            <Input placeholder="Newsletter - {{month}}" />
          </Form.Item>
          <Form.Item
            name="content"
            label="HTML Content"
            rules={[{ required: true, message: 'Content required' }]}
          >
            <TextArea rows={15} placeholder="<html>...</html>" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Campaign Preview"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width={800}
      >
        <div
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            padding: 24,
            background: '#fafafa',
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: previewContent }} />
        </div>
      </Modal>
    </div>
  );
};

export default NewslettersPage;
