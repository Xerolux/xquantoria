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
  Statistic,
  Switch,
  DatePicker,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { adService } from '../services/api';
import type { Advertisement } from '../types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const AdsPage: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [previewAd, setPreviewAd] = useState<Advertisement | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const data = await adService.getAll();
      setAds(data.data || data);
    } catch (error) {
      message.error('Failed to fetch advertisements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAd(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    form.setFieldsValue({
      ...ad,
      dateRange: ad.start_date && ad.end_date
        ? [dayjs(ad.start_date), dayjs(ad.end_date)]
        : undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await adService.delete(id);
      message.success('Advertisement deleted successfully');
      fetchAds();
    } catch (error) {
      message.error('Failed to delete advertisement');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const adData = {
        ...values,
        start_date: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: values.dateRange?.[1]?.format('YYYY-MM-DD'),
      };

      delete adData.dateRange;

      if (editingAd) {
        await adService.update(editingAd.id, adData);
        message.success('Advertisement updated successfully');
      } else {
        await adService.create(adData);
        message.success('Advertisement created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchAds();
    } catch (error) {
      message.error('Failed to save advertisement');
    }
  };

  const handlePreview = (ad: Advertisement) => {
    setPreviewAd(ad);
    setPreviewModalVisible(true);
  };

  const getZoneColor = (zone: string) => {
    const colors: Record<string, string> = {
      header: 'blue',
      sidebar: 'green',
      footer: 'orange',
      'in-content': 'purple',
    };
    return colors[zone] || 'default';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      html: 'cyan',
      image: 'geekblue',
      script: 'magenta',
    };
    return colors[type] || 'default';
  };

  const renderAdPreview = (ad: Advertisement) => {
    if (ad.ad_type === 'image' && ad.image_url) {
      return (
        <div style={{ textAlign: 'center' }}>
          <img
            src={ad.image_url}
            alt={ad.name}
            style={{ maxWidth: '100%', maxHeight: '300px' }}
          />
          {ad.link_url && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              Link: {ad.link_url}
            </div>
          )}
        </div>
      );
    }

    if (ad.ad_type === 'html' && ad.content) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: ad.content }}
          style={{ border: '1px solid #d9d9d9', padding: 16, minHeight: 100 }}
        />
      );
    }

    if (ad.ad_type === 'script' && ad.content) {
      return (
        <div style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {ad.content}
        </div>
      );
    }

    return <div style={{ color: '#999' }}>No preview available</div>;
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Advertisement, b: Advertisement) => a.name.localeCompare(b.name),
    },
    {
      title: 'Zone',
      dataIndex: 'zone',
      key: 'zone',
      render: (zone: string) => <Tag color={getZoneColor(zone)}>{zone.toUpperCase()}</Tag>,
      filters: [
        { text: 'Header', value: 'header' },
        { text: 'Sidebar', value: 'sidebar' },
        { text: 'Footer', value: 'footer' },
        { text: 'In-Content', value: 'in-content' },
      ],
      onFilter: (value: unknown, record: Advertisement) => record.zone === value,
    },
    {
      title: 'Type',
      dataIndex: 'ad_type',
      key: 'ad_type',
      render: (type: string) => <Tag color={getTypeColor(type)}>{type.toUpperCase()}</Tag>,
      filters: [
        { text: 'HTML', value: 'html' },
        { text: 'Image', value: 'image' },
        { text: 'Script', value: 'script' },
      ],
      onFilter: (value: unknown, record: Advertisement) => record.ad_type === value,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value: unknown, record: Advertisement) => record.is_active === value,
    },
    {
      title: 'Impressions',
      dataIndex: 'impressions',
      key: 'impressions',
      render: (count: number) => count.toLocaleString(),
      sorter: (a: Advertisement, b: Advertisement) => a.impressions - b.impressions,
    },
    {
      title: 'Clicks',
      dataIndex: 'clicks',
      key: 'clicks',
      render: (count: number) => count.toLocaleString(),
      sorter: (a: Advertisement, b: Advertisement) => a.clicks - b.clicks,
    },
    {
      title: 'CTR',
      dataIndex: 'click_through_rate',
      key: 'click_through_rate',
      render: (ctr: number) => `${ctr}%`,
      sorter: (a: Advertisement, b: Advertisement) =>
        (a.click_through_rate || 0) - (b.click_through_rate || 0),
    },
    {
      title: 'Date Range',
      key: 'dateRange',
      render: (_: unknown, record: Advertisement) => {
        if (!record.start_date && !record.end_date) {
          return <Tag color="default">Always Active</Tag>;
        }
        return (
          <span style={{ fontSize: 12 }}>
            {record.start_date && <div>From: {dayjs(record.start_date).format('YYYY-MM-DD')}</div>}
            {record.end_date && <div>To: {dayjs(record.end_date).format('YYYY-MM-DD')}</div>}
          </span>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Advertisement) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this advertisement?"
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

  const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
  const averageCTR =
    ads.length > 0
      ? ads.reduce((sum, ad) => sum + (ad.click_through_rate || 0), 0) / ads.length
      : 0;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Ads" value={ads.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Impressions" value={totalImpressions} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Clicks" value={totalClicks} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg CTR"
              value={averageCTR}
              suffix="%"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Advertisements Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create Ad
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={ads}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingAd ? 'Edit Advertisement' : 'Create Advertisement'}
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
            rules={[{ required: true, message: 'Please enter ad name' }]}
          >
            <Input placeholder="e.g., Summer Sale Banner" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Zone"
                name="zone"
                rules={[{ required: true, message: 'Please select zone' }]}
              >
                <Select placeholder="Select zone">
                  <Select.Option value="header">Header</Select.Option>
                  <Select.Option value="sidebar">Sidebar</Select.Option>
                  <Select.Option value="footer">Footer</Select.Option>
                  <Select.Option value="in-content">In-Content</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Ad Type"
                name="ad_type"
                rules={[{ required: true, message: 'Please select ad type' }]}
              >
                <Select placeholder="Select type">
                  <Select.Option value="html">HTML</Select.Option>
                  <Select.Option value="image">Image</Select.Option>
                  <Select.Option value="script">Script</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.ad_type !== curr.ad_type}>
            {({ getFieldValue }) => {
              const adType = getFieldValue('ad_type');

              if (adType === 'image') {
                return (
                  <>
                    <Form.Item label="Image URL" name="image_url">
                      <Input placeholder="https://example.com/ad-image.jpg" />
                    </Form.Item>
                    <Form.Item label="Link URL" name="link_url">
                      <Input placeholder="https://example.com/landing-page" />
                    </Form.Item>
                  </>
                );
              }

              if (adType === 'html' || adType === 'script') {
                return (
                  <Form.Item label="Content" name="content">
                    <TextArea
                      rows={8}
                      placeholder={adType === 'html' ? '<div>HTML code here</div>' : '<script>Script code here</script>'}
                    />
                  </Form.Item>
                );
              }

              return null;
            }}
          </Form.Item>

          <Form.Item label="Date Range" name="dateRange">
            <RangePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder={['Start Date', 'End Date']}
            />
          </Form.Item>

          <Form.Item
            label="Active"
            name="is_active"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Advertisement Preview"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width={800}
      >
        {previewAd && (
          <div>
            <Divider orientation="left">{previewAd.name}</Divider>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag color={getZoneColor(previewAd.zone)}>
                  {previewAd.zone.toUpperCase()}
                </Tag>
                <Tag color={getTypeColor(previewAd.ad_type)}>
                  {previewAd.ad_type.toUpperCase()}
                </Tag>
                <Tag color={previewAd.is_active ? 'success' : 'default'}>
                  {previewAd.is_active ? 'Active' : 'Inactive'}
                </Tag>
              </Space>
            </div>
            {renderAdPreview(previewAd)}
            <Divider />
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Impressions"
                  value={previewAd.impressions}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Clicks"
                  value={previewAd.clicks}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="CTR"
                  value={previewAd.click_through_rate || 0}
                  suffix="%"
                  precision={2}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdsPage;
