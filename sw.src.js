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

const MANIFEST = self.__WB_MANIFEST;

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
