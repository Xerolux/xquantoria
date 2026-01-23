import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  List,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  message,
  Typography,
  Progress,
  Alert,
  Select,
} from 'antd';
import {
  TeamOutlined,
  CrownOutlined,
  SafetyOutlined,
  EditOutlined,
  UserOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface Role {
  key: string;
  name: string;
  level: number;
  icon: React.ReactNode;
  color: string;
  description: string;
  permissions: string[];
  users_count: number;
}

const RoleHierarchyPage: React.FC = () => {
  const [roles] = useState<Role[]>([
    {
      key: 'super_admin',
      name: 'Super Admin',
      level: 100,
      icon: <CrownOutlined />,
      color: '#ff4d4f',
      description: 'Full system access including user management',
      permissions: ['All permissions'],
      users_count: 1,
    },
    {
      key: 'admin',
      name: 'Admin',
      level: 80,
      icon: <SafetyOutlined />,
      color: '#faad14',
      description: 'Manage content, users, and settings',
      permissions: ['Create/Edit/Delete Posts', 'Manage Users', 'Manage Comments', 'Manage Media', 'View Analytics'],
      users_count: 3,
    },
    {
      key: 'editor',
      name: 'Editor',
      level: 60,
      icon: <EditOutlined />,
      color: '#52c41a',
      description: 'Publish and manage all content',
      permissions: ['Create/Edit Posts', 'Publish Posts', 'Manage Comments', 'Upload Media'],
      users_count: 5,
    },
    {
      key: 'author',
      name: 'Author',
      level: 40,
      icon: <UserOutlined />,
      color: '#1890ff',
      description: 'Create and edit own posts',
      permissions: ['Create/Edit Own Posts', 'Upload Media'],
      users_count: 12,
    },
    {
      key: 'contributor',
      name: 'Contributor',
      level: 20,
      icon: <UserOutlined />,
      color: '#722ed1',
      description: 'Create drafts (cannot publish)',
      permissions: ['Create Drafts', 'Upload Own Media'],
      users_count: 8,
    },
    {
      key: 'subscriber',
      name: 'Subscriber',
      level: 10,
      icon: <TeamOutlined />,
      color: '#8c8c8c',
      description: 'Read-only access to published content',
      permissions: ['View Published Posts', 'Manage Own Profile'],
      users_count: 45,
    },
  ]);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [form] = Form.useForm();

  const getRoleWidth = (level: number) => {
    return Math.min(100, Math.max(20, level));
  };

  const handleAssignManager = (role: Role) => {
    setSelectedRole(role);
    setAssignModalVisible(true);
  };

  const handleAssignManagerSubmit = async () => {
    try {
      await form.validateFields();
      message.success(`Manager assigned to ${selectedRole?.name}`);
      setAssignModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to assign manager');
    }
  };

  return (
    <div>
      <Title level={2}>
        <TeamOutlined /> Role Hierarchy & Permissions
      </Title>
      <Text type="secondary">Manage user roles, permissions, and organizational structure</Text>

      <Card style={{ marginTop: 16 }} title="Role Hierarchy (by permission level)">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {roles.map((role) => (
            <Card
              key={role.key}
              size="small"
              style={{ marginBottom: 8 }}
              headStyle={{
                background: role.color,
                color: '#fff',
              }}
              title={
                <Space style={{ color: '#fff' }}>
                  {role.icon}
                  <span style={{ fontWeight: 500 }}>
                    {role.name}
                  </span>
                  <Tag color={role.color}>
                    Level {role.level}
                  </Tag>
                </Space>
              }
              extra={
                <Button
                  type="link"
                  style={{ color: '#fff' }}
                  onClick={() => handleAssignManager(role)}
                >
                  Assign Manager
                </Button>
              }
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Text strong>Users:</Text> <Tag>{role.users_count}</Tag>
                </Col>
                <Col span={18}>
                  <Text strong>Permission Level:</Text>
                  <Progress
                    percent={getRoleWidth(role.level)}
                    showInfo={false}
                    strokeColor={role.color}
                  />
                </Col>
              </Row>

              <div style={{ marginTop: 12 }}>
                <Text strong style={{ marginBottom: 8 }}>Description:</Text>
                <p style={{ margin: 0 }}>{role.description}</p>
              </div>

              <div style={{ marginTop: 12 }}>
                <Text strong>Permissions:</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    {role.permissions.slice(0, 3).map((_perm, i) => (
                      <Tag key={i} color="blue">{_perm}</Tag>
                    ))}
                    {role.permissions.length > 3 && (
                      <Tag>+{role.permissions.length - 3} more</Tag>
                    )}
                  </Space>
                </div>
              </div>
            </Card>
          ))}
        </Space>
      </Card>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="Role Comparison Matrix">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ border: '1px solid #f0f0f0', padding: 8 }}>Permission</th>
                  {roles.slice(0, 4).map((role) => (
                    <th
                      key={role.key}
                      style={{
                        border: '1px solid #f0f0f0',
                        padding: 8,
                        textAlign: 'center',
                        color: role.color,
                      }}
                    >
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8 }}>Create Posts</td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8 }}>Publish Posts</td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <WarningOutlined style={{ color: '#faad14' }} />
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8 }}>Manage Users</td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <WarningOutlined style={{ color: '#faad14' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <WarningOutlined style={{ color: '#faad14' }} />
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8 }}>System Settings</td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <WarningOutlined style={{ color: '#faad14' }} />
                  </td>
                  <td style={{ border: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
                    <WarningOutlined style={{ color: '#faad14' }} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Hierarchy Rules">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                type="info"
                message="Role Inheritance"
                description="Higher level roles inherit all permissions from lower level roles"
                showIcon
              />

              <div>
                <Text strong>Permission Levels:</Text>
                <List
                  size="small"
                  dataSource={roles}
                  renderItem={(role) => (
                    <List.Item>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          {role.icon}
                          <span>{role.name}</span>
                        </Space>
                        <Tag color={role.color}>Level {role.level}</Tag>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>

              <Alert
                type="warning"
                message="Manager Assignment"
                description="Each role can have a manager who approves actions performed by users in that role"
                showIcon
              />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Assign Manager Modal */}
      <Modal
        title={`Assign Manager to ${selectedRole?.name}`}
        open={assignModalVisible}
        onOk={handleAssignManagerSubmit}
        onCancel={() => setAssignModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="manager_id"
            label="Select Manager"
            rules={[{ required: true, message: 'Please select a manager' }]}
          >
            <Select placeholder="Choose a manager from higher role levels">
              {/* Mock users from higher roles */}
              <Select.Option value="1">Admin User 1</Select.Option>
              <Select.Option value="2">Admin User 2</Select.Option>
              <Select.Option value="3">Super Admin</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="approval_required"
            label="Requires Approval"
            initialValue={false}
          >
            <Select>
              <Select.Option value={true}>Yes - Manager must approve actions</Select.Option>
              <Select.Option value={false}>No - Automatic approval</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleHierarchyPage;
