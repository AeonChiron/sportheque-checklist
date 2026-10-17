// Tableau de l'Aperçu. Chaque téléphone garde ses propres quarts envoyés;
// si l'hébergement offre /api/board (Netlify), tout le monde partage le même
// tableau. Sinon, on reste discrètement en mode « plan du jour ».

import { CONFIG } from './config.js';
import { sanitizeShift, mergeShift } from './board-shape.js';

const LOCAL = 'gym-board-local';
const KEEP_DAYS = 14;

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL)) || {}; } catch { return {}; }
}
function writeLocal(all) {
  const dates = Object.keys(all).sort().slice(-KEEP_DAYS);
  try { localStorage.setItem(LOCAL, JSON.stringify(Object.fromEntries(dates.map((d) => [d, all[d]])))); } catch { /* mode privé */ }
}

async function call(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function publishShift(raw) {
  const shift = sanitizeShift(raw);
  if (!shift) return false;
  const all = readLocal();
  all[shift.date] = mergeShift(all[shift.date] || [], shift);
  writeLocal(all);
  if (!CONFIG.boardEndpoint) return false;
  try {
    await call(CONFIG.boardEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shift) });
    return true;
  } catch {
    return false; // pas de tableau partagé ici : le local suffit
  }
}

export async function loadBoard(date) {
  const local = readLocal()[date] || [];
  if (!CONFIG.boardEndpoint) return { live: false, shifts: local };
  try {
    const { shifts } = await call(`${CONFIG.boardEndpoint}?date=${encodeURIComponent(date)}`);
    const merged = local.reduce((list, s) => mergeShift(list, s), Array.isArray(shifts) ? shifts : []);
    return { live: true, shifts: merged };
  } catch {
    return { live: false, shifts: local };
  }
}
