import React from 'react';
import { Drawer, List, Avatar, Button, Typography, Space, Badge, Divider } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  PictureOutlined,
  TagsOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  CloseOutlined,
  ShopOutlined,
  BarChartOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Text } = Typography;

interface MobileMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  roles?: string[];
  badge?: number;
}

const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
    path: '/admin/dashboard',
  },
  {
    key: 'posts',
    icon: <FileTextOutlined />,
    label: 'Beiträge',
    path: '/admin/posts',
  },
  {
    key: 'media',
    icon: <PictureOutlined />,
    label: 'Medien',
    path: '/admin/media',
  },
  {
    key: 'categories',
    icon: <TagsOutlined />,
    label: 'Kategorien',
    path: '/admin/categories',
  },
  {
    key: 'shop',
    icon: <ShopOutlined />,
    label: 'Shop',
    path: '/admin/shop',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'users',
    icon: <TeamOutlined />,
    label: 'Benutzer',
    path: '/admin/users',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'analytics',
    icon: <BarChartOutlined />,
    label: 'Analytics',
    path: '/admin/analytics',
  },
  {
    key: 'security',
    icon: <SafetyOutlined />,
    label: 'Sicherheit',
    path: '/admin/security',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: 'Einstellungen',
    path: '/admin/settings',
    roles: ['admin', 'super_admin'],
  },
];

export const MobileMenu: React.FC<MobileMenuProps> = ({ visible, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  const filteredItems = menuItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const isActive = (path: string) => location.pathname === path;

  return (
    <Drawer
      placement="left"
      closable={false}
      onClose={onClose}
      open={visible}
      width={280}
      className="mobile-menu-drawer"
      styles={{
        body: { padding: 0 },
        header: { display: 'none' },
      }}
    >
      <div className="mobile-menu-header">
        <div className="user-info">
          <Avatar
            size={48}
            src={user?.avatar}
            style={{ backgroundColor: '#1890ff' }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <div className="user-details">
            <Text strong>{user?.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {user?.email}
            </Text>
          </div>
        </div>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          className="close-button"
        />
      </div>

      <Divider style={{ margin: 0 }} />

      <List
        className="mobile-menu-list"
        dataSource={filteredItems}
        renderItem={(item) => (
          <List.Item
            className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleNavigate(item.path)}
            style={{
              cursor: 'pointer',
              backgroundColor: isActive(item.path) ? '#e6f7ff' : 'transparent',
              borderLeft: isActive(item.path) ? '3px solid #1890ff' : '3px solid transparent',
            }}
          >
            <List.Item.Meta
              avatar={
                <Badge count={item.badge} size="small">
                  <span style={{ fontSize: 18, color: isActive(item.path) ? '#1890ff' : undefined }}>
                    {item.icon}
                  </span>
                </Badge>
              }
              title={
                <Text strong={isActive(item.path)} style={{ color: isActive(item.path) ? '#1890ff' : undefined }}>
                  {item.label}
                </Text>
              }
            />
          </List.Item>
        )}
      />

      <Divider style={{ margin: 0 }} />

      <div className="mobile-menu-footer">
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          danger
          block
          size="large"
        >
          Abmelden
        </Button>
      </div>
    </Drawer>
  );
};

export const MobileHeader: React.FC<{
  title?: string;
  onMenuClick: () => void;
  rightContent?: React.ReactNode;
}> = ({ title, onMenuClick, rightContent }) => {
  return (
    <div className="mobile-header">
      <Space>
        <Button
          type="text"
          onClick={onMenuClick}
          className="menu-trigger"
          icon={
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
            </svg>
          }
        />
        {title && <Text strong style={{ fontSize: 18 }}>{title}</Text>}
      </Space>
      {rightContent}
    </div>
  );
};

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const mainItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, path: '/admin/dashboard' },
    { key: 'posts', icon: <FileTextOutlined />, path: '/admin/posts' },
    { key: 'new-post', icon: <FileTextOutlined />, path: '/admin/posts/new', isMain: true },
    { key: 'media', icon: <PictureOutlined />, path: '/admin/media' },
    { key: 'profile', icon: <Avatar size={24} src={user?.avatar} />, path: '/admin/profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="mobile-bottom-nav">
      {mainItems.map((item) => (
        <div
          key={item.key}
          className={`nav-item ${isActive(item.path) ? 'active' : ''} ${item.isMain ? 'main' : ''}`}
          onClick={() => navigate(item.path)}
        >
          {item.isMain ? (
            <div className="main-button">
              {item.icon}
            </div>
          ) : (
            <>
              <span className="nav-icon" style={{ color: isActive(item.path) ? '#1890ff' : undefined }}>
                {item.icon}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export const MobileCardList: React.FC<{
  items: any[];
  renderItem: (item: any) => React.ReactNode;
  loading?: boolean;
}> = ({ items, renderItem, loading }) => {
  return (
    <div className="mobile-card-list">
      <List
        dataSource={items}
        loading={loading}
        renderItem={renderItem}
      />
    </div>
  );
};

export const MobilePullToRefresh: React.FC<{
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
}> = ({ children, onRefresh }) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const [currentY, setCurrentY] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY > 0 && containerRef.current?.scrollTop === 0) {
      setCurrentY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = async () => {
    const diff = currentY - startY;
    if (diff > 80 && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setStartY(0);
    setCurrentY(0);
  };

  const pullDistance = Math.max(0, Math.min(currentY - startY, 100));

  return (
    <div
      ref={containerRef}
      className="mobile-pull-to-refresh"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDistance > 0 && (
        <div
          className="pull-indicator"
          style={{
            height: pullDistance * 0.5,
            opacity: Math.min(pullDistance / 80, 1),
          }}
        >
          {refreshing ? 'Aktualisieren...' : 'Ziehen zum Aktualisieren'}
        </div>
      )}
      {children}
    </div>
  );
};

export default MobileMenu;
