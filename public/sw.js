// Service Worker for Mining Command GPS Background Location Persistence
const CACHE_NAME = 'mining-gps-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for background sync or messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PING_GPS') {
    // Keep alive message from client
    event.ports[0]?.postMessage({ status: 'ACK' });
  }
});
