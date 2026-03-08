import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Switch,
  Typography,
  Space,
  Divider,
  List,
  Collapse,
  Table,
  Tag,
  message,
} from 'antd';
import {
  GiftOutlined,
  SettingOutlined,
  CheckOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieBannerProps {
  onAccept?: (preferences: CookiePreferences) => void;
  onDecline?: () => void;
  privacyPolicyUrl?: string;
  imprintUrl?: string;
}

const COOKIE_PREFERENCES_KEY = 'cookie-preferences';

const cookieCategories = [
  {
    key: 'necessary',
    name: 'Notwendige Cookies',
    required: true,
    description: 'Diese Cookies sind für das Funktionieren der Website erforderlich und können nicht deaktiviert werden.',
    cookies: [
      { name: 'session', purpose: 'Sitzungsmanagement', duration: 'Session' },
      { name: 'csrf_token', purpose: 'Sicherheits-Token', duration: 'Session' },
      { name: 'cookie_consent', purpose: 'Cookie-Einwilligung', duration: '1 Jahr' },
    ],
  },
  {
    key: 'functional',
    name: 'Funktionale Cookies',
    required: false,
    description: 'Diese Cookies ermöglichen erweiterte Funktionen wie Spracheinstellungen und Login-Merken.',
    cookies: [
      { name: 'language', purpose: 'Spracheinstellung', duration: '1 Jahr' },
      { name: 'remember_me', purpose: 'Login speichern', duration: '30 Tage' },
      { name: 'theme', purpose: 'Dark/Light Mode', duration: '1 Jahr' },
    ],
  },
  {
    key: 'analytics',
    name: 'Analyse-Cookies',
    required: false,
    description: 'Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren.',
    cookies: [
      { name: '_ga', purpose: 'Google Analytics', duration: '2 Jahre' },
      { name: '_gid', purpose: 'Google Analytics', duration: '24 Stunden' },
      { name: 'matomo_*', purpose: 'Matomo Analytics', duration: '13 Monate' },
    ],
  },
  {
    key: 'marketing',
    name: 'Marketing-Cookies',
    required: false,
    description: 'Diese Cookies werden verwendet, um relevante Werbung anzuzeigen.',
    cookies: [
      { name: '_fbp', purpose: 'Facebook Pixel', duration: '3 Monate' },
      { name: 'ads_prefs', purpose: 'Werbepräferenzen', duration: '1 Jahr' },
    ],
  },
];

const CookieBanner: React.FC<CookieBannerProps> = ({
  onAccept,
  onDecline,
  privacyPolicyUrl = '/page/datenschutz',
  imprintUrl = '/page/impressum',
}) => {
  const [visible, setVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (!saved) {
      setVisible(true);
    } else {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(parsed);
        applyConsent(parsed);
      } catch (e) {
        setVisible(true);
      }
    }
  }, []);

  const applyConsent = (prefs: CookiePreferences) => {
    if (prefs.analytics) {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
      });
    }
    if (prefs.marketing) {
      window.gtag?.('consent', 'update', {
        ad_storage: 'granted',
      });
    }
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const handleAcceptSelected = () => {
    savePreferences(preferences);
  };

  const handleDeclineAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    savePreferences(onlyNecessary);
    onDecline?.();
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    applyConsent(prefs);
    setVisible(false);
    setSettingsVisible(false);
    onAccept?.(prefs);
    message.success('Cookie-Einstellungen gespeichert');
  };

  const handleToggle = (key: string, checked: boolean) => {
    if (key === 'necessary') return;
    setPreferences((prev) => ({ ...prev, [key]: checked }));
  };

  const cookieColumns = [
    { title: 'Cookie', dataIndex: 'name', key: 'name' },
    { title: 'Zweck', dataIndex: 'purpose', key: 'purpose' },
    { title: 'Laufzeit', dataIndex: 'duration', key: 'duration' },
  ];

  return (
    <>
      <Modal
        open={visible && !settingsVisible}
        closable={false}
        footer={null}
        width={500}
        style={{ position: 'fixed', bottom: 24, right: 24, top: 'auto', left: 'auto' }}
        bodyStyle={{ padding: 24 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <GiftOutlined style={{ fontSize: 32, color: '#1890ff' }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Cookie-Einstellungen
              </Title>
              <Text type="secondary">
                Wir nutzen Cookies, um Ihre Erfahrung zu verbessern.
              </Text>
            </div>
          </div>

          <Paragraph style={{ margin: 0 }}>
            Diese Website verwendet Cookies, um Ihnen das beste Erlebnis zu bieten. 
            Einige sind notwendig für den Betrieb der Seite, während andere uns helfen, 
            die Website zu verbessern und personalisierte Inhalte anzuzeigen.
          </Paragraph>

          <Space wrap style={{ fontSize: 12 }}>
            <a href={privacyPolicyUrl}>Datenschutzerklärung</a>
            <a href={imprintUrl}>Impressum</a>
          </Space>

          <Divider style={{ margin: '12px 0' }} />

          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Button type="primary" block size="large" onClick={handleAcceptAll}>
              Alle akzeptieren
            </Button>
            <Button block size="large" onClick={handleAcceptSelected}>
              Ausgewählte akzeptieren
            </Button>
            <Space style={{ width: '100%' }} size="small">
              <Button block onClick={() => setSettingsVisible(true)}>
                <SettingOutlined /> Einstellungen
              </Button>
              <Button block onClick={handleDeclineAll}>
                Nur notwendige
              </Button>
            </Space>
          </Space>
        </Space>
      </Modal>

      <Modal
        title={
          <Space>
            <GiftOutlined />
            Cookie-Einstellungen
          </Space>
        }
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={
          <Space>
            <Button onClick={() => setSettingsVisible(false)}>Abbrechen</Button>
            <Button type="primary" onClick={handleAcceptSelected}>
              Einstellungen speichern
            </Button>
          </Space>
        }
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Paragraph>
            Hier können Sie Ihre Cookie-Präferenzen verwalten. Notwendige Cookies 
            können nicht deaktiviert werden, da sie für das Funktionieren der Website 
            erforderlich sind.
          </Paragraph>

          <Collapse accordion>
            {cookieCategories.map((category) => (
              <Panel
                header={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      {category.required && <Tag color="blue">Erforderlich</Tag>}
                      <Text strong>{category.name}</Text>
                    </Space>
                    <Switch
                      checked={preferences[category.key as keyof CookiePreferences]}
                      disabled={category.required}
                      onChange={(checked) => handleToggle(category.key, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                }
                key={category.key}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text type="secondary">{category.description}</Text>
                  <Table
                    dataSource={category.cookies}
                    columns={cookieColumns}
                    pagination={false}
                    size="small"
                    rowKey="name"
                  />
                </Space>
              </Panel>
            ))}
          </Collapse>

          <Divider />

          <Space direction="vertical" size="small">
            <Text strong>Ihre aktuellen Einstellungen:</Text>
            <Space wrap>
              {Object.entries(preferences).map(([key, value]) => (
                <Tag key={key} color={value ? 'green' : 'default'}>
                  {key === 'necessary' && 'Notwendig'}
                  {key === 'functional' && 'Funktional'}
                  {key === 'analytics' && 'Analyse'}
                  {key === 'marketing' && 'Marketing'}
                  {value ? <CheckOutlined /> : null}
                </Tag>
              ))}
            </Space>
          </Space>
        </Space>
      </Modal>
    </>
  );
};

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export default CookieBanner;
export type { CookiePreferences };
