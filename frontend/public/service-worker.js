// Service Worker für Offline-Support und Caching
const CACHE_NAME = 'cms-v1';
const RUNTIME_CACHE = 'cms-runtime-v1';

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Cache API responses
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.addAll([
        '/api/v1/health',
      ]);
    })()
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const cachesToDelete = cacheNames.filter(
        (name) => name !== CACHE_NAME && name !== RUNTIME_CACHE
      );

      await Promise.all(
        cachesToDelete.map((name) => caches.delete(name))
      );
    })()
  );
  self.clients.claim();
});

// Fetch event - handle routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          throw error;
        }
      })()
    );
    return;
  }

  // Static assets - Stale While Revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      const fetchPromise = fetch(request).then((networkResponse) => {
        cache.put(request, networkResponse.clone());
        return networkResponse;
      });

      return cachedResponse || fetchPromise;
    })()
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

async function syncPosts() {
  // Sync posts that were edited offline
  const db = await openDB();
  const tx = db.transaction('offline-posts', 'readwrite');
  const store = tx.objectStore('offline-posts');

  const offlinePosts = await store.getAll();

  for (const post of offlinePosts) {
    try {
      await fetch('/api/v1/posts/' + post.id, {
        method: post.method || 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${post.token}`,
        },
        body: JSON.stringify(post.data),
      });

      // Remove synced post from offline storage
      await store.delete(post.id);
    } catch (error) {
      console.error('Failed to sync post:', error);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cms-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('offline-posts')) {
        const store = db.createObjectStore('offline-posts', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}
