import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Tag,
  Modal,
  Input,
  Checkbox,
  DatePicker,
  Row,
  Col,
  Statistic,
  Typography,
  List,
  Alert,
  Divider,
} from 'antd';
import {
  ShareAltOutlined,
  FacebookOutlined,
  TwitterOutlined,
  LinkedinOutlined,
  SendOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { socialMediaService, postService } from '../services/api';
import type { SocialShare, SocialMediaStats, Post } from '../types/api';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

const PostSharingPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<SocialMediaStats | null>(null);
  const [shares, setShares] = useState<SocialShare[]>([]);
  const [loading, setLoading] = useState(false);

  // Share Modal
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [scheduleDate, setScheduleDate] = useState<dayjs.Dayjs | null>(null);

  useEffect(() => {
    fetchPosts();
    fetchStats();
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await postService.getAll({
        status: ['published', 'approved'],
        per_page: 100,
      });
      setPosts(data.data || []);
    } catch (error) {
      message.error('Failed to fetch posts');
    }
  };

  const fetchStats = async () => {
    try {
      const data = await socialMediaService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchShares = async (postId: number) => {
    try {
      const data = await socialMediaService.getPostShares(postId);
      setShares(data.data || []);
    } catch (error) {
      console.error('Failed to fetch shares');
    }
  };

  const handleOpenShareModal = (post: Post) => {
    setSelectedPost(post);
    setSelectedPlatforms([]);
    setCustomMessage('');
    setScheduleDate(null);
    setShareModalVisible(true);
    fetchShares(post.id);
  };

  const handleShareNow = async () => {
    if (!selectedPost || selectedPlatforms.length === 0) {
      message.warning('Please select at least one platform');
      return;
    }

    setLoading(true);
    try {
      await socialMediaService.sharePost(
        selectedPost.id,
        selectedPlatforms,
        customMessage || undefined
      );
      message.success('Post shared successfully!');
      setShareModalVisible(false);
      fetchStats();
    } catch (error: unknown) {
      message.error(error.response?.data?.message || 'Failed to share post');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleShare = async () => {
    if (!selectedPost || selectedPlatforms.length === 0) {
      message.warning('Please select at least one platform');
      return;
    }
    if (!scheduleDate) {
      message.warning('Please select a schedule date');
      return;
    }

    setLoading(true);
    try {
      await socialMediaService.scheduleShare(
        selectedPost.id,
        selectedPlatforms,
        scheduleDate.format('YYYY-MM-DD HH:mm:ss'),
        customMessage || undefined
      );
      message.success('Share scheduled successfully!');
      setShareModalVisible(false);
    } catch (error: unknown) {
      message.error(error.response?.data?.message || 'Failed to schedule share');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShare = async (shareId: number) => {
    try {
      await socialMediaService.deleteShare(shareId);
      message.success('Share deleted');
      if (selectedPost) {
        fetchShares(selectedPost.id);
      }
      fetchStats();
    } catch (error) {
      message.error('Failed to delete share');
    }
  };

  const handleBatchShare = async () => {
    const publishedPosts = posts.filter(p => p.status === 'published');
    if (publishedPosts.length === 0) {
      message.warning('No published posts to share');
      return;
    }

    setLoading(true);
    try {
      await socialMediaService.batchShare(
        publishedPosts.map(p => p.id),
        ['twitter', 'facebook', 'linkedin']
      );
      message.success(`Successfully shared ${publishedPosts.length} posts!`);
      fetchStats();
    } catch (error: unknown) {
      message.error(error.response?.data?.message || 'Failed to batch share');
    } finally {
      setLoading(false);
    }
  };

  
  const platforms = [
    { key: 'twitter', name: 'Twitter/X', icon: <TwitterOutlined style={{ color: '#1DA1F2' }} />, color: '#1DA1F2' },
    { key: 'facebook', name: 'Facebook', icon: <FacebookOutlined style={{ color: '#1877F2' }} />, color: '#1877F2' },
    { key: 'linkedin', name: 'LinkedIn', icon: <LinkedinOutlined style={{ color: '#0A66C2' }} />, color: '#0A66C2' },
  ];

  return (
    <div>
      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Shares"
              value={stats?.total_shares || 0}
              prefix={<ShareAltOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Twitter"
              value={stats?.by_platform?.twitter || 0}
              prefix={<TwitterOutlined style={{ color: '#1DA1F2' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Facebook"
              value={stats?.by_platform?.facebook || 0}
              prefix={<FacebookOutlined style={{ color: '#1877F2' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="LinkedIn"
              value={stats?.by_platform?.linkedin || 0}
              prefix={<LinkedinOutlined style={{ color: '#0A66C2' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card
        title={
          <Space>
            <ShareAltOutlined />
            <span>Social Media Management</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleBatchShare}
            loading={loading}
          >
            Batch Share All Published
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Alert
          message="Auto-Publishing"
          description="Share your published posts automatically to social media platforms. You can share immediately or schedule for later."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={[
            {
              title: 'Post',
              dataIndex: 'title',
              key: 'title',
              render: (title: string, record: Post) => (
                <Space direction="vertical" size="small">
                  <Text strong>{title}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(record.created_at).format('YYYY-MM-DD')}
                  </Text>
                </Space>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => (
                <Tag color={status === 'published' ? 'success' : 'default'}>
                  {status.toUpperCase()}
                </Tag>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: unknown, record: Post) => (
                <Button
                  type="primary"
                  icon={<ShareAltOutlined />}
                  onClick={() => handleOpenShareModal(record)}
                >
                  Share
                </Button>
              ),
            },
          ]}
          dataSource={posts}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Share Modal */}
      <Modal
        title={`Share "${selectedPost?.title}"`}
        open={shareModalVisible}
        onCancel={() => setShareModalVisible(false)}
        footer={null}
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Platform Selection */}
          <div>
            <Text strong>Select Platforms:</Text>
            <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
              {platforms.map((platform) => (
                <Col key={platform.key} span={8}>
                  <Card
                    hoverable
                    onClick={() => {
                      if (selectedPlatforms.includes(platform.key)) {
                        setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.key));
                      } else {
                        setSelectedPlatforms([...selectedPlatforms, platform.key]);
                      }
                    }}
                    style={{
                      borderColor: selectedPlatforms.includes(platform.key) ? platform.color : '#d9d9d9',
                      borderWidth: selectedPlatforms.includes(platform.key) ? 2 : 1,
                    }}
                  >
                    <Space direction="vertical" align="center" style={{ width: '100%' }}>
                      <div style={{ fontSize: 32 }}>{platform.icon}</div>
                      <Text strong>{platform.name}</Text>
                      <Checkbox checked={selectedPlatforms.includes(platform.key)} />
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          {/* Custom Message */}
          <div>
            <Text strong>Custom Message (Optional):</Text>
            <TextArea
              rows={3}
              placeholder="Add a custom message for your social media post..."
              value={customMessage}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomMessage(e.target.value)}
              maxLength={280}
              showCount
              style={{ marginTop: 8 }}
            />
          </div>

          {/* Scheduling */}
          <div>
            <Text strong>Schedule (Optional):</Text>
            <DatePicker
              showTime
              style={{ width: '100%', marginTop: 8 }}
              value={scheduleDate}
              onChange={(date) => setScheduleDate(date)}
              disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
              format="YYYY-MM-DD HH:mm"
            />
          </div>

          <Divider />

          {/* Actions */}
          <Space>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleShareNow}
              loading={loading}
              disabled={selectedPlatforms.length === 0}
            >
              Share Now
            </Button>
            <Button
              icon={<ClockCircleOutlined />}
              onClick={handleScheduleShare}
              loading={loading}
              disabled={selectedPlatforms.length === 0 || !scheduleDate}
            >
              Schedule
            </Button>
            <Button onClick={() => setShareModalVisible(false)}>
              Cancel
            </Button>
          </Space>

          {/* Previous Shares */}
          {shares.length > 0 && (
            <>
              <Divider />
              <Text strong>Previous Shares:</Text>
              <List
                size="small"
                dataSource={shares}
                renderItem={(item) => (
                  <List.Item
                    key={item.id}
                    actions={[
                      <Button
                        key="delete"
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteShare(item.id)}
                      >
                        Delete
                      </Button>
                    ]}
                  >
                    <Space>
                      {item.platform === 'twitter' && <TwitterOutlined />}
                      {item.platform === 'facebook' && <FacebookOutlined />}
                      {item.platform === 'linkedin' && <LinkedinOutlined />}
                      <Text>Shared {dayjs(item.shared_at).fromNow()}</Text>
                      <Tag>{item.share_count || 0} shares</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            </>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default PostSharingPage;
