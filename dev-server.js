// Serveur local : `npm run dev` puis ouvrir http://localhost:3000
// API (comptes, historique, signalements) simulée en mémoire.
// Ancienne option Resend : sans RESEND_API_KEY, écrit last-report.html.
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import handler from './api/send-report.js';
import { renderReportHtml, reportSubject } from './js/report.js';
import { createApi, memoryStores } from './netlify/lib/api.mjs';

// La même API que sur Netlify, avec un stockage en mémoire. Codes d'essai :
// TEAM_CODE=equipe, BOSS_CODE=patron (modifiables par variables d'environnement).
const api = createApi({
  getStore: memoryStores(),
  env: () => ({ TEAM_CODE: process.env.TEAM_CODE || 'equipe', BOSS_CODE: process.env.BOSS_CODE || 'patron' }),
});

const ROOT = new URL('.', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const PORT = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/') && url.pathname !== '/api/send-report') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks);
    const out = await api(new Request(`http://localhost${req.url}`, { method: req.method, headers: req.headers, body }));
    res.writeHead(out.status, Object.fromEntries(out.headers));
    return res.end(Buffer.from(await out.arrayBuffer()));
  }
  if (url.pathname === '/api/send-report') {
    let body = '';
    for await (const chunk of req) body += chunk;
    req.body = body;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
    if (!process.env.RESEND_API_KEY) {
      const { attachments = [], ...r } = JSON.parse(body);
      await writeFile(join(ROOT, 'last-report.html'), renderReportHtml(r));
      console.log(`[dev] Courriel simulé : « ${reportSubject(r)} », ${attachments.length} photo(s) → last-report.html`);
      return res.json({ ok: true, simulated: true });
    }
    return handler(req, res);
  }
  const path = normalize(join(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
  if (!path.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  try {
    let data = await readFile(path);
    if (process.env.DEMO && path.endsWith('/js/config.js')) data = Buffer.from(String(data).replace('demo: false', 'demo: true'));
    res.setHeader('Content-Type', TYPES[extname(path)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Introuvable');
  }
}).listen(PORT, () => console.log(`Checklist gym : http://localhost:${PORT}`));
