import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Tabs,
  Badge,
  Empty,
  Spin,
  Divider,
  DndContext,
  DragEndEvent,
  SortableContext,
  verticalListSortingStrategy,
  List,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  MailOutlined,
  DragOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { formService } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface FormField {
  type: string;
  name: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface FormType {
  id: number;
  name: string;
  slug: string;
  description: string;
  fields: FormField[];
  is_active: boolean;
  success_message: string;
  send_notification: boolean;
  notification_email: string;
}

interface Submission {
  id: number;
  data: Record<string, any>;
  is_read: boolean;
  is_spam: boolean;
  created_at: string;
}

const fieldTypes = [
  { value: 'text', label: 'Textfeld' },
  { value: 'email', label: 'E-Mail' },
  { value: 'tel', label: 'Telefon' },
  { value: 'textarea', label: 'Textbereich' },
  { value: 'select', label: 'Auswahl' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio-Buttons' },
  { value: 'date', label: 'Datum' },
  { value: 'number', label: 'Zahl' },
  { value: 'url', label: 'URL' },
  { value: 'file', label: 'Datei-Upload' },
];

const FormBuilderPage: React.FC = () => {
  const [forms, setForms] = useState<FormType[]>([]);
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  const [submissionsModalVisible, setSubmissionsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [fields, setFields] = useState<FormField[]>([]);
  const [editingFormId, setEditingFormId] = useState<number | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    setLoading(true);
    try {
      const response = await formService.getAll();
      setForms(response || []);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (formId: number) => {
    try {
      const response = await formService.getSubmissions(formId);
      setSubmissions(response.data || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  };

  const handleCreateForm = () => {
    setEditingFormId(null);
    setFields([]);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      description: '',
      success_message: 'Vielen Dank für Ihre Nachricht!',
      send_notification: true,
      is_active: true,
    });
    setEditorModalVisible(true);
  };

  const handleEditForm = (formData: FormType) => {
    setEditingFormId(formData.id);
    setFields(formData.fields || []);
    form.setFieldsValue({
      name: formData.name,
      description: formData.description,
      success_message: formData.success_message,
      send_notification: formData.send_notification,
      notification_email: formData.notification_email,
      is_active: formData.is_active,
    });
    setEditorModalVisible(true);
  };

  const handleSaveForm = async (values: any) => {
    try {
      const formData = {
        ...values,
        fields,
      };

      if (editingFormId) {
        await formService.update(editingFormId, formData);
        message.success('Formular aktualisiert');
      } else {
        await formService.create(formData);
        message.success('Formular erstellt');
      }

      setEditorModalVisible(false);
      loadForms();
    } catch (error) {
      message.error('Fehler beim Speichern');
    }
  };

  const handleDeleteForm = async (formId: number) => {
    try {
      await formService.delete(formId);
      message.success('Formular gelöscht');
      loadForms();
    } catch (error) {
      message.error('Fehler beim Löschen');
    }
  };

  const handleDuplicateForm = async (formId: number) => {
    try {
      await formService.duplicate(formId);
      message.success('Formular dupliziert');
      loadForms();
    } catch (error) {
      message.error('Fehler beim Duplizieren');
    }
  };

  const handleViewSubmissions = async (formData: FormType) => {
    setSelectedForm(formData);
    await loadSubmissions(formData.id);
    setSubmissionsModalVisible(true);
  };

  const handleMarkAsRead = async (submissionId: number) => {
    if (!selectedForm) return;
    try {
      await formService.markSubmissionRead(selectedForm.id, submissionId);
      loadSubmissions(selectedForm.id);
      message.success('Als gelesen markiert');
    } catch (error) {
      message.error('Fehler');
    }
  };

  const handleMarkAsSpam = async (submissionId: number) => {
    if (!selectedForm) return;
    try {
      await formService.markSubmissionSpam(selectedForm.id, submissionId);
      loadSubmissions(selectedForm.id);
      message.success('Als Spam markiert');
    } catch (error) {
      message.error('Fehler');
    }
  };

  const handleDeleteSubmission = async (submissionId: number) => {
    if (!selectedForm) return;
    try {
      await formService.deleteSubmission(selectedForm.id, submissionId);
      loadSubmissions(selectedForm.id);
      message.success('Eintrag gelöscht');
    } catch (error) {
      message.error('Fehler');
    }
  };

  const handleExportSubmissions = async (formId: number) => {
    try {
      const response = await formService.exportSubmissions(formId, 'csv');
      const csvContent = [response.headers.join(','), ...response.data.map((row: any[]) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-${formId}-submissions.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Export erfolgreich');
    } catch (error) {
      message.error('Fehler beim Exportieren');
    }
  };

  const addField = () => {
    const newField: FormField = {
      type: 'text',
      name: `field_${fields.length + 1}`,
      label: `Feld ${fields.length + 1}`,
      required: false,
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    { title: 'Status', dataIndex: 'is_active', key: 'status', render: (active: boolean) => (
      <Tag color={active ? 'green' : 'default'}>{active ? 'Aktiv' : 'Inaktiv'}</Tag>
    )},
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_: any, record: FormType) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditForm(record)} />
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewSubmissions(record)} />
          <Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicateForm(record.id)} />
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDeleteForm(record.id)} />
        </Space>
      ),
    },
  ];

  const submissionColumns = [
    { title: 'Datum', dataIndex: 'created_at', key: 'created_at', render: (date: string) => new Date(date).toLocaleString('de-DE') },
    { title: 'Status', key: 'status', render: (_: any, record: Submission) => (
      <Space>
        {record.is_read ? <Tag color="blue">Gelesen</Tag> : <Tag color="orange">Neu</Tag>}
        {record.is_spam && <Tag color="red">Spam</Tag>}
      </Space>
    )},
    {
      title: 'Daten',
      key: 'data',
      render: (_: any, record: Submission) => (
        <Text ellipsis style={{ maxWidth: 300 }}>
          {Object.entries(record.data).map(([k, v]) => `${k}: ${v}`).join(', ')}
        </Text>
      ),
    },
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_: any, record: Submission) => (
        <Space>
          {!record.is_read && (
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleMarkAsRead(record.id)} />
          )}
          {!record.is_spam && (
            <Button size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleMarkAsSpam(record.id)} />
          )}
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDeleteSubmission(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <FormOutlined style={{ marginRight: 8 }} />
        Form Builder
      </Title>

      <Card
        title="Formulare"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateForm}>
            Neues Formular
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={forms}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: 'Keine Formulare vorhanden' }}
        />
      </Card>

      <Modal
        title={editingFormId ? 'Formular bearbeiten' : 'Neues Formular'}
        open={editorModalVisible}
        onCancel={() => setEditorModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveForm}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label="Aktiv" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Beschreibung">
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item name="success_message" label="Erfolgsmeldung">
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="send_notification" label="E-Mail-Benachrichtigung" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="notification_email" label="Benachrichtigungs-E-Mail">
                <Input type="email" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Felder</Divider>

          <div style={{ marginBottom: 16 }}>
            <Button icon={<PlusOutlined />} onClick={addField}>
              Feld hinzufügen
            </Button>
          </div>

          <List
            dataSource={fields}
            renderItem={(field, index) => (
              <List.Item
                actions={[
                  <Button danger icon={<DeleteOutlined />} onClick={() => removeField(index)} />,
                ]}
              >
                <Row gutter={16} style={{ width: '100%' }}>
                  <Col span={4}>
                    <Select
                      value={field.type}
                      onChange={(val) => updateField(index, { type: val })}
                      style={{ width: '100%' }}
                    >
                      {fieldTypes.map((t) => (
                        <Option key={t.value} value={t.value}>{t.label}</Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={4}>
                    <Input
                      placeholder="Name"
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      placeholder="Label"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      placeholder="Platzhalter"
                      value={field.placeholder}
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                    />
                  </Col>
                  <Col span={4}>
                    <Switch
                      checked={field.required}
                      onChange={(val) => updateField(index, { required: val })}
                    />
                    <Text style={{ marginLeft: 8 }}>Pflicht</Text>
                  </Col>
                </Row>
              </List.Item>
            )}
          />

          <Divider />

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditorModalVisible(false)}>Abbrechen</Button>
            <Button type="primary" htmlType="submit">Speichern</Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={`Einsendungen: ${selectedForm?.name}`}
        open={submissionsModalVisible}
        onCancel={() => setSubmissionsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSubmissionsModalVisible(false)}>
            Schließen
          </Button>,
          <Button key="export" icon={<CopyOutlined />} onClick={() => selectedForm && handleExportSubmissions(selectedForm.id)}>
            CSV Export
          </Button>,
        ]}
        width={900}
      >
        <Table
          columns={submissionColumns}
          dataSource={submissions}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender: (record) => (
              <pre style={{ margin: 0 }}>{JSON.stringify(record.data, null, 2)}</pre>
            ),
          }}
        />
      </Modal>
    </div>
  );
};

export default FormBuilderPage;
