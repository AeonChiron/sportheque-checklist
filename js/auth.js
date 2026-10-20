// Comptes : on se connecte une fois, le téléphone s'en souvient (un jeton
// gardé dans localStorage, valide un an). Trois modes :
//   'accounts' : le serveur du site existe (Netlify) → connexion obligatoire;
//   'none'     : pas de serveur ici (GitHub Pages) → le site marche sans comptes;
//   'demo'     : démo publique → comptes simulés sur ce téléphone, rien n'est envoyé.

import { CONFIG } from './config.js';

const KEY = 'gym-auth';
const MODE = 'gym-auth-mode';
const DEMO_USERS = 'gym-demo-users';

export const session = { mode: 'none', user: null, token: '' };

// Visiteur : essaie l'app sans compte. Tout reste sur ce téléphone, dans un
// espace à part (clés « visit: »), et s'efface quand il quitte.
const VISITOR = (() => { try { return Boolean(JSON.parse(localStorage.getItem('gym-auth'))?.visitor); } catch { return false; } })();
const SHARED_KEYS = new Set(['gym-auth', 'gym-auth-mode', 'gym-shift-prefs']);
export const ns = (k) => (VISITOR && !SHARED_KEYS.has(k) ? `visit:${k}` : k);
export const isVisitor = () => Boolean(session.user?.visitor);
export const accounts = () => session.mode !== 'none';
export const isBoss = () => session.user?.role === 'boss';

const readJSON = (store, k) => { try { return JSON.parse(store.getItem(k)); } catch { return null; } };
function load() {
  try { return readJSON(localStorage, KEY) || readJSON(sessionStorage, KEY); } catch { return null; }
}
function keep(value, remember = true) {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    if (value) (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(value));
  } catch { /* mode privé */ }
}

// Appel au serveur du site, avec le jeton. Erreur : err.status (0 = pas de réseau).
export async function request(path, { method = 'GET', body, timeout = 8000, raw = false } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    let r;
    try {
      r = await fetch(`${CONFIG.api}/${path}`, {
        method,
        cache: 'no-store',
        signal: ctrl.signal,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error('network'), { status: 0 });
    }
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw Object.assign(new Error(e.error || String(r.status)), { status: r.status });
    }
    return raw ? r : await r.json();
  } finally {
    clearTimeout(timer);
  }
}

// Démarrage : on part tout de suite avec ce que le téléphone sait, puis on
// vérifie auprès du serveur; onChange() si la réponse change quelque chose.
export function initAuth(onChange) {
  const saved = load();
  if (saved?.visitor) {
    session.mode = 'demo';
    session.user = saved.user;
    return;
  }
  if (CONFIG.demo || !CONFIG.api) {
    session.mode = 'demo';
    session.user = saved?.demo ? saved.user : null;
    return;
  }
  session.token = saved?.token || '';
  session.user = saved?.user || null;
  let last = 'none';
  try { last = localStorage.getItem(MODE) || 'none'; } catch { /* ignore */ }
  session.mode = session.token ? 'accounts' : last;
  const before = `${session.mode}|${Boolean(session.user)}`;
  request('auth', { timeout: 6000 })
    .then(({ user }) => {
      session.mode = 'accounts';
      session.user = user;
      keep({ token: session.token, user, remember: saved?.remember !== false }, saved?.remember !== false);
    })
    .catch((err) => {
      if (err.status === 401) {
        session.mode = 'accounts';
        session.user = null;
        session.token = '';
        keep(null);
      } else if (err.status === 404 || err.status === 405) {
        session.mode = 'none'; // pas de serveur sur cet hébergement
        session.user = null;
      } // pas de réseau : on garde ce que le téléphone savait
    })
    .finally(() => {
      try { localStorage.setItem(MODE, session.mode); } catch { /* ignore */ }
      if (`${session.mode}|${Boolean(session.user)}` !== before) onChange?.();
    });
}

