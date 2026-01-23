import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  DatePicker,
  message,
  Alert,
  Calendar,
  Badge,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { scheduleService } from '../services/api';
import type { ScheduledPost } from '../types/api';
import dayjs, { Dayjs } from 'dayjs';

const { Text, Tooltip } = Typography;

const SchedulePage: React.FC = () => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [calendarData, setCalendarData] = useState<any>(null);

  // Schedule Modal
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [scheduleDate, setScheduleDate] = useState<Dayjs | null>(null);

  useEffect(() => {
    fetchScheduledPosts();
    fetchStats();
    fetchCalendar(dayjs().year(), dayjs().month() + 1);
  }, []);

  const fetchScheduledPosts = async () => {
    setLoading(true);
    try {
      const data = await scheduleService.getAll({ status: 'scheduled' });
      setScheduledPosts(data.data || []);
    } catch (error) {
      message.error('Failed to fetch scheduled posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await scheduleService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchCalendar = async (year: number, month: number) => {
    try {
      const data = await scheduleService.getCalendar(year, month);
      setCalendarData(data);
    } catch (error) {
      console.error('Failed to fetch calendar');
    }
  };

  const handleOpenScheduleModal = (post: Post) => {
    setSelectedPost(post);
    setScheduleDate(post.published_at ? dayjs(post.published_at) : null);
    setScheduleModalVisible(true);
  };

  const handleSchedule = async () => {
    if (!selectedPost || !scheduleDate) {
      message.warning('Please select a schedule date');
      return;
    }

    setLoading(true);
    try {
      await scheduleService.schedulePost(
        selectedPost.id,
        scheduleDate.format('YYYY-MM-DD HH:mm:ss')
      );
      message.success('Post scheduled successfully!');
      setScheduleModalVisible(false);
      fetchScheduledPosts();
      fetchStats();
      fetchCalendar(scheduleDate.year(), scheduleDate.month() + 1);
    } catch (error: unknown) {
      message.error(error.response?.data?.message || 'Failed to schedule post');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSchedule = async (postId: number) => {
    Modal.confirm({
      title: 'Cancel Scheduled Post?',
      content: 'This will cancel the scheduled publication. The post will remain as a draft.',
      okText: 'Cancel Schedule',
      okType: 'danger',
      onOk: async () => {
        try {
          await scheduleService.cancelScheduledPost(postId);
          message.success('Schedule cancelled');
          fetchScheduledPosts();
          fetchStats();
        } catch (error) {
          message.error('Failed to cancel schedule');
        }
      },
    });
  };

  const handleMonthChange = (date: Dayjs) => {
    setSelectedDate(date);
    fetchCalendar(date.year(), date.month() + 1);
  };

  const calendarCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const events = calendarData?.events?.filter((e: Post) =>
      dayjs(e.published_at).format('YYYY-MM-DD') === dateStr
    ) || [];

    return (
      <div style={{ height: '100%' }}>
        {events.map((event: Post) => (
          <Badge
            key={event.id}
            status="processing"
            text={
              <span style={{ fontSize: 10 }}>
                {event.title}
              </span>
            }
          />
        ))}
      </div>
    );
  };

  const columns = [
    {
      title: 'Post',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => (
        <Space direction="vertical" size="small">
          <Text strong>{title}</Text>
        </Space>
      ),
    },
    {
      title: 'Scheduled For',
      dataIndex: 'published_at',
      key: 'published_at',
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined />
          <span>{dayjs(date).format('YYYY-MM-DD HH:mm')}</span>
        </Space>
      ),
      sorter: (a: Post, b: Post) => dayjs(a.published_at).unix() - dayjs(b.published_at).unix(),
    },
    {
      title: 'Time Until',
      key: 'time_until',
      render: (_: unknown, record: Post) => {
        const now = dayjs();
        const scheduled = dayjs(record.published_at);
        const diff = scheduled.diff(now, 'hour');

        if (diff < 1) {
          const mins = scheduled.diff(now, 'minute');
          return <Tag color="red">{mins} minutes</Tag>;
        } else if (diff < 24) {
          return <Tag color="orange">{diff} hours</Tag>;
        } else {
          const days = Math.floor(diff / 24);
          return <Tag color="blue">{days} days</Tag>;
        }
      },
    },
    {
      title: 'Author',
      dataIndex: ['author', 'name'],
      key: 'author',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: Post) => (
        <Tag color="blue">{record.status?.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Post) => (
        <Space>
          <Tooltip title="Reschedule">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenScheduleModal(record)}
            >
              Reschedule
            </Button>
          </Tooltip>
          <Tooltip title="Cancel Schedule">
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleCancelSchedule(record.id)}
            >
              Cancel
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Scheduled Posts"
              value={stats?.scheduled_count || scheduledPosts.length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Publishing Today"
              value={stats?.today_count || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Publishing This Week"
              value={stats?.week_count || 0}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Approval"
              value={stats?.pending_approval || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Calendar */}
        <Col span={14}>
          <Card
            title={
              <Space>
                <CalendarOutlined />
                <span>Publication Calendar</span>
              </Space>
            }
          >
            <Calendar
              value={selectedDate}
              onPanelChange={handleMonthChange}
              cellRender={calendarCellRender}
              fullscreen={false}
            />
          </Card>
        </Col>

        {/* Upcoming */}
        <Col span={10}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>Upcoming Publications</span>
              </Space>
            }
          >
            {scheduledPosts.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {scheduledPosts
                  .sort((a, b) => dayjs(a.published_at).unix() - dayjs(b.published_at).unix())
                  .slice(0, 5)
                  .map((post) => (
                    <Card key={post.id} size="small">
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text strong>{post.title}</Text>
                        <Space>
                          <ClockCircleOutlined />
                          <Text type="secondary">
                            {dayjs(post.published_at).format('YYYY-MM-DD HH:mm')}
                          </Text>
                        </Space>
                        <Space>
                          <Text type="secondary">
                            {dayjs(post.published_at).fromNow()}
                          </Text>
                        </Space>
                      </Space>
                    </Card>
                  ))}
              </Space>
            ) : (
              <Alert
                message="No scheduled posts"
                description="Posts scheduled for publication will appear here"
                type="info"
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Scheduled Posts Table */}
      <Card
        title="All Scheduled Posts"
        style={{ marginTop: 16 }}
      >
        <Table
          columns={columns}
          dataSource={scheduledPosts}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* Schedule Modal */}
      <Modal
        title={`Schedule "${selectedPost?.title}"`}
        open={scheduleModalVisible}
        onOk={handleSchedule}
        onCancel={() => setScheduleModalVisible(false)}
        confirmLoading={loading}
        okText="Schedule"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Schedule Publication"
            description="Choose a date and time for this post to be automatically published. Make sure the post is approved before scheduling."
            type="info"
            showIcon
          />

          <div>
            <Text strong>Schedule Date & Time:</Text>
            <DatePicker
              showTime
              style={{ width: '100%', marginTop: 8 }}
              value={scheduleDate}
              onChange={(date) => setScheduleDate(date)}
              disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
              format="YYYY-MM-DD HH:mm"
              showNow={false}
            />
          </div>

          {scheduleDate && (
            <Alert
              message={`This post will be published ${dayjs(scheduleDate).fromNow()}`}
              type="info"
            />
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default SchedulePage;
