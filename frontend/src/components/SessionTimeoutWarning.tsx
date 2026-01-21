import React, { useEffect, useState } from 'react';
import { Modal, Progress, Button, Typography, Space, Alert } from 'antd';
import { WarningOutlined, LogoutOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Text, Title } = Typography;

interface SessionTimeoutWarningProps {
  timeout?: number; // Timeout in minutes (default: 30)
  warningTime?: number; // Show warning X minutes before timeout (default: 5)
  enabled?: boolean; // Enable/disable the warning (default: true)
}

const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  timeout = 30,
  warningTime = 5,
  enabled = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loggedOut, setLoggedOut] = useState(false);
  const { logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Check for user activity
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const TIMEOUT_MS = timeout * 60 * 1000;
    const WARNING_MS = warningTime * 60 * 1000;

    let timeoutId: NodeJS.Timeout;
    let warningTimeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      clearTimeout(warningTimeoutId);
      clearInterval(intervalId);
      setVisible(false);
      setLoggedOut(false);

      // Show warning before timeout
      warningTimeoutId = setTimeout(() => {
        if (isAuthenticated) {
          setVisible(true);
          setTimeLeft(warningTime * 60); // seconds

          // Start countdown
          intervalId = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev <= 1) {
                clearInterval(intervalId);
                handleLogout();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }, TIMEOUT_MS - WARNING_MS);

      // Set actual timeout for logout
      timeoutId = setTimeout(() => {
        handleLogout();
      }, TIMEOUT_MS);
    };

    const handleLogout = () => {
      setVisible(false);
      setLoggedOut(true);
      logout();
      navigate('/login');
    };

    const extendSession = () => {
      // Reset timer by making an API call
      resetTimer();
      setVisible(false);
    };

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      if (!visible) {
        resetTimer();
      }
    };

    // Set up activity listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Initial timer start
    resetTimer();

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(warningTimeoutId);
      clearInterval(intervalId);
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, isAuthenticated, timeout, warningTime]);

  const handleExtendSession = () => {
    // Send heartbeat to extend session
    fetch('/api/v1/sessions/heartbeat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    }).then(() => {
      setVisible(false);
      // Timer will be reset by the next activity event
    }).catch(() => {
      setVisible(false);
    });
  };

  const getProgressPercent = () => {
    return Math.max(0, Math.min(100, (timeLeft / (warningTime * 60)) * 100));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (timeLeft < 60) return '#ff4d4f'; // Less than 1 minute - red
    if (timeLeft < 180) return '#faad14'; // Less than 3 minutes - orange
    return '#52c41a'; // Green
  };

  if (loggedOut) {
    return (
      <Modal
        open={true}
        closable={false}
        footer={null}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <LogoutOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
          <Title level={4}>Session Abgelaufen</Title>
          <Text type="secondary">
            Du wurdest wegen Inaktivität automatisch abgemeldet.
          </Text>
          <Button
            type="primary"
            onClick={() => navigate('/login')}
            style={{ marginTop: 16 }}
          >
            Again Einloggen
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: getStatusColor() }} />
          <span>Session Timeout Warnung</span>
        </Space>
      }
      open={visible}
      closable={false}
      maskClosable={false}
      footer={
        <Space>
          <Button danger icon={<LogoutOutlined />} onClick={logout}>
            Jetzt Abmelden
          </Button>
          <Button type="primary" onClick={handleExtendSession}>
            Session Verlängern
          </Button>
        </Space>
      }
      centered
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="Inaktivität erkannt"
          description="Deine Session wird wegen Inaktivität bald beendet."
          type="warning"
          showIcon
        />

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text strong>Verbleibende Zeit:</Text>
            <Text strong style={{ fontSize: 16, color: getStatusColor() }}>
              {formatTime(timeLeft)}
            </Text>
          </div>
          <Progress
            percent={getProgressPercent()}
            status={timeLeft < 60 ? 'exception' : 'active'}
            strokeColor={getStatusColor()}
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <ClockCircleOutlined style={{ fontSize: 32, color: getStatusColor() }} />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              {timeLeft < 60
                ? 'Deine Session läuft in weniger als einer Minute ab!'
                : `Du hast noch ${formatTime(timeLeft)} Zeit.`}
            </Text>
          </div>
        </div>

        <Alert
          message="Tip"
          description="Klicke auf 'Session Verlängern' um deine Session zu verlängern und abgemeldet zu bleiben."
          type="info"
          showIcon
        />
      </Space>
    </Modal>
  );
};

export default SessionTimeoutWarning;
