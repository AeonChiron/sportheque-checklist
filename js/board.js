// Historique des quarts. Chaque téléphone garde ses propres quarts (six
// semaines). Si l'hébergement offre /api/board (Netlify), chaque quart
// enregistré y est aussi envoyé, et tout le monde voit le même historique;
// sinon, on reste discrètement en mode local. Un envoi raté (pas de réseau)
// est gardé en file et renvoyé plus tard, tout seul.

import { CONFIG } from './config.js';
import { sanitizeShift, mergeShift, combineDay, recentShifts } from './board-shape.js';

const LOCAL = 'gym-board-local';
const QUEUE = 'gym-board-queue';
const KEEP_DAYS = 42; // six semaines dans l'historique de ce téléphone
const CODE = /^[A-Za-z0-9_-]{1,40000}$/;

const readJSON = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* mode privé */ } };

function readLocal() { return readJSON(LOCAL, {}); }
function writeLocal(all) {
  const dates = Object.keys(all).sort().slice(-KEEP_DAYS);
  writeJSON(LOCAL, Object.fromEntries(dates.map((d) => [d, all[d]])));
}

async function call(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw Object.assign(new Error(String(r.status)), { status: r.status });
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function keepLocal(shift, code) {
  const all = readLocal();
  all[shift.date] = mergeShift(all[shift.date] || [], CODE.test(code || '') ? { ...shift, code } : shift);
  writeLocal(all);
}

const post = (shift) => call(CONFIG.boardEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shift) });

// 404 : cet hébergement n'a pas d'historique partagé (GitHub Pages, par
// exemple). Ce n'est pas une panne de réseau : rien à renvoyer plus tard.
const absent = (err) => err?.status === 404 || err?.status === 405;

// Renvoie les quarts restés en file (appelé au démarrage et au retour du réseau).
export async function flushQueue() {
  if (!CONFIG.boardEndpoint) return;
  const queue = readJSON(QUEUE, []);
  if (!queue.length) return;
  const left = [];
  for (const shift of queue) {
    try { await post(shift); } catch (err) { if (!absent(err)) left.push(shift); }
  }
  writeJSON(QUEUE, left);
}

// Enregistre un quart. Réponse : 'shared' (dans l'historique de tous),
// 'queued' (gardé ici, sera envoyé au retour du réseau) ou 'local'
// (pas d'historique partagé sur cet hébergement).
export async function publishShift(raw, code = '') {
  const shift = sanitizeShift(raw);
  if (!shift) return 'local';
  keepLocal(shift, code);
  if (!CONFIG.boardEndpoint) return 'local';
  try {
    await post(shift);
    return 'shared';
  } catch (err) {
    if (absent(err)) return 'local';
    writeJSON(QUEUE, [...readJSON(QUEUE, []).filter((s) => !(s.date === shift.date && s.shift === shift.shift && s.name === shift.name)), shift]);
    return 'queued';
  }
}

// Rapport ouvert depuis un ancien courriel : il s'ajoute à l'historique de ce téléphone.
export function keepReport(raw, code) {
  const shift = sanitizeShift(raw);
  if (shift) keepLocal(shift, code);
}

// Une semaine d'un coup : { live, days: { date: [quarts] } }.
export async function loadWeek(dates) {
  const all = readLocal();
  const days = Object.fromEntries(dates.map((d) => [d, combineDay([], all[d] || [])]));
  if (!CONFIG.boardEndpoint) return { live: false, days };
  try {
    const res = await call(`${CONFIG.boardEndpoint}?dates=${dates.join(',')}`);
    for (const d of dates) {
      const remote = (Array.isArray(res?.days?.[d]) ? res.days[d] : []).map(sanitizeShift).filter(Boolean);
      days[d] = combineDay(remote, all[d] || []);
    }
    return { live: true, days };
  } catch {
    return { live: false, days };
  }
}

// Les derniers quarts enregistrés, du plus récent au plus ancien : { live, shifts }.
export async function loadRecent(n = 40) {
  const local = readLocal();
  if (!CONFIG.boardEndpoint) return { live: false, shifts: recentShifts({}, local, n) };
  try {
    const res = await call(`${CONFIG.boardEndpoint}?recent=${n}`);
    const remote = Object.fromEntries(Object.entries(res?.days || {}).map(([d, list]) => [d, (Array.isArray(list) ? list : []).map(sanitizeShift).filter(Boolean)]));
    return { live: true, shifts: recentShifts(remote, local, n) };
  } catch {
    return { live: false, shifts: recentShifts({}, local, n) };
  }
}
