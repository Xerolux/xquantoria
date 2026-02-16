import React from 'react';
import { useMediaQuery, useDeviceType } from '../hooks/useMediaQuery';
import { usePWA } from '../hooks/usePWA';
import { Button, Modal, Result, Space, Typography, Badge, Alert } from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  mobileComponent?: React.ReactNode;
  tabletComponent?: React.ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  mobileComponent,
  tabletComponent,
}) => {
  const deviceType = useDeviceType();

  if (deviceType === 'mobile' && mobileComponent) {
    return <>{mobileComponent}</>;
  }

  if (deviceType === 'tablet' && tabletComponent) {
    return <>{tabletComponent}</>;
  }

  return <>{children}</>;
};

export const InstallPrompt: React.FC = () => {
  const { status, install, prompt } = usePWA();
  const [dismissed, setDismissed] = React.useState(false);

  if (!status.canInstall || dismissed) {
    return null;
  }

  return (
    <div className="install-prompt">
      <Alert
        message="App installieren"
        description="Installieren Sie XQuantoria für eine bessere Erfahrung und Offline-Zugriff."
        type="info"
        showIcon
        action={
          <Space>
            <Button size="small" onClick={() => setDismissed(true)}>
              Später
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={install}
            >
              Installieren
            </Button>
          </Space>
        }
      />
    </div>
  );
};

export const UpdatePrompt: React.FC = () => {
  const { status, update } = usePWA();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (status.hasUpdate) {
      setVisible(true);
    }
  }, [status.hasUpdate]);

  const handleUpdate = () => {
    update();
    setVisible(false);
  };

  return (
    <Modal
      open={visible}
      onCancel={() => setVisible(false)}
      footer={null}
      centered
    >
      <Result
        status="success"
        title="Update verfügbar"
        subTitle="Eine neue Version ist verfügbar. Möchten Sie jetzt aktualisieren?"
        extra={[
          <Button key="later" onClick={() => setVisible(false)}>
            Später
          </Button>,
          <Button
            key="update"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleUpdate}
          >
            Jetzt aktualisieren
          </Button>,
        ]}
      />
    </Modal>
  );
};

export const OfflineIndicator: React.FC = () => {
  const { status } = usePWA();
  const { isOnline } = status;

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-indicator">
      <Alert
        message="Offline"
        description="Sie sind offline. Einige Funktionen sind möglicherweise nicht verfügbar."
        type="warning"
        icon={<DisconnectOutlined />}
        showIcon
        banner
      />
    </div>
  );
};

export const ConnectionStatus: React.FC = () => {
  const { status } = usePWA();

  return (
    <Badge
      status={status.isOnline ? 'success' : 'error'}
      text={status.isOnline ? 'Online' : 'Offline'}
    />
  );
};

export const DeviceInfo: React.FC = () => {
  const info = useMediaQuery();

  return (
    <div className="device-info">
      <Space direction="vertical" size="small">
        <Text>
          Breakpoint: <Text strong>{info.breakpoint}</Text>
        </Text>
        <Text>
          Gerät: <Text strong>{info.isMobile ? 'Mobile' : info.isTablet ? 'Tablet' : 'Desktop'}</Text>
        </Text>
        <Text>
          Auflösung: <Text strong>{info.width}x{info.height}</Text>
        </Text>
        <Text>
          Pixel Ratio: <Text strong>{info.pixelRatio}x</Text>
        </Text>
        <Text>
          Touch: <Text strong>{info.isTouch ? 'Ja' : 'Nein'}</Text>
        </Text>
      </Space>
    </div>
  );
};

export const TouchOptimizedButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  block?: boolean;
}> = ({ children, onClick, type = 'default', icon, disabled, loading, danger, block }) => {
  const { isTouch } = useMediaQuery();

  return (
    <Button
      type={type}
      icon={icon}
      disabled={disabled}
      loading={loading}
      danger={danger}
      block={block}
      onClick={onClick}
      style={{
        minHeight: isTouch ? 48 : undefined,
        padding: isTouch ? '12px 24px' : undefined,
      }}
    >
      {children}
    </Button>
  );
};

export const SwipeableCard: React.FC<{
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}> = ({ children, onSwipeLeft, onSwipeRight, leftAction, rightAction }) => {
  const [translateX, setTranslateX] = React.useState(0);
  const [startX, setStartX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    setTranslateX(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    if (translateX > 50 && onSwipeRight) {
      onSwipeRight();
    } else if (translateX < -50 && onSwipeLeft) {
      onSwipeLeft();
    }
    setTranslateX(0);
    setIsDragging(false);
  };

  return (
    <div className="swipeable-card-container">
      {leftAction && (
        <div className="swipe-action left">{leftAction}</div>
      )}
      {rightAction && (
        <div className="swipe-action right">{rightAction}</div>
      )}
      <div
        className="swipeable-card"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const MobileFab: React.FC<{
  icon?: React.ReactNode;
  onClick: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
}> = ({ icon = <Text>+</Text>, onClick, label, position = 'bottom-right' }) => {
  const positionStyles = {
    'bottom-right': { right: 16 },
    'bottom-center': { left: '50%', transform: 'translateX(-50%)' },
    'bottom-left': { left: 16 },
  };

  return (
    <div className="mobile-fab" style={{ ...positionStyles[position] }}>
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={icon}
        onClick={onClick}
        style={{
          width: 56,
          height: 56,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      />
      {label && (
        <Text className="fab-label" style={{ marginTop: 4, display: 'block', textAlign: 'center' }}>
          {label}
        </Text>
      )}
    </div>
  );
};

export default ResponsiveLayout;
