import React, { useState, useEffect, useCallback } from 'react';
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
  Drawer,
  Tree,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Tooltip,
  Empty,
  Spin,
  Dropdown,
} from 'antd';
import {
  MenuOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  SettingOutlined,
  HolderOutlined,
  LinkOutlined,
  FileTextOutlined,
  FolderOutlined,
  TagOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { menuService } from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface Menu {
  id: number;
  name: string;
  slug: string;
  location: string | null;
  description: string | null;
  is_active: boolean;
  all_items_count: number;
  created_at: string;
}

interface MenuItem {
  id: number;
  title: string;
  url: string | null;
  target: string;
  icon: string | null;
  type: string;
  order: number;
  parent_id: number | null;
  is_active: boolean;
  children?: MenuItem[];
}

const MenuBuilderPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemDrawerVisible, setItemDrawerVisible] = useState(false);
  const [linkableOptions, setLinkableOptions] = useState<Array<{ id: number; title: string; url: string }>>([]);
  const [linkableLoading, setLinkableLoading] = useState(false);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    if (selectedMenu) {
      fetchMenuItems(selectedMenu.id);
    }
  }, [selectedMenu]);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const response = await menuService.getAll();
      setMenus(response.data || []);
      setLocations(response.locations || {});
    } catch (error) {
      message.error('Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async (menuId: number) => {
    try {
      const response = await menuService.getTree(menuId);
      setMenuItems(response.tree || []);
    } catch (error) {
      message.error('Failed to load menu items');
    }
  };

  const handleCreateMenu = async (values: Record<string, unknown>) => {
    try {
      if (editingMenu) {
        await menuService.update(editingMenu.id, values);
        message.success('Menu updated');
      } else {
        await menuService.create(values);
        message.success('Menu created');
      }
      setMenuModalVisible(false);
      setEditingMenu(null);
      form.resetFields();
      fetchMenus();
    } catch (error) {
      message.error('Failed to save menu');
    }
  };

  const handleDeleteMenu = async (id: number) => {
    try {
      await menuService.delete(id);
      message.success('Menu deleted');
      if (selectedMenu?.id === id) {
        setSelectedMenu(null);
        setMenuItems([]);
      }
      fetchMenus();
    } catch (error) {
      message.error('Failed to delete menu');
    }
  };

  const handleCreateItem = async (values: Record<string, unknown>) => {
    if (!selectedMenu) return;

    try {
      const data = { ...values };
      if (values.type !== 'custom' && values.linkable_id) {
        const option = linkableOptions.find((o) => o.id === values.linkable_id);
        if (option) {
          data.url = option.url;
        }
      }

      if (editingItem) {
        await menuService.updateItem(selectedMenu.id, editingItem.id, data);
        message.success('Item updated');
      } else {
        await menuService.addItem(selectedMenu.id, data);
        message.success('Item added');
      }
      setItemModalVisible(false);
      setEditingItem(null);
      itemForm.resetFields();
      fetchMenuItems(selectedMenu.id);
    } catch (error) {
      message.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!selectedMenu) return;

    try {
      await menuService.deleteItem(selectedMenu.id, itemId);
      message.success('Item deleted');
      fetchMenuItems(selectedMenu.id);
    } catch (error) {
      message.error('Failed to delete item');
    }
  };

  const handleReorder = async (items: MenuItem[]) => {
    if (!selectedMenu) return;

    const flattenItems = (
      items: MenuItem[],
      parentId: number | null = null,
      result: Array<{ id: number; order: number; parent_id: number | null }> = []
    ) => {
      items.forEach((item, index) => {
        result.push({ id: item.id, order: index, parent_id: parentId });
        if (item.children) {
          flattenItems(item.children, item.id, result);
        }
      });
      return result;
    };

    try {
      await menuService.reorder(selectedMenu.id, flattenItems(items));
      message.success('Order saved');
    } catch (error) {
      message.error('Failed to save order');
    }
  };

  const fetchLinkableOptions = async (type: string, search?: string) => {
    setLinkableLoading(true);
    try {
      const response = await menuService.getLinkableOptions(type, search);
      setLinkableOptions(response.data || []);
    } catch (error) {
      setLinkableOptions([]);
    } finally {
      setLinkableLoading(false);
    }
  };

  const openEditMenu = (menu: Menu) => {
    setEditingMenu(menu);
    form.setFieldsValue(menu);
    setMenuModalVisible(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    itemForm.setFieldsValue(item);
    if (item.type !== 'custom') {
      fetchLinkableOptions(item.type);
    }
    setItemModalVisible(true);
  };

  const renderMenuTree = (items: MenuItem[]): React.ReactNode => {
    return items.map((item) => ({
      key: item.id,
      title: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '4px 8px',
          }}
        >
          <Space>
            {item.icon && <span className={item.icon} />}
            <Text>{item.title}</Text>
            <Tag color={item.is_active ? 'green' : 'default'}>{item.is_active ? 'Active' : 'Inactive'}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.url}
            </Text>
          </Space>
          <Space>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openEditItem(item);
              }}
            />
            <Popconfirm
              title="Delete this item?"
              onConfirm={(e) => {
                e?.stopPropagation();
                handleDeleteItem(item.id);
              }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Space>
        </div>
      ),
      children: item.children ? renderMenuTree(item.children) : undefined,
    }));
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Menu) => (
        <Space>
          <AppstoreOutlined />
          <Text strong>{name}</Text>
          <Tag>{record.slug}</Tag>
        </Space>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => (location ? locations[location] || location : '-'),
    },
    {
      title: 'Items',
      dataIndex: 'all_items_count',
      key: 'all_items_count',
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Menu) => (
        <Space>
          <Button type="link" onClick={() => setSelectedMenu(record)}>
            Edit Items
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditMenu(record)}>
            Edit
          </Button>
          <Popconfirm title="Delete this menu?" onConfirm={() => handleDeleteMenu(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Title level={3} style={{ margin: 0 }}>
                <MenuOutlined /> Menu Builder
              </Title>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingMenu(null);
                  form.resetFields();
                  setMenuModalVisible(true);
                }}
              >
                Create Menu
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={menus}
          rowKey="id"
          loading={loading}
          pagination={false}
          onRow={(record) => ({
            onClick: () => setSelectedMenu(record),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Drawer
        title={`Edit: ${selectedMenu?.name}`}
        placement="right"
        width={600}
        onClose={() => setSelectedMenu(null)}
        open={!!selectedMenu}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingItem(null);
              itemForm.resetFields();
              setItemModalVisible(true);
            }}
          >
            Add Item
          </Button>
        }
      >
        {menuItems.length > 0 ? (
          <Tree
            treeData={renderMenuTree(menuItems)}
            draggable
            blockNode
            onDrop={(info) => {
              const dropKey = info.node.key as number;
              const dragKey = info.dragNode.key as number;
              const dropPos = info.node.pos.split('-');
              const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

              const loop = (data: MenuItem[], key: number, callback: (item: MenuItem, i: number, arr: MenuItem[]) => void) => {
                for (let i = 0; i < data.length; i++) {
                  if (data[i].id === key) {
                    callback(data[i], i, data);
                    return;
                  }
                  if (data[i].children) {
                    loop(data[i].children!, key, callback);
                  }
                }
              };

              const data = [...menuItems];
              let dragObj: MenuItem;

              loop(data, dragKey, (item, index, arr) => {
                arr.splice(index, 1);
                dragObj = item;
              });

              if (!info.dropToGap) {
                loop(data, dropKey, (item) => {
                  item.children = item.children || [];
                  item.children.unshift(dragObj!);
                });
              } else {
                let ar: MenuItem[] = [];
                let i = 0;
                loop(data, dropKey, (_item, index, arr) => {
                  ar = arr;
                  i = index;
                });
                if (dropPosition === -1) {
                  ar.splice(i, 0, dragObj!);
                } else {
                  ar.splice(i + 1, 0, dragObj!);
                }
              }

              setMenuItems(data);
              handleReorder(data);
            }}
          />
        ) : (
          <Empty description="No menu items. Click 'Add Item' to create one." />
        )}
      </Drawer>

      <Modal
        title={editingMenu ? 'Edit Menu' : 'Create Menu'}
        open={menuModalVisible}
        onCancel={() => {
          setMenuModalVisible(false);
          setEditingMenu(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateMenu}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Main Menu" />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input placeholder="main-menu" />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Select placeholder="Select location" allowClear>
              {Object.entries(locations).map(([key, label]) => (
                <Option key={key} value={key}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
        open={itemModalVisible}
        onCancel={() => {
          setItemModalVisible(false);
          setEditingItem(null);
          itemForm.resetFields();
        }}
        onOk={() => itemForm.submit()}
        width={600}
      >
        <Form form={itemForm} layout="vertical" onFinish={handleCreateItem}>
          <Form.Item name="type" label="Type" initialValue="custom">
            <Select
              onChange={(value) => {
                itemForm.setFieldsValue({ linkable_id: null, url: null });
                if (value !== 'custom') {
                  fetchLinkableOptions(value);
                }
              }}
            >
              <Option value="custom">
                <LinkOutlined /> Custom Link
              </Option>
              <Option value="post">
                <FileTextOutlined /> Post
              </Option>
              <Option value="page">
                <FileTextOutlined /> Page
              </Option>
              <Option value="category">
                <FolderOutlined /> Category
              </Option>
              <Option value="tag">
                <TagOutlined /> Tag
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.type !== curr.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              if (type !== 'custom') {
                return (
                  <Form.Item name="linkable_id" label="Select Content">
                    <Select
                      showSearch
                      placeholder="Search..."
                      loading={linkableLoading}
                      onSearch={(search) => fetchLinkableOptions(type, search)}
                      filterOption={false}
                    >
                      {linkableOptions.map((opt) => (
                        <Option key={opt.id} value={opt.id}>
                          {opt.title}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              return (
                <Form.Item name="url" label="URL" rules={[{ required: true }]}>
                  <Input placeholder="/path or https://..." />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Menu item title" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="target" label="Target" initialValue="_self">
                <Select>
                  <Option value="_self">Same Window</Option>
                  <Option value="_blank">New Window</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="icon" label="Icon Class">
                <Input placeholder="e.g., fa fa-home" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuBuilderPage;
