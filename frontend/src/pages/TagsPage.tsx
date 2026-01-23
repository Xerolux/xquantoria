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
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { tagService } from '../services/api';
import type { Tag as TagType } from '../types';

const TagsPage: React.FC = () => {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const data = await tagService.getAll();
      setTags(data.data || data);
    } catch (error) {
      message.error('Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTag(null);
    form.resetFields();
    form.setFieldsValue({
      language: 'de',
    });
    setModalVisible(true);
  };

  const handleEdit = (tag: TagType) => {
    setEditingTag(tag);
    form.setFieldsValue({
      ...tag,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await tagService.delete(id);
      message.success('Tag deleted successfully');
      fetchTags();
    } catch (error) {
      message.error('Failed to delete tag');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const tagData = {
        ...values,
      };

      if (editingTag) {
        await tagService.update(editingTag.id, tagData);
        message.success('Tag updated successfully');
      } else {
        await tagService.create(tagData);
        message.success('Tag created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchTags();
    } catch (error) {
      message.error('Failed to save tag');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <TagsOutlined style={{ color: '#52c41a' }} />
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
      sorter: (a: TagType, b: TagType) => a.name.localeCompare(b.name),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#999' }}>
          /{slug}
        </span>
      ),
    },
    {
      title: 'Usage Count',
      dataIndex: 'usage_count',
      key: 'usage_count',
      render: (count: number) => (
        <Tag color={count > 0 ? 'green' : 'default'}>{count} posts</Tag>
      ),
      sorter: (a: TagType, b: TagType) => a.usage_count - b.usage_count,
    },
    {
      title: 'Language',
      dataIndex: 'language',
      key: 'language',
      render: (lang: string) => <Tag>{lang?.toUpperCase()}</Tag>,
      filters: [
        { text: 'German', value: 'de' },
        { text: 'English', value: 'en' },
      ],
      onFilter: (value: unknown, record: TagType) => record.language === value,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: TagType, b: TagType) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: TagType) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this tag?"
            description="This will also unassign posts from this tag"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const totalUsage = tags.reduce((sum, tag) => sum + tag.usage_count, 0);
  const unusedTags = tags.filter((tag) => tag.usage_count === 0).length;
  const mostUsedTags = [...tags]
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Tags" value={tags.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Usage" value={totalUsage} suffix="posts" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Unused Tags"
              value={unusedTags}
              valueStyle={{ color: unusedTags > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Usage"
              value={tags.length > 0 ? Math.round(totalUsage / tags.length) : 0}
              suffix="posts/tag"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Tags Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create Tag
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={tags}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} tags`,
          }}
        />
      </Card>

      {/* Most Used Tags */}
      {mostUsedTags.length > 0 && mostUsedTags[0].usage_count > 0 && (
        <Card title="Most Used Tags" style={{ marginTop: 16 }}>
          <Space size={[8, 8]} wrap>
            {mostUsedTags.map((tag) => (
              <Tag
                key={tag.id}
                color="blue"
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {tag.name} ({tag.usage_count})
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={editingTag ? 'Edit Tag' : 'Create Tag'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={500}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter tag name' }]}
          >
            <Input placeholder="e.g., React" />
          </Form.Item>

          <Form.Item
            label="Language"
            name="language"
            rules={[{ required: true, message: 'Please select language' }]}
          >
            <Select>
              <Select.Option value="de">German (DE)</Select.Option>
              <Select.Option value="en">English (EN)</Select.Option>
            </Select>
          </Form.Item>

          {editingTag && (
            <Card size="small" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Usage Count"
                    value={editingTag.usage_count}
                    suffix="posts"
                  />
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                    Created
                  </div>
                  <div>{new Date(editingTag.created_at).toLocaleDateString()}</div>
                </Col>
              </Row>
            </Card>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default TagsPage;
