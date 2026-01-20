import React, { useEffect, useState, useCallback } from 'react';
import { message, Button, Badge, Space } from 'antd';
import { SyncOutlined, WifiOutlined } from '@ant-design/icons';

export interface LiveUpdateConfig {
  enabled: boolean;
  method: 'polling' | 'sse' | 'websocket';
  interval?: number; // for polling (ms)
  sseUrl?: string; // for SSE
  wsUrl?: string; // for WebSocket
  onUpdate?: (data: any) => void;
  onError?: (error: any) => void;
}

export interface LiveUpdateResult {
  isConnected: boolean;
  lastUpdate: Date | null;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * Live Updates Hook for real-time data updates
 * Supports: Polling, Server-Sent Events (SSE), WebSocket
 */
export const useLiveUpdates = (
  fetchFn: () => Promise<any>,
  config: LiveUpdateConfig
): LiveUpdateResult => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [intervalId, setIntervalId] = useState<number | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);

  const disconnect = useCallback(() => {
    // Clear polling
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }

    // Close SSE
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }

    // Close WebSocket
    if (webSocket) {
      webSocket.close();
      setWebSocket(null);
    }

    setIsConnected(false);
  }, [intervalId, eventSource, webSocket]);

  const reconnect = useCallback(() => {
    disconnect();
    setIsConnected(true);

    if (config.method === 'polling') {
      // Polling mode
      const interval = config.interval || 30000; // Default 30 seconds
      const id = setInterval(async () => {
        try {
          const data = await fetchFn();
          setLastUpdate(new Date());
          config.onUpdate?.(data);
        } catch (error) {
          config.onError?.(error);
          setIsConnected(false);
        }
      }, interval);
      setIntervalId(id);

    } else if (config.method === 'sse') {
      // Server-Sent Events mode
      if (!config.sseUrl) {
        message.error('SSE URL is required');
        return;
      }

      const source = new EventSource(config.sseUrl);

      source.onopen = () => {
        setIsConnected(true);
        setLastUpdate(new Date());
      };

      source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLastUpdate(new Date());
        config.onUpdate?.(data);
      };

      source.onerror = (error) => {
        config.onError?.(error);
        setIsConnected(false);
        source.close();
      };

      setEventSource(source);

    } else if (config.method === 'websocket') {
      // WebSocket mode
      if (!config.wsUrl) {
        message.error('WebSocket URL is required');
        return;
      }

      const ws = new WebSocket(config.wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setLastUpdate(new Date());
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLastUpdate(new Date());
        config.onUpdate?.(data);
      };

      ws.onerror = (error) => {
        config.onError?.(error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      setWebSocket(ws);
    }
  }, [fetchFn, config, disconnect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (config.enabled) {
      reconnect();
    }

    return () => {
      disconnect();
    };
  }, [config.enabled, reconnect, disconnect]);

  return {
    isConnected,
    lastUpdate,
    disconnect,
    reconnect,
  };
};

/**
 * Higher-Order Component for live updates
 */
export const withLiveUpdates = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fetchFn: () => Promise<any>,
  config: LiveUpdateConfig
) => {
  const WithLiveUpdates = (props: P) => {
    const liveUpdates = useLiveUpdates(fetchFn, config);

    return React.createElement(WrappedComponent, { ...props, liveUpdates });
  };
  WithLiveUpdates.displayName = `WithLiveUpdates(${getDisplayName(WrappedComponent)})`;
  return WithLiveUpdates;
};

function getDisplayName<P>(WrappedComponent: React.ComponentType<P>) {
  return WrappedComponent.displayName || (WrappedComponent as any).name || 'Component';
}

/**
 * Live Updates Button Component
 */
interface LiveUpdatesButtonProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  onToggle: () => void;
}

export const LiveUpdatesButton: React.FC<LiveUpdatesButtonProps> = ({
  isConnected,
  lastUpdate,
  onToggle,
}) => {
  let timeDisplay = null;
  if (lastUpdate) {
    const spanProps = {
      style: { marginLeft: 8 }
    };
    const timeText = 'Updated ' + lastUpdate.toLocaleTimeString();
    timeDisplay = React.createElement('span', spanProps, timeText);
  }

  const content = isConnected ? 'Live' : 'Paused';
  const icon = isConnected ? React.createElement(WifiOutlined) : React.createElement(SyncOutlined);

  const buttonProps = {
    type: (isConnected ? 'primary' : 'default') as any,
    icon: icon,
    onClick: onToggle,
  };

  const badgeProps = {
    status: (isConnected ? 'processing' : 'default') as any,
    dot: isConnected,
  };

  const button = React.createElement(Button, buttonProps, content, timeDisplay);
  return React.createElement(Badge, badgeProps, button);
};
