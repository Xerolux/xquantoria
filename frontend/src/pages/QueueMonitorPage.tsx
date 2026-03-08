import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Descriptions,
  Progress,
  Statistic,
  Row,
  Col,
  Tabs,
  Badge,
  Tooltip,
  message,
  Popconfirm,
  Drawer,
  Typography,
  Alert,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  DeleteOutlined,
  RedoOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ClearOutlined,
  EyeOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { queueMonitorService } from '../services/api';

const { Title, Text } = Typography;

interface QueueJob {
  id: string;
  job: string;
  queue: string;
  attempts: number;
  command_class: string | null;
  created_at: string | null;
}

interface FailedJob {
  id: number;
  connection: string;
  queue: string;
  job: string;
  exception: string;
  failed_at: string;
}

interface QueueStats {
  name: string;
  pending: number;
  delayed: number;
  reserved: number;
  total: number;
}

interface QueueMonitorData {
  queues: QueueStats[];
  workers: Array<{ pid: number; queue: string; status: string }>;
  failed_jobs: FailedJob[];
  summary: {
    total_pending: number;
    total_failed: number;
    total_processed_today: number;
  };
}

const QueueMonitorPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QueueMonitorData | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [queueDetails, setQueueDetails] = useState<any>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [failedJobDetails, setFailedJobDetails] = useState<FailedJob | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await queueMonitorService.getIndex();
      setData(response.data);
    } catch (error) {
      message.error('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewQueue = async (queueName: string) => {
    try {
      const response = await queueMonitorService.getQueue(queueName);
      setQueueDetails(response.data);
      setSelectedQueue(queueName);
      setDetailsVisible(true);
    } catch (error) {
      message.error('Failed to load queue details');
    }
  };

  const handleRetry = async (id: number) => {
    try {
      await queueMonitorService.retryFailedJob(id);
      message.success('Job retry initiated');
      fetchData();
    } catch (error) {
      message.error('Failed to retry job');
    }
  };

  const handleForget = async (id: number) => {
    try {
      await queueMonitorService.forgetFailedJob(id);
      message.success('Failed job deleted');
      fetchData();
    } catch (error) {
      message.error('Failed to delete job');
    }
  };

  const handleFlush = async () => {
    try {
      await queueMonitorService.flushFailedJobs();
      message.success('All failed jobs cleared');
      fetchData();
    } catch (error) {
      message.error('Failed to clear failed jobs');
    }
  };

  const handleClearQueue = async (queueName: string) => {
    try {
      await queueMonitorService.clearQueue(queueName);
      message.success(`Queue ${queueName} cleared`);
      fetchData();
    } catch (error) {
      message.error('Failed to clear queue');
    }
  };

  const handlePauseQueue = async (queueName: string) => {
    try {
      await queueMonitorService.pauseQueue(queueName);
      message.success(`Queue ${queueName} paused`);
    } catch (error) {
      message.error('Failed to pause queue');
    }
  };

  const handleResumeQueue = async (queueName: string) => {
    try {
      await queueMonitorService.resumeQueue(queueName);
      message.success(`Queue ${queueName} resumed`);
    } catch (error) {
      message.error('Failed to resume queue');
    }
  };

  const queueColumns = [
    {
      title: 'Queue Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Badge status="processing" text={name} />,
    },
    {
      title: 'Pending',
      dataIndex: 'pending',
      key: 'pending',
      render: (count: number) => (
        <Tag color={count > 100 ? 'red' : count > 10 ? 'orange' : 'green'}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Delayed',
      dataIndex: 'delayed',
      key: 'delayed',
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: 'Reserved',
      dataIndex: 'reserved',
      key: 'reserved',
      render: (count: number) => <Tag color="purple">{count}</Tag>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (count: number) => <strong>{count}</strong>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: QueueStats) => (
        <Space>
          <Tooltip title="View Details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewQueue(record.name)} />
          </Tooltip>
          <Tooltip title="Pause">
            <Button size="small" icon={<PauseCircleOutlined />} onClick={() => handlePauseQueue(record.name)} />
          </Tooltip>
          <Tooltip title="Resume">
            <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleResumeQueue(record.name)} />
          </Tooltip>
          <Popconfirm title="Clear all jobs in this queue?" onConfirm={() => handleClearQueue(record.name)}>
            <Button size="small" danger icon={<ClearOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const failedJobsColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Queue',
      dataIndex: 'queue',
      key: 'queue',
      render: (queue: string) => <Tag>{queue}</Tag>,
    },
    {
      title: 'Job',
      dataIndex: 'job',
      key: 'job',
      ellipsis: true,
      render: (job: string) => <Text code>{job}</Text>,
    },
    {
      title: 'Exception',
      dataIndex: 'exception',
      key: 'exception',
      ellipsis: true,
      width: 300,
    },
    {
      title: 'Failed At',
      dataIndex: 'failed_at',
      key: 'failed_at',
      width: 180,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: FailedJob) => (
        <Space>
          <Tooltip title="Retry">
            <Button size="small" icon={<RedoOutlined />} onClick={() => handleRetry(record.id)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleForget(record.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>Queue Monitor</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Pending"
              value={data?.summary.total_pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Failed Jobs"
              value={data?.summary.total_failed || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: data?.summary.total_failed ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Processed Today"
              value={data?.summary.total_processed_today || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Workers"
              value={data?.workers?.length || 0}
              prefix={<SyncOutlined spin={!!data?.workers?.length} />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'queues',
            label: (
              <span>
                <DatabaseOutlined /> Queues
              </span>
            ),
            children: (
              <Card title="Queue Status">
                <Table
                  columns={queueColumns}
                  dataSource={data?.queues || []}
                  rowKey="name"
                  loading={loading}
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'failed',
            label: (
              <span>
                <ExclamationCircleOutlined /> Failed Jobs
                <Badge count={data?.summary.total_failed || 0} style={{ marginLeft: 8 }} />
              </span>
            ),
            children: (
              <Card
                title="Failed Jobs"
                extra={
                  <Popconfirm title="Clear all failed jobs?" onConfirm={handleFlush}>
                    <Button danger icon={<DeleteOutlined />}>
                      Flush All
                    </Button>
                  </Popconfirm>
                }
              >
                {data?.failed_jobs && data.failed_jobs.length > 0 && (
                  <Alert
                    message="Some jobs have failed"
                    description="Review the exceptions and either retry or delete failed jobs."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
                <Table
                  columns={failedJobsColumns}
                  dataSource={data?.failed_jobs || []}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Drawer
        title={`Queue: ${selectedQueue}`}
        placement="right"
        width={600}
        onClose={() => setDetailsVisible(false)}
        open={detailsVisible}
      >
        {queueDetails && (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Statistic title="Pending" value={queueDetails.stats.pending_count} />
              </Col>
              <Col span={8}>
                <Statistic title="Delayed" value={queueDetails.stats.delayed_count} />
              </Col>
              <Col span={8}>
                <Statistic title="Reserved" value={queueDetails.stats.reserved_count} />
              </Col>
            </Row>

            <Title level={5}>Pending Jobs</Title>
            <Table
              dataSource={queueDetails.pending}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 80 },
                { title: 'Job', dataIndex: 'job', ellipsis: true },
                { title: 'Attempts', dataIndex: 'attempts', width: 80 },
              ]}
            />

            <Title level={5} style={{ marginTop: 16 }}>Delayed Jobs</Title>
            <Table
              dataSource={queueDetails.delayed}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 80 },
                { title: 'Job', dataIndex: 'job', ellipsis: true },
              ]}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default QueueMonitorPage;