// action : 'signup' (name, email, password, role, code) ou 'login' (email, password).
export async function signIn(action, fields, remember = true) {
  const email = String(fields.email || '').trim().toLowerCase();
  if (session.mode === 'demo') {
    const all = readJSON(localStorage, DEMO_USERS) || {};
    if (action === 'signup') {
      if (!fields.name?.trim()) throw Object.assign(new Error('name'), { status: 400 });
      const role = fields.role === 'boss' ? 'boss' : 'employee';
      const name = fields.name.trim();
      all[email] = { name, email, role, alerts: role === 'boss' && configAlerts().some((x) => x.name.toLowerCase() === name.toLowerCase()) };
      try { localStorage.setItem(DEMO_USERS, JSON.stringify(all)); } catch { /* ignore */ }
    }
    const user = all[email];
    if (!user) throw Object.assign(new Error('login'), { status: 401 });
    session.user = user;
    keep({ demo: true, user }, remember);
    return user;
  }
  const { token, user } = await request('auth', { method: 'POST', body: { action, ...fields, email } });
  session.mode = 'accounts';
  session.token = token;
  session.user = user;
  keep({ token, user, remember }, remember);
  return user;
}

export function startVisitor(name) {
  keep({ visitor: true, user: { name, email: 'visiteur', role: 'employee', visitor: true } });
}
function clearVisitor() {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('visit:')) localStorage.removeItem(k); } catch { /* ignore */ }
}

export async function signOut() {
  if (session.user?.visitor) clearVisitor();
  if (session.mode === 'accounts' && session.token) {
    try { await request('auth', { method: 'POST', body: { action: 'logout' }, timeout: 4000 }); } catch { /* le jeton s'oublie quand même */ }
  }
  session.token = '';
  session.user = null;
  keep(null);
}

// L'équipe (superviseurs). En démo : les comptes simulés de ce téléphone.
export async function listTeam() {
  if (session.mode === 'demo') return Object.values(readJSON(localStorage, DEMO_USERS) || {});
  return (await request('users')).users;
}
export async function teamAction(action, email, extra = {}) {
  if (session.mode === 'demo') {
    if (action === 'remove') {
      const all = readJSON(localStorage, DEMO_USERS) || {};
      delete all[email];
      try { localStorage.setItem(DEMO_USERS, JSON.stringify(all)); } catch { /* ignore */ }
    }
    return;
  }
  await request('users', { method: 'POST', body: { action, email, ...extra } });
}

// Courriels des problèmes urgents : qui les reçoit (nom + adresse).
// Par défaut : les superviseurs marqués alerts dans la config (Daniel).
const configAlerts = () => (CONFIG.supervisors || []).filter((x) => x.alerts).map((x) => ({ name: x.name, email: x.email || '' }));
export async function alertRecipients() {
  if (session.mode === 'accounts') {
    try {
      const { to } = await request('alerts', { timeout: 5000 });
      if (to.length) return to;
    } catch { /* hors ligne : la config */ }
  }
  if (session.mode === 'demo') {
    const all = Object.values(readJSON(localStorage, DEMO_USERS) || {}).filter((u) => u.role === 'boss' && u.alerts);
    const names = new Set(all.map((u) => u.name.toLowerCase()));
    return [...configAlerts().filter((x) => !names.has(x.name.toLowerCase())), ...all.map((u) => ({ name: u.name, email: '' }))];
  }
  return configAlerts();
}

// Un superviseur s'abonne (ou se désabonne) aux courriels urgents.
export async function setAlerts(on) {
  if (session.mode === 'demo') {
    const all = readJSON(localStorage, DEMO_USERS) || {};
    const me = all[session.user.email];
    if (me) me.alerts = on;
    try { localStorage.setItem(DEMO_USERS, JSON.stringify(all)); } catch { /* ignore */ }
    session.user = { ...session.user, alerts: on };
  } else {
    session.user = (await request('auth', { method: 'POST', body: { action: 'alerts', on } })).user;
  }
  const saved = load();
  if (saved) keep({ ...saved, user: session.user }, saved.remember !== false);
  return session.user;
}
