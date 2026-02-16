const CACHE_NAME = 'xquantoria-v1';
const STATIC_CACHE = 'xquantoria-static-v1';
const DYNAMIC_CACHE = 'xquantoria-dynamic-v1';
const IMAGE_CACHE = 'xquantoria-images-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

const CACHE_STRATEGIES = {
  networkFirst: [
    '/api/',
  ],
  cacheFirst: [
    '/media/',
    '/storage/',
  ],
  staleWhileRevalidate: [
    '/blog/',
    '/category/',
    '/tag/',
  ],
};

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  (self as any).skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.includes('xquantoria'))
          .map((name) => caches.delete(name))
      );
    })
  );
  (self as any).clients.claim();
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

function isApiRequest(url: URL): boolean {
  return url.pathname.startsWith('/api/');
}

function isImageRequest(url: URL): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
  return imageExtensions.some((ext) => url.pathname.toLowerCase().endsWith(ext));
}

function isStaticAsset(url: URL): boolean {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some((ext) => url.pathname.toLowerCase().endsWith(ext));
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'Please check your connection' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function cacheFirst(request: Request, cacheName: string = DYNAMIC_CACHE): Promise<Response> {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      caches.open(DYNAMIC_CACHE).then((cache) => {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  }).catch(() => {
    return caches.match('/offline.html') as Promise<Response>;
  });
  
  return cachedResponse || fetchPromise;
}

self.addEventListener('message', (event: MessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    (self as any).skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options: NotificationOptions = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  };
  
  event.waitUntil(
    (self as any).registration.showNotification(data.title || 'XQuantoria', options)
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    (self as any).clients.matchAll({ type: 'window' }).then((clientList: any[]) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      return (self as any).clients.openWindow(url);
    })
  );
});

self.addEventListener('backgroundsync', (event: any) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
  
  if (event.tag === 'sync-media') {
    event.waitUntil(syncMedia());
  }
});

async function syncPosts(): Promise<void> {
  try {
    const pendingPosts = await getPendingData('pending-posts');
    
    for (const post of pendingPosts) {
      await fetch('/api/v1/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      });
    }
    
    await clearPendingData('pending-posts');
  } catch (error) {
    console.error('Sync posts failed:', error);
  }
}

async function syncMedia(): Promise<void> {
  try {
    const pendingMedia = await getPendingData('pending-media');
    
    for (const media of pendingMedia) {
      const formData = new FormData();
      formData.append('file', media.file);
      
      await fetch('/api/v1/media', {
        method: 'POST',
        body: formData,
      });
    }
    
    await clearPendingData('pending-media');
  } catch (error) {
    console.error('Sync media failed:', error);
  }
}

async function getPendingData(storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('xquantoria-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function clearPendingData(storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('xquantoria-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}

export {};
