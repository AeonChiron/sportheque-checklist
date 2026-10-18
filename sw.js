// Garde l'app utilisable sans réseau (sous-sol, Wi-Fi faible).
// Réseau d'abord, cache en secours; l'API n'est jamais mise en cache.
const CACHE = 'quart-gym-v27';
const SHELL = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/config.js', 'js/manual.js', 'js/planner.js', 'js/report.js', 'js/photos.js', 'js/i18n.js', 'js/illustrations.js', 'js/board.js', 'js/board-shape.js', 'js/auth.js', 'js/problems.js', 'js/problem-shape.js', 'js/gym3d.js', 'js/floor-layout.js', 'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2', 'icons/logo-sportheque.png', 'icons/logo-sportheque-dark.png', 'icons/mark-sportheque.png', 'icons/mark-sportheque-dark.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
