import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, Checkbox, Alert } from 'antd';
import { LockOutlined, MailOutlined, DashboardOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuthStore();

  // If already authenticated, redirect to admin dashboard
  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password, rememberMe);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
      message.success('Erfolgreich eingeloggt!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <DashboardOutlined style={{ fontSize: '48px', color: '#667eea', marginBottom: '16px' }} />
          <Title level={2} style={{ color: '#667eea', marginBottom: 8 }}>
            Admin Login
          </Title>
          <Text type="secondary">Melde dich an, um auf das Admin-Panel zuzugreifen</Text>
        </div>

        <Divider style={{ margin: '24px 0' }} />

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Test-Account: admin@example.com / password
          </Text>
            <br />
            <Text>Noch kein Konto? <Button type="link" onClick={() => navigate('/register')} style={{ padding: 0 }}>Registrieren</Button></Text>
        </div>

        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="email"
          layout="vertical"
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Bitte Email eingeben' },
              { type: 'email', message: 'Ungültige Email' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="deine@email.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Passwort"
            name="password"
            rules={[{ required: true, message: 'Bitte Passwort eingeben' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Dein Passwort"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}>
                Angemeldet bleiben (30 Tage)
              </Checkbox>
            </Form.Item>
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
            >
              Einloggen
            </Button>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
             <Button
              type="link"
              onClick={() => navigate('/forgot-password')}
              style={{ padding: 0 }}
            >
              Passwort vergessen?
            </Button>
            <Button
              type="link"
              onClick={() => navigate('/')}
              style={{ padding: 0 }}
            >
              Startseite
            </Button>
          </div>
        </Form>

        <Divider style={{ margin: '16px 0' }} />

        <Alert
          message="Sicherheitshinweis"
          description="Die &quot;Angemeldet bleiben&quot; Funktion speichert ein sicheres Token für 30 Tage. Verwende dies nur auf vertrauenswürdigen Geräten."
          type="info"
          showIcon
          style={{ fontSize: 12 }}
        />
      </Card>
    </div>
  );
};

export default LoginPage;
