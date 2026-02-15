import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Card, Typography, Space, Alert, Spin } from 'antd';
import {
  ReloadOutlined,
  HomeOutlined,
  BugOutlined,
  CustomerServiceOutlined,
  ExclamationCircleOutlined,
  WifiOutlined,
} from '@ant-design/icons';

const { Text, Paragraph, Title } = Typography;

interface BaseProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface BaseState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<BaseProps, BaseState> {
  constructor(props: BaseProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BaseState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    this.logError(error, errorInfo);
  }

  logError(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);

    if (import.meta.env.PROD) {
      fetch('/api/v1/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: 50, textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card style={{ maxWidth: 600 }}>
            <Result
              status="error"
              icon={<BugOutlined style={{ color: '#ff4d4f' }} />}
              title="Etwas ist schiefgelaufen"
              subTitle="Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut."
              extra={[
                <Button type="primary" key="reload" icon={<ReloadOutlined />} onClick={this.handleReload}>
                  Seite neu laden
                </Button>,
                <Button key="home" icon={<HomeOutlined />} onClick={this.handleGoHome}>
                  Zur Startseite
                </Button>,
                <Button key="reset" onClick={this.handleReset}>
                  Erneut versuchen
                </Button>,
              ]}
            />
            {import.meta.env.DE && this.state.error && (
              <details style={{ marginTop: 24, textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#1890ff' }}>
                  <BugOutlined /> Fehlerdetails (Dev Only)
                </summary>
                <Card size="small" style={{ marginTop: 12, background: '#fff1f0' }}>
                  <Paragraph>
                    <Text strong>Message:</Text>
                    <br />
                    <Text code>{this.state.error.message}</Text>
                  </Paragraph>
                  {this.state.error.stack && (
                    <Paragraph>
                      <Text strong>Stack:</Text>
                      <br />
                      <Text code style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>
                        {this.state.error.stack}
                      </Text>
                    </Paragraph>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <Paragraph>
                      <Text strong>Component Stack:</Text>
                      <br />
                      <Text code style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    </Paragraph>
                  )}
                </Card>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AsyncErrorBoundaryProps extends BaseProps {
  loading?: boolean;
  loadingFallback?: ReactNode;
}

export class AsyncErrorBoundary extends Component<AsyncErrorBoundaryProps, BaseState> {
  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BaseState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error('AsyncErrorBoundary:', error);
  }

  render(): ReactNode {
    if (this.props.loading) {
      return this.props.loadingFallback || (
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
        </div>
      );
    }

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: 50, textAlign: 'center' }}>
          <Result
            status="500"
            title="Fehler beim Laden"
            subTitle="Die Daten konnten nicht geladen werden."
            extra={[
              <Button type="primary" key="retry" onClick={() => this.setState({ hasError: false })}>
                Erneut versuchen
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

interface NetworkErrorBoundaryProps extends BaseProps {
  isOffline?: boolean;
}

export class NetworkErrorBoundary extends Component<NetworkErrorBoundaryProps, BaseState & { isOffline: boolean }> {
  constructor(props: NetworkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, isOffline: props.isOffline ?? !navigator.onLine };
  }

  componentDidMount(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = (): void => {
    this.setState({ isOffline: false });
  };

  handleOffline = (): void => {
    this.setState({ isOffline: true });
  };

  static getDerivedStateFromError(error: Error): BaseState {
    const isNetworkError = 
      error.message.includes('Network') ||
      error.message.includes('fetch') ||
      error.message.includes('CORS') ||
      error.message.includes('timeout');

    return { hasError: true, error: isNetworkError ? new Error('Netzwerkfehler') : error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.isOffline) {
      return (
        <div style={{ padding: 24 }}>
          <Alert
            message="Keine Internetverbindung"
            description="Bitte überprüfe deine Netzwerkverbindung und versuche es erneut."
            type="error"
            icon={<WifiOutlined />}
            showIcon
            action={
              <Button size="small" type="primary" onClick={() => window.location.reload()}>
                Erneut versuchen
              </Button>
            }
          />
        </div>
      );
    }

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message === 'Netzwerkfehler';

      return (
        <div style={{ padding: 50, textAlign: 'center' }}>
          <Result
            status={isNetworkError ? '500' : 'error'}
            icon={isNetworkError ? <WifiOutlined /> : <ExclamationCircleOutlined />}
            title={isNetworkError ? 'Verbindungsfehler' : 'Ein Fehler ist aufgetreten'}
            subTitle={
              isNetworkError
                ? 'Die Verbindung zum Server konnte nicht hergestellt werden.'
                : this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'
            }
            extra={[
              <Button
                type="primary"
                key="retry"
                onClick={() => this.setState({ hasError: false })}
              >
                Erneut versuchen
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

interface QueryErrorBoundaryProps extends BaseProps {
  error?: Error | null;
  onRetry?: () => void;
}

export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({
  children,
  error,
  onRetry,
  fallback,
}) => {
  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    const isAuthError = error.message.includes('401') || error.message.includes('Unauthorized');
    const isNotFound = error.message.includes('404') || error.message.includes('Not Found');
    const isServerError = error.message.includes('500') || error.message.includes('Server Error');

    let status: '403' | '404' | '500' | 'error' = 'error';
    let title = 'Ein Fehler ist aufgetreten';
    let subTitle = error.message;

    if (isAuthError) {
      status = '403';
      title = 'Zugriff verweigert';
      subTitle = 'Du hast keine Berechtigung für diese Aktion.';
    } else if (isNotFound) {
      status = '404';
      title = 'Nicht gefunden';
      subTitle = 'Die angeforderte Ressource wurde nicht gefunden.';
    } else if (isServerError) {
      status = '500';
      title = 'Serverfehler';
      subTitle = 'Ein interner Serverfehler ist aufgetreten. Bitte versuche es später erneut.';
    }

    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <Result
          status={status}
          title={title}
          subTitle={subTitle}
          extra={
            onRetry && (
              <Button type="primary" onClick={onRetry}>
                Erneut versuchen
              </Button>
            )
          }
        />
      </div>
    );
  }

  return <>{children}</>;
};

interface RouteErrorBoundaryProps extends BaseProps {
  routeName?: string;
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, BaseState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BaseState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error(`RouteErrorBoundary (${this.props.routeName || 'unknown'}):`, error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: 50, textAlign: 'center', minHeight: '60vh' }}>
          <Result
            status="404"
            title="Seite nicht gefunden"
            subTitle="Die angeforderte Seite konnte nicht geladen werden."
            extra={[
              <Button type="primary" key="home" href="/">
                Zur Startseite
              </Button>,
              <Button key="back" onClick={() => window.history.back()}>
                Zurück
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export class ComponentErrorBoundary extends Component<BaseProps & { componentName: string }, BaseState> {
  constructor(props: BaseProps & { componentName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BaseState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error(`ComponentErrorBoundary (${this.props.componentName}):`, error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert
          message={`Fehler in ${this.props.componentName}`}
          description="Diese Komponente konnte nicht geladen werden."
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => this.setState({ hasError: false })}>
              Erneut laden
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
