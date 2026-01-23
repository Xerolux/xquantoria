import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Avatar,
  Switch,
  Statistic,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { userService } from '../services/api';
import type { User, PaginatedResponse } from '../types';

const { TextArea } = Input;
const { Option } = Select;

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [form] = Form.useForm();

  const currentUser = JSON.parse(localStorage.getItem('user-storage') || '{}').state?.user;

  useEffect(() => {
    fetchUsers();
  }, [pagination.current, pagination.pageSize]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data: PaginatedResponse<User> = await userService.getAll();
      setUsers(data.data || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      role: 'subscriber',
      is_active: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
      password: '', // Don't show password
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await userService.delete(id);
      message.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      message.error('Failed to delete user');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const userData = {
        ...values,
      };

      // Remove password if empty
      if (!userData.password) {
        delete userData.password;
      }

      if (editingUser) {
        await userService.update(editingUser.id, userData);
        message.success('User updated successfully');
      } else {
        await userService.create(userData);
        message.success('User created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error('Failed to save user');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await userService.update(user.id, {
        is_active: !user.is_active,
      });
      message.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error) {
      message.error('Failed to update user status');
    }
  };

  const handleView = (user: User) => {
    setViewingUser(user);
    setViewModalVisible(true);
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'red',
      admin: 'orange',
      editor: 'blue',
      author: 'green',
      contributor: 'cyan',
      subscriber: 'default',
    };
    return colors[role] || 'default';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      editor: 'Editor',
      author: 'Author',
      contributor: 'Contributor',
      subscriber: 'Subscriber',
    };
    return labels[role] || role;
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: unknown, record: User) => (
        <Space>
          <Avatar
            src={record.avatar_url}
            icon={<UserOutlined />}
            size={40}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.display_name || record.name}
              {record.id === currentUser?.id && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  You
                </Tag>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </Space>
      ),
      sorter: (a: User, b: User) => a.name.localeCompare(b.name),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>{getRoleLabel(role)}</Tag>
      ),
      filters: [
        { text: 'Super Admin', value: 'super_admin' },
        { text: 'Admin', value: 'admin' },
        { text: 'Editor', value: 'editor' },
        { text: 'Author', value: 'author' },
        { text: 'Contributor', value: 'contributor' },
        { text: 'Subscriber', value: 'subscriber' },
      ],
      onFilter: (value: unknown, record: User) => record.role === value,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag
          icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={isActive ? 'success' : 'default'}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value: unknown, record: User) => record.is_active === value,
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (date: string) => {
        if (!date) return <span style={{ color: '#999' }}>Never</span>;
        const d = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return d.toLocaleDateString();
      },
      sorter: (a: User, b: User) => {
        if (!a.last_login_at) return 1;
        if (!b.last_login_at) return -1;
        return new Date(b.last_login_at).getTime() - new Date(a.last_login_at).getTime();
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: User, b: User) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: User) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title={record.is_active ? 'Deactivate' : 'Activate'}>
            <Button
              type="text"
              icon={record.is_active ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => handleToggleActive(record)}
            />
          </Tooltip>
          {record.id !== currentUser?.id && (
            <Popconfirm
              title="Delete this user?"
              description="This action cannot be undone"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Calculate statistics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const roleDistribution = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Users" value={totalUsers} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={activeUsers}
              suffix={`/ ${totalUsers}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Inactive Users"
              value={totalUsers - activeUsers}
              valueStyle={{ color: totalUsers - activeUsers > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Super Admins"
              value={roleDistribution.super_admin || 0}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="User Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create User
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={users}
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
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingUser ? 'Edit User' : 'Create User'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={700}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Name"
                name="name"
                rules={[{ required: true, message: 'Please enter name' }]}
              >
                <Input placeholder="John Doe" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Display Name"
                name="display_name"
                tooltip="Optional public display name"
              >
                <Input placeholder="John D." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Invalid email format' },
            ]}
          >
            <Input placeholder="john@example.com" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={editingUser ? 'New Password (leave empty to keep)' : 'Password'}
                name="password"
                rules={editingUser ? [] : [{ required: true, message: 'Please enter password' }]}
                extra={editingUser ? '' : 'Min. 8 characters'}
              >
                <Input.Password placeholder="Min. 8 characters" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Role"
                name="role"
                rules={[{ required: true, message: 'Please select a role' }]}
              >
                <Select placeholder="Select role">
                  <Option value="super_admin">Super Admin</Option>
                  <Option value="admin">Admin</Option>
                  <Option value="editor">Editor</Option>
                  <Option value="author">Author</Option>
                  <Option value="contributor">Contributor</Option>
                  <Option value="subscriber">Subscriber</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Bio"
            name="bio"
            tooltip="Optional short biography"
          >
            <TextArea rows={3} placeholder="Tell us about yourself" />
          </Form.Item>

          {editingUser && (
            <Form.Item
              label="Active Status"
              name="is_active"
              valuePropName="checked"
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          )}

          {editingUser && (
            <Card size="small" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#999' }}>Member Since</div>
                  <div>{new Date(editingUser.created_at).toLocaleDateString()}</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#999' }}>Last Login</div>
                  <div>
                    {editingUser.last_login_at
                      ? new Date(editingUser.last_login_at).toLocaleString()
                      : 'Never'}
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#999' }}>Status</div>
                  <Tag color={editingUser.is_active ? 'success' : 'default'}>
                    {editingUser.is_active ? 'Active' : 'Inactive'}
                  </Tag>
                </Col>
              </Row>
            </Card>
          )}
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={viewingUser?.display_name || viewingUser?.name}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={600}
      >
        {viewingUser && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div style={{ textAlign: 'center' }}>
              <Avatar
                src={viewingUser.avatar_url}
                icon={<UserOutlined />}
                size={100}
              />
              <div style={{ marginTop: 16, fontSize: 20, fontWeight: 500 }}>
                {viewingUser.display_name || viewingUser.name}
              </div>
              <div style={{ color: '#999' }}>{viewingUser.email}</div>
            </div>

            <Card size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#999' }}>Role</div>
                  <Tag color={getRoleColor(viewingUser.role)}>
                    {getRoleLabel(viewingUser.role)}
                  </Tag>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#999' }}>Status</div>
                  <Tag color={viewingUser.is_active ? 'success' : 'default'}>
                    {viewingUser.is_active ? 'Active' : 'Inactive'}
                  </Tag>
                </Col>
              </Row>
            </Card>

            {viewingUser.bio && (
              <div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Bio</div>
                <div>{viewingUser.bio}</div>
              </div>
            )}

            <Card size="small" title="Account Info">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ fontSize: 12, color: '#999' }}>Member Since</div>
                    <div>{new Date(viewingUser.created_at).toLocaleString()}</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: 12, color: '#999' }}>Last Login</div>
                    <div>
                      {viewingUser.last_login_at
                        ? new Date(viewingUser.last_login_at).toLocaleString()
                        : 'Never'}
                    </div>
                  </Col>
                </Row>
              </Space>
            </Card>

            {viewingUser.id === currentUser?.id && (
              <Card size="small" style={{ background: '#e6f7ff' }}>
                <div style={{ color: '#1890ff' }}>
                  This is your account. Some actions are restricted.
                </div>
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default UsersPage;
