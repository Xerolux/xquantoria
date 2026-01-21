import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Space } from 'antd';
import Breadcrumb from '../Breadcrumb';
import {
  HomeOutlined,
  FileTextOutlined,
  FolderOutlined,
  TagsOutlined,
  PictureOutlined,
  DownloadOutlined,
  DollarOutlined,
  FileOutlined,
  UserOutlined,
  TeamOutlined,
  MessageOutlined,
  MailOutlined,
  GlobalOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
  HeartOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  ShareAltOutlined,
  SafetyOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/api';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate('/login');
  };

  const menuItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: 'Dashboard' },
    { key: '/posts', icon: <FileTextOutlined />, label: 'Posts' },
    { key: '/pages', icon: <FileOutlined />, label: 'Pages' },
    { key: '/categories', icon: <FolderOutlined />, label: 'Categories' },
    { key: '/tags', icon: <TagsOutlined />, label: 'Tags' },
    { key: '/media', icon: <PictureOutlined />, label: 'Media' },
    { key: '/users', icon: <TeamOutlined />, label: 'Users' },
    { key: '/comments', icon: <MessageOutlined />, label: 'Comments' },
    { key: '/newsletters', icon: <MailOutlined />, label: 'Newsletters' },
    { key: '/seo', icon: <GlobalOutlined />, label: 'SEO' },
    { key: '/backups', icon: <CloudDownloadOutlined />, label: 'Backups' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
    { key: '/activity-logs', icon: <FileTextOutlined />, label: 'Activity Logs' },
    { key: '/system-health', icon: <HeartOutlined />, label: 'System Health' },
    { key: '/downloads', icon: <DownloadOutlined />, label: 'Downloads' },
    { key: '/ads', icon: <DollarOutlined />, label: 'Advertisements' },
    { key: '/ai-assistant', icon: <AppstoreOutlined />, label: 'AI Assistant' },
    { key: '/post-sharing', icon: <ShareAltOutlined />, label: 'Post Sharing' },
    { key: '/plugin-manager', icon: <SafetyOutlined />, label: 'Plugin Manager' },
    { key: '/role-hierarchy', icon: <CrownOutlined />, label: 'Role Hierarchy' },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{
          height: 32,
          margin: 16,
          color: '#fff',
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          {collapsed ? 'CMS' : 'Blog CMS'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 64, height: 64 }}
          />
          <Space>
            <span>Welcome, {user?.display_name || user?.name}</span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                icon={<UserOutlined />}
                style={{ cursor: 'pointer' }}
                src={user?.avatar_url}
              />
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '24px 16', padding: 24, background: '#fff', minHeight: 280 }}>
          <Breadcrumb />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
