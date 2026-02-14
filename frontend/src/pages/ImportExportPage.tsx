import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tabs,
  Upload,
  message,
  Divider,
  Alert,
  Select,
  Table,
  Tag,
  Progress,
  Modal,
} from 'antd';
import {
  DownloadOutlined,
  UploadOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import { importExportService, postService, categoryService, tagService } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const ImportExportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('export');
  const [exportType, setExportType] = useState('posts');
  const [exportFormat, setExportFormat] = useState('json');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      let response;
      let filename;

      switch (exportType) {
        case 'posts':
          response = await importExportService.exportPosts({ format: exportFormat });
          filename = `posts.${exportFormat}`;
          break;
        case 'categories':
          response = await importExportService.exportCategories();
          filename = 'categories.json';
          break;
        case 'tags':
          response = await importExportService.exportTags();
          filename = 'tags.json';
          break;
        case 'users':
          response = await importExportService.exportUsers();
          filename = 'users.json';
          break;
        case 'all':
          response = await importExportService.exportAll();
          filename = 'full-export.json';
          break;
        default:
          response = await importExportService.exportPosts({ format: exportFormat });
          filename = `posts.${exportFormat}`;
      }

      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
      const blob = new Blob([content], { type: exportFormat === 'json' ? 'application/json' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      message.success('Export erfolgreich');
    } catch (error) {
      message.error('Fehler beim Exportieren');
    } finally {
      setExporting(false);
    }
  };

  const handleWordPressImport = async (file: File) => {
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      setImportProgress(30);
      const response = await importExportService.importWordPress(file);
      setImportProgress(100);
      setImportResult(response);

      if (response.imported) {
        message.success(`Import erfolgreich: ${response.imported.posts} Beiträge, ${response.imported.categories} Kategorien, ${response.imported.tags} Tags`);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Fehler beim Importieren');
      setImportProgress(0);
    } finally {
      setImporting(false);
    }
  };

  const handleJsonImport = async (file: File) => {
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          setImportProgress(30);

          const response = await importExportService.importJson(jsonData);
          setImportProgress(100);
          setImportResult(response);

          if (response.imported) {
            message.success(`Import erfolgreich: ${response.imported.posts} Beiträge, ${response.imported.categories} Kategorien, ${response.imported.tags} Tags`);
          }
        } catch (parseError) {
          message.error('Ungültiges JSON-Format');
          setImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (error: any) {
      message.error('Fehler beim Importieren');
      setImportProgress(0);
      setImporting(false);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file: File) => {
      if (activeTab === 'wordpress') {
        if (!file.name.endsWith('.xml')) {
          message.error('Bitte eine XML-Datei hochladen');
          return false;
        }
        handleWordPressImport(file);
      } else {
        if (!file.name.endsWith('.json')) {
          message.error('Bitte eine JSON-Datei hochladen');
          return false;
        }
        handleJsonImport(file);
      }
      return false;
    },
  };

  const renderExportTab = () => (
    <div>
      <Alert
        message="Daten exportieren"
        description="Exportieren Sie Ihre Inhalte in verschiedenen Formaten. JSON-Exporte können später wieder importiert werden."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card>
        <Row gutter={24}>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong>Was exportieren?</Text>
                <Select style={{ width: '100%', marginTop: 8 }} value={exportType} onChange={setExportType}>
                  <Option value="posts">Beiträge</Option>
                  <Option value="categories">Kategorien</Option>
                  <Option value="tags">Tags</Option>
                  <Option value="users">Benutzer</Option>
                  <Option value="all">Alles (vollständiger Export)</Option>
                </Select>
              </div>

              {(exportType === 'posts' || exportType === 'all') && (
                <div>
                  <Text strong>Format</Text>
                  <Select style={{ width: '100%', marginTop: 8 }} value={exportFormat} onChange={setExportFormat}>
                    <Option value="json">JSON</Option>
                    <Option value="csv">CSV</Option>
                    <Option value="xml">XML</Option>
                  </Select>
                </div>
              )}
            </Space>
          </Col>

          <Col span={12}>
            <Card style={{ textAlign: 'center', height: '100%' }}>
              <CloudDownloadOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
              <Title level={4}>Export starten</Title>
              <Paragraph type="secondary">
                Der Export wird als Datei heruntergeladen.
              </Paragraph>
              <Button
                type="primary"
                size="large"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exporting}
              >
                Exportieren
              </Button>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );

  const renderImportTab = (type: 'wordpress' | 'json') => (
    <div>
      {type === 'wordpress' ? (
        <Alert
          message="WordPress Import"
          description="Importieren Sie Beiträge, Kategorien und Tags aus einer WordPress XML-Exportdatei."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      ) : (
        <Alert
          message="JSON Import"
          description="Importieren Sie Daten aus einer vorherigen JSON-Exportdatei."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Card>
        <Dragger {...uploadProps} disabled={importing}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">Klicken oder Datei hierher ziehen</p>
          <p className="ant-upload-hint">
            {type === 'wordpress' ? 'WordPress XML-Datei (.xml)' : 'JSON-Datei (.json)'}
          </p>
        </Dragger>

        {importing && (
          <div style={{ marginTop: 24 }}>
            <Text>Importiere...</Text>
            <Progress percent={importProgress} status="active" />
          </div>
        )}

        {importResult && (
          <div style={{ marginTop: 24 }}>
            <Card title="Import-Ergebnis" size="small">
              <Row gutter={16}>
                {importResult.imported?.posts !== undefined && (
                  <Col span={6}>
                    <Statistic title="Beiträge" value={importResult.imported.posts} />
                  </Col>
                )}
                {importResult.imported?.categories !== undefined && (
                  <Col span={6}>
                    <Statistic title="Kategorien" value={importResult.imported.categories} />
                  </Col>
                )}
                {importResult.imported?.tags !== undefined && (
                  <Col span={6}>
                    <Statistic title="Tags" value={importResult.imported.tags} />
                  </Col>
                )}
                {importResult.imported?.authors !== undefined && (
                  <Col span={6}>
                    <Statistic title="Autoren" value={importResult.imported.authors} />
                  </Col>
                )}
              </Row>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );

  const Statistic = ({ title, value }: { title: string; value: number }) => (
    <div style={{ textAlign: 'center' }}>
      <Text type="secondary">{title}</Text>
      <Title level={3} style={{ marginBottom: 0 }}>{value}</Title>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <DatabaseOutlined style={{ marginRight: 8 }} />
        Import / Export
      </Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'export',
            label: (
              <span>
                <DownloadOutlined />
                Export
              </span>
            ),
            children: renderExportTab(),
          },
          {
            key: 'wordpress',
            label: (
              <span>
                <FileTextOutlined />
                WordPress Import
              </span>
            ),
            children: renderImportTab('wordpress'),
          },
          {
            key: 'json',
            label: (
              <span>
                <DatabaseOutlined />
                JSON Import
              </span>
            ),
            children: renderImportTab('json'),
          },
        ]}
      />
    </div>
  );
};

export default ImportExportPage;
