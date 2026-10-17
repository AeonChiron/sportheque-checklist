// Tableau partagé de l'Aperçu (Netlify Functions + Netlify Blobs, gratuits).
// GET  /api/board?dates=AAAA-MM-JJ,…  → les quarts envoyés ces jours-là (une semaine)
// GET  /api/board?date=AAAA-MM-JJ     → un seul jour (anciennes versions du site)
// POST /api/board                     → ajoute ou remplace un quart
// Sur GitHub Pages cette fonction n'existe pas : le site passe alors en
// mode « plan du jour » sans rien casser.

import { getStore } from '@netlify/blobs';
import { sanitizeShift, mergeShift, parseDates } from '../../js/board-shape.js';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export default async (req) => {
  const store = getStore('board');
  if (req.method === 'GET') {
    const params = new URL(req.url).searchParams;
    if (params.has('dates')) {
      const dates = parseDates(params.get('dates'));
      if (!dates.length) return json({ error: 'dates' }, 400);
      const lists = await Promise.all(dates.map((d) => store.get(d, { type: 'json' })));
      return json({ days: Object.fromEntries(dates.map((d, i) => [d, lists[i] || []])) });
    }
    const date = params.get('date') || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'date' }, 400);
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
