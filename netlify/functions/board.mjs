// Historique partagé des quarts (Netlify Functions + Netlify Blobs, gratuits).
// GET  /api/board?recent=40                → les derniers quarts enregistrés, par jour
// GET  /api/board?dates=AAAA-MM-JJ,…       → les quarts de ces jours-là (une semaine)
// GET  /api/board?date=AAAA-MM-JJ          → un seul jour (anciennes versions du site)
// POST /api/board                          → ajoute ou remplace un quart
// Ouvert à toutes les origines : le site sur GitHub Pages peut aussi s'en servir
// (CONFIG.boardEndpoint = 'https://<site>.netlify.app/api/board').

import { getStore } from '@netlify/blobs';
import { sanitizeShift, mergeShift, parseDates } from '../../js/board-shape.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...CORS } });
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const store = getStore('board');
  if (req.method === 'GET') {
    const params = new URL(req.url).searchParams;
    if (params.has('recent')) {
      // Les jours les plus récents d'abord, jusqu'à avoir assez de quarts (au plus 45 jours).
      const want = Math.min(Math.max(Number(params.get('recent')) || 40, 1), 120);
      const { blobs } = await store.list();
      const dates = blobs.map((b) => b.key).filter((k) => DATE.test(k)).sort().reverse().slice(0, 45);
      const days = {};
      let n = 0;
      for (const d of dates) {
        days[d] = (await store.get(d, { type: 'json' })) || [];
        n += days[d].length;
        if (n >= want) break;
      }
      return json({ days });
    }
    if (params.has('dates')) {
      const dates = parseDates(params.get('dates'));
      if (!dates.length) return json({ error: 'dates' }, 400);
      const lists = await Promise.all(dates.map((d) => store.get(d, { type: 'json' })));
      return json({ days: Object.fromEntries(dates.map((d, i) => [d, lists[i] || []])) });
    }
    const date = params.get('date') || '';
    if (!DATE.test(date)) return json({ error: 'date' }, 400);
    return json({ shifts: (await store.get(date, { type: 'json' })) || [] });
  }
  if (req.method === 'POST') {
    const text = await req.text();
    if (text.length > 60_000) return json({ error: 'size' }, 413);
    let shift;
    try { shift = sanitizeShift(JSON.parse(text)); } catch { shift = null; }
    if (!shift) return json({ error: 'invalid' }, 400);
    const list = (await store.get(shift.date, { type: 'json' })) || [];
    await store.setJSON(shift.date, mergeShift(list, shift));
    return json({ ok: true });
  }
  return json({ error: 'method' }, 405);
};

export const config = { path: '/api/board' };
