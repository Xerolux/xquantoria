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
  Upload,
  Tooltip,
  Image,
  Switch,
  Radio,
  Progress,
  Slider,
  Divider,
  Alert,
  Typography,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  UploadOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileOutlined,
  PlayCircleOutlined,
  AppstoreOutlined,
  BarsOutlined,
  SearchOutlined,
  CropOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { mediaService, imageProcessingService } from '../services/api';
import type { Media, PaginatedResponse } from '../types';

const { TextArea } = Input;
const { Text } = Typography;
const { Search } = Input;
const { Dragger } = Upload;

const MediaPage: React.FC = () => {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modalVisible, setModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [previewMedia, setPreviewMedia] = useState<Media | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    type: 'all',
    search: '',
  });
  const [fileList, setFileList] = useState<any[]>([]);
  const [editForm] = Form.useForm();

  // Image Processing States
  const [imageProcessingModalVisible, setImageProcessingModalVisible] = useState(false);
  const [processingMedia, setProcessingMedia] = useState<Media | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [processingLoading, setProcessingLoading] = useState(false);
  const [cropParams, setCropParams] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [resizeParams, setResizeParams] = useState({ width: 800, height: 600 });
  const [rotationDegrees, setRotationDegrees] = useState(90);

  useEffect(() => {
    fetchMedia();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        per_page: pagination.pageSize,
      };

      if (filters.type !== 'all') {
        params.type = filters.type;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      const data: PaginatedResponse<Media> = await mediaService.getAll(params);
      setMedia(data.data || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      message.error('Failed to fetch media');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (options: any) => {
    const { file } = options;
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await mediaService.upload(file, {
        alt_text: '',
        caption: '',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      message.success('File uploaded successfully');
      setFileList([]);
      setUploadModalVisible(false);
      fetchMedia();
    } catch (error) {
      message.error('Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleBulkUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please select files to upload');
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i].originFileObj;
        await mediaService.upload(file);
        setUploadProgress(Math.round(((i + 1) / fileList.length) * 100));
      }

      message.success(`${fileList.length} files uploaded successfully`);
      setFileList([]);
      setUploadModalVisible(false);
      fetchMedia();
    } catch (error) {
      message.error('Failed to upload files');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (mediaItem: Media) => {
    setSelectedMedia(mediaItem);
    editForm.setFieldsValue({
      alt_text: mediaItem.alt_text || '',
      caption: mediaItem.caption || '',
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!selectedMedia) return;

    try {
      const values = await editForm.validateFields();
      await mediaService.update(selectedMedia.id, {
        alt_text: values.alt_text,
        caption: values.caption,
      });

      message.success('Media updated successfully');
      setEditModalVisible(false);
      fetchMedia();
    } catch (error) {
      message.error('Failed to update media');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await mediaService.delete(id);
      message.success('Media deleted successfully');
      fetchMedia();
    } catch (error) {
      message.error('Failed to delete media');
    }
  };

  const handlePreview = (mediaItem: Media) => {
    setPreviewMedia(mediaItem);
    setPreviewModalVisible(true);
  };

  // Image Processing Handlers
  const handleOpenImageProcessing = (mediaItem: Media) => {
    if (!mediaItem.mime_type.startsWith('image/')) {
      message.warning('Image processing is only available for images');
      return;
    }
    setProcessingMedia(mediaItem);
    setProcessingAction(null);
    setCropParams({ x: 0, y: 0, width: 100, height: 100 });
    setResizeParams({ width: mediaItem.width || 800, height: mediaItem.height || 600 });
    setRotationDegrees(90);
    setImageProcessingModalVisible(true);
  };

  const handleImageAction = async (action: string) => {
    if (!processingMedia) return;

    setProcessingLoading(true);
    try {
      switch (action) {
        case 'rotate':
          await imageProcessingService.rotate(processingMedia.id, rotationDegrees);
          message.success(`Image rotated ${rotationDegrees} degrees`);
          break;
        case 'flip':
          await imageProcessingService.flip(processingMedia.id, 'horizontal');
          message.success('Image flipped horizontally');
          break;
        case 'optimize':
          await imageProcessingService.optimize(processingMedia.id);
          message.success('Image optimized successfully');
          break;
        case 'webp':
          await imageProcessingService.convertToWebP(processingMedia.id);
          message.success('Image converted to WebP');
          break;
        case 'blurhash':
          await imageProcessingService.generateBlurhash(processingMedia.id);
          message.success('Blurhash generated');
          break;
        case 'thumbnails':
          await imageProcessingService.generateThumbnails(processingMedia.id);
          message.success('Thumbnails generated');
          break;
        default:
          message.warning('Unknown action');
      }
      setImageProcessingModalVisible(false);
      fetchMedia();
    } catch (error: any) {
      message.error(error.response?.data?.message || `Failed to ${action} image`);
    } finally {
      setProcessingLoading(false);
    }
  };

  const handleCrop = async () => {
    if (!processingMedia) return;
    setProcessingLoading(true);
    try {
      await imageProcessingService.crop(
        processingMedia.id,
        cropParams.x,
        cropParams.y,
        cropParams.width,
        cropParams.height
      );
      message.success('Image cropped successfully');
      setImageProcessingModalVisible(false);
      fetchMedia();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to crop image');
    } finally {
      setProcessingLoading(false);
    }
  };

  const handleResize = async () => {
    if (!processingMedia) return;
    setProcessingLoading(true);
    try {
      await imageProcessingService.resize(
        processingMedia.id,
        resizeParams.width,
        resizeParams.height
      );
      message.success('Image resized successfully');
      setImageProcessingModalVisible(false);
      fetchMedia();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to resize image');
    } finally {
      setProcessingLoading(false);
    }
  };

  const getMediaIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImageOutlined />;
    if (mimeType.startsWith('video/')) return <PlayCircleOutlined />;
    if (mimeType === 'application/pdf') return <FilePdfOutlined />;
    return <FileOutlined />;
  };

  const getMediaColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'blue';
    if (mimeType.startsWith('video/')) return 'purple';
    if (mimeType === 'application/pdf') return 'red';
    return 'default';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    onChange: ({ fileList }) => setFileList(fileList),
    beforeUpload: () => false, // Prevent automatic upload
    accept: 'image/*,video/*,application/pdf',
  };

  const columns = [
    {
      title: 'Preview',
      key: 'preview',
      width: 100,
      render: (_: any, record: Media) => (
        <Image
          src={record.url}
          alt={record.alt_text || record.original_filename}
          width={60}
          height={60}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJF9kT1Iw0AcxV9TpVUqDnYQ6vChCgzYGMPuKRUpUixVqC9YNlCy9DYZynVTfFQ9YhD7JuOlVUfhVF7y4uFlTfXQ2NQ1NTU1NTU1PT03//65fPUWdKKQr9Uq1NSKdRTU1V0v/H0nmurqTBA36Jb+31n/03n/p+9e3o/tj01udfE0WrVM1vNSavJc0uXNCVKn3fRW+v31tMvP3p0uLq6bmt9u1aNDj+36ze/367e7f//7xbrz1btmy78iHhIFH/5FmAAAggZJREFUeJzt3d1L20eWx/Hv50aIgQDiQCIfcOFDFAUSypuQkCWK7I2XfDdLFRjE1BE7/LL4cSBWvyS1YskMvMEaolKK3BZgyQGy0hKp2kl1fn+/l6cDg4Onjk7O1fm3aq7F03vT09PT+/fvR0dEAYRiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAjgdDrJZLLouq5pmi6IYRhkWbYMY2zJV2qttdZaG9oNtfUso7QsyzJuZ5ZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhGI"
        />
      ),
    },
    {
      title: 'Filename',
      dataIndex: 'original_filename',
      key: 'original_filename',
      render: (filename: string, record: Media) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{filename}</span>
          <span style={{ fontSize: 12, color: '#999' }}>
            {record.mime_type}
          </span>
        </Space>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'filesize',
      key: 'filesize',
      render: (size: number) => formatFileSize(size),
      sorter: (a: Media, b: Media) => a.filesize - b.filesize,
    },
    {
      title: 'Dimensions',
      key: 'dimensions',
      render: (_: any, record: Media) => {
        if (record.width && record.height) {
          return `${record.width} × ${record.height}`;
        }
        if (record.mime_type.startsWith('video/')) {
          return <Tag color="purple">Video</Tag>;
        }
        return <Tag>Document</Tag>;
      },
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: Media, b: Media) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: Media) => (
        <Space>
          <Tooltip title="Preview">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          {record.mime_type.startsWith('image/') && (
            <Tooltip title="Image Processing">
              <Button
                type="text"
                icon={<CropOutlined />}
                onClick={() => handleOpenImageProcessing(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this file?"
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

  return (
    <div>
      <Card
        title="Media Library"
        extra={
          <Space>
            <Radio.Group
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              buttonStyle="solid"
            >
              <Radio.Button value="all">All</Radio.Button>
              <Radio.Button value="image">Images</Radio.Button>
              <Radio.Button value="video">Videos</Radio.Button>
              <Radio.Button value="application">Documents</Radio.Button>
            </Radio.Group>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              Upload
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Search
              placeholder="Search files..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={(value) => setFilters({ ...filters, search: value })}
              onChange={(e) => !e.target.value && setFilters({ ...filters, search: '' })}
            />
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Space>
              <span style={{ marginRight: 8 }}>View:</span>
              <Button
                type={viewMode === 'grid' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('grid')}
              />
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                icon={<BarsOutlined />}
                onClick={() => setViewMode('list')}
              />
            </Space>
          </Col>
        </Row>

        {viewMode === 'list' ? (
          <Table
            columns={columns}
            dataSource={media}
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
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {media.map((item) => (
                <Col key={item.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                  <Card
                    hoverable
                    bodyStyle={{ padding: 8 }}
                    cover={
                      item.mime_type.startsWith('image/') ? (
                        <div
                          style={{
                            height: 180,
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          <img
                            alt={item.alt_text || item.original_filename}
                            src={item.url}
                            loading="lazy"
                            decoding="async"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: 'rgba(0,0,0,0.6)',
                              borderRadius: 4,
                              padding: '4px 8px',
                            }}
                          >
                            <Tag color="white" style={{ margin: 0 }}>
                              {item.width && item.height
                                ? `${item.width}×${item.height}`
                                : ''}
                            </Tag>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            height: 180,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f5f5f5',
                          }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 48, color: '#999' }}>
                              {getMediaIcon(item.mime_type)}
                            </div>
                            <Tag color={getMediaColor(item.mime_type)}>
                              {item.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </Tag>
                          </div>
                        </div>
                      )
                    }
                  >
                    <Card.Meta
                      title={
                        <Tooltip title={item.original_filename}>
                          <div
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.original_filename}
                          </div>
                        </Tooltip>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <div style={{ fontSize: 11, color: '#999' }}>
                            {formatFileSize(item.filesize)}
                          </div>
                          <Space size={4}>
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => handlePreview(item)}
                            />
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleEdit(item)}
                            />
                            <Popconfirm
                              title="Delete this file?"
                              onConfirm={() => handleDelete(item.id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </Space>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
            {pagination.total > 0 && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Button
                  disabled={pagination.current === 1}
                  onClick={() =>
                    setPagination({ ...pagination, current: pagination.current - 1 })
                  }
                >
                  Previous
                </Button>
                <span style={{ margin: '0 16px' }}>
                  Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
                </span>
                <Button
                  disabled={
                    pagination.current >= Math.ceil(pagination.total / pagination.pageSize)
                  }
                  onClick={() =>
                    setPagination({ ...pagination, current: pagination.current + 1 })
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Upload Modal */}
      <Modal
        title="Upload Files"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setFileList([]);
          setUploadProgress(0);
        }}
        footer={[
          <Button key="cancel" onClick={() => setUploadModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="upload"
            type="primary"
            loading={uploading}
            onClick={handleBulkUpload}
            disabled={fileList.length === 0}
          >
            Upload {fileList.length > 0 && `${fileList.length} Files`}
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag files to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for single or bulk upload. Images, Videos, PDFs.
              Max file size: 50MB for images, 100MB for videos.
            </p>
          </Dragger>

          {uploading && (
            <Progress percent={uploadProgress} status="active" />
          )}
        </Space>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Media"
        open={editModalVisible}
        onOk={handleUpdate}
        onCancel={() => setEditModalVisible(false)}
        okText="Save"
      >
        <Form form={editForm} layout="vertical">
          {selectedMedia?.mime_type.startsWith('image/') && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <Image
                src={selectedMedia.url}
                alt={selectedMedia.alt_text || selectedMedia.original_filename}
                style={{ maxWidth: '100%', maxHeight: 200 }}
              />
            </div>
          )}

          <Form.Item label="Alt Text" name="alt_text">
            <Input placeholder="Describe this image for accessibility" />
          </Form.Item>

          <Form.Item label="Caption" name="caption">
            <TextArea rows={3} placeholder="Optional caption or description" />
          </Form.Item>

          {selectedMedia && (
            <Card size="small" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#999' }}>Size</div>
                  <div>{formatFileSize(selectedMedia.filesize)}</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#999' }}>Type</div>
                  <div>{selectedMedia.mime_type}</div>
                </Col>
                {selectedMedia.width && selectedMedia.height && (
                  <Col span={8}>
                    <div style={{ fontSize: 12, color: '#999' }}>Dimensions</div>
                    <div>
                      {selectedMedia.width} × {selectedMedia.height}
                    </div>
                  </Col>
                )}
              </Row>
            </Card>
          )}
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title={previewMedia?.original_filename}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width={800}
      >
        {previewMedia && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {previewMedia.mime_type.startsWith('image/') ? (
              <Image
                src={previewMedia.url}
                alt={previewMedia.alt_text || previewMedia.original_filename}
                style={{ width: '100%' }}
              />
            ) : (
              <Card>
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <div style={{ fontSize: 72, color: '#999' }}>
                    {getMediaIcon(previewMedia.mime_type)}
                  </div>
                  <Tag color={getMediaColor(previewMedia.mime_type)}>
                    {previewMedia.mime_type}
                  </Tag>
                </Space>
              </Card>
            )}

            {previewMedia.alt_text && (
              <div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                  Alt Text
                </div>
                <div>{previewMedia.alt_text}</div>
              </div>
            )}

            {previewMedia.caption && (
              <div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                  Caption
                </div>
                <div>{previewMedia.caption}</div>
              </div>
            )}

            <Card size="small">
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ fontSize: 12, color: '#999' }}>Size</div>
                  <div>{formatFileSize(previewMedia.filesize)}</div>
                </Col>
                <Col span={6}>
                  <div style={{ fontSize: 12, color: '#999' }}>Type</div>
                  <div>{previewMedia.mime_type}</div>
                </Col>
                {previewMedia.width && previewMedia.height && (
                  <Col span={6}>
                    <div style={{ fontSize: 12, color: '#999' }}>Dimensions</div>
                    <div>
                      {previewMedia.width} × {previewMedia.height}
                    </div>
                  </Col>
                )}
                <Col span={6}>
                  <div style={{ fontSize: 12, color: '#999' }}>Uploaded</div>
                  <div>{new Date(previewMedia.created_at).toLocaleDateString()}</div>
                </Col>
              </Row>
            </Card>
          </Space>
        )}
      </Modal>

      {/* Image Processing Modal */}
      <Modal
        title={`Image Processing - ${processingMedia?.original_filename}`}
        open={imageProcessingModalVisible}
        onCancel={() => setImageProcessingModalVisible(false)}
        footer={null}
        width={700}
      >
        {processingMedia && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert
              message="Image Processing Tools"
              description="Transform and optimize your images with various tools. Changes are applied directly to the image."
              type="info"
              showIcon
            />

            <div style={{ textAlign: 'center' }}>
              <Image
                src={processingMedia.url}
                alt={processingMedia.alt_text || processingMedia.original_filename}
                style={{ maxWidth: 400, maxHeight: 300 }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                Original: {processingMedia.width} × {processingMedia.height} ({(processingMedia.filesize / 1024).toFixed(1)} KB)
              </div>
            </div>

            <Divider />

            {/* Rotation */}
            <div>
              <Text strong>Rotation:</Text>
              <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <Button
                    block
                    icon={<RotateLeftOutlined />}
                    onClick={() => setRotationDegrees(rotationDegrees - 90)}
                  >
                    Rotate Left
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    icon={<RotateRightOutlined />}
                    onClick={() => setRotationDegrees(rotationDegrees + 90)}
                  >
                    Rotate Right
                  </Button>
                </Col>
              </Row>
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <Text>Rotation: {rotationDegrees}°</Text>
              </div>
              <Button
                type="primary"
                block
                onClick={() => handleImageAction('rotate')}
                loading={processingLoading}
                style={{ marginTop: 8 }}
              >
                Apply Rotation
              </Button>
            </div>

            <Divider />

            {/* Resize */}
            <div>
              <Text strong>Resize:</Text>
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <div>
                    <Text style={{ fontSize: 12 }}>Width (px):</Text>
                    <Input
                      type="number"
                      value={resizeParams.width}
                      onChange={(e) => setResizeParams({ ...resizeParams, width: parseInt(e.target.value) || 800 })}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text style={{ fontSize: 12 }}>Height (px):</Text>
                    <Input
                      type="number"
                      value={resizeParams.height}
                      onChange={(e) => setResizeParams({ ...resizeParams, height: parseInt(e.target.value) || 600 })}
                    />
                  </div>
                </Col>
              </Row>
              <Button
                type="primary"
                block
                icon={<ExpandOutlined />}
                onClick={handleResize}
                loading={processingLoading}
                style={{ marginTop: 8 }}
              >
                Apply Resize
              </Button>
            </div>

            <Divider />

            {/* Flip */}
            <div>
              <Text strong>Flip:</Text>
              <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <Button
                    block
                    icon={<SyncOutlined />}
                    onClick={() => handleImageAction('flip')}
                    loading={processingLoading}
                  >
                    Flip Horizontal
                  </Button>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* Optimization & Conversion */}
            <div>
              <Text strong>Optimization & Conversion:</Text>
              <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <Button
                    block
                    icon={<CompressOutlined />}
                    onClick={() => handleImageAction('optimize')}
                    loading={processingLoading}
                  >
                    Optimize
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    icon={<ThunderboltOutlined />}
                    onClick={() => handleImageAction('webp')}
                    loading={processingLoading}
                  >
                    Convert to WebP
                  </Button>
                </Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Button
                    block
                    onClick={() => handleImageAction('blurhash')}
                    loading={processingLoading}
                  >
                    Generate Blurhash
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    onClick={() => handleImageAction('thumbnails')}
                    loading={processingLoading}
                  >
                    Generate Thumbnails
                  </Button>
                </Col>
              </Row>
            </div>

            <Divider />

            <Button onClick={() => setImageProcessingModalVisible(false)} block>
              Close
            </Button>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default MediaPage;
