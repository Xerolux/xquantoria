/// <reference types="vite-plugin-pwa/client" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching/cache';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Service Worker für Offline-Support und Caching
const CACHE_NAME = 'cms-v1';
const RUNTIME_CACHE = 'cms-runtime-v1';

// Install event - precache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Precache static assets
      await cleanupOutdatedCaches();
      await precacheAndRoute(self.__WB_MANIFEST);

      // Cache API responses
      await caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll([
          '/api/v1/health',
        ]);
      });
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload
      await clientsClaim();

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
});

// Fetch event - handle routing
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      new NetworkFirst({
        cacheName: RUNTIME_CACHE,
        networkTimeoutSeconds: 3,
      }).handle({ request })
    );
    return;
  }

  // Static assets - Cache First
  event.respondWith(
    new StaleWhileRevalidate({
      cacheName: CACHE_NAME,
    }).handle({ request })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event: any) => {
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

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cms-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('offline-posts')) {
        const store = db.createObjectStore('offline-posts', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

export {};
