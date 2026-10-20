// Garde l'app utilisable sans réseau (sous-sol, Wi-Fi faible).
// Réseau d'abord, cache en secours; l'API n'est jamais mise en cache.
const CACHE = 'quart-gym-v111';
const SHELL = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/config.js', 'js/manual.js', 'js/planner.js', 'js/report.js', 'js/photos.js', 'js/i18n.js', 'js/illustrations.js', 'js/board.js', 'js/board-shape.js', 'js/auth.js', 'js/problems.js', 'js/problem-shape.js', 'js/pool.js', 'js/fx.js', 'js/clock.js', 'js/avatars.js', 'icons/avatars/lapin.webp', 'icons/avatars/salut.webp', 'icons/avatars/coucou.webp', 'icons/avatars/ours.webp', 'icons/avatars/renard.webp', 'icons/avatars/chat.webp', 'icons/avatars/faon.webp', 'icons/avatars/souris.webp', 'icons/rabbit.svg', 'icons/rabbit-hello.svg', 'icons/rabbit-cheer.svg', 'icons/rabbit-rest.svg', 'js/gym3d.js', 'js/floor-layout.js', 'fonts/fraunces-latin-full-normal.woff2', 'fonts/saira-semi-condensed-latin-300-normal.woff2', 'fonts/saira-semi-condensed-latin-500-normal.woff2', 'fonts/saira-semi-condensed-latin-600-normal.woff2', 'fonts/saira-semi-condensed-latin-700-normal.woff2', 'icons/logo-sportheque.png', 'icons/logo-sportheque-dark.png', 'icons/mark-sportheque.png', 'icons/mark-sportheque-dark.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    // no-cache : toujours demander la dernière version (GitHub dit « garde 10 min », on ne l'écoute pas).
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
