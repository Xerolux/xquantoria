import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Typography } from 'antd';
import axios from 'axios';

const { Text } = Typography;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const OAuthCallbackPage: React.FC = () => {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        const errorMsg = errorDescription || errorParam;
        setStatus('error');
        setError(errorMsg);
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-callback',
            success: false,
            error: errorMsg,
          }, window.location.origin);
          setTimeout(() => window.close(), 500);
        }
        return;
      }

      if (!code || !provider) {
        setStatus('error');
        setError('Missing authorization code or provider');
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-callback',
            success: false,
            error: 'Missing authorization code or provider',
          }, window.location.origin);
          setTimeout(() => window.close(), 500);
        }
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/oauth/${provider}/callback`, {
          params: { code, state },
        });

        const { token, user } = response.data;

        setStatus('success');

        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-callback',
            success: true,
            token,
            user,
          }, window.location.origin);
          
          setTimeout(() => window.close(), 500);
        } else {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user,
              token,
              isAuthenticated: true,
            },
            version: 0,
          }));
          navigate('/admin/dashboard');
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        const errorMsg = axiosErr.response?.data?.message || 'OAuth authentication failed';
        setStatus('error');
        setError(errorMsg);

        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-callback',
            success: false,
            error: errorMsg,
          }, window.location.origin);
          setTimeout(() => window.close(), 500);
        }
      }
    };

    handleCallback();
  }, [provider, searchParams, navigate]);

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f0f2f5',
      }}>
        <Spin size="large" />
        <Text type="secondary" style={{ marginTop: 16 }}>
          Authentifizierung mit {provider?.charAt(0).toUpperCase()}{provider?.slice(1)} läuft...
        </Text>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f0f2f5',
      }}>
        <Result
          status="success"
          title="Erfolgreich angemeldet!"
          subTitle="Dieses Fenster schließt automatisch..."
        />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#f0f2f5',
    }}>
      <Result
        status="error"
        title="Authentifizierung fehlgeschlagen"
        subTitle={error}
        extra={
          <Text type="secondary">
            Bitte schließe dieses Fenster und versuche es erneut.
          </Text>
        }
      />
    </div>
  );
};

export default OAuthCallbackPage;
