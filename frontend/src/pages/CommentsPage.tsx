import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Select,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { commentService } from '../services/api';
import type { Comment, PaginatedResponse } from '../types';

const { Paragraph } = Typography;

const CommentsPage: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingComment, setViewingComment] = useState<Comment | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    status: 'all',
    post_id: undefined as number | undefined,
  });

  useEffect(() => {
    fetchComments();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: pagination.current,
        per_page: pagination.pageSize,
      };

      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      if (filters.post_id) {
        params.post_id = filters.post_id;
      }

      const data: PaginatedResponse<Comment> = await commentService.getAll(params);
      setComments(data.data || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      message.error('Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await commentService.approve(id);
      message.success('Comment approved');
      fetchComments();
    } catch (error) {
      message.error('Failed to approve comment');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await commentService.reject(id);
      message.success('Comment rejected');
      fetchComments();
    } catch (error) {
      message.error('Failed to reject comment');
    }
  };

  const handleMarkAsSpam = async (id: number) => {
    try {
      await commentService.markAsSpam(id);
      message.success('Comment marked as spam');
      fetchComments();
    } catch (error) {
      message.error('Failed to mark comment as spam');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await commentService.delete(id);
      message.success('Comment deleted');
      fetchComments();
    } catch (error) {
      message.error('Failed to delete comment');
    }
  };

  const handleView = (comment: Comment) => {
    setViewingComment(comment);
    setViewModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      approved: 'success',
      rejected: 'error',
      spam: 'purple',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      pending: <ExclamationCircleOutlined />,
      approved: <CheckCircleOutlined />,
      rejected: <CloseCircleOutlined />,
      spam: <StopOutlined />,
    };
    return icons[status] || <MessageOutlined />;
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const columns = [
    {
      title: 'Author',
      key: 'author',
      render: (_: unknown, record: Comment) => (
        <Space>
          {record.user ? (
            <>
              <UserOutlined />
              <span>{record.user.display_name || record.user.name}</span>
            </>
          ) : (
            <>
              <UserOutlined />
              <span>{record.author_name}</span>
              <br />
              <span style={{ fontSize: 12, color: '#999' }}>{record.author_email}</span>
            </>
          )}
        </Space>
      ),
      sorter: (a: Comment, b: Comment) => {
        const nameA = a.user?.name || a.author_name || '';
        const nameB = b.user?.name || b.author_name || '';
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: 'Comment',
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => (
        <Paragraph
          ellipsis={{ rows: 2, tooltip: content }}
          style={{ margin: 0, maxWidth: 400 }}
        >
          {content}
        </Paragraph>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag icon={getStatusIcon(status)} color={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Approved', value: 'approved' },
        { text: 'Rejected', value: 'rejected' },
        { text: 'Spam', value: 'spam' },
      ],
      onFilter: (value: unknown, record: Comment) => record.status === value,
    },
    {
      title: 'Reactions',
      key: 'reactions',
      render: (_: unknown, record: Comment) => (
        <Space size="large">
          <span style={{ color: '#52c41a' }}>
            👍 {record.likes_count}
          </span>
          <span style={{ color: '#ff4d4f' }}>
            👎 {record.dislikes_count}
          </span>
        </Space>
      ),
      sorter: (a: Comment, b: Comment) => a.likes_count - b.likes_count,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a: Comment, b: Comment) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Comment) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>

          {record.status === 'pending' && (
            <>
              <Tooltip title="Approve">
                <Button
                  type="text"
                  style={{ color: '#52c41a' }}
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(record.id)}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  type="text"
                  style={{ color: '#ff4d4f' }}
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleReject(record.id)}
                />
              </Tooltip>
            </>
          )}

          {record.status !== 'spam' && (
            <Tooltip title="Mark as Spam">
              <Popconfirm
                title="Mark this comment as spam?"
                onConfirm={() => handleMarkAsSpam(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  style={{ color: '#722ed1' }}
                  icon={<StopOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}

          <Popconfirm
            title="Delete this comment?"
            description="This action cannot be undone"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<StopOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const totalComments = comments.length;
  const pendingComments = comments.filter((c) => c.status === 'pending').length;
  const approvedComments = comments.filter((c) => c.status === 'approved').length;
  const spamComments = comments.filter((c) => c.status === 'spam').length;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Comments" value={totalComments} prefix={<MessageOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending"
              value={pendingComments}
              valueStyle={{ color: pendingComments > 0 ? '#fa8c16' : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Approved"
              value={approvedComments}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Spam"
              value={spamComments}
              valueStyle={{ color: spamComments > 0 ? '#722ed1' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Comments Management"
        extra={
          <Space>
            <Select
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              style={{ width: 150 }}
            >
              <Select.Option value="all">All Status</Select.Option>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="approved">Approved</Select.Option>
              <Select.Option value="rejected">Rejected</Select.Option>
              <Select.Option value="spam">Spam</Select.Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={comments}
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
          expandable={{
            expandedRowRender: (record) => (
              <Card size="small" style={{ margin: 0 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Full Content</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{record.content}</div>
                  </div>

                  {record.parent && (
                    <div>
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                        Reply to Comment #{record.parent_id}
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {record.parent.content?.substring(0, 100)}
                        {record.parent.content && record.parent.content.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  )}

                  {record.author_ip && (
                    <div>
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>IP Address</div>
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {record.author_ip}
                      </span>
                    </div>
                  )}

                  {record.replies && record.replies.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                        Replies
                      </div>
                      <Tag color="blue">{record.replies.length} replies</Tag>
                    </div>
                  )}
                </Space>
              </Card>
            ),
          }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title="Comment Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={700}
      >
        {viewingComment && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card size="small" title="Author Info">
              <Space direction="vertical" style={{ width: '100%' }}>
                {viewingComment.user ? (
                  <>
                    <div>
                      <div style={{ fontSize: 12, color: '#999' }}>Name</div>
                      <div>{viewingComment.user.display_name || viewingComment.user.name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#999' }}>Email</div>
                      <div>{viewingComment.user.email}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#999' }}>Role</div>
                      <Tag color="blue">
                        {viewingComment.user.role}
                      </Tag>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div style={{ fontSize: 12, color: '#999' }}>Name</div>
                      <div>{viewingComment.author_name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#999' }}>Email</div>
                      <div>{viewingComment.author_email}</div>
                    </div>
                  </>
                )}
                {viewingComment.author_ip && (
                  <div>
                    <div style={{ fontSize: 12, color: '#999' }}>IP Address</div>
                    <div style={{ fontFamily: 'monospace' }}>
                      {viewingComment.author_ip}
                    </div>
                  </div>
                )}
              </Space>
            </Card>

            <Card size="small" title="Comment">
              <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{viewingComment.content}</div>
              </div>
            </Card>

            <Card size="small" title="Status & Moderation">
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Status</div>
                  <Tag icon={getStatusIcon(viewingComment.status)} color={getStatusColor(viewingComment.status)}>
                    {getStatusLabel(viewingComment.status)}
                  </Tag>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Created</div>
                  <div>{new Date(viewingComment.created_at).toLocaleString()}</div>
                </Col>
              </Row>

              {viewingComment.approved_at && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                    Approved At
                  </div>
                  <div>{new Date(viewingComment.approved_at).toLocaleString()}</div>
                </div>
              )}

              {viewingComment.rejected_at && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                    Rejected At
                  </div>
                  <div>{new Date(viewingComment.rejected_at).toLocaleString()}</div>
                </div>
              )}
            </Card>

            <Card size="small" title="Reactions">
              <Row gutter={16}>
                <Col span={12}>
                  <Space size="large">
                    <span style={{ fontSize: 24 }}>👍</span>
                    <span style={{ fontSize: 20, fontWeight: 500, color: '#52c41a' }}>
                      {viewingComment.likes_count}
                    </span>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space size="large">
                    <span style={{ fontSize: 24 }}>👎</span>
                    <span style={{ fontSize: 20, fontWeight: 500, color: '#ff4d4f' }}>
                      {viewingComment.dislikes_count}
                    </span>
                  </Space>
                </Col>
              </Row>
            </Card>

            {viewingComment.parent_id && (
              <Card size="small" title="In Reply To" style={{ background: '#f0f5ff' }}>
                <div style={{ fontSize: 12, color: '#597ef7' }}>
                  Comment #{viewingComment.parent_id}
                </div>
                {viewingComment.parent && (
                  <div style={{ marginTop: 8 }}>
                    {viewingComment.parent.content?.substring(0, 200)}
                    {viewingComment.parent.content && viewingComment.parent.content.length > 200 ? '...' : ''}
                  </div>
                )}
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default CommentsPage;
