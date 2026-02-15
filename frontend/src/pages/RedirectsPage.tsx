import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  Tabs,
  Badge,
} from 'antd';
import {
  RedirectOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  SwapOutlined,
  BarChartOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { redirectService } from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Redirect {
  id: number;
  from_url: string;
  to_url: string;
  status_code: number;
  is_active: boolean;
  hits: number;
  last_hit_at: string | null;
  notes: string | null;
  creator?: { id: number; name: string };
  created_at: string;
}

interface RedirectStats {
  total: number;
  active: number;
  inactive: number;
  permanent: number;
  temporary: number;
  total_hits: number;
  top_redirects: Redirect[];
  recently_hit: Redirect[];
}

const RedirectsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [stats, setStats] = useState<RedirectStats | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [filters, setFilters] = useState<{ status_code?: number; is_active?: boolean }>({});
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();

  useEffect(() => {
    fetchRedirects();
    fetchStats();
  }, [filters]);

  const fetchRedirects = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { per_page: 100 };
      if (filters.status_code) params.status_code = filters.status_code;
      if (filters.is_active !== undefined) params.is_active = filters.is_active;

      const response = await redirectService.getAll(params);
      setRedirects(response.data || []);
    } catch (error) {
      message.error('Failed to load redirects');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await redirectService.getStats();
      setStats(response);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleCreate = async (values: Record<string, unknown>) => {
    try {
      if (editingRedirect) {
        await redirectService.update(editingRedirect.id, values);
        message.success('Redirect updated');
      } else {
        await redirectService.create(values);
        message.success('Redirect created');
      }
      setModalVisible(false);
      setEditingRedirect(null);
      form.resetFields();
      fetchRedirects();
      fetchStats();
    } catch (error) {
      message.error('Failed to save redirect');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await redirectService.delete(id);
      message.success('Redirect deleted');
      fetchRedirects();
      fetchStats();
    } catch (error) {
      message.error('Failed to delete redirect');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await redirectService.toggle(id);
      message.success('Redirect toggled');
      fetchRedirects();
      fetchStats();
    } catch (error) {
      message.error('Failed to toggle redirect');
    }
  };

  const handleResetHits = async (id: number) => {
    try {
      await redirectService.resetHits(id);
      message.success('Hits reset');
      fetchRedirects();
      fetchStats();
    } catch (error) {
      message.error('Failed to reset hits');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select redirects to delete');
      return;
    }

    try {
      await redirectService.bulkDelete(selectedRowKeys);
      message.success(`${selectedRowKeys.length} redirects deleted`);
      setSelectedRowKeys([]);
      fetchRedirects();
      fetchStats();
    } catch (error) {
      message.error('Failed to delete redirects');
    }
  };

  const handleBulkCreate = async (values: { redirects_text: string }) => {
    try {
      const lines = values.redirects_text.split('\n').filter((line) => line.trim());
      const redirects = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          from_url: parts[0] || '',
          to_url: parts[1] || '',
          status_code: parseInt(parts[2]) || 301,
        };
      });

      const response = await redirectService.bulkCreate(redirects);
      message.success(`${response.data.created_count} redirects created`);
      setBulkModalVisible(false);
      bulkForm.resetFields();
      fetchRedirects();
      fetchStats();
    } catch (error) {
      message.error('Failed to create redirects');
    }
  };

  const handleExport = async () => {
    try {
      const response = await redirectService.export();
      const data = JSON.stringify(response.data, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'redirects.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error('Failed to export');
    }
  };

  const openEdit = (redirect: Redirect) => {
    setEditingRedirect(redirect);
    form.setFieldsValue(redirect);
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'From URL',
      dataIndex: 'from_url',
      key: 'from_url',
      ellipsis: true,
      render: (url: string) => (
        <Tooltip title={url}>
          <Text code>{url}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'To URL',
      dataIndex: 'to_url',
      key: 'to_url',
      ellipsis: true,
      render: (url: string) => (
        <Tooltip title={url}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status_code',
      key: 'status_code',
      width: 100,
      render: (code: number) => (
        <Tag color={code === 301 ? 'blue' : code === 302 ? 'orange' : 'default'}>
          {code}
        </Tag>
      ),
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean) => (
        <Badge status={active ? 'success' : 'default'} text={active ? 'Yes' : 'No'} />
      ),
    },
    {
      title: 'Hits',
      dataIndex: 'hits',
      key: 'hits',
      width: 80,
      sorter: (a: Redirect, b: Redirect) => a.hits - b.hits,
      render: (hits: number) => <Tag color={hits > 100 ? 'green' : 'default'}>{hits}</Tag>,
    },
    {
      title: 'Last Hit',
      dataIndex: 'last_hit_at',
      key: 'last_hit_at',
      width: 120,
      render: (date: string | null) =>
        date ? <Tooltip title={dayjs(date).format('DD.MM.YYYY HH:mm')}>{dayjs(date).fromNow()}</Tooltip> : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Redirect) => (
        <Space>
          <Tooltip title="Toggle">
            <Button
              type="text"
              icon={record.is_active ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggle(record.id)}
            />
          </Tooltip>
          <Tooltip title="Reset Hits">
            <Button type="text" icon={<ReloadOutlined />} onClick={() => handleResetHits(record.id)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm title="Delete this redirect?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Redirects" value={stats?.total || 0} prefix={<RedirectOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active"
              value={stats?.active || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Permanent (301)"
              value={stats?.permanent || 0}
              prefix={<SwapOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Hits" value={stats?.total_hits || 0} prefix={<BarChartOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Title level={4} style={{ margin: 0 }}>
            <RedirectOutlined /> Redirect Management
          </Title>
        }
        extra={
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => setBulkModalVisible(true)}>
              Bulk Import
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingRedirect(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Add Redirect
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Status Code"
            style={{ width: 150 }}
            allowClear
            onChange={(value) => setFilters({ ...filters, status_code: value })}
          >
            <Option value={301}>301 - Permanent</Option>
            <Option value={302}>302 - Temporary</Option>
            <Option value={307}>307 - Temporary</Option>
            <Option value={308}>308 - Permanent</Option>
          </Select>
          <Select
            placeholder="Active Status"
            style={{ width: 150 }}
            allowClear
            onChange={(value) => setFilters({ ...filters, is_active: value })}
          >
            <Option value={true}>Active</Option>
            <Option value={false}>Inactive</Option>
          </Select>
          {selectedRowKeys.length > 0 && (
            <Popconfirm title={`Delete ${selectedRowKeys.length} redirects?`} onConfirm={handleBulkDelete}>
              <Button danger>Delete Selected ({selectedRowKeys.length})</Button>
            </Popconfirm>
          )}
        </Space>

        <Table
          columns={columns}
          dataSource={redirects}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as number[]),
          }}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `${total} redirects`,
          }}
        />
      </Card>

      <Modal
        title={editingRedirect ? 'Edit Redirect' : 'Add Redirect'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRedirect(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="from_url"
            label="From URL"
            rules={[{ required: true, message: 'Please enter source URL' }]}
          >
            <Input placeholder="/old-page" />
          </Form.Item>
          <Form.Item
            name="to_url"
            label="To URL"
            rules={[{ required: true, message: 'Please enter destination URL' }]}
          >
            <Input placeholder="/new-page or https://example.com/page" />
          </Form.Item>
          <Form.Item name="status_code" label="Status Code" initialValue={301}>
            <Select>
              <Option value={301}>301 - Permanent Redirect</Option>
              <Option value={302}>302 - Temporary Redirect</Option>
              <Option value={307}>307 - Temporary (Preserve Method)</Option>
              <Option value={308}>308 - Permanent (Preserve Method)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Optional notes..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Bulk Import Redirects"
        open={bulkModalVisible}
        onCancel={() => {
          setBulkModalVisible(false);
          bulkForm.resetFields();
        }}
        onOk={() => bulkForm.submit()}
        width={600}
      >
        <Form form={bulkForm} layout="vertical" onFinish={handleBulkCreate}>
          <Form.Item
            name="redirects_text"
            label="Redirects (CSV format)"
            rules={[{ required: true }]}
            extra="Format: from_url, to_url, status_code (one per line). Status code is optional (default: 301)"
          >
            <TextArea
              rows={10}
              placeholder="/old-page, /new-page, 301&#10;/another-old, /another-new"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RedirectsPage;
