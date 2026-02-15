import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Input,
  Button,
  Tabs,
  Empty,
  Spin,
  Descriptions,
  Modal,
  message,
  Tooltip,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  BugOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface LogEntry {
  id: number;
  level: string;
  message: string;
  context: Record<string, unknown>;
  file: string;
  line: number;
  created_at: string;
}

const SystemLogsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('laravel.log');

  useEffect(() => {
    fetchLogFiles();
    fetchLogs();
  }, [selectedFile, levelFilter]);

  const fetchLogFiles = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/system/logs/files`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      setLogFiles(data.files || []);
    } catch (error) {
      console.error('Failed to fetch log files:', error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/system/logs`, {
        params: {
          file: selectedFile,
          level: levelFilter,
          search: searchQuery,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      setLogs(data.logs || []);
    } catch (error) {
      message.error('Fehler beim Laden der Logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    fetchLogs();
  };

  const handleClearLog = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/system/logs/clear`, {
        params: { file: selectedFile },
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      message.success('Log file cleared');
      fetchLogs();
    } catch (error) {
      message.error('Failed to clear log file');
    }
  };

  const handleDownloadLog = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/system/logs/download`, {
        params: { file: selectedFile },
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', selectedFile);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      message.error('Failed to download log file');
    }
  };

  const getLevelConfig = (level: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      emergency: { color: 'red', icon: <CloseCircleOutlined /> },
      alert: { color: 'red', icon: <WarningOutlined /> },
      critical: { color: 'red', icon: <BugOutlined /> },
      error: { color: 'red', icon: <CloseCircleOutlined /> },
      warning: { color: 'orange', icon: <WarningOutlined /> },
      notice: { color: 'blue', icon: <InfoCircleOutlined /> },
      info: { color: 'blue', icon: <InfoCircleOutlined /> },
      debug: { color: 'default', icon: <BugOutlined /> },
    };
    return configs[level.toLowerCase()] || { color: 'default', icon: <FileTextOutlined /> };
  };

  const columns = [
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => {
        const config = getLevelConfig(level);
        return (
          <Tag color={config.color} icon={config.icon}>
            {level.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Nachricht',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: 400 }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'Datei',
      dataIndex: 'file',
      key: 'file',
      width: 200,
      ellipsis: true,
      render: (file: string, record: LogEntry) => (
        <Tooltip title={`${file}:${record.line}`}>
          <Text code ellipsis style={{ maxWidth: 180 }}>
            {file?.split('/').pop()}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Zeitstempel',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined />
          {dayjs(date).format('DD.MM.YYYY HH:mm:ss')}
        </Space>
      ),
    },
    {
      title: 'Aktionen',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: LogEntry) => (
        <Button type="link" size="small" onClick={() => setSelectedLog(record)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>System Logs</Title>
      <Text type="secondary">Application and error logs</Text>

      <Card style={{ marginTop: 24 }}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            value={selectedFile}
            onChange={setSelectedFile}
            style={{ width: 200 }}
            options={logFiles.map((f) => ({ label: f, value: f }))}
          />
          <Select
            value={levelFilter}
            onChange={setLevelFilter}
            style={{ width: 120 }}
            options={[
              { label: 'Alle Levels', value: 'all' },
              { label: 'Emergency', value: 'emergency' },
              { label: 'Alert', value: 'alert' },
              { label: 'Critical', value: 'critical' },
              { label: 'Error', value: 'error' },
              { label: 'Warning', value: 'warning' },
              { label: 'Notice', value: 'notice' },
              { label: 'Info', value: 'info' },
              { label: 'Debug', value: 'debug' },
            ]}
          />
          <Search
            placeholder="Search logs..."
            onSearch={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
            Aktualisieren
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadLog}>
            Download
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleClearLog}>
            Löschen
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total) => `${total} Einträge`,
          }}
          expandable={{
            expandedRowRender: (record) => (
              <Card size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Nachricht">
                    <Paragraph copyable style={{ marginBottom: 0 }}>
                      {record.message}
                    </Paragraph>
                  </Descriptions.Item>
                  {record.file && (
                    <Descriptions.Item label="Datei">
                      {record.file}:{record.line}
                    </Descriptions.Item>
                  )}
                  {record.context && Object.keys(record.context).length > 0 && (
                    <Descriptions.Item label="Kontext">
                      <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                        {JSON.stringify(record.context, null, 2)}
                      </pre>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            ),
          }}
        />
      </Card>

      <Modal
        title="Log Details"
        open={!!selectedLog}
        onCancel={() => setSelectedLog(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedLog(null)}>
            Schließen
          </Button>,
        ]}
        width={800}
      >
        {selectedLog && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Level">
              <Tag color={getLevelConfig(selectedLog.level).color}>
                {selectedLog.level.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Zeitstempel">
              {dayjs(selectedLog.created_at).format('DD.MM.YYYY HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="Nachricht">
              <Paragraph copyable>{selectedLog.message}</Paragraph>
            </Descriptions.Item>
            {selectedLog.file && (
              <Descriptions.Item label="Datei">
                {selectedLog.file}:{selectedLog.line}
              </Descriptions.Item>
            )}
            {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
              <Descriptions.Item label="Kontext">
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
                  {JSON.stringify(selectedLog.context, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default SystemLogsPage;
