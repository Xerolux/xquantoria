import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Statistic,
  Row,
  Col,
  Tabs,
  Badge,
  Typography,
  message,
  Popconfirm,
  Input,
  Descriptions,
  Avatar,
  Tooltip,
  Drawer,
  List,
  Empty,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { contentApprovalService } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface PendingPost {
  id: number;
  title: string;
  slug: string;
  status: string;
  author: { id: number; name: string; email: string };
  categories: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string }>;
  excerpt: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface PendingComment {
  id: number;
  content: string;
  author_name: string;
  author_email: string;
  author_ip: string;
  user?: { id: number; name: string; email: string };
  post: { id: number; title: string; slug: string };
  is_spam: boolean;
  spam_score: number;
  created_at: string;
}

interface ApprovalStats {
  posts_pending: number;
  posts_approved_today: number;
  posts_rejected_today: number;
  comments_pending: number;
  comments_spam: number;
  comments_approved_today: number;
  avg_review_time_hours: number;
}

const ContentApprovalPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [selectedPost, setSelectedPost] = useState<PendingPost | null>(null);
  const [selectedComment, setSelectedComment] = useState<PendingComment | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'requestChanges'>('approve');
  const [feedback, setFeedback] = useState('');
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, statsRes] = await Promise.all([
        contentApprovalService.getPending(),
        contentApprovalService.getStats(),
      ]);
      setPosts(pendingRes.data.posts || []);
      setComments(pendingRes.data.comments || []);
      setStats(statsRes.data);
    } catch (error) {
      message.error('Failed to load content approval data');
    } finally {
      setLoading(false);
    }
  };

  const handlePostAction = async () => {
    if (!selectedPost) return;

    if ((actionType === 'reject' || actionType === 'requestChanges') && !feedback.trim()) {
      message.error('Please provide feedback');
      return;
    }

    try {
      if (actionType === 'approve') {
        await contentApprovalService.approvePost(selectedPost.id, feedback);
        message.success('Post approved');
      } else if (actionType === 'reject') {
        await contentApprovalService.rejectPost(selectedPost.id, feedback);
        message.success('Post rejected');
      } else if (actionType === 'requestChanges') {
        await contentApprovalService.requestChanges(selectedPost.id, feedback);
        message.success('Changes requested');
      }
      setActionModalVisible(false);
      setFeedback('');
      setSelectedPost(null);
      fetchData();
    } catch (error) {
      message.error('Action failed');
    }
  };

  const handleCommentAction = async (action: 'approve' | 'reject', commentId: number, reason?: string) => {
    try {
      if (action === 'approve') {
        await contentApprovalService.approveComment(commentId);
        message.success('Comment approved');
      } else {
        await contentApprovalService.rejectComment(commentId, reason);
        message.success('Comment rejected');
      }
      fetchData();
    } catch (error) {
      message.error('Action failed');
    }
  };

  const openActionModal = (post: PendingPost, type: 'approve' | 'reject' | 'requestChanges') => {
    setSelectedPost(post);
    setActionType(type);
    setFeedback('');
    setActionModalVisible(true);
  };

  const postColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: PendingPost) => (
        <Space>
          <Text strong>{title}</Text>
          {record.status === 'draft' && <Tag color="default">Draft</Tag>}
          {record.status === 'pending_review' && <Tag color="blue">Pending Review</Tag>}
        </Space>
      ),
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      render: (author: PendingPost['author']) => (
        <Space>
          <Avatar size="small">{author.name[0]}</Avatar>
          <Text>{author.name}</Text>
        </Space>
      ),
    },
    {
      title: 'Word Count',
      dataIndex: 'word_count',
      key: 'word_count',
      render: (count: number) => <Tag>{count} words</Tag>,
    },
    {
      title: 'Submitted',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PendingPost) => (
        <Space>
          <Tooltip title="View Details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => {
              setSelectedPost(record);
              setDetailsDrawerVisible(true);
            }} />
          </Tooltip>
          <Tooltip title="Approve">
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => openActionModal(record, 'approve')} />
          </Tooltip>
          <Tooltip title="Request Changes">
            <Button size="small" icon={<EditOutlined />} onClick={() => openActionModal(record, 'requestChanges')} />
          </Tooltip>
          <Popconfirm title="Reject this post?" onConfirm={() => openActionModal(record, 'reject')}>
            <Button size="small" danger icon={<CloseCircleOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const commentColumns = [
    {
      title: 'Author',
      key: 'author',
      render: (_: any, record: PendingComment) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.author_name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.author_email}</Text>
        </Space>
      ),
    },
    {
      title: 'Comment',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 300,
      render: (content: string) => <Text>{content.substring(0, 100)}...</Text>,
    },
    {
      title: 'On Post',
      dataIndex: 'post',
      key: 'post',
      render: (post: PendingComment['post']) => <Text>{post.title}</Text>,
    },
    {
      title: 'Spam',
      key: 'spam',
      render: (_: any, record: PendingComment) => (
        record.is_spam 
          ? <Tag color="red">Spam ({record.spam_score}%)</Tag>
          : <Tag color="green">Clean</Tag>
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PendingComment) => (
        <Space>
          <Popconfirm title="Approve this comment?" onConfirm={() => handleCommentAction('approve', record.id)}>
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} />
          </Popconfirm>
          <Popconfirm title="Reject this comment?" onConfirm={() => handleCommentAction('reject', record.id)}>
            <Button size="small" danger icon={<CloseCircleOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>Content Approval</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="Pending Posts"
              value={stats?.posts_pending || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Approved Today"
              value={stats?.posts_approved_today || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Rejected Today"
              value={stats?.posts_rejected_today || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Pending Comments"
              value={stats?.comments_pending || 0}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Spam Comments"
              value={stats?.comments_spam || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Avg Review Time"
              value={stats?.avg_review_time_hours || 0}
              suffix="hrs"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'posts',
            label: (
              <span>
                <FileTextOutlined /> Pending Posts
                <Badge count={stats?.posts_pending || 0} style={{ marginLeft: 8 }} />
              </span>
            ),
            children: (
              <Card>
                <Table
                  columns={postColumns}
                  dataSource={posts}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: <Empty description="No pending posts" /> }}
                />
              </Card>
            ),
          },
          {
            key: 'comments',
            label: (
              <span>
                <MessageOutlined /> Pending Comments
                <Badge count={stats?.comments_pending || 0} style={{ marginLeft: 8 }} />
              </span>
            ),
            children: (
              <Card>
                <Table
                  columns={commentColumns}
                  dataSource={comments}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: <Empty description="No pending comments" /> }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={
          actionType === 'approve' ? 'Approve Post' :
          actionType === 'reject' ? 'Reject Post' : 'Request Changes'
        }
        open={actionModalVisible}
        onCancel={() => {
          setActionModalVisible(false);
          setFeedback('');
          setSelectedPost(null);
        }}
        onOk={handlePostAction}
        okText={actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Request Changes'}
        okButtonProps={{ danger: actionType === 'reject' }}
      >
        {selectedPost && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>{selectedPost.title}</Text>
            <br />
            <Text type="secondary">by {selectedPost.author.name}</Text>
          </div>
        )}
        {(actionType === 'reject' || actionType === 'requestChanges') && (
          <TextArea
            rows={4}
            placeholder={actionType === 'reject' ? 'Rejection reason...' : 'Feedback for changes...'}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        )}
        {actionType === 'approve' && (
          <TextArea
            rows={2}
            placeholder="Optional feedback..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        )}
      </Modal>

      <Drawer
        title="Post Details"
        placement="right"
        width={600}
        onClose={() => setDetailsDrawerVisible(false)}
        open={detailsDrawerVisible}
      >
        {selectedPost && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Title">{selectedPost.title}</Descriptions.Item>
              <Descriptions.Item label="Author">{selectedPost.author.name}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedPost.status === 'pending_review' ? 'blue' : 'default'}>
                  {selectedPost.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Categories">
                {selectedPost.categories.map(c => <Tag key={c.id}>{c.name}</Tag>)}
              </Descriptions.Item>
              <Descriptions.Item label="Tags">
                {selectedPost.tags.map(t => <Tag key={t.id}>{t.name}</Tag>)}
              </Descriptions.Item>
              <Descriptions.Item label="Word Count">{selectedPost.word_count}</Descriptions.Item>
              <Descriptions.Item label="Created">{new Date(selectedPost.created_at).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Updated">{new Date(selectedPost.updated_at).toLocaleString()}</Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 24 }}>Excerpt</Title>
            <Paragraph ellipsis={{ rows: 5, expandable: true }}>
              {selectedPost.excerpt}
            </Paragraph>

            <Space style={{ marginTop: 24 }}>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => {
                setDetailsDrawerVisible(false);
                openActionModal(selectedPost, 'approve');
              }}>
                Approve
              </Button>
              <Button icon={<EditOutlined />} onClick={() => {
                setDetailsDrawerVisible(false);
                openActionModal(selectedPost, 'requestChanges');
              }}>
                Request Changes
              </Button>
              <Button danger icon={<CloseCircleOutlined />} onClick={() => {
                setDetailsDrawerVisible(false);
                openActionModal(selectedPost, 'reject');
              }}>
                Reject
              </Button>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ContentApprovalPage;
