// Démarrage : d'abord remettre ce que Safari aurait effacé (js/keep.js), puis l'app.
import { ready } from './keep.js';
import { CONFIG } from './config.js';

// Rapports de plantage (Sentry) : seulement si un DSN est réglé dans js/config.js.
// Pour aider, pas surveiller : aucun nom, courriel, adresse IP ni texte tapé n'est envoyé.
if (CONFIG.sentryDsn && !/^(localhost|127\.)/.test(location.hostname)) {
  const s = document.createElement('script');
  s.src = 'https://browser.sentry-cdn.com/8.55.0/bundle.min.js';
  s.crossOrigin = 'anonymous';
  s.onload = () => {
    try {
      window.Sentry.init({
        dsn: CONFIG.sentryDsn,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        release: document.querySelector('meta[name="app-version"]')?.content || undefined,
        beforeSend(event) {
          delete event.user;
          if (event.request) { delete event.request.cookies; delete event.request.headers; }
          return event;
        },
        beforeBreadcrumb: (b) => (b.category === 'ui.input' || b.category === 'console' ? null : b),
      });
    } catch { /* jamais bloquant */ }
  };
  document.head.append(s);
}

try { await ready; } catch { /* l'app démarre quand même */ }
await import('./app.js');
