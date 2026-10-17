// Serveur local : `npm run dev` puis ouvrir http://localhost:3000
// Sans RESEND_API_KEY, le courriel n'est pas envoyé : il est écrit dans
// last-report.html pour vérification.
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import handler from './api/send-report.js';
import { renderReportHtml, reportSubject } from './js/report.js';
import { sanitizeShift, mergeShift, parseDates } from './js/board-shape.js';

// Tableau partagé simulé en mémoire (comme la fonction Netlify).
const board = new Map();

const ROOT = new URL('.', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const PORT = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/board') {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && url.searchParams.has('dates')) {
      return res.end(JSON.stringify({ days: Object.fromEntries(parseDates(url.searchParams.get('dates')).map((d) => [d, board.get(d) || []])) }));
    }
    if (req.method === 'GET') return res.end(JSON.stringify({ shifts: board.get(url.searchParams.get('date')) || [] }));
    let body = '';
    for await (const chunk of req) body += chunk;
    const shift = sanitizeShift(JSON.parse(body || 'null'));
    if (!shift) { res.statusCode = 400; return res.end('{"error":"invalid"}'); }
    board.set(shift.date, mergeShift(board.get(shift.date) || [], shift));
    return res.end('{"ok":true}');
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
