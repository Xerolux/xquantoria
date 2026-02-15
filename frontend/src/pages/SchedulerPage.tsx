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
  Timeline,
  Badge,
  Tooltip,
  message,
  Popconfirm,
  Typography,
  Alert,
  Descriptions,
  Switch,
  List,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  CalendarOutlined,
  WarningOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { schedulerService } from '../../services/api';

const { Title, Text } = Typography;

interface ScheduledTask {
  id: string;
  name: string;
  command: string;
  expression: string;
  description: string;
  next_run: string | null;
  enabled: boolean;
}

interface SchedulerData {
  status: {
    enabled: boolean;
    cron_configured: boolean;
    running: boolean;
    health: 'healthy' | 'warning' | 'error';
  };
  tasks: ScheduledTask[];
  last_run: string | null;
  next_run: string | null;
  history: Array<{
    time: string;
    task: string;
    status: string;
    duration: number;
  }>;
  stats: {
    total_today: number;
    successful_today: number;
    failed_today: number;
    success_rate: number;
  };
}

const SchedulerPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SchedulerData | null>(null);
  const [runModalVisible, setRunModalVisible] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await schedulerService.getIndex();
      setData(response.data);
    } catch (error) {
      message.error('Failed to load scheduler data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunScheduler = async (force = false) => {
    try {
      await schedulerService.runScheduler(force);
      message.success('Scheduler run initiated');
      setRunModalVisible(false);
      setTimeout(fetchData, 2000);
    } catch (error) {
      message.error('Failed to run scheduler');
    }
  };

  const handleRunTask = async (taskId: string) => {
    try {
      await schedulerService.runTask(taskId);
      message.success(`Task ${taskId} executed`);
      setTimeout(fetchData, 2000);
    } catch (error) {
      message.error('Failed to run task');
    }
  };

  const handleEnable = async () => {
    try {
      await schedulerService.enable();
      message.success('Scheduler enabled');
      fetchData();
    } catch (error) {
      message.error('Failed to enable scheduler');
    }
  };

  const handleDisable = async () => {
    try {
      await schedulerService.disable();
      message.success('Scheduler disabled');
      fetchData();
    } catch (error) {
      message.error('Failed to disable scheduler');
    }
  };

  const handleClearHistory = async () => {
    try {
      await schedulerService.clearHistory();
      message.success('History cleared');
      fetchData();
    } catch (error) {
      message.error('Failed to clear history');
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const taskColumns = [
    {
      title: 'Task',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ScheduledTask) => (
        <Space>
          <Badge status={record.enabled ? 'success' : 'default'} />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Command',
      dataIndex: 'command',
      key: 'command',
      render: (cmd: string) => <Text code>{cmd}</Text>,
    },
    {
      title: 'Cron Expression',
      dataIndex: 'expression',
      key: 'expression',
      render: (expr: string) => <Tag icon={<ClockCircleOutlined />}>{expr}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Next Run',
      dataIndex: 'next_run',
      key: 'next_run',
      render: (date: string | null) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>{enabled ? 'Yes' : 'No'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ScheduledTask) => (
        <Tooltip title="Run Now">
          <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleRunTask(record.id)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>Scheduler Status</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Scheduler Status"
              value={data?.status.enabled ? 'Enabled' : 'Disabled'}
              prefix={data?.status.enabled ? <CheckCircleOutlined /> : <PauseCircleOutlined />}
              valueStyle={{ color: data?.status.enabled ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Health"
              value={data?.status.health || 'Unknown'}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{
                color: data?.status.health === 'healthy' ? '#52c41a' : 
                       data?.status.health === 'warning' ? '#faad14' : '#ff4d4f'
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Success Rate Today"
              value={data?.stats.success_rate || 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Executions Today"
              value={data?.stats.total_today || 0}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {!data?.status.cron_configured && (
        <Alert
          message="Cron not configured"
          description="The Laravel scheduler cron is not configured. Add this to your crontab: * * * * * php /path-to-your-project/artisan schedule:run >> /dev/null 2>&1"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={24}>
        <Col span={16}>
          <Card
            title="Scheduled Tasks"
            extra={
              <Space>
                <Switch
                  checked={data?.status.enabled}
                  onChange={(checked) => checked ? handleEnable() : handleDisable()}
                  checkedChildren="Enabled"
                  unCheckedChildren="Disabled"
                />
                <Button icon={<PlayCircleOutlined />} onClick={() => setRunModalVisible(true)}>
                  Run Scheduler
                </Button>
              </Space>
            }
          >
            <Table
              columns={taskColumns}
              dataSource={data?.tasks || []}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title="Execution History"
            extra={
              <Popconfirm title="Clear history?" onConfirm={handleClearHistory}>
                <Button size="small" icon={<DeleteOutlined />}>Clear</Button>
              </Popconfirm>
            }
          >
            <List
              dataSource={data?.history?.slice(0, 10) || []}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Badge status={item.status === 'success' ? 'success' : 'error'} />
                    }
                    title={item.task}
                    description={
                      <Space split={<Text type="secondary">|</Text>}>
                        <Text type="secondary">{new Date(item.time).toLocaleString()}</Text>
                        <Text type="secondary">{item.duration}ms</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No history' }}
            />
          </Card>

          <Card title="Last/Next Run" style={{ marginTop: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Last Run">
                {data?.last_run ? new Date(data.last_run).toLocaleString() : 'Never'}
              </Descriptions.Item>
              <Descriptions.Item label="Next Run">
                {data?.next_run ? new Date(data.next_run).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Today's Stats" style={{ marginTop: 16 }}>
            <Row gutter={8}>
              <Col span={8}>
                <Statistic title="Total" value={data?.stats.total_today || 0} />
              </Col>
              <Col span={8}>
                <Statistic title="Success" value={data?.stats.successful_today || 0} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={8}>
                <Statistic title="Failed" value={data?.stats.failed_today || 0} valueStyle={{ color: '#ff4d4f' }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Run Scheduler"
        open={runModalVisible}
        onCancel={() => setRunModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRunModalVisible(false)}>Cancel</Button>,
          <Button key="run" type="primary" onClick={() => handleRunScheduler(false)}>Run</Button>,
          <Button key="force" type="primary" danger onClick={() => handleRunScheduler(true)}>Force Run</Button>,
        ]}
      >
        <Alert
          message="Run the scheduler manually?"
          description="This will execute all due scheduled tasks. Force run will run all tasks regardless of their schedule."
          type="info"
        />
      </Modal>
    </div>
  );
};

export default SchedulerPage;
