// Caches the whole game so it opens instantly and works offline.
const CACHE = 'holdout-v2';
const FILES = ['./', 'index.html', 'style.css', 'game.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png', 'sprites.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network first so updates arrive; fall back to cache offline.
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
