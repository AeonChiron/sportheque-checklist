// Historique des quarts. Chaque téléphone garde ses propres quarts (six
// semaines). Avec le serveur du site (Netlify, comptes), chaque quart
// enregistré y est aussi envoyé, et toute l'équipe voit le même historique;
// sinon (GitHub Pages, démo), on reste discrètement en mode local. Un envoi
// raté (pas de réseau, session expirée) est gardé en file et renvoyé plus tard.

import { session, request, ns } from './auth.js';
import { sanitizeShift, mergeShift, combineDay, recentShifts } from './board-shape.js';

const LOCAL = 'gym-board-local';
const QUEUE = 'gym-board-queue';
const KEEP_DAYS = 730; // deux ans dans l'historique de ce téléphone (les résumés sont petits)
const CODE = /^[A-Za-z0-9_-]{1,40000}$/;

const readJSON = (k, fallback) => { try { return JSON.parse(localStorage.getItem(ns(k))) ?? fallback; } catch { return fallback; } };
const writeJSON = (k, v) => { try { localStorage.setItem(ns(k), JSON.stringify(v)); } catch { /* mode privé */ } };

function readLocal() { return readJSON(LOCAL, {}); }
function writeLocal(all) {
  const dates = Object.keys(all).sort().slice(-KEEP_DAYS);
  writeJSON(LOCAL, Object.fromEntries(dates.map((d) => [d, all[d]])));
}

const shared = () => session.mode === 'accounts';

function keepLocal(shift, code) {
  const all = readLocal();
  all[shift.date] = mergeShift(all[shift.date] || [], CODE.test(code || '') ? { ...shift, code } : shift);
  writeLocal(all);
}

const post = (shift) => request('board', { method: 'POST', body: shift });
// 404/405 : pas de serveur ici; 400/409 : refusé (invalide, ou modifié après minuit) — rien à renvoyer.
const absent = (err) => [400, 404, 405, 409].includes(err?.status);

// Renvoie les quarts restés en file (appelé au démarrage et au retour du réseau).
export async function flushQueue() {
  if (!shared() || !session.token) return;
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
  if (!shared()) return 'local';
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
  if (!shared()) return { live: false, days };
  try {
    const res = await request(`board?dates=${dates.join(',')}`);
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
  if (!shared()) return { live: false, shifts: recentShifts({}, local, n) };
  try {
    const res = await request(`board?recent=${n}`);
    const remote = Object.fromEntries(Object.entries(res?.days || {}).map(([d, list]) => [d, (Array.isArray(list) ? list : []).map(sanitizeShift).filter(Boolean)]));
    return { live: true, shifts: recentShifts(remote, local, n) };
  } catch {
    return { live: false, shifts: recentShifts({}, local, n) };
  }
}
