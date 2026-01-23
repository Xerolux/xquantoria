import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Upload,
  Statistic,
  Tooltip,
  DatePicker,
  Select,
  Input,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  CloudUploadOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileZipOutlined,
  FileTextOutlined,
  EyeOutlined,
  CalendarOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import { downloadService } from '../services/api';
import type { Download, PaginatedResponse } from '../types';

const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

const DownloadsPage: React.FC = () => {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [tokenModalVisible, setTokenModalVisible] = useState(false);
  const [viewingDownload, setViewingDownload] = useState<Download | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [fileList, setFileList] = useState<any[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchDownloads();
  }, [pagination.pageSize]);

  const fetchDownloads = async () => {
    setLoading(true);
    try {
      const data: PaginatedResponse<Download> = await downloadService.getAll();
      setDownloads(data.data || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      message.error('Failed to fetch downloads');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const file = fileList[0].originFileObj;
      const values = await form.validateFields();

      await downloadService.upload(file, {
        description: values.description,
        access_level: values.access_level || 'public',
        expires_at: values.expires_at ? values.expires_at.format('YYYY-MM-DD') : undefined,
      });

      message.success('File uploaded successfully');
      setFileList([]);
      form.resetFields();
      setModalVisible(false);
      fetchDownloads();
    } catch (error) {
      message.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await downloadService.delete(id);
      message.success('Download deleted successfully');
      fetchDownloads();
    } catch (error) {
      message.error('Failed to delete download');
    }
  };

  const handleView = (download: Download) => {
    setViewingDownload(download);
    setViewModalVisible(true);
  };

  const handleGenerateToken = async (download: Download) => {
    setViewingDownload(download);
    setTokenModalVisible(true);
    setGeneratedToken('');
    setDownloadUrl('');

    // Simulate token generation (in real app, call API)
    const mockToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setGeneratedToken(mockToken);
    setDownloadUrl(`${window.location.origin}/dl/${mockToken}`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(downloadUrl);
    message.success('Download link copied to clipboard');
  };

  const getAccessLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      public: 'green',
      registered: 'blue',
      premium: 'gold',
    };
    return colors[level] || 'default';
  };

  const getAccessLevelIcon = (level: string) => {
    const icons: Record<string, React.ReactNode> = {
      public: <DownloadOutlined />,
      registered: <FileTextOutlined />,
      premium: <FileOutlined />,
    };
    return icons[level] || <FileOutlined />;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileZipOutlined style={{ fontSize: 32, color: '#fa8c16' }} />;
    if (mimeType.includes('text')) return <FileTextOutlined style={{ fontSize: 32, color: '#52c41a' }} />;
    return <FileOutlined style={{ fontSize: 32, color: '#1890ff' }} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const uploadProps: UploadProps = {
    fileList,
    onChange: ({ fileList }) => {
      if (fileList.length > 1) {
        fileList = [fileList[fileList.length - 1]]; // Keep only last file
      }
      setFileList(fileList);
    },
    beforeUpload: () => false,
    maxCount: 1,
    accept: '.pdf,.zip,.rar,.doc,.docx,.txt,.csv',
  };

  const columns = [
    {
      title: 'File',
      key: 'file',
      render: (_: unknown, record: Download) => (
        <Space>
          <div style={{ fontSize: 32 }}>{getFileIcon(record.mime_type)}</div>
          <div>
            <div style={{ fontWeight: 500 }}>{record.original_filename}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.mime_type}</div>
          </div>
        </Space>
      ),
      sorter: (a: Download, b: Download) =>
        a.original_filename.localeCompare(b.original_filename),
    },
    {
      title: 'Size',
      dataIndex: 'filesize',
      key: 'filesize',
      render: (size: number) => formatFileSize(size),
      sorter: (a: Download, b: Download) => a.filesize - b.filesize,
    },
    {
      title: 'Access',
      dataIndex: 'access_level',
      key: 'access_level',
      render: (level: string) => (
        <Tag icon={getAccessLevelIcon(level)} color={getAccessLevelColor(level)}>
          {level.charAt(0).toUpperCase() + level.slice(1)}
        </Tag>
      ),
      filters: [
        { text: 'Public', value: 'public' },
        { text: 'Registered', value: 'registered' },
        { text: 'Premium', value: 'premium' },
      ],
      onFilter: (value: unknown, record: Download) => record.access_level === value,
    },
    {
      title: 'Downloads',
      dataIndex: 'download_count',
      key: 'download_count',
      render: (count: number) => (
        <Space>
          <DownloadOutlined />
          <span>{count}</span>
        </Space>
      ),
      sorter: (a: Download, b: Download) => a.download_count - b.download_count,
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date: string) => {
        if (!date) return <Tag color="green">Never</Tag>;
        const expiryDate = new Date(date);
        const now = new Date();
        const isExpired = expiryDate < now;

        return (
          <Tag color={isExpired ? 'red' : 'orange'}>
            <CalendarOutlined />
            {expiryDate.toLocaleDateString()}
          </Tag>
        );
      },
      sorter: (a: Download, b: Download) => {
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      },
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: Download, b: Download) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Download) => (
        <Space>
          <Tooltip title="Generate Download Link">
            <Button
              type="text"
              icon={<LinkOutlined />}
              onClick={() => handleGenerateToken(record)}
            />
          </Tooltip>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this file?"
            description="This will permanently delete the file"
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

  const totalDownloads = downloads.length;
  const totalDownloadsCount = downloads.reduce((sum, d) => sum + d.download_count, 0);
  const publicFiles = downloads.filter((d) => d.access_level === 'public').length;
  const premiumFiles = downloads.filter((d) => d.access_level === 'premium').length;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Files" value={totalDownloads} prefix={<CloudUploadOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Downloads" value={totalDownloadsCount} suffix="times" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Public Files"
              value={publicFiles}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Premium Files"
              value={premiumFiles}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Downloads Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            Upload File
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={downloads}
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

      {/* Upload Modal */}
      <Modal
        title="Upload Download File"
        open={modalVisible}
        onOk={handleUpload}
        onCancel={() => {
          setModalVisible(false);
          setFileList([]);
          form.resetFields();
        }}
        width={700}
        okText="Upload"
        okButtonProps={{ loading: uploading, disabled: fileList.length === 0 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Select File">
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <CloudUploadOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">
                Supported: PDF, ZIP, RAR, DOC, DOCX, TXT, CSV. Max 100MB.
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item
            label="Access Level"
            name="access_level"
            initialValue="public"
            rules={[{ required: true, message: 'Please select access level' }]}
          >
            <Select>
              <Option value="public">
                <Space>
                  <DownloadOutlined />
                  Public - Everyone can download
                </Space>
              </Option>
              <Option value="registered">
                <Space>
                  <FileTextOutlined />
                  Registered - Login required
                </Space>
              </Option>
              <Option value="premium">
                <Space>
                  <FileOutlined />
                  Premium - Premium members only
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Expiration Date"
            name="expires_at"
            tooltip="Optional. Leave empty for no expiration"
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={(current) => current && current < dayjs().endOf('day')} />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            tooltip="Optional file description"
          >
            <TextArea rows={3} placeholder="Describe this file" />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={viewingDownload?.original_filename}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={600}
      >
        {viewingDownload && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>
                {getFileIcon(viewingDownload.mime_type)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>
                {viewingDownload.original_filename}
              </div>
            </div>

            <Card size="small" title="File Info">
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#999' }}>Size</div>
                  <div>{formatFileSize(viewingDownload.filesize)}</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#999' }}>Type</div>
                  <div>{viewingDownload.mime_type}</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#999' }}>Downloads</div>
                  <div>{viewingDownload.download_count}</div>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Access Control">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Access Level</div>
                  <Tag icon={getAccessLevelIcon(viewingDownload.access_level)} color={getAccessLevelColor(viewingDownload.access_level)}>
                    {viewingDownload.access_level.charAt(0).toUpperCase() + viewingDownload.access_level.slice(1)}
                  </Tag>
                </div>
                {viewingDownload.expires_at && (
                  <div>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Expires</div>
                    <Tag color="orange"><CalendarOutlined /> {new Date(viewingDownload.expires_at).toLocaleString()}</Tag>
                  </div>
                )}
              </Space>
            </Card>

            {viewingDownload.description && (
              <div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Description</div>
                <div>{viewingDownload.description}</div>
              </div>
            )}

            <Card size="small" title="Statistics">
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#999' }}>Uploaded</div>
                  <div>{new Date(viewingDownload.created_at).toLocaleString()}</div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#999' }}>Total Downloads</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: '#1890ff' }}>
                    {viewingDownload.download_count}
                  </div>
                </Col>
              </Row>
            </Card>

            <Button
              type="primary"
              icon={<LinkOutlined />}
              block
              onClick={() => {
                setViewModalVisible(false);
                handleGenerateToken(viewingDownload);
              }}
            >
              Generate Download Link
            </Button>
          </Space>
        )}
      </Modal>

      {/* Token Modal */}
      <Modal
        title="Download Link Generated"
        open={tokenModalVisible}
        onCancel={() => setTokenModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTokenModalVisible(false)}>
            Close
          </Button>,
          <Button key="copy" type="primary" onClick={copyToClipboard}>
            Copy Link
          </Button>,
        ]}
      >
        {generatedToken && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Download Link</div>
              <Input
                value={downloadUrl}
                readOnly
                addonAfter={
                  <Button
                    type="text"
                    icon={<LinkOutlined />}
                    onClick={copyToClipboard}
                  />
                }
              />
            </div>

            <Card size="small" style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}>
              <Space direction="vertical" size="small">
                <div style={{ fontSize: 12, color: '#597ef7' }}>
                  <strong>⚠️ Important:</strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#597ef7' }}>
                  <li>This link is valid for 1 hour</li>
                  <li>Can be used only once</li>
                  <li>Do not share publicly</li>
                  {viewingDownload && viewingDownload.access_level !== 'public' && (
                    <li>User must have appropriate access level</li>
                  )}
                </ul>
              </Space>
            </Card>

            {viewingDownload && (
              <Card size="small">
                <div style={{ fontSize: 12, color: '#999' }}>File</div>
                <div style={{ fontWeight: 500 }}>{viewingDownload.original_filename}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>Access Level</div>
                <Tag icon={getAccessLevelIcon(viewingDownload.access_level)} color={getAccessLevelColor(viewingDownload.access_level)}>
                  {viewingDownload.access_level.charAt(0).toUpperCase() + viewingDownload.access_level.slice(1)}
                </Tag>
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default DownloadsPage;
