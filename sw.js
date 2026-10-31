// Service Worker: hält die App offline verfügbar und merkt sich Cover-Bilder.
const VERSION = 'inventar-v13';
const SHELL = ['./', './index.html', './app.js', './html5-qrcode.min.js', './pocketbase.umd.js', './manifest.webmanifest',
  './icon-192.png', './logo.png', './logo-dark.png', './icon-512.png', './apple-touch-icon.png'];
const COVERS = 'inventar-covers';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== VERSION && k !== COVERS).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Eigene Dateien: erst Cache, dann Netz
  // Server-Schnittstelle nie aus dem Cache bedienen
  if (url.pathname.startsWith('/api/')) return;

  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match('./index.html'))));
    return;
  }

  // Cover-Bilder: einmal laden, dann aus dem Cache
  if (req.destination === 'image') {
    e.respondWith(caches.open(COVERS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
  }
  // Buchdatenbank-Abfragen gehen immer direkt ins Netz.
});
