import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Drawer,
  Input,
  Space,
  Switch,
  Dropdown,
  Avatar,
  Typography,
  Divider,
} from 'antd';
import {
  MenuOutlined,
  SearchOutlined,
  UserOutlined,
  SunOutlined,
  MoonOutlined,
  BellOutlined,
  GlobalOutlined,
  HomeOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MailOutlined,
  LoginOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Header } = Layout;
const { Search } = Input;
const { Text } = Typography;

interface PublicHeaderProps {
  siteName?: string;
  siteLogo?: string;
  menuItems?: Array<{ key: string; label: string; path: string }>;
  categories?: Array<{ id: number; name: string; slug: string }>;
  onThemeChange?: (dark: boolean) => void;
}

const PublicHeader: React.FC<PublicHeaderProps> = ({
  siteName = 'Blog CMS',
  siteLogo,
  menuItems = [],
  categories = [],
  onThemeChange,
}) => {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
    onThemeChange?.(newTheme);
  };

  const handleSearch = (value: string) => {
    if (value.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(value)}`;
    }
  };

  const navItems = [
    { key: '/', label: 'Home', icon: <HomeOutlined /> },
    { key: '/blog', label: 'Blog', icon: <FileTextOutlined /> },
    ...menuItems.map((item) => ({
      key: item.path,
      label: item.label,
    })),
  ];

  const categoryMenu = {
    items: categories.slice(0, 10).map((cat) => ({
      key: cat.slug,
      label: <Link to={`/category/${cat.slug}`}>{cat.name}</Link>,
    })),
  };

  const userMenu = {
    items: [
      {
        key: 'dashboard',
        icon: <SettingOutlined />,
        label: <Link to="/admin/dashboard">Dashboard</Link>,
      },
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: <Link to="/admin/profile">Profile</Link>,
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LoginOutlined />,
        label: 'Logout',
        onClick: () => {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        },
      },
    ],
  };

  return (
    <Header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {siteLogo ? (
            <img src={siteLogo} alt={siteName} style={{ height: 40 }} />
          ) : (
            <Text strong style={{ fontSize: 20, color: '#1890ff' }}>
              {siteName}
            </Text>
          )}
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={navItems}
          style={{
            flex: 1,
            minWidth: 400,
            border: 'none',
            background: 'transparent',
          }}
          className="desktop-menu"
        />

        {categories.length > 0 && (
          <Dropdown menu={categoryMenu} placement="bottomRight">
            <Button type="text">
              <GlobalOutlined /> Categories
            </Button>
          </Dropdown>
        )}

        <Button
          type="text"
          icon={<SearchOutlined />}
          onClick={() => setSearchVisible(!searchVisible)}
        />

        <Switch
          checked={isDark}
          onChange={toggleTheme}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />

        {isAuthenticated ? (
          <Dropdown menu={userMenu} placement="bottomRight">
            <Avatar
              style={{ cursor: 'pointer', backgroundColor: '#1890ff' }}
              icon={<UserOutlined />}
              src={user?.avatar_url}
            />
          </Dropdown>
        ) : (
          <Link to="/login">
            <Button type="primary" icon={<LoginOutlined />}>
              Login
            </Button>
          </Link>
        )}

        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuVisible(true)}
          className="mobile-menu-button"
          style={{ display: 'none' }}
        />
      </div>

      <Drawer
        title={siteName}
        placement="right"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        width={300}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Search
            placeholder="Search..."
            allowClear
            enterButton
            onSearch={handleSearch}
          />

          <Menu
            mode="vertical"
            selectedKeys={[location.pathname]}
            items={navItems}
            style={{ border: 'none' }}
          />

          {categories.length > 0 && (
            <>
              <Divider>Categories</Divider>
              <Space wrap>
                {categories.map((cat) => (
                  <Link key={cat.id} to={`/category/${cat.slug}`}>
                    <Button size="small">{cat.name}</Button>
                  </Link>
                ))}
              </Space>
            </>
          )}

          <Divider>Settings</Divider>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Dark Mode</Text>
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
          </div>

          <Divider />

          {isAuthenticated ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Link to="/admin/dashboard">
                <Button block icon={<SettingOutlined />}>
                  Dashboard
                </Button>
              </Link>
              <Button
                block
                danger
                onClick={() => {
                  useAuthStore.getState().logout();
                  window.location.href = '/';
                }}
              >
                Logout
              </Button>
            </Space>
          ) : (
            <Link to="/login">
              <Button type="primary" block icon={<LoginOutlined />}>
                Login
              </Button>
            </Link>
          )}
        </Space>
      </Drawer>

      <Drawer
        title="Search"
        placement="top"
        onClose={() => setSearchVisible(false)}
        open={searchVisible}
        height={120}
      >
        <Search
          placeholder="Search posts, categories, tags..."
          allowClear
          enterButton="Search"
          size="large"
          onSearch={(value) => {
            handleSearch(value);
            setSearchVisible(false);
          }}
        />
      </Drawer>

      <style>{`
        @media (max-width: 992px) {
          .desktop-menu {
            display: none !important;
          }
          .mobile-menu-button {
            display: block !important;
          }
        }
      `}</style>
    </Header>
  );
};

export default PublicHeader;
