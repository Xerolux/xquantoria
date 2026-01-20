import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (values: any) => {
    setLoading(true);
    try {
      await authService.register(
        values.name,
        values.email,
        values.password,
        values.password_confirmation
      );
      message.success('Registrierung erfolgreich! Bitte überprüfe deine E-Mails zur Verifizierung.');
      navigate('/login');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Registrierung fehlgeschlagen');
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
          <UserAddOutlined style={{ fontSize: '48px', color: '#667eea', marginBottom: '16px' }} />
          <Title level={2} style={{ color: '#667eea', marginBottom: 8 }}>
            Registrieren
          </Title>
          <Text type="secondary">Erstelle ein neues Konto</Text>
        </div>

        <Divider style={{ margin: '24px 0' }} />

        <Form
          name="register"
          onFinish={handleRegister}
          layout="vertical"
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Bitte Namen eingeben' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Dein Name"
              size="large"
            />
          </Form.Item>

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
            rules={[
              { required: true, message: 'Bitte Passwort eingeben' },
              { min: 12, message: 'Mindestens 12 Zeichen' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Dein Passwort"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Passwort bestätigen"
            name="password_confirmation"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Bitte bestätigen' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwörter stimmen nicht überein!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Passwort bestätigen"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
            >
              Registrieren
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text>Bereits ein Konto? </Text>
            <Link to="/login">Einloggen</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;
