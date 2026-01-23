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
  ColorPicker,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { categoryService } from '../services/api';
import type { Category } from '../types';

const { TextArea } = Input;

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getAll();
      setCategories(data.data || data);
    } catch (error) {
      message.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      language: 'de',
      color: '#1890ff',
    });
    setModalVisible(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      ...category,
      parent_id: category.parent_id || undefined,
      color: category.color || '#1890ff',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await categoryService.delete(id);
      message.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      message.error('Failed to delete category');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Convert ColorPicker value to hex string
      if (values.color && typeof values.color === 'object') {
        values.color = values.color.toHexString();
      }

      const categoryData = {
        ...values,
      };

      if (editingCategory) {
        await categoryService.update(editingCategory.id, categoryData);
        message.success('Category updated successfully');
      } else {
        await categoryService.create(categoryData);
        message.success('Category created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchCategories();
    } catch (error) {
      message.error('Failed to save category');
    }
  };

  const getParentCategoryName = (parentId: number | undefined): string => {
    if (!parentId) return '-';
    const parent = categories.find((c) => c.id === parentId);
    return parent ? parent.name : '-';
  };

  const flattenedCategories: (Category & { level: number })[] = [];

  const flattenTree = (parentId: number | null = null, level: number = 0) => {
    const children = categories.filter((c) =>
      parentId === null ? !c.parent_id : c.parent_id === parentId
    );
    children.forEach((child) => {
      flattenedCategories.push({ ...child, level });
      flattenTree(child.id, level + 1);
    });
  };

  flattenTree();

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: Category & { level: number }) => {
        const indent = record.level * 24;
        const hasChildren = categories.some((c) => c.parent_id === record.id);

        return (
          <Space style={{ marginLeft: indent }}>
            {hasChildren ? (
              <FolderOpenOutlined style={{ color: record.color || '#1890ff' }} />
            ) : (
              <FolderOutlined style={{ color: record.color || '#1890ff' }} />
            )}
            <span>
              {record.name}
              {record.parent_id && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  Subcategory
                </Tag>
              )}
            </span>
          </Space>
        );
      },
      sorter: (a: Category, b: Category) => a.name.localeCompare(b.name),
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
      title: 'Parent',
      dataIndex: 'parent_id',
      key: 'parent_id',
      render: (parentId: number | undefined) => getParentCategoryName(parentId),
      filters: [
        { text: 'Root Categories', value: 'root' },
        { text: 'Subcategories', value: 'sub' },
      ],
      onFilter: (value: unknown, record: Category) => {
        if (value === 'root') return !record.parent_id;
        if (value === 'sub') return !!record.parent_id;
        return true;
      },
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (color: string) => (
        <Space>
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: color || '#1890ff',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
            }}
          />
          <span style={{ fontSize: 12 }}>{color || '#1890ff'}</span>
        </Space>
      ),
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
      onFilter: (value: unknown, record: Category) => record.language === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Category) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this category?"
            description="This will also unassign posts from this category"
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

  // Get parent category options (exclude current category when editing)
  const getParentOptions = () => {
    if (editingCategory) {
      return categories
        .filter((c) => c.id !== editingCategory.id)
        .map((c) => ({
          label: c.name,
          value: c.id,
        }));
    }
    return categories.map((c) => ({
      label: c.name,
      value: c.id,
    }));
  };

  return (
    <div>
      <Card
        title="Categories Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create Category
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={flattenedCategories}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} categories`,
          }}
          expandable={{
            defaultExpandAllRows: true,
            indentSize: 0,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Create Category'}
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
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g., Technology" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Parent Category"
                name="parent_id"
                tooltip="Optional. Create a subcategory"
              >
                <Select
                  placeholder="Select parent category"
                  allowClear
                  options={getParentOptions()}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
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
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Color" name="color">
                <ColorPicker showText />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Icon URL"
                name="icon_url"
                tooltip="Optional URL to category icon image"
              >
                <Input placeholder="https://example.com/icon.png" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Description"
            name="description"
            tooltip="Optional category description"
          >
            <TextArea rows={3} placeholder="Brief description of this category" />
          </Form.Item>

          <Card title="SEO Settings" size="small">
            <Form.Item
              label="Meta Title"
              name="meta_title"
              tooltip="Optional. Leave empty to use category name"
            >
              <Input
                placeholder="SEO title (max 60 chars recommended)"
                maxLength={60}
              />
            </Form.Item>

            <Form.Item
              label="Meta Description"
              name="meta_description"
              tooltip="Optional. Short description for search engines"
            >
              <TextArea
                rows={2}
                placeholder="SEO description (max 160 chars recommended)"
                maxLength={160}
              />
            </Form.Item>
          </Card>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
