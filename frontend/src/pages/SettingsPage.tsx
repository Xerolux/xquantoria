import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  message,
  Row,
  Col,
  Typography,
  Space,
  Upload,
  Image,
  Divider,
  Tag,
  Tooltip,
  Spin,
  Select,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  GlobalOutlined,
  PictureOutlined,
  MailOutlined,
  SecurityScanOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
// import type { UploadFile } from 'antd/es/upload/interface';
import { settingsService } from '../services/api';
import type { Setting, SettingGroup } from '../types';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface SettingsData {
  settings: SettingGroup;
  groups: Record<string, string>;
}

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingGroup>({});
  const [groups, setGroups] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data: SettingsData = await settingsService.getAll();
      setSettings(data.settings);
      setGroups(data.groups);

      // Initialize form with current values
      const initialValues: Record<string, any> = {};
      Object.entries(data.settings).forEach((_groupName, settingsList) => {
        settingsList.forEach((setting) => {
          initialValues[setting.key] = setting.value;
        });
      });
      form.setFieldsValue(initialValues);
    } catch (error) {
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Convert to array of settings
      const settingsToUpdate = Object.entries(values).map(([key, value]) => ({
        key,
        value,
      }));

      await settingsService.updateBulk(settingsToUpdate);
      message.success('Settings saved successfully');
      fetchSettings();
    } catch (error) {
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    try {
      await settingsService.reset(key);
      message.success('Setting reset to default');
      fetchSettings();
    } catch (error) {
      message.error('Failed to reset setting');
    }
  };

  const renderSettingInput = (setting: Setting) => {
    switch (setting.type) {
      case 'text':
        return (
          <Input
            placeholder={setting.description}
            style={{ width: '100%' }}
          />
        );

      case 'textarea':
        return (
          <TextArea
            rows={4}
            placeholder={setting.description}
            style={{ width: '100%' }}
          />
        );

      case 'number':
        return (
          <InputNumber
            style={{ width: '100%' }}
            placeholder={setting.description}
          />
        );

      case 'boolean':
        return (
          <Switch
            checkedChildren="Enabled"
            unCheckedChildren="Disabled"
          />
        );

      case 'select':
        return (
          <Select
            style={{ width: '100%' }}
            options={Object.entries(setting.options || {}).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        );

      case 'json':
        return (
          <TextArea
            rows={6}
            placeholder='{"key": "value"}'
            style={{ width: '100%', fontFamily: 'monospace' }}
          />
        );

      case 'image':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            {setting.value && (
              <Image
                src={setting.value}
                alt={setting.display_name}
                width={200}
                style={{ marginBottom: 8 }}
              />
            )}
            <Upload
              listType="picture"
              maxCount={1}
              beforeUpload={() => false}
              onChange={(info) => {
                const file = info.fileList[0];
                if (file) {
                  form.setFieldValue(setting.key, file.originFileObj);
                }
              }}
            >
              <Button icon={<CloudUploadOutlined />}>
                Upload Image
              </Button>
            </Upload>
          </Space>
        );

      case 'file':
        return (
          <Upload
            maxCount={1}
            beforeUpload={() => false}
            onChange={(info) => {
              const file = info.fileList[0];
              if (file) {
                form.setFieldValue(setting.key, file.originFileObj);
              }
            }}
          >
            <Button icon={<CloudUploadOutlined />}>
              Upload File
            </Button>
          </Upload>
        );

      default:
        return <Input placeholder={setting.description} />;
    }
  };

  const renderGroup = (groupName: string) => {
    const groupSettings = settings[groupName];
    if (!groupSettings) return null;

    return (
      <Row gutter={[16, 16]}>
        {groupSettings.map((setting) => (
          <Col key={setting.key} xs={24} md={setting.type === 'textarea' ? 24 : 12}>
            <Card
              size="small"
              title={
                <Space>
                  {setting.display_name}
                  {setting.is_public && (
                    <Tag color="blue">Public</Tag>
                  )}
                </Space>
              }
              extra={
                <Tooltip title="Reset to default">
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => handleReset(setting.key)}
                  />
                </Tooltip>
              }
            >
              <Form.Item
                name={setting.key}
                label={
                  <Space>
                    <Text type="secondary">{setting.description}</Text>
                  </Space>
                }
                tooltip={setting.description}
              >
                {renderSettingInput(setting)}
              </Form.Item>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const tabItems = Object.entries(groups).map(([key, label]) => ({
    key,
    label: (
      <Space>
        {{
          general: <SettingOutlined />,
          seo: <GlobalOutlined />,
          media: <PictureOutlined />,
          email: <MailOutlined />,
          security: <SecurityScanOutlined />,
          performance: <ThunderboltOutlined />,
        }[key] || <SettingOutlined />}
        {label}
      </Space>
    ),
    children: renderGroup(key),
  }));

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Settings</Title>
        <Text type="secondary">Manage your CMS configuration</Text>
      </div>

      <Card
        extra={
          <Space>
            <Button onClick={fetchSettings}>Reload</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              Save All
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            tabBarStyle={{ marginBottom: 24 }}
          />
        </Form>
      </Card>

      <Divider />

      <Card type="inner" title={<Space><InfoCircleOutlined /> Tips</Space>}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            • Changes are saved immediately when clicking &quot;Save All&quot;
          </Text>
          <Text>
            • Public settings are accessible via <code>/api/v1/settings/public</code>
          </Text>
          <Text>
            • Use the reset button to revert a setting to its default value
          </Text>
          <Text>
            • Image and file uploads are stored in <code>storage/app/public/settings</code>
          </Text>
          <Text>
            • JSON settings must be valid JSON format
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default SettingsPage;
