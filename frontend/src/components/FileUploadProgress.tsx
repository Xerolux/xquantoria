import React, { useState, useCallback } from 'react';
import { Upload, Progress, List, Button, Typography, Space, Tag, message, Image, Modal } from 'antd';
import {
  InboxOutlined,
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileZipOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';

const { Dragger } = Upload;
const { Text } = Typography;

interface FileUploadProgressProps {
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  uploadUrl: string;
  headers?: Record<string, string>;
  onUploadComplete?: (files: UploadFile[]) => void;
  onUploadError?: (error: Error) => void;
  onFileRemove?: (file: UploadFile) => void;
}

const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  multiple = true,
  accept,
  maxSize = 100 * 1024 * 1024,
  maxFiles = 10,
  uploadUrl,
  headers = {},
  onUploadComplete,
  onUploadError,
  onFileRemove,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);

  const getFileIcon = (file: UploadFile) => {
    const type = file.type || '';
    const name = file.name?.toLowerCase() || '';

    if (type.startsWith('image/')) return <FileImageOutlined style={{ fontSize: 24, color: '#52c41a' }} />;
    if (type === 'application/pdf' || name.endsWith('.pdf')) return <FilePdfOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />;
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return <FileZipOutlined style={{ fontSize: 24, color: '#fa8c16' }} />;
    if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return <FileWordOutlined style={{ fontSize: 24, color: '#1890ff' }} />;
    if (type.includes('excel') || type.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) return <FileExcelOutlined style={{ fontSize: 24, color: '#52c41a' }} />;
    
    return <FileOutlined style={{ fontSize: 24 }} />;
  };

  const getStatusTag = (status?: string) => {
    switch (status) {
      case 'uploading':
        return <Tag icon={<SyncOutlined spin />} color="processing">Uploading</Tag>;
      case 'done':
        return <Tag icon={<CheckCircleOutlined />} color="success">Complete</Tag>;
      case 'error':
        return <Tag icon={<CloseCircleOutlined />} color="error">Failed</Tag>;
      default:
        return <Tag color="default">Pending</Tag>;
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple,
    accept,
    action: uploadUrl,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      ...headers,
    },
    fileList,
    beforeUpload: (file) => {
      if (file.size > maxSize) {
        message.error(`${file.name} is too large. Max size is ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
        return Upload.LIST_IGNORE;
      }
      if (fileList.length >= maxFiles) {
        message.error(`Maximum ${maxFiles} files allowed`);
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    onChange: ({ fileList: newFileList, file }) => {
      setFileList(newFileList);
      
      if (file.status === 'done') {
        const allDone = newFileList.every((f) => f.status === 'done');
        if (allDone && newFileList.length > 0) {
          onUploadComplete?.(newFileList);
        }
      }
      
      if (file.status === 'error') {
        onUploadError?.(new Error(`${file.name} upload failed`));
      }
    },
    onRemove: (file) => {
      onFileRemove?.(file);
      return true;
    },
    onPreview: (file) => {
      if (file.type?.startsWith('image/')) {
        setPreviewFile(file);
      } else {
        Modal.info({
          title: file.name,
          content: (
            <div>
              <p>Size: {(file.size! / 1024).toFixed(2)} KB</p>
              <p>Type: {file.type}</p>
              <p>Status: {file.status}</p>
            </div>
          ),
        });
      }
    },
  };

  const clearCompleted = () => {
    setFileList((prev) => prev.filter((f) => f.status !== 'done'));
  };

  const retryFailed = () => {
    setFileList((prev) => prev.map((f) => (f.status === 'error' ? { ...f, status: 'uploading', percent: 0 } : f)));
  };

  const completedCount = fileList.filter((f) => f.status === 'done').length;
  const failedCount = fileList.filter((f) => f.status === 'error').length;
  const uploadingCount = fileList.filter((f) => f.status === 'uploading').length;

  return (
    <div>
      <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag files to upload</p>
        <p className="ant-upload-hint">
          Max {(maxSize / 1024 / 1024).toFixed(0)}MB per file, up to {maxFiles} files
        </p>
      </Dragger>

      {fileList.length > 0 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Text>Progress: {completedCount}/{fileList.length} completed</Text>
              {failedCount > 0 && <Tag color="error">{failedCount} failed</Tag>}
              {uploadingCount > 0 && <Tag color="processing">{uploadingCount} uploading</Tag>}
            </Space>
            <Space style={{ float: 'right' }}>
              {failedCount > 0 && (
                <Button size="small" icon={<SyncOutlined />} onClick={retryFailed}>
                  Retry Failed
                </Button>
              )}
              {completedCount > 0 && (
                <Button size="small" onClick={clearCompleted}>
                  Clear Completed
                </Button>
              )}
            </Space>
          </div>

          <List
            dataSource={fileList}
            renderItem={(file) => (
              <List.Item
                actions={[
                  <Button
                    key="view"
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => uploadProps.onPreview?.(file)}
                  />,
                  <Button
                    key="remove"
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
                      onFileRemove?.(file);
                    }}
                  />,
                ]}
              >
                <List.Item.Meta
                  avatar={getFileIcon(file)}
                  title={
                    <Space>
                      <Text ellipsis style={{ maxWidth: 200 }}>
                        {file.name}
                      </Text>
                      {getStatusTag(file.status)}
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {(file.size! / 1024).toFixed(2)} KB
                      </Text>
                      {file.status === 'uploading' && (
                        <Progress percent={file.percent || 0} size="small" showInfo={false} />
                      )}
                      {file.status === 'error' && file.response?.message && (
                        <Text type="danger" style={{ fontSize: 12 }}>
                          {file.response.message}
                        </Text>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}

      <Modal
        open={!!previewFile}
        footer={null}
        onCancel={() => setPreviewFile(null)}
        title={previewFile?.name}
      >
        {previewFile?.thumbUrl && (
          <Image src={previewFile.thumbUrl} alt={previewFile.name} style={{ width: '100%' }} />
        )}
      </Modal>
    </div>
  );
};

export default FileUploadProgress;
