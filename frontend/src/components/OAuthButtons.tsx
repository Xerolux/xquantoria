import React, { useState } from 'react';
import { Button, Divider, message, Space, Tooltip } from 'antd';
import {
  GoogleOutlined,
  GithubOutlined,
  FacebookOutlined,
  TwitterOutlined,
  LinkedinOutlined,
  AppleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface OAuthButtonsProps {
  mode?: 'login' | 'link';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface OAuthProvider {
  name: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  label: string;
}

const providers: OAuthProvider[] = [
  {
    name: 'google',
    icon: <GoogleOutlined />,
    color: '#DB4437',
    hoverColor: '#C33D2E',
    label: 'Google',
  },
  {
    name: 'github',
    icon: <GithubOutlined />,
    color: '#333333',
    hoverColor: '#24292F',
    label: 'GitHub',
  },
  {
    name: 'facebook',
    icon: <FacebookOutlined />,
    color: '#1877F2',
    hoverColor: '#166FE5',
    label: 'Facebook',
  },
  {
    name: 'twitter',
    icon: <TwitterOutlined />,
    color: '#1DA1F2',
    hoverColor: '#0D8ECA',
    label: 'Twitter',
  },
  {
    name: 'linkedin',
    icon: <LinkedinOutlined />,
    color: '#0A66C2',
    hoverColor: '#004182',
    label: 'LinkedIn',
  },
];

const OAuthButtons: React.FC<OAuthButtonsProps> = ({ mode = 'login', onSuccess, onError }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { loginWithToken } = useAuthStore();

  const handleOAuthLogin = async (provider: string) => {
    setLoading(provider);

    try {
      const { data } = await axios.get(`${API_BASE_URL}/oauth/${provider}/redirect`);

      if (data.redirect_url) {
        const popup = window.open(
          data.redirect_url,
          `oauth-${provider}`,
          'width=600,height=700,scrollbars=yes'
        );

        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data?.type === 'oauth-callback') {
            window.removeEventListener('message', handleMessage);

            if (event.data.success && event.data.token) {
              localStorage.setItem('auth_token', event.data.token);

              if (mode === 'login') {
                await loginWithToken(event.data.token);
                message.success(`Erfolgreich mit ${provider} eingeloggt!`);
                navigate('/admin/dashboard');
              }

              onSuccess?.();
            } else if (event.data.error) {
              message.error(event.data.error);
              onError?.(event.data.error);
            }

            popup?.close();
            setLoading(null);
          }
        };

        window.addEventListener('message', handleMessage);

        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setLoading(null);
          }
        }, 500);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const errorMsg = err.response?.data?.message || `${provider} Login fehlgeschlagen`;
      message.error(errorMsg);
      onError?.(errorMsg);
      setLoading(null);
    }
  };

  const handleLinkProvider = async (provider: string) => {
    setLoading(provider);

    try {
      const { data } = await axios.get(`${API_BASE_URL}/oauth/${provider}/redirect`);

      if (data.redirect_url) {
        const popup = window.open(
          data.redirect_url,
          `oauth-${provider}`,
          'width=600,height=700,scrollbars=yes'
        );

        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data?.type === 'oauth-callback') {
            window.removeEventListener('message', handleMessage);
            popup?.close();
            setLoading(null);

            if (event.data.success) {
              message.success(`${provider} erfolgreich verknüpft!`);
              onSuccess?.();
            } else if (event.data.error) {
              message.error(event.data.error);
              onError?.(event.data.error);
            }
          }
        };

        window.addEventListener('message', handleMessage);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || `${provider} Verknüpfung fehlgeschlagen`);
      setLoading(null);
    }
  };

  return (
    <div>
      <Divider style={{ margin: '16px 0' }}>
        <span style={{ color: '#999', fontSize: 12 }}>
          {mode === 'login' ? 'oder anmelden mit' : 'Verknüpfen mit'}
        </span>
      </Divider>

      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Space wrap style={{ width: '100%', justifyContent: 'center' }}>
          {providers.map((provider) => (
            <Tooltip key={provider.name} title={provider.label}>
              <Button
                icon={provider.icon}
                loading={loading === provider.name}
                onClick={() =>
                  mode === 'login'
                    ? handleOAuthLogin(provider.name)
                    : handleLinkProvider(provider.name)
                }
                style={{
                  backgroundColor: loading === provider.name ? provider.hoverColor : provider.color,
                  borderColor: provider.color,
                  color: '#fff',
                  minWidth: 48,
                }}
                onMouseEnter={(e) => {
                  if (loading !== provider.name) {
                    e.currentTarget.style.backgroundColor = provider.hoverColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (loading !== provider.name) {
                    e.currentTarget.style.backgroundColor = provider.color;
                  }
                }}
              >
                {provider.label}
              </Button>
            </Tooltip>
          ))}
        </Space>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Button
            icon={<AppleOutlined />}
            loading={loading === 'apple'}
            onClick={() =>
              mode === 'login' ? handleOAuthLogin('apple') : handleLinkProvider('apple')
            }
            style={{
              backgroundColor: '#000',
              borderColor: '#000',
              color: '#fff',
            }}
            block
          >
            Mit Apple fortfahren
          </Button>
        </div>
      </Space>
    </div>
  );
};

export default OAuthButtons;
