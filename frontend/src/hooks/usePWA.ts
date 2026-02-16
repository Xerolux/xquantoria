import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAStatus {
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function usePWA(): {
  status: PWAStatus;
  install: () => Promise<boolean>;
  update: () => void;
  prompt: BeforeInstallPromptEvent | null;
} {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<PWAStatus>({
    isInstalled: false,
    isStandalone: false,
    canInstall: false,
    isOnline: true,
    hasUpdate: false,
    registration: null,
  });

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setStatus((prev) => ({
      ...prev,
      isStandalone,
      isInstalled: isStandalone,
      isOnline: navigator.onLine,
    }));

    const handleOnline = () => setStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setStatus((prev) => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          setStatus((prev) => ({ ...prev, registration }));

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setStatus((prev) => ({ ...prev, hasUpdate: true }));
                }
              });
            }
          });
        })
        .catch(console.error);
    }
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!prompt) return false;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;

      if (outcome === 'accepted') {
        setPrompt(null);
        setStatus((prev) => ({
          ...prev,
          canInstall: false,
          isInstalled: true,
        }));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  }, [prompt]);

  const update = useCallback(() => {
    if (status.registration?.waiting) {
      status.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [status.registration]);

  return { status, install, update, prompt };
}

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setRegistration(reg);
          console.log('Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          setError(err);
          console.error('Service Worker registration failed:', err);
        });
    }
  }, []);

  const unregister = useCallback(async () => {
    if (registration) {
      await registration.unregister();
      setRegistration(null);
    }
  }, [registration]);

  const update = useCallback(async () => {
    if (registration) {
      await registration.update();
    }
  }, [registration]);

  return { registration, error, unregister, update };
}

export function usePushNotifications() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  const subscribe = useCallback(async (vapidPublicKey: string): Promise<PushSubscription | null> => {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(sub);
      return sub;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      return true;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      return false;
    }
  }, [subscription]);

  return {
    subscription,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function useOfflineStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('Offline storage error:', error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error('Offline storage removal error:', error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

export function useBackgroundSync() {
  const [pendingActions, setPendingActions] = useState<Array<() => Promise<void>>>([]);

  useEffect(() => {
    const handleOnline = async () => {
      for (const action of pendingActions) {
        try {
          await action();
        } catch (error) {
          console.error('Background sync action failed:', error);
        }
      }
      setPendingActions([]);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pendingActions]);

  const queueAction = useCallback((action: () => Promise<void>) => {
    if (navigator.onLine) {
      action();
    } else {
      setPendingActions((prev) => [...prev, action]);
    }
  }, []);

  return { queueAction, pendingCount: pendingActions.length };
}
