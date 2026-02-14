import React, { useState, useEffect } from 'react';
import {
  Card,
  Steps,
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Divider,
  Alert,
  Spin,
  message,
  Modal,
  Table,
  Tag,
  Tooltip,
  Tabs,
} from 'antd';
import {
  FileTextOutlined,
  SafetyCertificateOutlined,
  TruckOutlined,
  ReloadOutlined,
  CreditCardOutlined,
  SettingOutlined,
  EyeOutlined,
  DownloadOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface LegalDocument {
  id: number;
  type: string;
  title: string;
  content: string;
  slug: string;
  is_published: boolean;
  generated_at: string;
  created_at: string;
}

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  default?: any;
}

const documentTypes: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  impressum: {
    label: 'Impressum',
    icon: <FileTextOutlined />,
    description: 'Pflichtangaben für jede geschäftliche Website in Deutschland',
  },
  datenschutz: {
    label: 'Datenschutzerklärung',
    icon: <SafetyCertificateOutlined />,
    description: 'DSGVO-konforme Datenschutzerklärung mit allen erforderlichen Informationen',
  },
  versand: {
    label: 'Versand & Lieferung',
    icon: <TruckOutlined />,
    description: 'Versandkosten, Lieferzeiten und Versandbedingungen für Online-Shops',
  },
  widerruf: {
    label: 'Widerrufsrecht',
    icon: <ReloadOutlined />,
    description: 'Widerrufsbelehrung und Muster-Widerrufsformular für Verbraucher',
  },
  bezahlung: {
    label: 'Zahlungsarten',
    icon: <CreditCardOutlined />,
    description: 'Übersicht aller akzeptierten Zahlungsarten und Bedingungen',
  },
  agb: {
    label: 'AGB',
    icon: <SettingOutlined />,
    description: 'Allgemeine Geschäftsbedingungen für Ihre Dienstleistung/Produkte',
  },
  cookie: {
    label: 'Cookie-Richtlinie',
    icon: <SafetyCertificateOutlined />,
    description: 'Detaillierte Informationen über verwendete Cookies',
  },
};

const LegalGeneratorPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [form] = Form.useForm();
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState<LegalDocument[]>([]);
  const [activeTab, setActiveTab] = useState('create');
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);

  useEffect(() => {
    loadSavedDocuments();
  }, []);

  const loadSavedDocuments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/legal-documents');
      setSavedDocuments(response.data.data || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeSelect = async (type: string) => {
    setSelectedType(type);
    setLoading(true);
    try {
      const response = await api.get(`/legal-documents/${type}/form-fields`);
      setFormFields(response.data.fields || []);
      setCurrentStep(1);
    } catch (error) {
      message.error('Fehler beim Laden der Formularfelder');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const response = await api.post(`/legal-documents/${selectedType}/preview`, values);
      setPreviewContent(response.data.content);
      setCurrentStep(2);
    } catch (error) {
      message.error('Bitte füllen Sie alle Pflichtfelder aus');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setGenerating(true);
      const response = await api.post(`/legal-documents/${selectedType}/generate`, values);
      message.success('Dokument erfolgreich erstellt!');
      setCurrentStep(3);
      loadSavedDocuments();
    } catch (error) {
      message.error('Fehler beim Erstellen des Dokuments');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSelectedType(null);
    setFormFields([]);
    setPreviewContent('');
    form.resetFields();
  };

  const handleViewDocument = (doc: LegalDocument) => {
    setSelectedDocument(doc);
    setPreviewModalVisible(true);
  };

  const handlePublishDocument = async (doc: LegalDocument) => {
    try {
      await api.post(`/legal-documents/${doc.id}/publish`);
      message.success('Dokument veröffentlicht');
      loadSavedDocuments();
    } catch (error) {
      message.error('Fehler beim Veröffentlichen');
    }
  };

  const handleDeleteDocument = async (doc: LegalDocument) => {
    Modal.confirm({
      title: 'Dokument löschen?',
      content: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      okText: 'Löschen',
      okType: 'danger',
      cancelText: 'Abbrechen',
      onOk: async () => {
        try {
          await api.delete(`/legal-documents/${doc.id}`);
          message.success('Dokument gelöscht');
          loadSavedDocuments();
        } catch (error) {
          message.error('Fehler beim Löschen');
        }
      },
    });
  };

  const handleDuplicateDocument = async (doc: LegalDocument) => {
    try {
      await api.post(`/legal-documents/${doc.id}/duplicate`);
      message.success('Dokument dupliziert');
      loadSavedDocuments();
    } catch (error) {
      message.error('Fehler beim Duplizieren');
    }
  };

  const renderFormField = (field: FormField) => {
    const commonProps = {
      name: field.name,
      label: field.label,
      rules: field.required ? [{ required: true, message: `${field.label} ist erforderlich` }] : [],
      initialValue: field.default,
      valuePropName: field.type === 'checkbox' ? 'checked' : 'value',
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Input type={field.type} placeholder={field.label} />
          </Form.Item>
        );

      case 'textarea':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <TextArea rows={4} placeholder={field.label} />
          </Form.Item>
        );

      case 'select':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Select placeholder={`Bitte wählen...`}>
              {field.options?.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'multiselect':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Select mode="multiple" placeholder={`Bitte wählen...`}>
              {field.options?.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'checkbox':
        return (
          <Form.Item key={field.name} {...commonProps} valuePropName="checked">
            <Checkbox>{field.label}</Checkbox>
          </Form.Item>
        );

      default:
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Input placeholder={field.label} />
          </Form.Item>
        );
    }
  };

  const renderTypeSelection = () => (
    <div className="legal-type-grid">
      <Row gutter={[16, 16]}>
        {Object.entries(documentTypes).map(([key, config]) => (
          <Col xs={24} sm={12} md={8} lg={6} key={key}>
            <Card
              hoverable
              className={`legal-type-card ${selectedType === key ? 'selected' : ''}`}
              onClick={() => handleTypeSelect(key)}
            >
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8, color: '#1890ff' }}>
                  {config.icon}
                </div>
                <Title level={5} style={{ marginBottom: 8 }}>
                  {config.label}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {config.description}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  const renderForm = () => (
    <div>
      <Button onClick={() => setCurrentStep(0)} style={{ marginBottom: 16 }}>
        Zurück zur Auswahl
      </Button>
      <Title level={4} style={{ marginBottom: 24 }}>
        {documentTypes[selectedType!]?.label} erstellen
      </Title>
      <Alert
        message="Hinweis"
        description="Die generierten Texte dienen als Vorlage und sollten von einem Rechtsanwalt überprüft werden. Wir übernehmen keine Haftung für die Richtigkeit der Inhalte."
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />
      <Form
        form={form}
        layout="vertical"
        onValuesChange={async () => {
          try {
            const values = await form.validateFields();
            const response = await api.post(`/legal-documents/${selectedType}/preview`, values);
            setPreviewContent(response.data.content);
          } catch (e) {
            // Ignore validation errors during live preview
          }
        }}
      >
        <Row gutter={16}>
          {formFields.map((field) => (
            <Col xs={24} sm={field.type === 'checkbox' ? 24 : 12} key={field.name}>
              {renderFormField(field)}
            </Col>
          ))}
        </Row>
        <Divider />
        <Space>
          <Button onClick={() => setCurrentStep(0)}>Abbrechen</Button>
          <Button type="primary" onClick={handlePreview} loading={loading}>
            Vorschau generieren
          </Button>
        </Space>
      </Form>
    </div>
  );

  const renderPreview = () => (
    <div>
      <Button onClick={() => setCurrentStep(1)} style={{ marginBottom: 16 }}>
        Zurück zum Formular
      </Button>
      <Title level={4} style={{ marginBottom: 24 }}>
        Vorschau: {documentTypes[selectedType!]?.label}
      </Title>
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card className="legal-preview">
            <div
              dangerouslySetInnerHTML={{ __html: previewContent }}
              style={{
                lineHeight: 1.8,
                fontFamily: 'Georgia, serif',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Aktionen">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                block
                onClick={handleGenerate}
                loading={generating}
                icon={<DownloadOutlined />}
              >
                Dokument erstellen
              </Button>
              <Button
                block
                onClick={() => {
                  navigator.clipboard.writeText(previewContent);
                  message.success('In Zwischenablage kopiert');
                }}
                icon={<CopyOutlined />}
              >
                HTML kopieren
              </Button>
              <Button
                block
                onClick={() => setCurrentStep(1)}
              >
                Bearbeiten
              </Button>
            </Space>
          </Card>
          <Alert
            message="Rechtlicher Hinweis"
            description="Bitte lassen Sie dieses Dokument von einem Anwalt prüfen, bevor Sie es veröffentlichen."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Col>
      </Row>
    </div>
  );

  const renderSuccess = () => (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }}>
        <SafetyCertificateOutlined />
      </div>
      <Title level={3}>Dokument erfolgreich erstellt!</Title>
      <Paragraph type="secondary">
        Ihr {documentTypes[selectedType!]?.label} wurde gespeichert und kann jetzt bearbeitet oder
        veröffentlicht werden.
      </Paragraph>
      <Space>
        <Button onClick={handleReset}>Neues Dokument erstellen</Button>
        <Button type="primary" onClick={() => setActiveTab('documents')}>
          Alle Dokumente anzeigen
        </Button>
      </Space>
    </div>
  );

  const renderDocumentsList = () => {
    const columns = [
      {
        title: 'Typ',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => (
          <Tag icon={documentTypes[type]?.icon} color="blue">
            {documentTypes[type]?.label || type}
          </Tag>
        ),
      },
      {
        title: 'Titel',
        dataIndex: 'title',
        key: 'title',
      },
      {
        title: 'Status',
        dataIndex: 'is_published',
        key: 'status',
        render: (published: boolean) => (
          <Tag color={published ? 'green' : 'default'}>
            {published ? 'Veröffentlicht' : 'Entwurf'}
          </Tag>
        ),
      },
      {
        title: 'Erstellt',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (date: string) => new Date(date).toLocaleDateString('de-DE'),
      },
      {
        title: 'Aktionen',
        key: 'actions',
        render: (_: any, record: LegalDocument) => (
          <Space>
            <Tooltip title="Anzeigen">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewDocument(record)}
              />
            </Tooltip>
            <Tooltip title="Duplizieren">
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleDuplicateDocument(record)}
              />
            </Tooltip>
            {!record.is_published && (
              <Tooltip title="Veröffentlichen">
                <Button
                  type="text"
                  icon={<DownloadOutlined />}
                  onClick={() => handlePublishDocument(record)}
                />
              </Tooltip>
            )}
            <Tooltip title="Löschen">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteDocument(record)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ];

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Title level={4}>Gespeicherte Dokumente</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setActiveTab('create')}>
            Neues Dokument
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={savedDocuments}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: 'Keine Dokumente vorhanden' }}
        />
      </div>
    );
  };

  return (
    <div className="legal-generator-page" style={{ padding: 24 }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        <SafetyCertificateOutlined style={{ marginRight: 8 }} />
        Rechtstexte-Generator
      </Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'create',
            label: 'Dokument erstellen',
            children: (
              <Card>
                <Steps
                  current={currentStep}
                  items={[
                    { title: 'Dokumenttyp wählen' },
                    { title: 'Daten eingeben' },
                    { title: 'Vorschau & Erstellen' },
                    { title: 'Fertig' },
                  ]}
                  style={{ marginBottom: 32 }}
                />

                <Spin spinning={loading}>
                  {currentStep === 0 && renderTypeSelection()}
                  {currentStep === 1 && renderForm()}
                  {currentStep === 2 && renderPreview()}
                  {currentStep === 3 && renderSuccess()}
                </Spin>
              </Card>
            ),
          },
          {
            key: 'documents',
            label: `Meine Dokumente (${savedDocuments.length})`,
            children: <Card>{renderDocumentsList()}</Card>,
          },
        ]}
      />

      <Modal
        title={selectedDocument?.title}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            Schließen
          </Button>,
          <Button
            key="copy"
            onClick={() => {
              navigator.clipboard.writeText(selectedDocument?.content || '');
              message.success('In Zwischenablage kopiert');
            }}
          >
            HTML kopieren
          </Button>,
        ]}
        width={800}
      >
        <div
          dangerouslySetInnerHTML={{ __html: selectedDocument?.content || '' }}
          style={{ lineHeight: 1.8 }}
        />
      </Modal>
    </div>
  );
};

export default LegalGeneratorPage;
