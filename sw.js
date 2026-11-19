// 薪动 service worker — cache-first for app shell, network-first for navigations.
const CACHE = 'xindong-v379';
const SHELL = [
  './',
  './index.html',
  './assets/css/app.css?v=20261125q',
  './assets/js/salary-engine.js?v=20261125q',
  './assets/js/app.js?v=20261125q',
  './assets/js/deep-link.js?v=20261125q',
  './assets/img/favicon.svg',
  './assets/img/piggy.webp',
  './site.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('xindong-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => caches.open(CACHE))
      .then((cache) => cache.keys().then((reqs) => Promise.all(
        reqs.filter((r) => new URL(r.url).hostname !== 'api.frankfurter.dev'
          && !SHELL.some((p) => r.url.endsWith(p.replace('./', '/')))).map((r) => cache.delete(r))
      )))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Frankfurter rates: network-first, cache the last good response so
  // currency conversion keeps working offline.
  if (url.hostname === 'api.frankfurter.dev') {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  if (url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
