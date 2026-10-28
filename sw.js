// Garde l'app utilisable sans réseau (sous-sol, Wi-Fi faible), avec Workbox (Google).
// - Chaque fichier de l'app est gardé avec une empreinte : quand un fichier change, seul lui
//   est retéléchargé. Plus besoin de changer un numéro de version à la main.
// - En ligne : toujours la dernière version (réseau d'abord, 4 s max sur un Wi-Fi faible).
// - Hors ligne : la copie gardée. L'API n'est jamais mise en cache.
// - Les notifications (rappel de quart, problème urgent) arrivent ici.
// Ce fichier est généré : modifier sw.src.js puis lancer `npm run sw`.
import { precache, matchPrecache, cleanupOutdatedCaches } from './vendor/workbox/workbox-precaching/index.js';
import { registerRoute } from './vendor/workbox/workbox-routing/index.js';
import { NetworkFirst } from './vendor/workbox/workbox-strategies/index.js';
import { clientsClaim } from './vendor/workbox/workbox-core/index.js';

const MANIFEST = [{"url":"fonts/fraunces-latin-full-normal.woff2","revision":"9a1814381455"},
  {"url":"fonts/saira-semi-condensed-latin-300-normal.woff2","revision":"c293d511bde1"},
  {"url":"fonts/saira-semi-condensed-latin-500-normal.woff2","revision":"a676f503a804"},
  {"url":"fonts/saira-semi-condensed-latin-600-normal.woff2","revision":"16d5d3eec1fe"},
  {"url":"fonts/saira-semi-condensed-latin-700-normal.woff2","revision":"ef86dd42eb0e"},
  {"url":"icons/avatars/chat.webp","revision":"c9f64268fd1e"},
  {"url":"icons/avatars/coucou.webp","revision":"fb4dc98550f1"},
  {"url":"icons/avatars/faon.webp","revision":"8161bbb65108"},
  {"url":"icons/avatars/lapin.webp","revision":"1eab356a4c82"},
  {"url":"icons/avatars/ours.webp","revision":"0d24e673d22c"},
  {"url":"icons/avatars/renard.webp","revision":"83bdd9340aa2"},
  {"url":"icons/avatars/salut.webp","revision":"df0dabd8798f"},
  {"url":"icons/avatars/souris.webp","revision":"ef1c91717a5d"},
  {"url":"icons/icon-180.png","revision":"efe899ddbedb"},
  {"url":"icons/icon.svg","revision":"d8aec5620b10"},
  {"url":"icons/logo-sportheque-dark.png","revision":"96c2ab6cec3f"},
  {"url":"icons/logo-sportheque.png","revision":"552c69e69e2f"},
  {"url":"icons/mark-sportheque-dark.png","revision":"a350d6431778"},
  {"url":"icons/mark-sportheque.png","revision":"5a977fa0a637"},
  {"url":"icons/rabbit-cheer.svg","revision":"995e8afb46a3"},
  {"url":"icons/rabbit-hello.svg","revision":"56f2df52dd73"},
  {"url":"icons/rabbit-rest.svg","revision":"38b94e634be1"},
  {"url":"icons/rabbit.svg","revision":"e23c8e5bcb2a"},
  {"url":"index.html","revision":"90bc93c647c8"},
  {"url":"js/app.js","revision":"7b3d7302b462"},
  {"url":"js/auth.js","revision":"30affe1946a9"},
  {"url":"js/avatars.js","revision":"6a1e3a290665"},
  {"url":"js/board-shape.js","revision":"e8d853425827"},
  {"url":"js/board.js","revision":"82773c88fbd7"},
  {"url":"js/boot.js","revision":"b6b051714bfc"},
  {"url":"js/clock.js","revision":"bc0be64ddbfb"},
  {"url":"js/config.js","revision":"b6f2e28fde88"},
  {"url":"js/fictive.js","revision":"ea204d2d6c18"},
  {"url":"js/floor-layout.js","revision":"929d6d428978"},
  {"url":"js/fx.js","revision":"33d93128488e"},
  {"url":"js/gym3d.js","revision":"613145263544"},
  {"url":"js/holidays.js","revision":"b3a52a4f2385"},
  {"url":"js/i18n.js","revision":"38e3e5ddb6db"},
  {"url":"js/illustrations.js","revision":"c6c8e281c2b5"},
  {"url":"js/keep.js","revision":"7c020b6864e5"},
  {"url":"js/manual.js","revision":"af0d644cfa96"},
  {"url":"js/method.js","revision":"e5f76b420bc8"},
  {"url":"js/motion.js","revision":"10159b3a61e9"},
  {"url":"js/photos.js","revision":"634bb13011cd"},
  {"url":"js/planner.js","revision":"8fef688fa974"},
  {"url":"js/pool.js","revision":"0303498b4ba3"},
  {"url":"js/problem-shape.js","revision":"f77b5beed108"},
  {"url":"js/problems.js","revision":"3c78c9fb8001"},
  {"url":"js/puzzle.js","revision":"66b64ebb5f79"},
  {"url":"js/report.js","revision":"64c1b79ed61b"},
  {"url":"js/updates.js","revision":"385b398498e2"},
  {"url":"manifest.webmanifest","revision":"d46c08bd92fd"},
  {"url":"styles.css","revision":"cec996b9e36f"},
  {"url":"vendor/auto-animate/index.js","revision":"ff3ed293e583"},
  {"url":"vendor/idb-keyval/index.js","revision":"e167d80cbf99"},
  {"url":"vendor/ios-haptics/index.js","revision":"086cbbd279e7"},
  {"url":"vendor/ios-haptics/utils.js","revision":"1de691d2d4a9"},
  {"url":"vendor/qrcode.js","revision":"639921a3f950"},
  {"url":"vendor/three.module.min.js","revision":"4d8e72afd963"}];

self.skipWaiting();
clientsClaim();
precache(MANIFEST);
cleanupOutdatedCaches();

// Les anciennes caches faites à la main (quart-gym-v117 et avant) partent.
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('quart-gym-')).map((k) => caches.delete(k)))));
});

const offline = {
  // Pas de réseau : la copie gardée du fichier, sinon la page d'accueil.
  handlerDidError: async ({ request }) => (await matchPrecache(request.url)) || (request.mode === 'navigate' ? matchPrecache('index.html') : undefined),
};
registerRoute(
  ({ request, url }) => request.method === 'GET' && url.origin === self.location.origin && !url.pathname.includes('/api/'),
  new NetworkFirst({ cacheName: 'quart-runtime', networkTimeoutSeconds: 4, fetchOptions: { cache: 'no-cache' }, plugins: [offline] }),
);

// ---------- Notifications ----------
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() }; }
  // L'app est ouverte : elle se met à jour tout de suite (et sonne la cloche douce pour une tâche ajoutée, Q76).
  // L'avis du téléphone reste, mais en silence quand l'app est à l'écran (sa propre cloche suffit).
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => {
    list.forEach((c) => c.postMessage({ type: 'push', tag: d.tag || '', bell: Boolean(d.bell) }));
    const seen = list.some((c) => c.visibilityState === 'visible');
    return self.registration.showNotification(d.title || 'Sporthèque', {
      body: d.body || '', tag: d.tag || undefined, renotify: Boolean(d.tag) && !(seen && d.bell), silent: seen && Boolean(d.bell), // seulement la tâche ajoutée : l'app ouverte sonne sa cloche
      icon: 'icons/icon-180.png', badge: 'icons/icon-180.png', data: { url: d.url || './' },
    });
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    if (open) { open.navigate?.(target).catch(() => {}); return open.focus(); }
    return self.clients.openWindow(target);
  }));
});
