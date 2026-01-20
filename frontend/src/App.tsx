import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PostsPage from './pages/PostsPage';
import PostEditorPage from './pages/PostEditorPage';
import CategoriesPage from './pages/CategoriesPage';
import TagsPage from './pages/TagsPage';
import MediaPage from './pages/MediaPage';
import UsersPage from './pages/UsersPage';
import CommentsPage from './pages/CommentsPage';
import NewslettersPage from './pages/NewslettersPage';
import SEOPage from './pages/SEOPage';
import BackupsPage from './pages/BackupsPage';
import SettingsPage from './pages/SettingsPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import SystemHealthPage from './pages/SystemHealthPage';
import DownloadsPage from './pages/DownloadsPage';
import AdsPage from './pages/AdsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import PostSharingPage from './pages/PostSharingPage';
import PluginManagerPage from './pages/PluginManagerPage';
import RoleHierarchyPage from './pages/RoleHierarchyPage';
import MainLayout from './components/Layout/MainLayout';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CookieBanner from './components/CookieBanner';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Public Home Page */}
          <Route path="/" element={<HomePage />} />

          {/* Admin Routes with Layout and Auth */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="posts" element={<PostsPage />} />
            <Route path="posts/new" element={<PostEditorPage />} />
            <Route path="posts/:id/edit" element={<PostEditorPage />} />
            <Route path="pages" element={<PostsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="comments" element={<CommentsPage />} />
            <Route path="newsletters" element={<NewslettersPage />} />
            <Route path="seo" element={<SEOPage />} />
            <Route path="backups" element={<BackupsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="activity-logs" element={<ActivityLogsPage />} />
            <Route path="system-health" element={<SystemHealthPage />} />
            <Route path="downloads" element={<DownloadsPage />} />
            <Route path="ads" element={<AdsPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="post-sharing" element={<PostSharingPage />} />
            <Route path="plugin-manager" element={<PluginManagerPage />} />
            <Route path="role-hierarchy" element={<RoleHierarchyPage />} />
          </Route>

          {/* Standalone Login Page */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <CookieBanner />
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
