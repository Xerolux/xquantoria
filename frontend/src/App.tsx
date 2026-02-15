import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import QuickSearch from './components/QuickSearch';

// Code Splitting - Lazy load all pages
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

// Public Pages
const PublicHomePage = lazy(() => import('./pages/public/HomePage'));
const BlogListPage = lazy(() => import('./pages/public/BlogPage').then(m => ({ default: m.default })));
const PostDetailPage = lazy(() => import('./pages/public/BlogPage').then(m => ({ default: m.PostDetailPage })));
const StaticPage = lazy(() => import('./pages/public/StaticPage'));

// Admin Pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PostsPage = lazy(() => import('./pages/PostsPage'));
const PostEditorPage = lazy(() => import('./pages/PostEditorPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const TagsPage = lazy(() => import('./pages/TagsPage'));
const MediaPage = lazy(() => import('./pages/MediaPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const CommentsPage = lazy(() => import('./pages/CommentsPage'));
const NewslettersPage = lazy(() => import('./pages/NewslettersPage'));
const SEOPage = lazy(() => import('./pages/SEOPage'));
const BackupsPage = lazy(() => import('./pages/BackupsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogsPage'));
const SystemHealthPage = lazy(() => import('./pages/SystemHealthPage'));
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'));
const AdsPage = lazy(() => import('./pages/AdsPage'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const PostSharingPage = lazy(() => import('./pages/PostSharingPage'));
const PluginManagerPage = lazy(() => import('./pages/PluginManagerPage'));
const RoleHierarchyPage = lazy(() => import('./pages/RoleHierarchyPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const ThemeCustomizerPage = lazy(() => import('./pages/ThemeCustomizerPage'));
const FormBuilderPage = lazy(() => import('./pages/FormBuilderPage'));
const ImportExportPage = lazy(() => import('./pages/ImportExportPage'));
const LegalGeneratorPage = lazy(() => import('./pages/LegalGeneratorPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PushSettingsPage = lazy(() => import('./pages/PushSettingsPage'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'));
const ElasticsearchSearchPage = lazy(() => import('./pages/ElasticsearchSearchPage'));
const WebhooksPage = lazy(() => import('./pages/WebhooksPage'));
const AnalyticsDashboardPage = lazy(() => import('./pages/AnalyticsDashboardPage'));
const SystemLogsPage = lazy(() => import('./pages/SystemLogsPage'));
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage'));
const SecurityDashboardPage = lazy(() => import('./pages/SecurityDashboardPage'));
const QueueMonitorPage = lazy(() => import('./pages/QueueMonitorPage'));
const SchedulerPage = lazy(() => import('./pages/SchedulerPage'));
const PerformancePage = lazy(() => import('./pages/PerformancePage'));
const ContentApprovalPage = lazy(() => import('./pages/ContentApprovalPage'));

// Components
const MainLayout = lazy(() => import('./components/Layout/MainLayout'));
const CookieBanner = lazy(() => import('./components/CookieBanner'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));

// Loading component for Suspense
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} size="large" />
  </div>
);

function App() {
  const [quickSearchVisible, setQuickSearchVisible] = useState(false);

  // Cmd+K shortcut for Quick Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearchVisible(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <QuickSearch
          visible={quickSearchVisible}
          onClose={() => setQuickSearchVisible(false)}
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Website Routes */}
            <Route path="/" element={<PublicHomePage />} />
            <Route path="/blog" element={<BlogListPage />} />
            <Route path="/blog/:slug" element={<PostDetailPage />} />
            <Route path="/category/:category" element={<BlogListPage />} />
            <Route path="/tag/:tag" element={<BlogListPage />} />
            <Route path="/page/:slug" element={<StaticPage />} />
            <Route path="/search" element={<BlogListPage />} />

            {/* Admin Home (redirects to dashboard) */}
            <Route path="/home" element={<HomePage />} />

            {/* Admin Routes with Layout and Auth */}
            <Route
              path="/admin"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                </Suspense>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route
                path="dashboard"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="posts"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PostsPage />
                  </Suspense>
                }
              />
              <Route
                path="posts/new"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PostEditorPage />
                  </Suspense>
                }
              />
              <Route
                path="posts/:id/edit"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PostEditorPage />
                  </Suspense>
                }
              />
              <Route
                path="pages"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PostsPage />
                  </Suspense>
                }
              />
              <Route
                path="categories"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <CategoriesPage />
                  </Suspense>
                }
              />
              <Route
                path="tags"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <TagsPage />
                  </Suspense>
                }
              />
              <Route
                path="media"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <MediaPage />
                  </Suspense>
                }
              />
              <Route
                path="users"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <UsersPage />
                  </Suspense>
                }
              />
              <Route
                path="comments"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <CommentsPage />
                  </Suspense>
                }
              />
              <Route
                path="newsletters"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <NewslettersPage />
                  </Suspense>
                }
              />
              <Route
                path="seo"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SEOPage />
                  </Suspense>
                }
              />
              <Route
                path="backups"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <BackupsPage />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
              <Route
                path="activity-logs"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ActivityLogsPage />
                  </Suspense>
                }
              />
              <Route
                path="system-health"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SystemHealthPage />
                  </Suspense>
                }
              />
              <Route
                path="downloads"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <DownloadsPage />
                  </Suspense>
                }
              />
              <Route
                path="ads"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdsPage />
                  </Suspense>
                }
              />
              <Route
                path="ai-assistant"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AIAssistantPage />
                  </Suspense>
                }
              />
              <Route
                path="post-sharing"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PostSharingPage />
                  </Suspense>
                }
              />
              <Route
                path="plugin-manager"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PluginManagerPage />
                  </Suspense>
                }
              />
              <Route
                path="role-hierarchy"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <RoleHierarchyPage />
                  </Suspense>
                }
              />
              <Route
                path="shop"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ShopPage />
                  </Suspense>
                }
              />
              <Route
                path="themes"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ThemeCustomizerPage />
                  </Suspense>
                }
              />
              <Route
                path="forms"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <FormBuilderPage />
                  </Suspense>
                }
              />
              <Route
                path="import-export"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ImportExportPage />
                  </Suspense>
                }
              />
              <Route
                path="legal"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <LegalGeneratorPage />
                  </Suspense>
                }
              />
              <Route
                path="payments"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PaymentsPage />
                  </Suspense>
                }
              />
              <Route
                path="checkout"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <CheckoutPage />
                  </Suspense>
                }
              />
              <Route
                path="profile"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="push-settings"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PushSettingsPage />
                  </Suspense>
                }
              />
              <Route
                path="elasticsearch"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ElasticsearchSearchPage />
                  </Suspense>
                }
              />
              <Route
                path="webhooks"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <WebhooksPage />
                  </Suspense>
                }
              />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AnalyticsDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="system-logs"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SystemLogsPage />
                  </Suspense>
                }
              />
              <Route
                path="api-docs"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ApiDocsPage />
                  </Suspense>
                }
              />
              <Route
                path="security"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SecurityDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="queue"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <QueueMonitorPage />
                  </Suspense>
                }
              />
              <Route
                path="scheduler"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SchedulerPage />
                  </Suspense>
                }
              />
              <Route
                path="performance"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PerformancePage />
                  </Suspense>
                }
              />
              <Route
                path="content-approval"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ContentApprovalPage />
                  </Suspense>
                }
              />
            </Route>

            {/* Standalone Auth Pages */}
            <Route
              path="/oauth/:provider/callback"
              element={
                <Suspense fallback={<PageLoader />}>
                  <OAuthCallbackPage />
                </Suspense>
              }
            />
            <Route
              path="/login"
              element={
                <Suspense fallback={<PageLoader />}>
                  <LoginPage />
                </Suspense>
              }
            />
            <Route
              path="/register"
              element={
                <Suspense fallback={<PageLoader />}>
                  <RegisterPage />
                </Suspense>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ForgotPasswordPage />
                </Suspense>
              }
            />
            <Route
              path="/reset-password"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ResetPasswordPage />
                </Suspense>
              }
            />
            <Route
              path="/verify-email"
              element={
                <Suspense fallback={<PageLoader />}>
                  <EmailVerificationPage />
                </Suspense>
              }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Suspense fallback={null}>
            <CookieBanner />
          </Suspense>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
