import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Input,
  Select,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Tooltip,
  Typography,
  Tabs,
  DatePicker,
  Progress,
} from 'antd';
import {
  MailOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  UserAddOutlined,
  DownloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Editor } from '@tinymce/tinymce-react';
import { newsletterService } from '../services/api';
import type { Newsletter, NewsletterSubscriber, PaginatedResponse } from '../types';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const NewslettersPage: React.FC = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('newsletters');

  // Newsletter Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [newsletterForm, setNewsletterForm] = useState({
    subject: '',
    preview_text: '',
    content: '',
    scheduled_at: null as any,
  });

  // Subscriber Modal
  const [subscriberModalVisible, setSubscriberModalVisible] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<NewsletterSubscriber | null>(null);
  const [subscriberForm, setSubscriberForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    status: 'active' as any,
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [filters, setFilters] = useState({
    status: 'all',
  });

  useEffect(() => {
    if (activeTab === 'newsletters') {
      fetchNewsletters();
      fetchStats();
    } else {
      fetchSubscribers();
    }
  }, [activeTab, pagination.current, pagination.pageSize, filters]);

  const fetchNewsletters = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        per_page: pagination.pageSize,
      };

      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      const data: PaginatedResponse<Newsletter> = await newsletterService.getAll(params);
      setNewsletters(data.data || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      message.error('Failed to fetch newsletters');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        per_page: pagination.pageSize,
      };

      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      const data: PaginatedResponse<NewsletterSubscriber> = await newsletterService.getSubscribers(params);
      setSubscribers(data.data || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      message.error('Failed to fetch subscribers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await newsletterService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const handleCreateNewsletter = () => {
    setEditingNewsletter(null);
    setNewsletterForm({
      subject: '',
      preview_text: '',
      content: '',
      scheduled_at: null,
    });
    setModalVisible(true);
  };

  const handleEditNewsletter = (newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setNewsletterForm({
      subject: newsletter.subject,
      preview_text: newsletter.preview_text || '',
      content: newsletter.content,
      scheduled_at: newsletter.scheduled_at ? null : null,
    });
    setModalVisible(true);
  };

  const handleSaveNewsletter = async () => {
    if (!newsletterForm.subject.trim() || !newsletterForm.content.trim()) {
      message.error('Subject and Content are required');
      return;
    }

    try {
      if (editingNewsletter) {
        await newsletterService.update(editingNewsletter.id, newsletterForm);
        message.success('Newsletter updated');
      } else {
        await newsletterService.create(newsletterForm);
        message.success('Newsletter created');
      }
      setModalVisible(false);
      fetchNewsletters();
      fetchStats();
    } catch (error) {
      message.error('Failed to save newsletter');
    }
  };

  const handleDeleteNewsletter = async (id: number) => {
    try {
      await newsletterService.delete(id);
      message.success('Newsletter deleted');
      fetchNewsletters();
      fetchStats();
    } catch (error) {
      message.error('Failed to delete newsletter');
    }
  };

  const handleSendNewsletter = async (id: number) => {
    try {
      const result = await newsletterService.send(id);
      message.success(`Newsletter sent to ${result.recipients_count} subscribers`);
      fetchNewsletters();
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to send newsletter');
    }
  };

  const handleExportSubscribers = async () => {
    try {
      const blob = await newsletterService.exportSubscribers();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers_${new Date().toISOString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Subscribers exported');
    } catch (error) {
      message.error('Failed to export subscribers');
    }
  };

  const getNewsletterStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'default',
      scheduled: 'blue',
      sending: 'processing',
      sent: 'success',
    };
    return colors[status] || 'default';
  };

  const getSubscriberStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      active: 'success',
      unsubscribed: 'default',
      bounced: 'error',
    };
    return colors[status] || 'default';
  };

  const newsletterColumns = [
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject: string, record: Newsletter) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontWeight: 500 }}>{subject}</div>
          {record.preview_text && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.preview_text}</div>
          )}
        </Space>
      ),
      sorter: (a: Newsletter, b: Newsletter) => a.subject.localeCompare(b.subject),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getNewsletterStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Draft', value: 'draft' },
        { text: 'Scheduled', value: 'scheduled' },
        { text: 'Sent', value: 'sent' },
      ],
      onFilter: (value: any, record: Newsletter) => record.status === value,
    },
    {
      title: 'Recipients',
      key: 'recipients',
      render: (_: any, record: Newsletter) => (
        <Space direction="vertical" size={0}>
          <div>{record.recipients_count} sent</div>
          <div style={{ fontSize: 12, color: '#52c41a' }}>
            {record.opened_count} opened ({record.open_rate || 0}%)
          </div>
          <div style={{ fontSize: 12, color: '#1890ff' }}>
            {record.clicked_count} clicked ({record.click_rate || 0}%)
          </div>
        </Space>
      ),
      sorter: (a: Newsletter, b: Newsletter) => a.recipients_count - b.recipients_count,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a: Newsletter, b: Newsletter) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: Newsletter) => (
        <Space size="small">
          <Tooltip title="View">
            <Button type="text" icon={<EyeOutlined />} />
          </Tooltip>

          {record.status !== 'sent' && (
            <>
              <Tooltip title="Edit">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEditNewsletter(record)}
                />
              </Tooltip>

              <Tooltip title="Send">
                <Popconfirm
                  title="Send this newsletter now?"
                  description="This will send the email to all active subscribers"
                  onConfirm={() => handleSendNewsletter(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" icon={<SendOutlined />} style={{ color: '#52c41a' }} />
                </Popconfirm>
              </Tooltip>
            </>
          )}

          <Popconfirm
            title="Delete this newsletter?"
            onConfirm={() => handleDeleteNewsletter(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const subscriberColumns = [
    {
      title: 'Subscriber',
      key: 'subscriber',
      render: (_: any, record: NewsletterSubscriber) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontWeight: 500 }}>{record.email}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.full_name || 'No name'}
          </div>
        </Space>
      ),
      sorter: (a: NewsletterSubscriber, b: NewsletterSubscriber) =>
        a.email.localeCompare(b.email),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getSubscriberStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Active', value: 'active' },
        { text: 'Unsubscribed', value: 'unsubscribed' },
        { text: 'Bounced', value: 'bounced' },
      ],
      onFilter: (value: any, record: NewsletterSubscriber) => record.status === value,
    },
    {
      title: 'Engagement',
      key: 'engagement',
      render: (_: any, record: NewsletterSubscriber) => (
        <Space direction="vertical" size={0}>
          <Progress
            percent={record.engagement_rate || 0}
            size="small"
            status={(record.engagement_rate || 0) > 50 ? 'success' : 'normal'}
          />
          <div style={{ fontSize: 11, color: '#999' }}>
            {record.emails_opened}/{record.emails_sent} opened
          </div>
        </Space>
      ),
      sorter: (a: NewsletterSubscriber, b: NewsletterSubscriber) =>
        (a.engagement_rate || 0) - (b.engagement_rate || 0),
    },
    {
      title: 'Subscribed',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: NewsletterSubscriber, b: NewsletterSubscriber) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: NewsletterSubscriber) => (
        <Space size="small">
          <Popconfirm
            title="Delete this subscriber?"
            onConfirm={() => handleDeleteSubscriber(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleDeleteSubscriber = async (id: number) => {
    try {
      await newsletterService.deleteSubscriber(id);
      message.success('Subscriber deleted');
      fetchSubscribers();
      fetchStats();
    } catch (error) {
      message.error('Failed to delete subscriber');
    }
  };

  return (
    <div>
      {/* Stats Dashboard */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Newsletters"
                value={stats.total_newsletters}
                prefix={<MailOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Active Subscribers"
                value={stats.total_subscribers}
                prefix={<UserAddOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Avg Open Rate"
                value={stats.avg_open_rate}
                suffix="%"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Avg Click Rate"
                value={stats.avg_click_rate}
                suffix="%"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title="Newsletter Management"
        extra={
          activeTab === 'newsletters' ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateNewsletter}
            >
              New Newsletter
            </Button>
          ) : (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportSubscribers}
            >
              Export
            </Button>
          )
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Newsletters" key="newsletters">
            <Table
              columns={newsletterColumns}
              dataSource={newsletters}
              rowKey="id"
              loading={loading}
              pagination={pagination}
              onChange={(newPagination) => {
                setPagination({
                  current: newPagination.current || 1,
                  pageSize: newPagination.pageSize || 20,
                  total: pagination.total,
                });
              }}
            />
          </TabPane>

          <TabPane tab="Subscribers" key="subscribers">
            <Table
              columns={subscriberColumns}
              dataSource={subscribers}
              rowKey="id"
              loading={loading}
              pagination={pagination}
              onChange={(newPagination) => {
                setPagination({
                  current: newPagination.current || 1,
                  pageSize: newPagination.pageSize || 20,
                  total: pagination.total,
                });
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Newsletter Modal */}
      <Modal
        title={editingNewsletter ? 'Edit Newsletter' : 'Create Newsletter'}
        open={modalVisible}
        onOk={handleSaveNewsletter}
        onCancel={() => setModalVisible(false)}
        width={900}
        okText="Save"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Subject</div>
            <Input
              placeholder="Newsletter subject"
              value={newsletterForm.subject}
              onChange={(e) =>
                setNewsletterForm({ ...newsletterForm, subject: e.target.value })
              }
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Preview Text</div>
            <Input
              placeholder="Short preview text for inbox preview"
              value={newsletterForm.preview_text}
              onChange={(e) =>
                setNewsletterForm({ ...newsletterForm, preview_text: e.target.value })
              }
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Content</div>
            <Editor
              apiKey="no-api-key"
              init={{
                height: 400,
                menubar: true,
                plugins: [
                  'advlist',
                  'autolink',
                  'lists',
                  'link',
                  'image',
                  'charmap',
                  'preview',
                  'anchor',
                  'searchreplace',
                  'visualblocks',
                  'code',
                  'fullscreen',
                  'insertdatetime',
                  'media',
                  'table',
                  'help',
                  'wordcount',
                ],
                toolbar:
                  'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
              }}
              value={newsletterForm.content}
              onEditorChange={(content: string) =>
                setNewsletterForm({ ...newsletterForm, content })
              }
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default NewslettersPage;
