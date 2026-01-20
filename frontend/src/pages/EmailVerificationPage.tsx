import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Result, Button, Spin, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [status, setStatus] = useState<'success' | 'error'>('success');
  const [messageText, setMessageText] = useState('Verifiziere E-Mail...');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessageText('Ungültiger Link. Token oder E-Mail fehlt.');
      setVerifying(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        await api.post('/auth/email/verify', { token, email });
        setStatus('success');
        setMessageText('Deine E-Mail wurde erfolgreich verifiziert! Du hast nun Zugriff auf alle Funktionen.');
        message.success('E-Mail erfolgreich verifiziert');
      } catch (error: any) {
        setStatus('error');
        setMessageText(error.response?.data?.message || 'Verifizierung fehlgeschlagen. Der Link ist möglicherweise ungültig oder abgelaufen.');
        message.error('Verifizierung fehlgeschlagen');
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [token, email]);

  return (
    <div style={{ padding: 24, background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
       {/* Use a simple container since MainLayout doesn't accept children and uses Outlet */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1
      }}>
        {verifying ? (
          <Spin size="large" tip="Verifiziere E-Mail..." />
        ) : (
          <Result
            status={status}
            icon={status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            title={status === 'success' ? 'E-Mail Verifiziert!' : 'Verifizierung fehlgeschlagen'}
            subTitle={messageText}
            extra={[
              <Button type="primary" key="console" onClick={() => navigate('/dashboard')}>
                Zum Dashboard
              </Button>,
              status === 'error' && (
                <Button key="resend" onClick={() => navigate('/profile')}>
                  Erneut senden
                </Button>
              ),
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default EmailVerificationPage;
