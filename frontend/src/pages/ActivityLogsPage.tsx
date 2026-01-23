import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Typography,
  Alert,
  Drawer,
} from 'antd';
import {
  FileTextOutlined,
  ExportOutlined,
  DeleteOutlined,
  SearchOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { activityLogService } from '../services/api';
import type { ActivityLog, ActivityLogStats } from '../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Text, Paragraph } = Typography;

const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    action: undefined as string | undefined,
    user_id: undefined as number | undefined,
    tag: undefined as string | undefined,
    search: undefined as string | undefined,
    from_date: undefined as string | undefined,
    to_date: undefined as string | undefined,
  });

  // Clean Modal
  const [cleanModalVisible, setCleanModalVisible] = useState(false);
  const [cleanDays, setCleanDays] = useState(90);
  const [cleaning, setCleaning] = useState(false);

  // Detail Drawer
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [pagination.current, pagination.pageSize]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await activityLogService.getAll({
        page: pagination.current,
        per_page: pagination.pageSize,
        ...filters,
      });
      setLogs(data.data || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      message.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await activityLogService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const handleExport = () => {
    activityLogService.export(filters);
    message.success('Exporting activity logs...');
  };

  const handleClean = async () => {
    setCleaning(true);
    try {
      const result = await activityLogService.clean(cleanDays);
      message.success(result.message);
      setCleanModalVisible(false);
      fetchLogs();
      fetchStats();
    } catch (error) {
      message.error('Failed to clean old logs');
    } finally {
      setCleaning(false);
    }
  };

  const handleViewDetail = (log: ActivityLog) => {
    setSelectedLog(log);
    setDetailDrawerVisible(true);
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      create: 'success',
      update: 'processing',
      delete: 'error',
      login: 'success',
      logout: 'default',
      failed_login: 'error',
      view: 'default',
      export: 'processing',
      import: 'success',
      download: 'processing',
      upload: 'success',
      backup: 'default',
      restore: 'warning',
      settings_update: 'processing',
      password_change: 'warning',
      '2fa_enabled': 'success',
      '2fa_disabled': 'error',
    };
    return colors[action] || 'default';
  };

  const columns: ColumnsType<ActivityLog> = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(date).format('YYYY-MM-DD')}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(date).format('HH:mm:ss')}
          </Text>
        </Space>
      ),
      sorter: true,
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      width: 150,
      render: (user: unknown, record: ActivityLog) => (
        <Space direction="vertical" size={0}>
          <Text strong>{user?.name || 'System'}</Text>
          {user?.email && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {user.email}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => (
        <Tag color={getActionColor(action)}>
          {action.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Create', value: 'create' },
        { text: 'Update', value: 'update' },
        { text: 'Delete', value: 'delete' },
        { text: 'Login', value: 'login' },
        { text: 'Logout', value: 'logout' },
        { text: 'Export', value: 'export' },
        { text: 'Import', value: 'import' },
        { text: 'Backup', value: 'backup' },
      ],
      onFilter: (value: unknown, record: ActivityLog) => record.action === value,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string, record: ActivityLog) => (
        <Space>
          <Text>{description || `${record.action} ${record.model_type || ''}`}</Text>
          {record.tags && (
            <Tag color="blue">{record.tags}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Model',
      key: 'model',
      width: 150,
      render: (_: unknown, record: ActivityLog) => (
        <Space direction="vertical" size={0}>
          {record.model_type && (
            <Text style={{ fontSize: 12 }}>
              {record.model_type?.split('\\').pop()}
            </Text>
          )}
          {record.model_id && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {record.model_id}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (ip: string) => ip || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: ActivityLog) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleViewDetail(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Stats Dashboard */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Logs"
                value={stats.total_logs}
                prefix={<HistoryOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Today"
                value={stats.today_logs}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="This Week"
                value={stats.week_logs}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="This Month"
                value={stats.month_logs}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>Activity Logs</span>
          </Space>
        }
        extra={
          <Space>
            <Button onClick={fetchLogs}>Reload</Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              Export
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => setCleanModalVisible(true)}
            >
              Clean Old Logs
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
            onPressEnter={fetchLogs}
            allowClear
          />

          <Select
            placeholder="Filter by Action"
            style={{ width: 150 }}
            value={filters.action}
            onChange={(value) => setFilters({ ...filters, action: value })}
            allowClear
          >
            <Select.Option value="create">Create</Select.Option>
            <Select.Option value="update">Update</Select.Option>
            <Select.Option value="delete">Delete</Select.Option>
            <Select.Option value="login">Login</Select.Option>
            <Select.Option value="logout">Logout</Select.Option>
            <Select.Option value="export">Export</Select.Option>
            <Select.Option value="import">Import</Select.Option>
            <Select.Option value="backup">Backup</Select.Option>
          </Select>

          <Select
            placeholder="Filter by Tag"
            style={{ width: 150 }}
            value={filters.tag}
            onChange={(value) => setFilters({ ...filters, tag: value })}
            allowClear
          >
            <Select.Option value="security">Security</Select.Option>
            <Select.Option value="admin">Admin</Select.Option>
            <Select.Option value="critical">Critical</Select.Option>
            <Select.Option value="content">Content</Select.Option>
            <Select.Option value="media">Media</Select.Option>
            <Select.Option value="user">User</Select.Option>
            <Select.Option value="system">System</Select.Option>
          </Select>

          <RangePicker
            placeholder={['From Date', 'To Date']}
            value={
              filters.from_date && filters.to_date
                ? [dayjs(filters.from_date), dayjs(filters.to_date)]
                : null
            }
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setFilters({
                  ...filters,
                  from_date: dates[0].format('YYYY-MM-DD'),
                  to_date: dates[1].format('YYYY-MM-DD'),
                });
              } else {
                setFilters({
                  ...filters,
                  from_date: undefined,
                  to_date: undefined,
                });
              }
            }}
          />

          <Button type="primary" icon={<SearchOutlined />} onClick={fetchLogs}>
            Search
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={(newPagination) => {
            setPagination({
              current: newPagination.current || 1,
              pageSize: newPagination.pageSize || 50,
              total: pagination.total,
            });
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Clean Old Logs Modal */}
      <Modal
        title="Clean Old Activity Logs"
        open={cleanModalVisible}
        onOk={handleClean}
        onCancel={() => setCleanModalVisible(false)}
        confirmLoading={cleaning}
        okButtonProps={{ danger: true }}
      >
        <Alert
          type="warning"
          message="Warning"
          description="This action will permanently delete old activity logs. This cannot be undone!"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>Delete logs older than:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={cleanDays}
              onChange={setCleanDays}
            >
              <Select.Option value={30}>30 days</Select.Option>
              <Select.Option value={60}>60 days</Select.Option>
              <Select.Option value={90}>90 days (default)</Select.Option>
              <Select.Option value={180}>180 days</Select.Option>
              <Select.Option value={365}>365 days</Select.Option>
            </Select>
          </div>

          <Text type="secondary">
            This helps manage database size and complies with data retention policies.
          </Text>
        </Space>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title="Activity Log Details"
        placement="right"
        width={600}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        {selectedLog && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Basic Info */}
            <Card title="Basic Information" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">ID:</Text>{' '}
                  <Text strong>{selectedLog.id}</Text>
                </div>
                <div>
                  <Text type="secondary">Date:</Text>{' '}
                  <Text>{dayjs(selectedLog.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
                </div>
                <div>
                  <Text type="secondary">Action:</Text>{' '}
                  <Tag color={getActionColor(selectedLog.action)}>
                    {selectedLog.action.toUpperCase()}
                  </Tag>
                </div>
                {selectedLog.tags && (
                  <div>
                    <Text type="secondary">Tags:</Text>{' '}
                    <Tag color="blue">{selectedLog.tags}</Tag>
                  </div>
                )}
              </Space>
            </Card>

            {/* User Info */}
            <Card title="User Information" size="small">
              {selectedLog.user ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">Name:</Text>{' '}
                    <Text strong>{selectedLog.user.name}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Email:</Text>{' '}
                    <Text>{selectedLog.user.email}</Text>
                  </div>
                </Space>
              ) : (
                <Text type="secondary">System Action</Text>
              )}
            </Card>

            {/* Model Info */}
            {selectedLog.model_type && (
              <Card title="Model Information" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">Type:</Text>{' '}
                    <Text code>{selectedLog.model_type?.split('\\').pop()}</Text>
                  </div>
                  {selectedLog.model_id && (
                    <div>
                      <Text type="secondary">ID:</Text>{' '}
                      <Text code>{selectedLog.model_id}</Text>
                    </div>
                  )}
                </Space>
              </Card>
            )}

            {/* Description */}
            {selectedLog.description && (
              <Card title="Description" size="small">
                <Paragraph>{selectedLog.description}</Paragraph>
              </Card>
            )}

            {/* Changes */}
            {(selectedLog.old_values || selectedLog.new_values) && (
              <Card title="Changes" size="small">
                {selectedLog.old_values && (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Old Values:</Text>
                    <pre style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.new_values && (
                  <div>
                    <Text strong>New Values:</Text>
                    <pre style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </Card>
            )}

            {/* Request Info */}
            <Card title="Request Information" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                {selectedLog.ip_address && (
                  <div>
                    <Text type="secondary">IP Address:</Text>{' '}
                    <Text code>{selectedLog.ip_address}</Text>
                  </div>
                )}
                {selectedLog.user_agent && (
                  <div>
                    <Text type="secondary">User Agent:</Text>{' '}
                    <Text ellipsis style={{ maxWidth: 400 }}>
                      {selectedLog.user_agent}
                    </Text>
                  </div>
                )}
              </Space>
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default ActivityLogsPage;
