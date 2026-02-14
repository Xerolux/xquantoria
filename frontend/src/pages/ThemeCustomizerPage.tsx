import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Input,
  ColorPicker,
  Select,
  Switch,
  Tabs,
  Spin,
  Empty,
  message,
  Modal,
  Form,
  Divider,
  Collapse,
  Alert,
  Tooltip,
} from 'antd';
import {
  BgColorsOutlined,
  FontColorsOutlined,
  LayoutOutlined,
  EyeOutlined,
  CheckOutlined,
  CopyOutlined,
  DownloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  SettingOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { themeService } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface Theme {
  id: number;
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  is_active: boolean;
  is_child_theme: boolean;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  custom_css: Record<string, string>;
  screenshot: string;
}

const ThemeCustomizerPage: React.FC = () => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewCss, setPreviewCss] = useState('');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('themes');

  const defaultColors = {
    primary: '#1890ff',
    secondary: '#52c41a',
    accent: '#faad14',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#333333',
    textSecondary: '#666666',
    border: '#d9d9d9',
    error: '#ff4d4f',
    success: '#52c41a',
    warning: '#faad14',
    info: '#1890ff',
  };

  const defaultFonts = {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
    mono: 'JetBrains Mono, monospace',
  };

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    setLoading(true);
    try {
      const response = await themeService.getAll();
      setThemes(response || []);
      const active = (response || []).find((t: Theme) => t.is_active);
      if (active) {
        setActiveTheme(active);
        loadThemeSettings(active.id);
      }
    } catch (error) {
      console.error('Failed to load themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadThemeSettings = async (themeId: number) => {
    try {
      const response = await themeService.getSettings(themeId);
      setSettings(response.settings || {});
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleActivateTheme = async (themeId: number) => {
    try {
      await themeService.activate(themeId);
      message.success('Theme aktiviert');
      loadThemes();
    } catch (error) {
      message.error('Fehler beim Aktivieren');
    }
  };

  const handleDuplicateTheme = async (themeId: number) => {
    try {
      await themeService.duplicate(themeId);
      message.success('Theme dupliziert');
      loadThemes();
    } catch (error) {
      message.error('Fehler beim Duplizieren');
    }
  };

  const handleDeleteTheme = async (themeId: number) => {
    Modal.confirm({
      title: 'Theme löschen?',
      content: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      okText: 'Löschen',
      okType: 'danger',
      onOk: async () => {
        try {
          await themeService.delete(themeId);
          message.success('Theme gelöscht');
          loadThemes();
        } catch (error) {
          message.error('Fehler beim Löschen');
        }
      },
    });
  };

  const handleExportTheme = async (themeId: number) => {
    try {
      const response = await themeService.export(themeId);
      const blob = new Blob([response.export], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-${themeId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Theme exportiert');
    } catch (error) {
      message.error('Fehler beim Exportieren');
    }
  };

  const handleUpdateColor = async (colorName: string, color: string) => {
    if (!activeTheme) return;

    const colors = { ...(activeTheme.colors || defaultColors), [colorName]: color };
    try {
      await themeService.update(activeTheme.id, { colors });
      setActiveTheme({ ...activeTheme, colors });
      message.success('Farbe aktualisiert');
    } catch (error) {
      message.error('Fehler beim Aktualisieren');
    }
  };

  const handleUpdateFont = async (fontName: string, value: string) => {
    if (!activeTheme) return;

    const fonts = { ...(activeTheme.fonts || defaultFonts), [fontName]: value };
    try {
      await themeService.update(activeTheme.id, { fonts });
      setActiveTheme({ ...activeTheme, fonts });
      message.success('Schrift aktualisiert');
    } catch (error) {
      message.error('Fehler beim Aktualisieren');
    }
  };

  const handleResetSettings = async () => {
    if (!activeTheme) return;

    Modal.confirm({
      title: 'Einstellungen zurücksetzen?',
      content: 'Alle Anpassungen werden gelöscht.',
      okText: 'Zurücksetzen',
      okType: 'danger',
      onOk: async () => {
        try {
          await themeService.resetSettings(activeTheme.id);
          loadThemeSettings(activeTheme.id);
          message.success('Einstellungen zurückgesetzt');
        } catch (error) {
          message.error('Fehler beim Zurücksetzen');
        }
      },
    });
  };

  const generateCss = () => {
    if (!activeTheme) return '';

    const colors = activeTheme.colors || defaultColors;
    const fonts = activeTheme.fonts || defaultFonts;

    let css = ':root {\n';
    Object.entries(colors).forEach(([name, value]) => {
      css += `  --color-${name}: ${value};\n`;
    });
    Object.entries(fonts).forEach(([name, value]) => {
      css += `  --font-${name}: ${value};\n`;
    });
    css += '}\n';

    return css;
  };

  const renderThemeList = () => (
    <Row gutter={[16, 16]}>
      {themes.map((theme) => (
        <Col xs={24} sm={12} md={8} lg={6} key={theme.id}>
          <Card
            hoverable
            cover={
              <div
                style={{
                  height: 150,
                  background: `linear-gradient(135deg, ${theme.colors?.primary || '#1890ff'} 0%, ${theme.colors?.secondary || '#52c41a'} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {theme.is_active && (
                  <Tag color="success" style={{ position: 'absolute', top: 8, right: 8 }}>
                    <CheckOutlined /> Aktiv
                  </Tag>
                )}
                {theme.is_child_theme && (
                  <Tag color="blue" style={{ position: 'absolute', top: 8, left: 8 }}>
                    Child Theme
                  </Tag>
                )}
              </div>
            }
            actions={[
              <Tooltip title="Aktivieren">
                <Button
                  type={theme.is_active ? 'primary' : 'default'}
                  icon={<CheckOutlined />}
                  onClick={() => handleActivateTheme(theme.id)}
                  disabled={theme.is_active}
                />
              </Tooltip>,
              <Tooltip title="Duplizieren">
                <Button icon={<CopyOutlined />} onClick={() => handleDuplicateTheme(theme.id)} />
              </Tooltip>,
              <Tooltip title="Exportieren">
                <Button icon={<DownloadOutlined />} onClick={() => handleExportTheme(theme.id)} />
              </Tooltip>,
              <Tooltip title="Löschen">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteTheme(theme.id)}
                  disabled={theme.is_active}
                />
              </Tooltip>,
            ]}
          >
            <Card.Meta
              title={theme.name}
              description={
                <div>
                  <Text type="secondary">{theme.description}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    v{theme.version} by {theme.author}
                  </Text>
                </div>
              }
            />
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderColorSettings = () => {
    const colors = activeTheme?.colors || defaultColors;

    return (
      <div>
        <Alert
          message="Farben anpassen"
          description="Klicken Sie auf eine Farbe, um sie zu ändern. Die Änderungen werden sofort angewendet."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Row gutter={[16, 16]}>
          {Object.entries(colors).map(([name, value]) => (
            <Col xs={24} sm={12} md={8} lg={6} key={name}>
              <Card size="small" title={name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <ColorPicker
                    value={value}
                    onChange={(color) => handleUpdateColor(name, color.toHexString())}
                    style={{ width: '100%' }}
                  />
                  <Input
                    value={value}
                    onChange={(e) => handleUpdateColor(name, e.target.value)}
                    placeholder="#000000"
                  />
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  const renderFontSettings = () => {
    const fonts = activeTheme?.fonts || defaultFonts;
    const fontOptions = [
      'Inter, sans-serif',
      'Roboto, sans-serif',
      'Open Sans, sans-serif',
      'Lato, sans-serif',
      'Montserrat, sans-serif',
      'Source Sans Pro, sans-serif',
      'Nunito, sans-serif',
      'Playfair Display, serif',
      'Merriweather, serif',
      'JetBrains Mono, monospace',
      'Fira Code, monospace',
    ];

    return (
      <div>
        <Alert
          message="Schriftarten anpassen"
          description="Wählen Sie die Schriftarten für verschiedene Textelemente."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {Object.entries(fonts).map(([name, value]) => (
            <Card key={name} size="small" title={name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
              <Select
                style={{ width: '100%' }}
                value={value}
                onChange={(val) => handleUpdateFont(name, val)}
                showSearch
              >
                {fontOptions.map((font) => (
                  <Option key={font} value={font} style={{ fontFamily: font }}>
                    {font.split(',')[0]}
                  </Option>
                ))}
              </Select>
              <div style={{ marginTop: 16, fontFamily: value }}>
                <Text style={{ fontSize: 24 }}>Aa Bb Cc 123</Text>
              </div>
            </Card>
          ))}
        </Space>
      </div>
    );
  };

  const renderCssEditor = () => {
    const css = generateCss();

    return (
      <div>
        <Alert
          message="CSS-Variablen"
          description="Diese CSS-Variablen werden automatisch generiert und können in Ihrem Custom CSS verwendet werden."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Card title="Generiertes CSS">
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, overflow: 'auto' }}>
            {css}
          </pre>
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(css);
              message.success('CSS kopiert');
            }}
          >
            CSS kopieren
          </Button>
        </Card>
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <BgColorsOutlined style={{ marginRight: 8 }} />
        Theme Customizer
      </Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'themes',
            label: 'Themes',
            children: (
              <Spin spinning={loading}>
                {themes.length === 0 ? (
                  <Empty description="Keine Themes vorhanden" />
                ) : (
                  renderThemeList()
                )}
              </Spin>
            ),
          },
          {
            key: 'colors',
            label: 'Farben',
            disabled: !activeTheme,
            children: renderColorSettings(),
          },
          {
            key: 'fonts',
            label: 'Schriftarten',
            disabled: !activeTheme,
            children: renderFontSettings(),
          },
          {
            key: 'css',
            label: 'CSS',
            disabled: !activeTheme,
            children: renderCssEditor(),
          },
        ]}
      />

      {activeTheme && (
        <div style={{ marginTop: 24 }}>
          <Space>
            <Button onClick={handleResetSettings} danger>
              Einstellungen zurücksetzen
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default ThemeCustomizerPage;
