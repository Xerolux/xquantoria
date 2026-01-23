import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Calendar,
  Badge,
  Alert,
  Progress,
  List,
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserAddOutlined,
  EditOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { workflowService, postService, userService } from '../services/api';
import type { WorkflowStats, EditorialCalendar, SEOScore, Post } from '../types/api';
import dayjs, { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const ContentWorkflowPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [calendarData, setCalendarData] = useState<EditorialCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  // Assignment Modal
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [assignForm] = Form.useForm();

  // Review Modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'request_changes'>('approve');
  const [reviewForm] = Form.useForm();

  // SEO Score Modal
  const [seoModalVisible, setSeoModalVisible] = useState(false);
  const [seoScore, setSeoScore] = useState<SEOScore | null>(null);

  useEffect(() => {
    fetchStats();
    fetchPosts();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await workflowService.getStats();
      setStats(data);
    } catch (error) {
      message.error('Failed to fetch workflow stats');
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await postService.getAll({
        status: ['draft', 'pending_review', 'changes_requested', 'approved', 'scheduled'],
        per_page: 100,
      });
      setPosts(data.data || []);
    } catch (error) {
      message.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await userService.getAll();
      setUsers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const fetchCalendar = async (year: number, month: number) => {
    try {
      const data = await workflowService.getEditorialCalendar(year, month + 1);
      setCalendarData(data);
    } catch (error) {
      message.error('Failed to fetch editorial calendar');
    }
  };

  const handleAssign = (post: Post) => {
    setSelectedPost(post);
    assignForm.resetFields();
    setAssignModalVisible(true);
  };

  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields();
      await workflowService.assignUser(selectedPost!.id, values.user_id, values.role);
      message.success('User assigned successfully');
      setAssignModalVisible(false);
      fetchPosts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Failed to assign user');
    }
  };

  const handleSubmitReview = (post: Post) => {
    setSelectedPost(post);
    setReviewAction('approve');
    reviewForm.resetFields();
    setReviewModalVisible(true);
  };

  const handleRequestChanges = (post: Post) => {
    setSelectedPost(post);
    setReviewAction('request_changes');
    reviewForm.resetFields();
    setReviewModalVisible(true);
  };

  const handleReviewSubmit = async () => {
    try {
      const values = await reviewForm.validateFields();
      if (reviewAction === 'approve') {
        await workflowService.approvePost(selectedPost!.id, values.feedback);
        message.success('Post approved successfully');
      } else {
        await workflowService.requestChanges(selectedPost!.id, values.feedback);
        message.success('Changes requested successfully');
      }
      setReviewModalVisible(false);
      fetchPosts();
      fetchStats();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Failed to process review');
    }
  };

  const handleViewSEOScore = async (post: Post) => {
    setLoading(true);
    try {
      const data = await workflowService.getSEOScore(post.id);
      setSeoScore(data);
      setSelectedPost(post);
      setSeoModalVisible(true);
    } catch (error) {
      message.error('Failed to fetch SEO score');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (date: Dayjs) => {
    setSelectedDate(date);
    fetchCalendar(date.year(), date.month());
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'default',
      pending_review: 'processing',
      changes_requested: 'warning',
      approved: 'success',
      scheduled: 'blue',
      published: 'green',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Post) => (
        <Space>
          <a href="#" onClick={() => setSelectedPost(record)}>{text}</a>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Author',
      dataIndex: ['user', 'name'],
      key: 'author',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Post) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<UserAddOutlined />}
            onClick={() => handleAssign(record)}
          >
            Assign
          </Button>
          {record.status === 'pending_review' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleSubmitReview(record)}
              >
                Approve
              </Button>
              <Button
                type="link"
                size="small"
                icon={<ExclamationCircleOutlined />}
                onClick={() => handleRequestChanges(record)}
              >
                Request Changes
              </Button>
            </>
          )}
          <Button
            type="link"
            size="small"
            icon={<SearchOutlined />}
            onClick={() => handleViewSEOScore(record)}
          >
            SEO
          </Button>
        </Space>
      ),
    },
  ];

  const calendarCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const events = calendarData?.events.filter((e) => e.date === dateStr) || [];

    return (
      <div style={{ height: '100%' }}>
        {events.map((event) => (
          <Badge
            key={event.id}
            status={event.status === 'published' ? 'success' : 'processing'}
            text={
              <span style={{ fontSize: 11 }}>
                {event.title}
              </span>
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Review"
              value={stats?.pending_review || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Approved"
              value={stats?.approved || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Changes Requested"
              value={stats?.changes_requested || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Drafts"
              value={stats?.draft || 0}
              prefix={<EditOutlined />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="Editorial Calendar">
            <Calendar
              value={selectedDate}
              onPanelChange={handleMonthChange}
              cellRender={calendarCellRender}
              fullscreen={false}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={16}>
        <Col span={24}>
          <Card title="Content Workflow" extra={<Button onClick={fetchPosts} icon={<SearchOutlined />}>Refresh</Button>}>
            <Table
              columns={columns}
              dataSource={posts}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Assignment Modal */}
      <Modal
        title="Assign User to Post"
        open={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={() => setAssignModalVisible(false)}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item label="Post">
            <Input value={selectedPost?.title} disabled />
          </Form.Item>
          <Form.Item
            label="User"
            name="user_id"
            rules={[{ required: true, message: 'Please select a user' }]}
          >
            <Select placeholder="Select a user">
              {users.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select a role">
              <Option value="author">Author</Option>
              <Option value="reviewer">Reviewer</Option>
              <Option value="editor">Editor</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Review Modal */}
      <Modal
        title={reviewAction === 'approve' ? 'Approve Post' : 'Request Changes'}
        open={reviewModalVisible}
        onOk={handleReviewSubmit}
        onCancel={() => setReviewModalVisible(false)}
        okText={reviewAction === 'approve' ? 'Approve' : 'Request Changes'}
      >
        <Form form={reviewForm} layout="vertical">
          <Form.Item label="Post">
            <Input value={selectedPost?.title} disabled />
          </Form.Item>
          <Form.Item
            label="Feedback"
            name="feedback"
            rules={reviewAction === 'request_changes' ? [{ required: true, message: 'Please provide feedback' }] : []}
          >
            <TextArea
              rows={4}
              placeholder={reviewAction === 'approve' ? 'Optional feedback for the author' : 'Please describe the changes needed'}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* SEO Score Modal */}
      <Modal
        title={`SEO Score - ${selectedPost?.title}`}
        open={seoModalVisible}
        onCancel={() => setSeoModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSeoModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {seoScore && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={seoScore.score}
                format={() => (
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 'bold' }}>{seoScore.grade}</div>
                    <div style={{ fontSize: 14 }}>{seoScore.score}%</div>
                  </div>
                )}
                strokeColor={seoScore.grade === 'A' ? '#52c41a' : seoScore.grade === 'B' ? '#1890ff' : '#faad14'}
                width={150}
              />
            </div>

            {seoScore.issues.length > 0 && (
              <div>
                <Alert
                  type="error"
                  message="Issues"
                  description={
                    <List
                      size="small"
                      dataSource={seoScore.issues}
                      renderItem={(item) => (
                        <List.Item>{item}</List.Item>
                      )}
                    />
                  }
                  showIcon
                />
              </div>
            )}

            {seoScore.warnings.length > 0 && (
              <div>
                <Alert
                  type="warning"
                  message="Warnings"
                  description={
                    <List
                      size="small"
                      dataSource={seoScore.warnings}
                      renderItem={(item) => (
                        <List.Item>{item}</List.Item>
                      )}
                    />
                  }
                  showIcon
                />
              </div>
            )}

            {seoScore.passes.length > 0 && (
              <div>
                <Alert
                  type="success"
                  message="Passed Checks"
                  description={
                    <List
                      size="small"
                      dataSource={seoScore.passes}
                      renderItem={(item) => (
                        <List.Item>{item}</List.Item>
                      )}
                    />
                  }
                  showIcon
                />
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default ContentWorkflowPage;
