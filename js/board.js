// Tableau de l'Aperçu et dossier des rapports. Chaque téléphone garde ses
// propres quarts envoyés (et les rapports ouverts depuis un courriel, avec le
// rapport complet); si l'hébergement offre /api/board (Netlify), tout le
// monde partage aussi le résumé de chaque quart. Sinon, on reste
// discrètement en mode local.

import { CONFIG } from './config.js';
import { sanitizeShift, mergeShift, combineDay } from './board-shape.js';

const LOCAL = 'gym-board-local';
const KEEP_DAYS = 42; // six semaines dans le dossier de ce téléphone
const CODE = /^[A-Za-z0-9_-]{1,40000}$/;

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

// Le rapport complet (code du lien #r=) reste sur ce téléphone seulement :
// le tableau partagé ne reçoit que les statuts et les problèmes.
function keepLocal(shift, code) {
  const all = readLocal();
  all[shift.date] = mergeShift(all[shift.date] || [], CODE.test(code || '') ? { ...shift, code } : shift);
  writeLocal(all);
}

export async function publishShift(raw, code = '') {
  const shift = sanitizeShift(raw);
  if (!shift) return false;
  keepLocal(shift, code);
  if (!CONFIG.boardEndpoint) return false;
  try {
    await call(CONFIG.boardEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shift) });
    return true;
  } catch {
    return false; // pas de tableau partagé ici : le local suffit
  }
}

// Rapport ouvert depuis un courriel : il s'ajoute au dossier de ce téléphone.
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
