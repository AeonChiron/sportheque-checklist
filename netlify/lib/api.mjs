// Le serveur du site (Netlify Functions + Netlify Blobs, gratuits) : comptes,
// historique des quarts, signalements. Aucune base de données externe.
//
//   /api/auth      GET → l'utilisateur connecté · POST { action: signup | login | logout | alerts }
//   /api/alerts    connecté : GET qui reçoit les courriels des problèmes urgents
//   /api/users     superviseur : GET la liste · POST { action: reset | remove, email }
//   /api/board     connecté : GET ?recent=N | ?dates=… · POST un quart
//   /api/problems  connecté : POST un signalement (+ photos)
//                  superviseur : GET la liste · GET ?id= · GET ?photo= · POST { action: status }
//   /api/push      connecté : GET l'état · POST { action: subscribe | unsubscribe | prefs | ntfy | test }
//   /api/people    superviseur : notes privées et signalements d'un employé (l'employé ne les voit jamais)
//   /api/ideas     le coin des superviseurs (leurs messages) + les idées des employés
//                  Notifications (web-push) : rappel 10 min avant son quart, problème urgent
//                  pour les superviseurs. ntfy : une chaîne privée pour l'app gratuite ntfy.
//
// Les codes d'inscription viennent des variables d'environnement TEAM_CODE
// (employés) et BOSS_CODE (superviseurs) : jamais dans le code du site.
// Connexion : un jeton gardé sur le téléphone (« rester connecté », un an).

import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { sanitizeShift, mergeShift, parseDates } from '../../js/board-shape.js';
import { sanitizeProblem, problemId, PROBLEM_ID, MAX_PROBLEM_PHOTOS, CATEGORIES as CATEGORY_NAMES } from '../../js/problem-shape.js';
import { CONFIG } from '../../js/config.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...CORS } });
// Une vraie date (« 2026-13-40 » a la bonne forme mais n'existe pas).
const DATE = { test: (d) => { const x = String(d); if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return false; const ms = Date.parse(`${x}T12:00:00Z`); return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === x; } };
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const SESSION_DAYS = 365;
// Propriétaire (25 oct.) : un employé corrige ou efface son quart pendant 12 h après l'envoi;
// un superviseur corrige n'importe quel quart, sans limite; l'admin fait tout.
export const EDIT_HOURS = 12;
const LOGIN_MAX = 50; // 50 mauvais mots de passe → 24 h sans pouvoir se connecter (propriétaire)
const LOGIN_LOCK_MS = 24 * 3600e3;
const UNDO_HOURS = 12; // annuler son propre signalement
const MAX_PHOTO_BYTES = 900_000;

// Tâches faites / prévues d'un quart, comme l'app les compte : les tâches du plan seulement
// (sans le pointage ni les tâches « en plus » qui débordent du quart).
function shiftCount(s) {
  const items = s.items || [], pt = items.find((i) => i.id === 'pointage');
  if (Number.isFinite(s.total) && Number.isFinite(s.done) && s.total >= (pt ? 1 : 0)) { const total = s.total - (pt ? 1 : 0); return { done: Math.max(0, Math.min(total, s.done - (pt?.status === 'done' ? 1 : 0))), total }; }
  const it = items.filter((i) => i.id !== 'pointage');
  return { done: it.filter((i) => i.status === 'done').length, total: it.length };
}
const localDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
const PHOTO_DAYS = 90;
const sha = (s) => createHash('sha256').update(s).digest('hex');
const hashPassword = (password, salt) => scryptSync(password, salt, 32).toString('hex');
const sameText = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
// L'horaire de la semaine : { '0'..'6' (lundi = 0) : { start, end } } — suit la personne d'un téléphone à l'autre.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
function cleanSchedule(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) if (/^[0-6]$/.test(k) && v && HHMM.test(v.start) && HHMM.test(v.end)) out[k] = { start: v.start, end: v.end };
  return out;
}
// Trois rôles : employé, superviseur, admin (la personne qui teste et règle le site; elle a tout ce qu'un superviseur a).
const lead = (u) => u?.role === 'boss' || u?.role === 'admin';
// Photo de profil : une mascotte (« m:ours ») ou une petite image JPEG/WebP (96 px, ~10 ko).
const cleanAvatar = (v) => (typeof v === 'string' && (/^m:[a-z]{2,12}$/.test(v) || (/^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= 40000)) ? v : '');
const uidOf = (email) => createHash('sha256').update(`uid:${String(email || '').toLowerCase()}`).digest('hex').slice(0, 12);
const publicUser = (u) => ({ name: u.name, email: u.email, uid: uidOf(u.email), workMode: u.role === 'admin' && u.workMode === true, role: u.role, alerts: lead(u) && u.alerts === true, schedule: cleanSchedule(u.schedule), scheduleBy: u.scheduleBy || '', scheduleAt: u.scheduleAt || '', avatar: cleanAvatar(u.avatar) });
// Courriels des problèmes urgents : par défaut, les superviseurs marqués
// alerts dans la config (Daniel); les autres peuvent s'abonner eux-mêmes.
const alertsByDefault = (name) => (CONFIG.supervisors || []).some((x) => x.alerts && x.name.toLowerCase() === name.toLowerCase());

// getStore(name) → magasin compatible Netlify Blobs; env() → { TEAM_CODE, BOSS_CODE }.
// push.send(subscription, payload, vapid) : envoi web-push (remplacé dans les tests).
// Les clés VAPID et la chaîne ntfy sont créées toutes seules au premier usage (rien à régler sur Netlify).
const webPush = {
  async keys() { const wp = (await import('web-push')).default; return wp.generateVAPIDKeys(); },
  async send(sub, payload, vapid) {
    const wp = (await import('web-push')).default;
    return wp.sendNotification(sub, JSON.stringify(payload), { vapidDetails: { subject: 'mailto:thealchemicalseed@gmail.com', publicKey: vapid.publicKey, privateKey: vapid.privateKey }, TTL: 3600, urgency: payload.urgent ? 'high' : 'normal' });
  },
};
const PUSH_TEXT = {
  fr: { sched: (by) => ({ title: 'Ton horaire a changé', body: `${by} a modifié ton horaire. Touchez pour le voir.` }), day: (by, d) => ({ title: 'Ton quart a changé', body: `${by} a changé ton quart du ${d}.` }), task: (by, title, h) => ({ title: `Nouvelle tâche : ${title}`, body: `Ajoutée par ${by}${h ? `, à ${h}` : ''}.` }), remind: (h) => ({ title: 'Ton quart commence bientôt', body: `À ${h}. Bon quart !` }), urgent: (cat, by) => ({ title: `⚑ Urgent : ${cat}`, body: `Signalé par ${by}. Touchez pour voir.` }), test: { title: 'Ça marche !', body: 'Les notifications sont activées.' }, conge: (who, when) => ({ title: `${who} prend congé`, body: `${when}. C’est dans l’horaire de l’équipe.` }), swapAsk: (who, when, h) => ({ title: `${who} cherche quelqu’un`, body: `Pour son quart du ${when} (${h}). Touche pour répondre.` }), swapOk: (who, when) => ({ title: 'Ton quart est pris', body: `${who} prend ton quart du ${when}. Merci !` }), swapNo: (who, when) => ({ title: 'Pas cette fois', body: `${who} ne peut pas prendre ton quart du ${when}.` }), swapDone: (a, b, when) => ({ title: 'Échange de quart', body: `${b} prend le quart de ${a} le ${when}.` }), monthly: (m, pct, fixed) => ({ title: `Le résumé ${/^[aeiouéh]/i.test(m) ? `d’${m}` : `de ${m}`} est prêt`, body: `${pct === null ? 'Aucun quart envoyé' : `Le gym : ${pct} % des tâches faites`} · ${fixed} problème${fixed > 1 ? 's' : ''} réglé${fixed > 1 ? 's' : ''}.` }), nosched: { title: 'Ton horaire est vide', body: 'Entre tes jours de travail une fois : ton quart partira tout seul.' }, weekly: (pct, urgent) => ({ title: 'Ta semaine au gym', body: `${pct === null ? 'Aucun quart envoyé' : `Le gym : ${pct} % des tâches faites`}${urgent ? ` · ${urgent} urgent${urgent > 1 ? 's' : ''} à régler` : ' · rien d’urgent'}.` }) },
  en: { sched: (by) => ({ title: 'Your schedule changed', body: `${by} changed your schedule. Tap to see it.` }), day: (by, d) => ({ title: 'Your shift changed', body: `${by} changed your shift on ${d}.` }), task: (by, title, h) => ({ title: `New task: ${title}`, body: `Added by ${by}${h ? `, at ${h}` : ''}.` }), remind: (h) => ({ title: 'Your shift starts soon', body: `At ${h}. Have a good shift!` }), urgent: (cat, by) => ({ title: `⚑ Urgent: ${cat}`, body: `Reported by ${by}. Tap to see it.` }), test: { title: 'It works!', body: 'Notifications are on.' }, conge: (who, when) => ({ title: `${who} is taking time off`, body: `${when}. It’s in the team schedule.` }), swapAsk: (who, when, h) => ({ title: `${who} is looking for someone`, body: `For their shift on ${when} (${h}). Tap to answer.` }), swapOk: (who, when) => ({ title: 'Your shift is taken', body: `${who} is taking your shift on ${when}. Thanks!` }), swapNo: (who, when) => ({ title: 'Not this time', body: `${who} can’t take your shift on ${when}.` }), swapDone: (a, b, when) => ({ title: 'Shift swap', body: `${b} is taking ${a}’s shift on ${when}.` }), monthly: (m, pct, fixed) => ({ title: `Your ${m} summary is ready`, body: `${pct === null ? 'No shift sent' : `The gym: ${pct}% of tasks done`} · ${fixed} problem${fixed === 1 ? '' : 's'} fixed.` }), nosched: { title: 'Your schedule is empty', body: 'Enter your work days once: your shift will start by itself.' }, weekly: (pct, urgent) => ({ title: 'Your week at the gym', body: `${pct === null ? 'No shift sent' : `The gym: ${pct}% of tasks done`}${urgent ? ` · ${urgent} urgent to fix` : ' · nothing urgent'}.` }) },
};

export function createApi({ getStore, env, push = webPush, fetchFn = (...a) => fetch(...a), clock = () => new Date() }) {
  const users = () => getStore('users');
  const sessions = () => getStore('sessions');
  const board = () => getStore('board');
  const problems = () => getStore('problems');
  const photos = () => getStore('problem-photos');
  const settings = () => getStore('settings');
  const pushes = () => getStore('push');
  // Les codes d'inscription : ceux que l'admin a changés dans l'app, sinon ceux de Netlify.
  async function codes() {
    const e = env();
    const saved = (await settings().get('codes', { type: 'json' })) || {};
    return { TEAM_CODE: saved.team || e.TEAM_CODE, BOSS_CODE: saved.boss || e.BOSS_CODE, ADMIN_CODE: saved.admin || e.ADMIN_CODE };
  }

  async function newSession(email) {
    const token = randomBytes(32).toString('hex');
    await sessions().setJSON(sha(token), { email, exp: Date.now() + SESSION_DAYS * 864e5 });
    return token;
  }

  async function currentUser(req) {
    const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('authorization') || '');
    if (!m) return null;
    const s = await sessions().get(sha(m[1]), { type: 'json' });
    if (!s || s.exp < Date.now()) return null;
    const u = await users().get(s.email, { type: 'json' });
    return u && !u.removed ? u : null;
  }

  async function body(req, max = 60_000) {
    const text = await req.text();
    if (text.length > max) throw Object.assign(new Error('size'), { status: 413 });
    try { return JSON.parse(text || '{}'); } catch { throw Object.assign(new Error('json'), { status: 400 }); }
  }

  // ---------- Comptes ----------
  async function auth(req) {
    if (req.method === 'GET') {
      const u = await currentUser(req);
      return u ? json({ user: publicUser(u) }) : json({ error: 'auth' }, 401);
    }
    const b = await body(req);
    const email = String(b.email || '').trim().toLowerCase();
    if (b.action === 'logout') {
      const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('authorization') || '');
      if (m) await sessions().delete(sha(m[1]));
      return json({ ok: true });
    }
    if (b.action === 'signup') {
      const { TEAM_CODE, BOSS_CODE, ADMIN_CODE } = await codes();
      if (!TEAM_CODE || !BOSS_CODE) return json({ error: 'codes-missing' }, 503);
      const role = ['boss', 'admin'].includes(b.role) ? b.role : 'employee';
      const want = role === 'admin' ? ADMIN_CODE : role === 'boss' ? BOSS_CODE : TEAM_CODE;
      if (!want) return json({ error: 'code' }, 403);
      const name = String(b.name || '').trim().slice(0, 40);
      const password = String(b.password || '');
      if (!name) return json({ error: 'name' }, 400);
      if (!EMAIL.test(email)) return json({ error: 'email' }, 400);
      if (password.length < 6 || password.length > 200) return json({ error: 'password' }, 400);
      // Mauvais code : 10 essais par jour par connexion (300 en tout) pour qu'un code court ne se devine pas.
      const day = localDay(new Date());
      const ip = (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || '?').split(',')[0].trim().slice(0, 60);
      const tries = (await settings().get(`tries:${day}`, { type: 'json' })) || {};
      if ((tries[ip] || 0) >= 10 || (tries._all || 0) >= 2000) return json({ error: 'tries' }, 429); // par connexion; le plafond global est haut pour qu'une personne ne bloque pas toute l'équipe
      if (!sameText(String(b.code || '').trim().toLowerCase(), String(want).trim().toLowerCase())) {
        await settings().setJSON(`tries:${day}`, { ...tries, [ip]: (tries[ip] || 0) + 1, _all: (tries._all || 0) + 1 });
        return json({ error: 'code' }, 403);
      }
      const old = await users().get(email, { type: 'json' });
      if (old && !old.removed) return json({ error: 'exists' }, 409);
      const salt = randomBytes(16).toString('hex');
      const u = { email, name, role, alerts: role === 'boss' && alertsByDefault(name), salt, hash: hashPassword(password, salt), created: new Date().toISOString() };
      await users().setJSON(email, u);
      return json({ token: await newSession(email), user: publicUser(u) });
    }
    if (b.action === 'login') {
      // Trop de mauvais mots de passe pour ce compte : 24 h de pause (le compte, pas l'appareil).
      const lockKey = `login:${sha(email)}`;
      const lock = (await settings().get(lockKey, { type: 'json' })) || { n: 0, until: 0 };
      if (lock.until > Date.now()) return json({ error: 'locked', until: new Date(lock.until).toISOString() }, 429);
      const u = await users().get(email, { type: 'json' });
      const ok = u && !u.removed && sameText(hashPassword(String(b.password || ''), u.salt), u.hash);
      if (!ok) {
        const n = (lock.until && lock.until <= Date.now() ? 0 : lock.n || 0) + 1;
        await settings().setJSON(lockKey, n >= LOGIN_MAX ? { n: 0, until: Date.now() + LOGIN_LOCK_MS } : { n, until: 0 });
        return json({ error: n >= LOGIN_MAX ? 'locked' : 'login', left: Math.max(0, LOGIN_MAX - n) }, n >= LOGIN_MAX ? 429 : 401);
      }
      if (lock.n) await settings().delete(lockKey);
      return json({ token: await newSession(email), user: publicUser(u) });
    }
    if (b.action === 'codes') {
      const u = await currentUser(req);
      if (!u) return json({ error: 'auth' }, 401);
      if (u.role !== 'admin') return json({ error: 'admin' }, 403);
      if (b.read === true) { const c = await codes(); return json({ codes: { team: c.TEAM_CODE || '', boss: c.BOSS_CODE || '', admin: c.ADMIN_CODE || '' } }); }
      // Un champ vide garde le code actuel; les trois codes doivent rester différents.
      const pick = (k) => String(b[k] || '').trim().slice(0, 40);
      const now = await codes();
      const saved = (await settings().get('codes', { type: 'json' })) || {};
      const next = { team: pick('team') || now.TEAM_CODE || '', boss: pick('boss') || now.BOSS_CODE || '', admin: pick('admin') || now.ADMIN_CODE || '' };
      const low = Object.values(next).filter(Boolean).map((x) => x.toLowerCase());
      if (['team', 'boss', 'admin'].some((k) => pick(k) && pick(k).length < 4) || new Set(low).size !== low.length) return json({ error: 'codes' }, 400);
      await settings().setJSON('codes', { ...saved, ...Object.fromEntries(['team', 'boss', 'admin'].filter((k) => pick(k)).map((k) => [k, pick(k)])) });
      return json({ ok: true });
    }
    // Entrer un code pour changer de rôle (ex. l'admin sur un compte déjà créé).
    if (b.action === 'role') {
      const u = await currentUser(req);
      if (!u) return json({ error: 'auth' }, 401);
      const { TEAM_CODE, BOSS_CODE, ADMIN_CODE } = await codes();
      // 10 essais ratés par jour au plus : un code à 4 chiffres ne se devine pas à la chaîne.
      const day = localDay(new Date());
      if (u.roleTries?.day === day && u.roleTries.n >= 10) return json({ error: 'tries' }, 429);
      const code = String(b.code || '').trim().toLowerCase();
      const is = (c) => Boolean(code && c) && sameText(code, String(c).trim().toLowerCase());
      const role = is(ADMIN_CODE) ? 'admin' : is(BOSS_CODE) ? 'boss' : is(TEAM_CODE) ? 'employee' : '';
      if (!role) {
        u.roleTries = { day, n: (u.roleTries?.day === day ? u.roleTries.n : 0) + 1 };
        await users().setJSON(u.email, u);
        return json({ error: 'code' }, 403);
      }
      u.role = role;
      await users().setJSON(u.email, u);
      return json({ user: publicUser(u) });
    }
    if (b.action === 'avatar') {
      const u = await currentUser(req);
      if (!u) return json({ error: 'auth' }, 401);
      const avatar = cleanAvatar(b.avatar);
      if (b.avatar && !avatar) return json({ error: 'avatar' }, 400);
      u.avatar = avatar;
      await users().setJSON(u.email, u);
      return json({ user: publicUser(u) });
    }
    if (b.action === 'schedule') {
      const u = await currentUser(req);
      if (!u) return json({ error: 'auth' }, 401);
      u.schedule = cleanSchedule(b.schedule);
      u.scheduleBy = ''; u.scheduleAt = new Date().toISOString();
      await users().setJSON(u.email, u);
      return json({ user: publicUser(u) });
    }
    // L'admin travaille aussi comme employé : « Mode employé » allumé, ses quarts sont de vrais quarts
    // (vus dans l'équipe et les rapports, comme un employé ordinaire); éteint, il est un fantôme.
    if (b.action === 'workmode') {
      const u = await currentUser(req);
      if (!u) return json({ error: 'auth' }, 401);
      if (u.role !== 'admin') return json({ error: 'admin' }, 403);
      u.workMode = b.on === true;
      await users().setJSON(u.email, u);
      return json({ user: publicUser(u) });
    }
    if (b.action === 'alerts') {
      const u = await currentUser(req);
      if (!u) return json({ error: 'auth' }, 401);
      if (!lead(u)) return json({ error: 'boss' }, 403);
      u.alerts = b.on === true;
      await users().setJSON(u.email, u);
      return json({ user: publicUser(u) });
    }
    return json({ error: 'action' }, 400);
  }

  // Qui reçoit les courriels urgents (nom + adresse) : pour l'envoi depuis le téléphone.
  async function alertList() {
    const { blobs } = await users().list();
    const all = await Promise.all(blobs.map((x) => users().get(x.key, { type: 'json' })));
    return json({ to: all.filter((u) => u && !u.removed && lead(u) && u.alerts).map((u) => ({ name: u.name, email: u.email })) });
  }

  // ---------- L'équipe (superviseurs) ----------
  async function team(req, me) {
    if (!lead(me)) return json({ error: 'boss' }, 403);
    if (req.method === 'GET') {
      const { blobs } = await users().list();
      const all = await Promise.all(blobs.map((x) => users().get(x.key, { type: 'json' })));
      // L'admin n'apparaît jamais comme admin : en mode employé, c'est un employé ordinaire; sinon, il n'y est pas.
      // Les départs (propriétaire) : la liste des anciens, pour redonner l'accès au besoin.
      if (new URL(req.url).searchParams.has('former')) return json({ former: all.filter((u) => u?.removed && u.role !== 'admin').map((u) => ({ name: u.name, email: u.email, role: u.role, avatar: cleanAvatar(u.avatar), removedAt: u.removedAt || '', removedBy: u.removedBy || '' })).sort((a, b) => (b.removedAt || '').localeCompare(a.removedAt || '')) });
      const seen = all.filter((u) => u && !u.removed && (u.role !== 'admin' || u.workMode || u.email === me.email || me.role === 'admin'));
      return json({ users: seen.map((u) => ({ ...publicUser(u), ...(u.role === 'admin' && me.role !== 'admin' ? { role: 'employee', workMode: false } : {}), created: u.created })).sort((a, b) => a.name.localeCompare(b.name)) });
    }
    const b = await body(req);
    const email = String(b.email || '').trim().toLowerCase();
    const u = await users().get(email, { type: 'json' });
    // Le compte admin : seul l'admin touche à son compte (mot de passe, départ, retour). En « Mode employé »,
    // l'équipe le voit comme un employé ordinaire : un superviseur peut alors changer son horaire, comme pour les autres.
    if (u?.role === 'admin' && me.role !== 'admin' && !(b.action === 'schedule' && u.workMode)) return json({ error: 'user' }, 404);
    // Redonner l'accès à quelqu'un qui était parti (ou annuler un départ fait par erreur).
    if (b.action === 'restore') {
      if (!u?.removed || !u.hash) return json({ error: 'user' }, 404);
      const { removed, removedAt, removedBy, ...back } = u;
      await users().setJSON(email, back);
      return json({ user: publicUser(back) });
    }
    if (!u || u.removed) return json({ error: 'user' }, 404);
    if (b.action === 'reset') {
      const password = String(b.password || '');
      if (password.length < 6 || password.length > 200) return json({ error: 'password' }, 400);
      u.salt = randomBytes(16).toString('hex');
      u.hash = hashPassword(password, u.salt);
      await users().setJSON(email, u);
      await settings().delete(`login:${sha(email)}`); // un nouveau mot de passe enlève aussi la pause de 24 h
      return json({ ok: true });
    }
    // Propriétaire : un superviseur (ou l'admin) peut changer l'horaire d'un employé. L'employé est averti.
    if (b.action === 'schedule') {
      u.schedule = cleanSchedule(b.schedule);
      u.scheduleBy = me.name; u.scheduleAt = new Date().toISOString();
      await users().setJSON(email, u);
      if (email !== me.email && !b.quiet) { try { await sendTo(email, (T) => ({ ...T.sched(me.name), tag: 'sched', url: './#horaire' }), 'sched'); } catch { /* jamais bloquant */ } }
      return json({ user: publicUser(u) });
    }
    // Un départ : l'accès est coupé tout de suite (le compte ne se connecte plus, ses sessions ne marchent
    // plus); ses quarts passés restent dans les rapports. Le reste est gardé pour pouvoir annuler.
    if (b.action === 'remove') {
      if (email === me.email) return json({ error: 'self' }, 400);
      if (u.role === 'admin' && me.role !== 'admin') return json({ error: 'user' }, 404);
      await users().setJSON(email, { ...u, removed: true, removedAt: new Date().toISOString(), removedBy: me.name });
      return json({ ok: true });
    }
    return json({ error: 'action' }, 400);
  }

  // ---------- Historique des quarts ----------
  async function shifts(req, me) {
    const store = board();
    // Propriétaire : pas de surveillance. Un quart encore en cours n'est visible que par la personne
    // qui le fait (sa sauvegarde), et l'heure où chaque case a été cochée n'est jamais renvoyée.
    // Un quart appartient à un COMPTE (byEmail), pas à un nom : deux « Noah » ne se mélangent plus.
    // Les vieux quarts (avant le 25 oct.) n'ont que le nom : on retombe sur le nom pour eux.
    const sameName = (s, n = me?.name) => String(s?.name || '').trim().toLowerCase() === String(n || '').trim().toLowerCase();
    const mine = (s) => (s?.byEmail ? s.byEmail === me?.email : sameName(s));
    const admin = me?.role === 'admin';
    const boss = lead(me);
    // Les quarts « fantômes » de l'admin (tests) : seul un admin les voit. Le courriel ne sort jamais :
    // chacun reçoit un identifiant court (uid) et « mine » pour reconnaître ses propres quarts.
    const shown = (list) => (list || []).filter((s) => (!s.open || mine(s)) && (!s.ghost || admin))
      .map(({ byEmail, ...s }) => ({ ...s, uid: byEmail ? uidOf(byEmail) : '', mine: byEmail ? byEmail === me?.email : sameName(s), items: (s.items || []).map(({ doneAt, ...i }) => i) }));
    // Le quart visé par une action : par uid si donné (deux personnes du même nom), sinon le mien, sinon le nom.
    const target = (list, raw) => {
      const sh = Number(raw.shift), uid = String(raw.uid || '');
      const same = list.filter((x) => Number(x.shift) === sh);
      if (uid) return same.find((x) => (x.byEmail ? uidOf(x.byEmail) === uid : false)) || null;
      return same.find((x) => mine(x) && sameName(x, raw.name)) || same.find((x) => mine(x) && !raw.name) || same.find((x) => sameName(x, raw.name)) || null; // trouvé; les droits se vérifient ensuite
    };
    const firstAt = (s) => Date.parse(s?.savedAt || s?.submittedAt || '') || 0;
    const fresh = (s) => firstAt(s) && Date.now() - firstAt(s) <= EDIT_HOURS * 3600e3;
    if (req.method === 'GET') {
      const params = new URL(req.url).searchParams;
      if (params.has('recent')) {
        // Les jours les plus récents d'abord, jusqu'à avoir assez de quarts (tout l'historique au besoin).
        const want = Math.min(Math.max(Number(params.get('recent')) || 40, 1), 1000);
        const { blobs } = await store.list();
        const dates = blobs.map((x) => x.key).filter((k) => DATE.test(k)).sort().reverse().slice(0, 1500);
        const days = {};
        let n = 0;
        for (const d of dates) {
          days[d] = shown(await store.get(d, { type: 'json' }));
          n += days[d].length;
          if (n >= want) break;
        }
        return json({ days });
      }
      const dates = parseDates(params.get('dates'));
      if (!dates.length) return json({ error: 'dates' }, 400);
      const lists = await Promise.all(dates.map((d) => store.get(d, { type: 'json' })));
      return json({ days: Object.fromEntries(dates.map((d, i) => [d, shown(lists[i])])) });
    }
    const raw = await body(req);
    // L'admin seulement peut effacer un quart de l'historique.
    // Effacer un quart : l'admin, n'importe lequel; chaque personne, le sien pendant 36 h (propriétaire).
    // Effacer un quart : l'admin, n'importe lequel; chaque personne, le sien pendant 12 h (propriétaire).
    if (raw?.action === 'delete') {
      if (!DATE.test(String(raw.date || '')) || ![1, 2].includes(Number(raw.shift))) return json({ error: 'invalid' }, 400);
      const list = (await store.get(raw.date, { type: 'json' })) || [];
      const s = target(list, raw);
      if (!s) return json({ error: 'missing' }, 404);
      if (!admin) {
        if (!mine(s)) return json({ error: 'admin' }, 403);
        if (!s.open && !fresh(s)) return json({ error: 'locked' }, 409);
      }
      await store.setJSON(raw.date, list.filter((x) => x !== s));
      return json({ ok: true });
    }
    // L'admin corrige les tâches d'un quart déjà enregistré (ex. oublié de cocher), n'importe quel jour.
    // Corriger les cases d'un quart déjà enregistré : l'admin, n'importe quel quart;
    // chaque personne, son propre quart pendant 36 h après le premier envoi (propriétaire).
    if (raw?.action === 'edit') {
      if (!DATE.test(String(raw.date || '')) || ![1, 2].includes(Number(raw.shift)) || !Array.isArray(raw.items)) return json({ error: 'invalid' }, 400);
      const list = (await store.get(raw.date, { type: 'json' })) || [];
      const s = target(list, raw);
      if (!s) return json({ error: 'missing' }, 404);
      const own = mine(s);
      // Le sien : 12 h. Un superviseur : n'importe quel quart, sans limite. L'admin : tout.
      if (!admin && !boss && !own) return json({ error: 'admin' }, 403);
      if (!admin && !boss && !fresh(s)) return json({ error: 'locked' }, 409);
      const ok = new Set(['done', 'notdone', 'unchecked']);
      const prev = new Map((s.items || []).map((i) => [i.id, i]));
      const edited = raw.items.slice(0, 40).filter((i) => i && typeof i.id === 'string' && ok.has(i.status)).map((i) => {
        const { doneAt, ...o } = prev.get(i.id) || { id: i.id.slice(0, 40), reason: '', remark: '' };
        const reason = i.status === 'notdone' ? String(i.reason ?? o.reason ?? '').slice(0, 20) : '';
        const remark = i.status === 'notdone' && typeof i.remark === 'string' ? i.remark.slice(0, 300) : o.remark || '';
        return { ...o, status: i.status, reason, remark };
      });
      const seen = new Set(edited.map((i) => i.id));
      s.items = [...(s.items || []).filter((i) => !seen.has(i.id)), ...edited].slice(0, 40); // le pointage et le reste restent tels quels
      // done/total gardent le compte des tâches du plan (sans les « en plus ») : on ajuste par différence.
      const delta = edited.reduce((a, i) => a + (i.status === 'done' ? 1 : 0) - (prev.get(i.id)?.status === 'done' ? 1 : 0), 0);
      if (Number.isFinite(s.total) && Number.isFinite(s.done)) s.done = Math.max(0, Math.min(s.total, s.done + delta));
      else { s.done = s.items.filter((i) => i.status === 'done').length; s.total = s.items.length; }
      if (!own) { s.editedBy = me.name || ''; s.editedAt = new Date().toISOString(); } // sa propre correction : pas d'étiquette
      await store.setJSON(raw.date, list);
      const { byEmail, ...pub } = s;
      return json({ ok: true, shift: { ...pub, uid: byEmail ? uidOf(byEmail) : '', mine: own } });
    }
    // Un superviseur valide (ou refuse) les activités personnalisées d'un quart.
    if (raw?.action === 'custom') {
      if (!['boss', 'admin'].includes(me?.role)) return json({ error: 'boss' }, 403);
      if (!DATE.test(String(raw.date || '')) || ![1, 2].includes(Number(raw.shift)) || !['approved', 'rejected'].includes(raw.status)) return json({ error: 'invalid' }, 400);
      const list = (await store.get(raw.date, { type: 'json' })) || [];
      const s = target(list, raw);
      if (!s?.custom?.length) return json({ error: 'missing' }, 404);
      s.customStatus = raw.status;
      s.customBy = me.name || '';
      await store.setJSON(raw.date, list);
      return json({ ok: true });
    }
    const shift = sanitizeShift(raw);
    if (!shift) return json({ error: 'invalid' }, 400);
    // On n'envoie que SON quart (propriétaire) : le nom vient du compte. L'admin peut tester sous un
    // autre nom (simulation), mais ce quart reste alors un fantôme.
    if (!admin && !sameName(shift)) return json({ error: 'name' }, 403);
    const list = (await store.get(shift.date, { type: 'json' })) || [];
    const old = list.find((x) => x.shift === shift.shift && (x.byEmail ? x.byEmail === me.email : sameName(x, shift.name)));
    const today = localDay(new Date());
    // Un quart envoyé se modifie pendant 12 h après son premier envoi (heure du serveur, pas celle du
    // téléphone). Un quart encore « en cours » se continue toujours.
    if (old && !old.open && !admin && !fresh(old)) return json({ error: 'locked' }, 409);
    const savedAt = shift.open ? '' : old && !old.open && old.savedAt ? old.savedAt : new Date().toISOString();
    // La validation vient du superviseur, jamais du téléphone : elle reste tant que les
    // activités ne changent pas; une activité changée redevient « à valider ».
    const sameCustom = old && JSON.stringify(old.custom || []) === JSON.stringify(shift.custom);
    shift.customStatus = shift.custom.length ? (sameCustom && old.customStatus) || 'pending' : '';
    shift.customBy = shift.custom.length && sameCustom ? old.customBy || '' : '';
    const ghost = admin && (!me.workMode || !sameName(shift));
    const rest = list.filter((x) => x !== old);
    const { uid, mine: _m, ...clean } = shift;
    await store.setJSON(shift.date, [...rest, { ...clean, byEmail: me.email, savedOn: today, savedAt, ghost }].slice(-20));
    return json({ ok: true });
  }

  // Photos gardées 90 jours (le signalement, lui, reste). Une fois par jour au plus.
  async function cleanPhotos() {
    const meta = getStore('meta');
    const today = localDay(new Date());
    if ((await meta.get('photos-cleaned', { type: 'json' }))?.day === today) return;
    await meta.setJSON('photos-cleaned', { day: today });
    const limit = Date.now() - PHOTO_DAYS * 864e5;
    const { blobs } = await photos().list();
    const old = blobs.map((x) => x.key).filter((k) => parseInt(k.slice(0, 9), 36) < limit);
    for (const key of old) await photos().delete(key);
    for (const id of new Set(old.map((k) => k.split('-')[0]))) {
      const p = await problems().get(id, { type: 'json' });
      if (p?.photos) await problems().setJSON(id, { ...p, photos: 0, photosExpired: p.photos });
    }
  }

  // ---------- Signalements ----------
  async function reports(req, me) {
    const params = new URL(req.url).searchParams;
    if (req.method === 'POST') {
      const b = await body(req, 3_000_000);
      if (b.action === 'status') {
        if (!lead(me)) return json({ error: 'boss' }, 403);
        if (!PROBLEM_ID.test(b.id || '')) return json({ error: 'id' }, 400);
        const p = await problems().get(b.id, { type: 'json' });
        if (!p) return json({ error: 'missing' }, 404);
        const resolved = b.status === 'resolved';
        const next = { ...p, status: resolved ? 'resolved' : 'open', resolvedBy: resolved ? me.name : '', resolvedAt: resolved ? new Date().toISOString() : '' };
        await problems().setJSON(b.id, next);
        return json({ problem: next });
      }
      // Annuler son propre signalement (propriétaire : « plein de boutons Annuler ») : 12 h, tant qu'il est ouvert.
      if (b.action === 'undo') {
        if (!PROBLEM_ID.test(b.id || '')) return json({ error: 'id' }, 400);
        const p = await problems().get(b.id, { type: 'json' });
        if (!p) return json({ error: 'missing' }, 404);
        if (me.role !== 'admin' && p.byEmail !== me.email) return json({ error: 'owner' }, 403);
        const at = parseInt(String(p.id).slice(0, 9), 36);
        if (me.role !== 'admin' && (p.status === 'resolved' || !at || Date.now() - at > UNDO_HOURS * 3600e3)) return json({ error: 'locked' }, 409);
        await problems().delete(p.id);
        for (let i = 0; i < (p.photos || 0); i++) await photos().delete(`${p.id}-${i}`);
        return json({ ok: true });
      }
      const clean = sanitizeProblem(b);
      if (!clean) return json({ error: 'invalid' }, 400);
      const files = (Array.isArray(b.photos) ? b.photos : []).slice(0, MAX_PROBLEM_PHOTOS)
        .map((s) => (typeof s === 'string' ? Buffer.from(s, 'base64') : null))
        .filter((buf) => buf && buf.length > 3 && buf.length <= MAX_PHOTO_BYTES && buf[0] === 0xff && buf[1] === 0xd8);
      const id = problemId();
      await Promise.all(files.map((buf, i) => photos().set(`${id}-${i}`, buf)));
      await cleanPhotos();
      const p = { ...clean, id, by: me.name, byEmail: me.email, photos: files.length, status: 'open', resolvedBy: '', resolvedAt: '', ghost: me.role === 'admin' && !me.workMode };
      await problems().setJSON(id, p);
      if (p.urgent && !p.ghost) { try { await notifyUrgent(p); } catch { /* l'envoi ne bloque jamais le signalement */ } }
      return json({ id });
    }
    // Un employé voit seulement SES signalements (pour pouvoir les annuler); le superviseur, tous.
    if (!lead(me)) {
      if (!params.has('mine')) return json({ error: 'boss' }, 403);
      const { blobs } = await problems().list();
      const keys = blobs.map((x) => x.key).filter((k) => PROBLEM_ID.test(k)).sort().reverse().slice(0, 150);
      const list = (await Promise.all(keys.map((k) => problems().get(k, { type: 'json' })))).filter((p) => p && p.byEmail === me.email);
      return json({ problems: list.slice(0, 20).map(({ byEmail, ...p }) => p) });
    }
    if (params.has('photo')) {
      const key = params.get('photo') || '';
      if (!/^[a-z0-9]{10,20}-[0-9]$/.test(key)) return json({ error: 'photo' }, 400);
      const data = await photos().get(key, { type: 'arrayBuffer' });
      if (!data) return json({ error: 'missing' }, 404);
      return new Response(data, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400', ...CORS } });
    }
    if (params.has('id')) {
      const id = params.get('id') || '';
      const p = PROBLEM_ID.test(id) ? await problems().get(id, { type: 'json' }) : null;
      return p && (!p.ghost || me.role === 'admin') ? json({ problem: p }) : json({ error: 'missing' }, 404);
    }
    const { blobs } = await problems().list();
    const keys = blobs.map((x) => x.key).filter((k) => PROBLEM_ID.test(k)).sort().reverse().slice(0, 150);
    const list = await Promise.all(keys.map((k) => problems().get(k, { type: 'json' })));
    return json({ problems: list.filter(Boolean).filter((p) => !p.ghost || me.role === 'admin').map(({ byEmail, ...p }) => ({ ...p, mine: byEmail === me.email })) });
  }

  // ---------- Notifications ----------
  async function vapid() {
    let k = await settings().get('vapid', { type: 'json' });
    if (!k?.publicKey) { k = await push.keys(); await settings().setJSON('vapid', { publicKey: k.publicKey, privateKey: k.privateKey }); }
    return k;
  }
  async function ntfySettings(create = false) {
    let n = (await settings().get('ntfy', { type: 'json' })) || null;
    if (!n && create) { n = { topic: `sportheque-${randomBytes(9).toString('hex')}`, on: false }; await settings().setJSON('ntfy', n); }
    return n;
  }
  const pushRecord = async (email) => (await pushes().get(email, { type: 'json' })) || { subs: [], remind: true, urgent: true, lang: 'fr' };
  // Choix par type (propriétaire : des réglages par défaut équilibrés, tout est allumé sauf la nuit).
  // Heures calmes : rien entre 23 h et 6 h, sauf un problème urgent.
  const PUSH_KINDS = ['remind', 'sched', 'task', 'urgent', 'weekly'];
  const quietNow = (now = clock()) => { const h = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', hourCycle: 'h23' }).format(now)); return h >= 23 || h < 6; };
  // Envoie à tous les appareils d'une personne; les abonnements expirés (404/410) sont retirés.
  async function sendTo(email, make, kind = '', now = clock()) {
    const rec = await pushes().get(email, { type: 'json' });
    if (!rec?.subs?.length) return 0;
    if (kind && rec[kind] === false) return 0;
    // Heures calmes : sauf l'urgent et le rappel du quart (il arrive 10 min avant un quart qui commence tôt).
    if (kind && !['urgent', 'remind'].includes(kind) && rec.quiet !== false && quietNow(now)) return 0;
    const who = await users().get(email, { type: 'json' });
    if (who?.removed) return 0; // parti : plus d'avis
    const keys = await vapid();
    const payload = make(PUSH_TEXT[rec.lang] || PUSH_TEXT.fr);
    let sent = 0;
    const keep = [];
    for (const sub of rec.subs) {
      try { await push.send(sub, payload, keys); sent += 1; keep.push(sub); } catch (e) { if (![404, 410].includes(e?.statusCode)) keep.push(sub); }
    }
    if (keep.length !== rec.subs.length) await pushes().setJSON(email, { ...rec, subs: keep });
    return sent;
  }
  async function notifyUrgent(p) {
    const { blobs } = await users().list();
    const all = await Promise.all(blobs.map((x) => users().get(x.key, { type: 'json' })));
    const cat = (lang) => (CATEGORY_NAMES[p.category]?.[lang]) || p.category || '';
    for (const u of all.filter((u) => u && !u.removed && lead(u) && u.email !== p.byEmail)) {
      const rec = await pushes().get(u.email, { type: 'json' });
      if (rec && rec.urgent !== false) await sendTo(u.email, (T) => ({ ...T.urgent(cat(rec.lang || 'fr'), p.by), tag: `p-${p.id}`, url: './#patron', urgent: true }), 'urgent');
    }
    const n = await ntfySettings();
    if (n?.on && n.topic) {
      await fetchFn(`https://ntfy.sh/${n.topic}`, { method: 'POST', body: 'Ouvrez l’app pour voir le signalement.', headers: { Title: `Urgent : ${cat('fr')}`, Priority: 'high', Tags: 'warning', Click: 'https://aeonchiron.github.io/sportheque-checklist/#patron' } }).catch(() => {});
    }
  }
  // Rappel 10 min avant le quart (fonction planifiée toutes les 5 min). Une fois par jour et par personne.
  async function remindDue(now = new Date()) {
    const day = localDay(now);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]));
    const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday);
    const nowMin = Number(parts.hour) * 60 + Number(parts.minute);
    const { blobs } = await pushes().list();
    let sent = 0;
    for (const { key } of blobs) {
      const rec = await pushes().get(key, { type: 'json' });
      if (!rec?.subs?.length || rec.remind === false || rec.reminded === day) continue;
      const u = await users().get(key, { type: 'json' });
      const slot = u && !u.removed ? await plannedOn(u, day) : null; // un congé ou un échange compte
      if (!slot) continue;
      const [h, m] = slot.start.split(':').map(Number);
      const until = h * 60 + m - nowMin;
      if (until < 1 || until > 12) continue;
      await pushes().setJSON(key, { ...rec, reminded: day });
      sent += await sendTo(key, (T) => ({ ...T.remind(slot.start), tag: `r-${day}`, url: './' }), 'remind', now);
    }
    return sent + await weeklyDue(now) + await monthlyDue(now) + await noSchedDue(now);
  }
  // Propriétaire (Q57) : le résumé du mois, fait tout seul le 1er (9 h) pour les superviseurs :
  // le % du gym, les problèmes réglés. Jamais une personne. Même interrupteur que le résumé de la semaine.
  async function monthlyDue(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]));
    if (Number(parts.day) !== 1 || Number(parts.hour) !== 9 || Number(parts.minute) > 14) return 0;
    const day = localDay(now);
    const first = `${plusDays(day, -1).slice(0, 8)}01`, last = plusDays(day, -1); // le mois qui vient de finir
    const { blobs } = await pushes().list();
    const leads = [];
    for (const { key } of blobs) {
      const rec = await pushes().get(key, { type: 'json' });
      if (!rec?.subs?.length || rec.weekly === false || rec.monthlyFor === day) continue;
      const u = await users().get(key, { type: 'json' });
      if (u && !u.removed && lead(u)) leads.push([key, rec]);
    }
    if (!leads.length) return 0;
    let done = 0, total = 0;
    for (const d of datesIn(first, last, 31)) {
      for (const sh of (await board().get(d, { type: 'json' })) || []) if (!sh.open && !sh.ghost) { const c = shiftCount(sh); done += c.done; total += c.total; }
    }
    const pct = total ? Math.round((100 * done) / total) : null;
    const { blobs: pb } = await problems().list();
    let fixed = 0;
    for (const { key } of pb) { const pr = await problems().get(key, { type: 'json' }); const at = pr?.resolvedAt ? localDay(pr.resolvedAt) : ''; if (pr?.status === 'resolved' && !pr.ghost && at >= first && at <= last) fixed += 1; }
    if (pct === null && !fixed) return 0; // un mois vide : rien à résumer
    let sent = 0;
    for (const [key, rec] of leads) {
      await pushes().setJSON(key, { ...rec, monthlyFor: day });
      const L = rec.lang === 'en' ? 'en' : 'fr';
      const month = new Date(`${first}T12:00:00Z`).toLocaleDateString(L === 'en' ? 'en-CA' : 'fr-CA', { month: 'long', timeZone: 'UTC' });
      sent += await sendTo(key, (T) => ({ ...T.monthly(month, pct, fixed), tag: `m-${day}`, url: './#historique' }), 'weekly', now);
    }
    return sent;
  }
  // Propriétaire (Q47) : pas encore d'horaire → un petit rappel une fois par semaine (lundi, 10 h).
  async function noSchedDue(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]));
    if (parts.weekday !== 'Mon' || Number(parts.hour) !== 10 || Number(parts.minute) > 14) return 0;
    const day = localDay(now);
    const { blobs } = await pushes().list();
    let sent = 0;
    for (const { key } of blobs) {
      const rec = await pushes().get(key, { type: 'json' });
      if (!rec?.subs?.length || rec.noschedFor === day) continue;
      const u = await users().get(key, { type: 'json' });
      if (!u || u.removed || lead(u) || Object.keys(cleanSchedule(u.schedule)).length) continue;
      await pushes().setJSON(key, { ...rec, noschedFor: day });
      sent += await sendTo(key, (T) => ({ ...T.nosched, tag: 'nosched', url: './#horaire' }), 'sched', now);
    }
    return sent;
  }
  // Propriétaire : un résumé par semaine seulement, pour les superviseurs (dimanche, 21 h) :
  // le % du gym (jamais une personne) et les urgents encore ouverts. Une fois par semaine.
  async function weeklyDue(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]));
    if (parts.weekday !== 'Sun' || Number(parts.hour) !== 21 || Number(parts.minute) > 14) return 0;
    const day = localDay(now);
    const { blobs } = await pushes().list();
    const leads = [];
    for (const { key } of blobs) {
      const rec = await pushes().get(key, { type: 'json' });
      if (!rec?.subs?.length || rec.weekly === false || rec.weeklyFor === day) continue;
      const u = await users().get(key, { type: 'json' });
      if (u && !u.removed && lead(u)) leads.push([key, rec]);
    }
    if (!leads.length) return 0;
    let done = 0, total = 0;
    for (let i = 0; i < 7; i++) {
      const d = localDay(now.getTime() - i * 864e5);
      for (const s of (await board().get(d, { type: 'json' })) || []) if (!s.open && !s.ghost) { const c = shiftCount(s); done += c.done; total += c.total; }
    }
    const pct = total ? Math.round((100 * done) / total) : null;
    const { blobs: pb } = await problems().list();
    let urgent = 0;
    for (const { key } of pb) { const p = await problems().get(key, { type: 'json' }); if (p?.urgent && p.status !== 'resolved') urgent += 1; }
    let sent = 0;
    for (const [key, rec] of leads) {
      await pushes().setJSON(key, { ...rec, weeklyFor: day });
      sent += await sendTo(key, (T) => ({ ...T.weekly(pct, urgent), tag: `w-${day}`, url: './#historique' }), 'weekly', now);
    }
    return sent;
  }
  async function pushApi(req, me) {
    if (req.method === 'GET') {
      const rec = await pushRecord(me.email);
      const n = lead(me) ? await ntfySettings(true) : null;
      return json({ key: (await vapid()).publicKey, devices: rec.subs.length, ...Object.fromEntries(PUSH_KINDS.map((k) => [k, rec[k] !== false])), quiet: rec.quiet !== false, ntfy: n ? { topic: n.topic, on: n.on === true } : null });
    }
    const b = await body(req);
    const rec = await pushRecord(me.email);
    if (b.action === 'subscribe') {
      const sub = b.sub;
      if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: 'sub' }, 400);
      const clean = { endpoint: sub.endpoint.slice(0, 600), keys: { p256dh: String(sub.keys.p256dh).slice(0, 200), auth: String(sub.keys.auth).slice(0, 100) } };
      const subs = [clean, ...rec.subs.filter((x) => x.endpoint !== clean.endpoint)].slice(0, 5);
      await pushes().setJSON(me.email, { ...rec, subs, lang: b.lang === 'en' ? 'en' : 'fr' });
      return json({ ok: true, devices: subs.length });
    }
    if (b.action === 'unsubscribe') {
      const subs = rec.subs.filter((x) => x.endpoint !== b.endpoint);
      await pushes().setJSON(me.email, { ...rec, subs });
      return json({ ok: true, devices: subs.length });
    }
    if (b.action === 'prefs') {
      const next = { ...rec };
      for (const k of [...PUSH_KINDS, 'quiet']) if (typeof b[k] === 'boolean') next[k] = b[k];
      if (b.lang) next.lang = b.lang === 'en' ? 'en' : 'fr';
      await pushes().setJSON(me.email, next);
      return json({ ok: true });
    }
    if (b.action === 'ntfy') {
      if (!lead(me)) return json({ error: 'boss' }, 403);
      const n = await ntfySettings(true);
      const next = { ...n, on: b.on === true };
      await settings().setJSON('ntfy', next);
      if (b.on === true && b.test) await fetchFn(`https://ntfy.sh/${n.topic}`, { method: 'POST', body: 'Les alertes urgentes arriveront ici.', headers: { Title: 'Sporthèque : ça marche !', Tags: 'white_check_mark' } }).catch(() => {});
      return json({ ok: true, ntfy: { topic: next.topic, on: next.on } });
    }
    if (b.action === 'test') return json({ sent: await sendTo(me.email, (T) => ({ ...T.test, tag: 'test' })) });
    return json({ error: 'action' }, 400);
  }

  // ---------- Changements d'un jour et tâches spéciales (superviseurs, propriétaire) ----------
  //  ov:<courriel> → { 'AAAA-MM-JJ': { start, end, by } | { off: true, by } }
  //  tasks:<date>  → [{ id, title, time, minutes, who: courriel | '*', by, at }]
  //  repeat        → [{ id, title, time, minutes, who, wd (lundi = 0), from, until, skip: [dates], by, at }]
  //                  (propriétaire : une tâche spéciale peut revenir chaque semaine, sans fin ou jusqu'à une date)
  const plans = () => getStore('plan');
  const wdOf = (d) => (new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7;
  const datesIn = (from, to, max = 62) => { const out = []; for (let d = new Date(`${from}T12:00:00Z`); out.length < max; d.setUTCDate(d.getUTCDate() + 1)) { const iso = d.toISOString().slice(0, 10); if (iso > to) break; out.push(iso); } return out; };
  const expandRepeat = (list, dates) => dates.flatMap((d) => list.filter((r) => r.wd === wdOf(d) && d >= r.from && (!r.until || d <= r.until) && !(r.skip || []).includes(d))
    .map((r) => ({ id: r.id, date: d, title: r.title, time: r.time, minutes: r.minutes, who: r.who, by: r.by, at: r.at, repeat: 'weekly', until: r.until || '' })));
  const dayName = (d, lang) => new Date(`${d}T12:00:00`).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
  const plusDays = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  // Le quart prévu d'une personne un jour donné : un changement du jour (congé, échange, autres heures), sinon son horaire.
  async function plannedOn(u, date) {
    const ov = ((await plans().get(`ov:${u.email}`, { type: 'json' })) || {})[date];
    if (ov) return ov.off ? null : { start: ov.start, end: ov.end };
    return cleanSchedule(u.schedule)[String(wdOf(date))] || null;
  }
  const langOf = async (email) => (await pushes().get(email, { type: 'json' }))?.lang || 'fr';
  async function activeUsers() {
    const { blobs } = await users().list();
    return (await Promise.all(blobs.map((x) => users().get(x.key, { type: 'json' })))).filter((u) => u && !u.removed);
  }
  // L'horaire de toute l'équipe, pour tout le monde (propriétaire, 23 oct.) : qui travaille, quand,
  // avec qui. Seulement le nom, la photo, le rôle et les heures (pas de courriel, pas de résultats).
  // L'admin est un fantôme : il n'y paraît pas (sauf pour lui-même).
  async function roster(req, me) {
    if (req.method !== 'GET') return json({ error: 'method' }, 405);
    const params = new URL(req.url).searchParams;
    const from = params.get('from') || localDay(Date.now()), to = params.get('to') || from;
    if (!DATE.test(from) || !DATE.test(to) || to < from) return json({ error: 'invalid' }, 400);
    const { blobs } = await users().list();
    const all = (await Promise.all(blobs.map((x) => users().get(x.key, { type: 'json' })))).filter((u) => u && !u.removed && (u.role !== 'admin' || u.workMode || u.email === me.email));
    const people = await Promise.all(all.map(async (u) => {
      const ov = (await plans().get(`ov:${u.email}`, { type: 'json' })) || {};
      const overrides = Object.fromEntries(Object.entries(ov).filter(([d]) => d >= from && d <= to).map(([d, v]) => [d, v.off ? { off: true, ...(v.conge ? { conge: true } : {}), ...(v.swap ? { swap: true } : {}) } : { start: v.start, end: v.end, ...(v.swap ? { swap: true } : {}) }]));
      return { id: createHash('sha256').update(`roster:${u.email}`).digest('hex').slice(0, 12), name: u.name, role: u.role === 'boss' ? 'boss' : 'employee' /* l'admin en mode employé : un employé ordinaire */, avatar: u.avatar || '', ...(lead(me) ? { email: u.email } : {}) /* un superviseur ouvre la fiche de la personne */, schedule: cleanSchedule(u.schedule), overrides, ...(u.email === me.email ? { me: true } : {}) };
    }));
    return json({ people: people.sort((a, b) => a.name.localeCompare(b.name)) });
  }

  async function planApi(req, me) {
    const params = new URL(req.url).searchParams;
    if (req.method === 'GET') {
      const from = params.get('from') || localDay(Date.now()), to = params.get('to') || from;
      if (!DATE.test(from) || !DATE.test(to)) return json({ error: 'invalid' }, 400);
      const dates = datesIn(from, to, 60);
      const team = params.has('team') && lead(me);
      const repeat = (await plans().get('repeat', { type: 'json' })) || [];
      const tasks = [...(await Promise.all(dates.map((d) => plans().get(`tasks:${d}`, { type: 'json' })))).flat().filter(Boolean), ...expandRepeat(repeat, dates)]
        .filter((x) => team || x.who === '*' || x.who === me.email);
      const overrides = {};
      if (team) {
        const { blobs } = await plans().list();
        for (const { key } of blobs.filter((x) => x.key.startsWith('ov:'))) {
          const all = (await plans().get(key, { type: 'json' })) || {};
          const inRange = Object.fromEntries(Object.entries(all).filter(([d]) => d >= from && d <= to));
          if (Object.keys(inRange).length) overrides[key.slice(3)] = inRange;
        }
      } else {
        const all = (await plans().get(`ov:${me.email}`, { type: 'json' })) || {};
        overrides[me.email] = Object.fromEntries(Object.entries(all).filter(([d]) => d >= from && d <= to));
      }
      return json({ overrides, tasks });
    }
    const b = await body(req);
    if (b.action === 'conge') return await ownConge(b, me);
    if (!lead(me)) return json({ error: 'boss' }, 403);
    const date = String(b.date || '');
    if (!DATE.test(date)) return json({ error: 'invalid' }, 400);
    const rec = async (email) => (await pushes().get(email, { type: 'json' }))?.lang || 'fr';
    if (b.action === 'override') {
      const email = String(b.email || '').trim().toLowerCase();
      const u = await users().get(email, { type: 'json' });
      if (!u || u.removed) return json({ error: 'user' }, 404);
      const all = (await plans().get(`ov:${email}`, { type: 'json' })) || {};
      // Un congé peut couvrir plusieurs jours (jusqu'à 2 mois) : « to » = le dernier jour.
      const span = b.to && DATE.test(String(b.to)) && b.to >= date ? datesIn(date, String(b.to), 62) : [date];
      if (b.clear) for (const d of span) delete all[d];
      else if (b.off || b.conge) for (const d of span) all[d] = { off: true, ...(b.conge ? { conge: true } : {}), by: me.name };
      else if (HHMM.test(b.start) && HHMM.test(b.end) && b.start !== b.end) all[date] = { start: b.start, end: b.end, by: me.name };
      else return json({ error: 'invalid' }, 400);
      await plans().setJSON(`ov:${email}`, all);
      if (email !== me.email) { const L = await rec(email); try { await sendTo(email, (T) => ({ ...T.day(me.name, dayName(date, L)), tag: `ov-${date}`, url: './#horaire' }), 'sched'); } catch { /* ignore */ } }
      return json({ ok: true });
    }
    if (b.action === 'task') {
      const title = String(b.title || '').trim().slice(0, 80);
      const who = b.who === '*' ? '*' : String(b.who || '').trim().toLowerCase();
      if (!title || !who || (b.time && !HHMM.test(b.time))) return json({ error: 'invalid' }, 400);
      const minutes = Math.max(5, Math.min(240, Number(b.minutes) || 15));
      if (b.until && (!DATE.test(String(b.until)) || b.until < date)) return json({ error: 'invalid' }, 400);
      const task = { id: randomBytes(5).toString('hex'), date, title, time: b.time || '', minutes, who, by: me.name, at: new Date().toISOString() };
      if (b.repeat === 'weekly') {
        const list = (await plans().get('repeat', { type: 'json' })) || [];
        Object.assign(task, { repeat: 'weekly', until: b.until || '' });
        if (list.length >= 200) return json({ error: 'full' }, 409);
        await plans().setJSON('repeat', [...list, { id: task.id, title, time: task.time, minutes, who, wd: wdOf(date), from: date, until: b.until || '', skip: [], by: me.name, at: task.at }]);
      } else {
        const list = (await plans().get(`tasks:${date}`, { type: 'json' })) || [];
        if (list.length >= 60) return json({ error: 'full' }, 409);
        await plans().setJSON(`tasks:${date}`, [...list, task]);
      }
      // Avertir : une personne, ou tous ceux qui travaillent ce jour-là (d'après leur horaire).
      let targets = [];
      if (who === '*') {
        const { blobs } = await users().list();
        const wd = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
        const all = await Promise.all(blobs.map((x) => users().get(x.key, { type: 'json' })));
        targets = all.filter((u) => u && !u.removed && cleanSchedule(u.schedule)[String(wd)]).map((u) => u.email);
      } else targets = [who];
      for (const email of targets.filter((e) => e !== me.email)) { try { await sendTo(email, (T) => ({ ...T.task(me.name, title, task.time), tag: `task-${task.id}`, url: './', bell: true }), 'task'); } catch { /* ignore */ } }
      return json({ task });
    }
    if (b.action === 'deltask') {
      // Une tâche qui revient : « all » enlève toute la série; sinon, seulement ce jour-là.
      const repeat = (await plans().get('repeat', { type: 'json' })) || [];
      const r = repeat.find((x) => x.id === b.id);
      if (r) {
        if (b.all) await plans().setJSON('repeat', repeat.filter((x) => x !== r));
        else { r.skip = [...new Set([...(r.skip || []), date])].slice(-200); await plans().setJSON('repeat', repeat); }
        return json({ ok: true });
      }
      const list = (await plans().get(`tasks:${date}`, { type: 'json' })) || [];
      await plans().setJSON(`tasks:${date}`, list.filter((x) => x.id !== b.id));
      return json({ ok: true });
    }
    // Annuler un « enlever ce jour-là » (bouton Annuler).
    if (b.action === 'unskip') {
      const repeat = (await plans().get('repeat', { type: 'json' })) || [];
      const r = repeat.find((x) => x.id === b.id);
      if (!r) return json({ error: 'missing' }, 404);
      r.skip = (r.skip || []).filter((d) => d !== date);
      await plans().setJSON('repeat', repeat);
      return json({ ok: true });
    }
    // Remettre une série enlevée par erreur (bouton Annuler), telle quelle.
    if (b.action === 'restoretask' && b.task && typeof b.task === 'object') {
      const x = b.task;
      const title = String(x.title || '').trim().slice(0, 80);
      const who = x.who === '*' ? '*' : String(x.who || '').trim().toLowerCase();
      if (!title || !who || !/^[a-f0-9]{6,12}$/.test(String(x.id || ''))) return json({ error: 'invalid' }, 400);
      const repeat = (await plans().get('repeat', { type: 'json' })) || [];
      if (!repeat.some((r) => r.id === x.id)) await plans().setJSON('repeat', [...repeat, { id: x.id, title, time: HHMM.test(x.time) ? x.time : '', minutes: Math.max(5, Math.min(240, Number(x.minutes) || 15)), who, wd: wdOf(date), from: DATE.test(String(x.from)) ? x.from : date, until: DATE.test(String(x.until)) ? x.until : '', skip: (Array.isArray(x.skip) ? x.skip : []).filter((d) => DATE.test(String(d))).slice(-200), by: me.name, at: new Date().toISOString() }]);
      return json({ ok: true });
    }
    return json({ error: 'action' }, 400);
  }

  // Propriétaire (Q43) : l'employé marque lui-même ses jours de congé dans Mon horaire; les superviseurs
  // le voient dans la semaine (et reçoivent un petit avis). Il peut enlever un congé qu'il a mis lui-même,
  // jamais celui qu'un superviseur a mis. Seulement aujourd'hui et plus tard.
  async function ownConge(b, me) {
    const date = String(b.date || '');
    if (!DATE.test(date) || date < localDay(clock())) return json({ error: 'invalid' }, 400);
    const span = b.to && DATE.test(String(b.to)) && b.to >= date ? datesIn(date, String(b.to), 62) : [date];
    const all = (await plans().get(`ov:${me.email}`, { type: 'json' })) || {};
    // Un quart reçu par échange : on ne le laisse pas tomber en silence (l'offrir à quelqu'un d'autre).
    const swappedDay = !b.clear && span.find((d) => all[d]?.swap && !all[d].off);
    if (swappedDay) return json({ error: 'swapped', day: swappedDay }, 409);
    // Enlever son congé remet ce qui était là avant (par exemple des heures changées par un superviseur).
    if (b.clear) { for (const d of span) if (all[d]?.self) { if (all[d].prev) all[d] = all[d].prev; else delete all[d]; } }
    else for (const d of span) if (!all[d]?.off || all[d].self) all[d] = { off: true, conge: true, self: true, by: me.name, ...(all[d]?.self ? (all[d].prev ? { prev: all[d].prev } : {}) : all[d] ? { prev: all[d] } : {}) };
    await plans().setJSON(`ov:${me.email}`, all);
    if (!b.clear && !b.quiet) {
      for (const u of (await activeUsers()).filter((x) => lead(x) && x.email !== me.email)) {
        const L = await langOf(u.email);
        const when = span.length > 1 ? (L === 'en' ? `${dayName(span[0], L)} to ${dayName(span.at(-1), L)}` : `Du ${dayName(span[0], L)} au ${dayName(span.at(-1), L)}`) : dayName(date, L);
        try { await sendTo(u.email, (T) => ({ ...T.conge(me.name, when.charAt(0).toUpperCase() + when.slice(1)), tag: `cg-${me.email}-${date}`, url: './#equipe' }), 'sched'); } catch { /* jamais bloquant */ }
      }
    }
    const mine = Object.fromEntries(Object.entries(all).filter(([d]) => d >= localDay(clock())));
    return json({ ok: true, overrides: mine });
  }

  // ---------- Échanges de quarts (C4) ----------
  // Un employé offre un de ses quarts à un collègue (ou à toute l'équipe). Quelqu'un accepte : l'échange
  // se fait tout de suite, sans approbation, et les superviseurs sont avertis. Celui qui a accepté peut
  // annuler pendant 15 minutes (tout revient comme avant).
  //  swaps → [{ id, date, start, end, from, fromName, to: courriel | '*', toName, status: open | done | cancel | no,
  //             passed: [courriels qui ont dit non à une demande pour tous], taker, takerName, prev, at, doneAt }]
  const rosterId = (email) => createHash('sha256').update(`roster:${email}`).digest('hex').slice(0, 12);
  const UNDO_SWAP_MS = 15 * 60 * 1000;
  // Encore à venir : un jour futur, ou aujourd'hui avant la fin du quart (heure de Montréal).
  const torontoMin = (now) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value])); return Number(p.hour) * 60 + Number(p.minute); };
  const hm2min = (x) => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
  const ahead = (date, start, end, now = clock()) => { const today = localDay(now); if (date !== today) return date > today; const e = hm2min(end) + (hm2min(end) <= hm2min(start) ? 1440 : 0); return torontoMin(now) < e; };
  async function swapsApi(req, me) {
    const today = localDay(clock());
    let list = ((await plans().get('swaps', { type: 'json' })) || []).filter((s) => s.date >= plusDays(today, -14));
    const forMe = (s) => s.status === 'open' && s.date >= today && s.from !== me.email && (s.to === me.email || (s.to === '*' && !(s.passed || []).includes(me.email)));
    const view = (s) => ({ id: s.id, date: s.date, start: s.start, end: s.end, fromName: s.fromName, toName: s.toName || '', all: s.to === '*', status: s.status === 'open' && s.date < today ? 'expired' : s.status, takerName: s.takerName || '', at: s.at, doneAt: s.doneAt || '', mine: s.from === me.email, forMe: forMe(s), took: s.taker === me.email });
    if (req.method === 'GET') {
      const shown = list.filter((s) => lead(me) || s.from === me.email || s.taker === me.email || forMe(s));
      return json({ swaps: shown.sort((a, b) => a.date.localeCompare(b.date)).map(view) });
    }
    const b = await body(req);
    const save = () => plans().setJSON('swaps', list.slice(-200));
    const whenFor = async (email, s) => { const L = await langOf(email); return { L, when: dayName(s.date, L), h: `${s.start}–${s.end}` }; };
    if (b.action === 'ask') {
      const date = String(b.date || '');
      if (!DATE.test(date) || date < today) return json({ error: 'invalid' }, 400);
      const slot = await plannedOn(me, date);
      if (!slot || !ahead(date, slot.start, slot.end)) return json({ error: 'noshift' }, 400);
      if (list.some((s) => s.from === me.email && s.date === date && s.status === 'open')) return json({ error: 'dup' }, 409);
      const team = (await activeUsers()).filter((u) => u.email !== me.email && (u.role !== 'admin' || u.workMode));
      let to = '*', toName = '';
      if (b.to && b.to !== '*') {
        const u = team.find((x) => rosterId(x.email) === String(b.to));
        if (!u) return json({ error: 'user' }, 404);
        to = u.email; toName = u.name;
      }
      const s = { id: randomBytes(5).toString('hex'), date, start: slot.start, end: slot.end, from: me.email, fromName: me.name, to, toName, status: 'open', passed: [], at: new Date().toISOString() };
      list.push(s); await save();
      const targets = to === '*' ? team.filter((u) => !lead(u)).map((u) => u.email) : [to];
      for (const email of targets) { const W = await whenFor(email, s); try { await sendTo(email, (T) => ({ ...T.swapAsk(me.name, W.when, W.h), tag: `sw-${s.id}`, url: './#horaire' }), 'sched'); } catch { /* jamais bloquant */ } }
      return json({ swap: view(s) });
    }
    const s = list.find((x) => x.id === b.id);
    if (!s) return json({ error: 'missing' }, 404);
    if (b.action === 'cancel') {
      if (s.from !== me.email || s.status !== 'open') return json({ error: 'state' }, 409);
      s.status = 'cancel'; await save();
      return json({ swap: view(s) });
    }
    if (b.action === 'reopen') { // Annuler un « retirer ma demande »
      if (s.from !== me.email || s.status !== 'cancel' || s.date < today || list.some((x) => x !== s && x.from === me.email && x.date === s.date && x.status === 'open')) return json({ error: 'state' }, 409);
      s.status = 'open'; await save();
      return json({ swap: view(s) });
    }
    if (b.action === 'decline') {
      if (!forMe(s)) return json({ error: 'state' }, 409);
      if (s.to === '*') s.passed = [...new Set([...(s.passed || []), me.email])];
      else {
        s.status = 'no';
        const W = await whenFor(s.from, s);
        try { await sendTo(s.from, (T) => ({ ...T.swapNo(me.name, W.when), tag: `sw-${s.id}`, url: './#horaire' }), 'sched'); } catch { /* ignore */ }
      }
      await save();
      return json({ swap: view(s) });
    }
    if (b.action === 'accept') {
      if (!forMe(s) || !ahead(s.date, s.start, s.end)) return json({ error: 'state' }, 409);
      const owner = await users().get(s.from, { type: 'json' });
      const still = owner && !owner.removed ? await plannedOn(owner, s.date) : null;
      if (!still || still.start !== s.start || still.end !== s.end) { s.status = 'cancel'; await save(); return json({ error: 'gone' }, 409); }
      if (await plannedOn(me, s.date)) return json({ error: 'busy' }, 409);
      // Juste avant d'écrire, on relit tout : deux personnes qui acceptent en même temps, un seul gagne.
      // (Les blobs n'ont pas de verrou : ça réduit la fenêtre au minimum, sans la fermer tout à fait.)
      list = ((await plans().get('swaps', { type: 'json' })) || []).filter((x) => x.date >= plusDays(today, -14));
      const fresh = list.find((x) => x.id === s.id);
      const ovFrom = (await plans().get(`ov:${s.from}`, { type: 'json' })) || {};
      const ovMe = (await plans().get(`ov:${me.email}`, { type: 'json' })) || {};
      if (!fresh || fresh.status !== 'open' || ovFrom[s.date]?.off) return json({ error: 'state' }, 409);
      // Un congé (même mis par un superviseur) ou d'autres heures ce jour-là : on ne l'écrase pas.
      if (ovMe[s.date] && !(ovMe[s.date].off && ovMe[s.date].swap)) return json({ error: 'busy' }, 409);
      // Réserver d'abord, relire ensuite : si quelqu'un d'autre a réservé en même temps, il garde le quart.
      // (Toujours pas atomique — les blobs n'ont pas de verrou — mais la fenêtre devient minuscule.)
      list[list.indexOf(fresh)] = Object.assign(s, fresh, { status: 'done', taker: me.email, takerName: me.name, doneAt: clock().toISOString() });
      await save();
      const check = ((await plans().get('swaps', { type: 'json' })) || []).find((x) => x.id === s.id);
      if (check?.taker !== me.email) return json({ error: 'state' }, 409);
      s.prev = { from: ovFrom[s.date] || null, me: ovMe[s.date] || null };
      ovFrom[s.date] = { off: true, swap: s.id, by: me.name };
      ovMe[s.date] = { start: s.start, end: s.end, swap: s.id, by: s.fromName };
      await plans().setJSON(`ov:${s.from}`, ovFrom);
      await plans().setJSON(`ov:${me.email}`, ovMe);
      Object.assign(s, { status: 'done', taker: me.email, takerName: me.name, doneAt: clock().toISOString() });
      await save();
      const W = await whenFor(s.from, s);
      try { await sendTo(s.from, (T) => ({ ...T.swapOk(me.name, W.when), tag: `sw-${s.id}`, url: './#horaire' }), 'sched'); } catch { /* ignore */ }
      for (const u of (await activeUsers()).filter((x) => lead(x) && x.email !== me.email && x.email !== s.from)) {
        const L = await langOf(u.email);
        try { await sendTo(u.email, (T) => ({ ...T.swapDone(s.fromName, me.name, dayName(s.date, L)), tag: `sw-${s.id}`, url: './#equipe' }), 'sched'); } catch { /* ignore */ }
      }
      return json({ swap: view(s) });
    }
    if (b.action === 'undo') { // celui qui a accepté (15 min) ou un superviseur : tout revient comme avant
      if (s.status !== 'done' || !(lead(me) || (s.taker === me.email && clock().getTime() - Date.parse(s.doneAt) < UNDO_SWAP_MS))) return json({ error: 'state' }, 409);
      // Rien n'a bougé depuis (pas d'autre échange, pas de congé, pas de changement du superviseur) : sinon, on ne défait rien.
      const ovF = (await plans().get(`ov:${s.from}`, { type: 'json' })) || {}, ovT = (await plans().get(`ov:${s.taker}`, { type: 'json' })) || {};
      if (ovF[s.date]?.swap !== s.id || ovT[s.date]?.swap !== s.id) return json({ error: 'changed' }, 409);
      const put = async (email, v) => { const all = (await plans().get(`ov:${email}`, { type: 'json' })) || {}; if (v) all[s.date] = v; else delete all[s.date]; await plans().setJSON(`ov:${email}`, all); };
      await put(s.from, s.prev?.from || null);
      await put(s.taker, s.prev?.me || null);
      Object.assign(s, { status: 'open', taker: '', takerName: '', doneAt: '', prev: null });
      await save();
      return json({ swap: view(s) });
    }
    return json({ error: 'action' }, 400);
  }

  // ---------- La fiche d'un employé (superviseurs seulement, propriétaire 25 oct.) ----------
  //  notes:<courriel> → [{ id, kind: note | report, cat, text, by, at }]
  // Notes privées et « Signaler cet employé » : jamais vus par l'employé (ni par personne d'autre qu'un
  // superviseur ou l'admin). Pas de note, pas de score : seulement des mots, pour s'entraider.
  const people = () => getStore('people');
  const NOTE_CATS = ['retard', 'tache', 'securite', 'attitude', 'bravo', 'autre'];
  async function peopleApi(req, me) {
    if (!lead(me)) return json({ error: 'boss' }, 403);
    const params = new URL(req.url).searchParams;
    if (req.method === 'GET') {
      const email = String(params.get('email') || '').trim().toLowerCase();
      if (!EMAIL.test(email)) return json({ error: 'invalid' }, 400);
      return json({ notes: ((await people().get(`notes:${email}`, { type: 'json' })) || []).slice().reverse() });
    }
    const b = await body(req);
    const email = String(b.email || '').trim().toLowerCase();
    const u = EMAIL.test(email) ? await users().get(email, { type: 'json' }) : null;
    if (!u) return json({ error: 'user' }, 404);
    const list = (await people().get(`notes:${email}`, { type: 'json' })) || [];
    if (b.action === 'add') {
      const text = String(b.text || '').trim().slice(0, 1000);
      const kind = b.kind === 'report' ? 'report' : 'note';
      const cat = NOTE_CATS.includes(b.cat) ? b.cat : kind === 'report' ? 'autre' : '';
      if (!text && !(kind === 'report' && cat !== 'autre')) return json({ error: 'invalid' }, 400);
      const note = { id: randomBytes(5).toString('hex'), kind, cat, text, by: me.name, at: new Date().toISOString() };
      await people().setJSON(`notes:${email}`, [...list, note].slice(-200));
      return json({ note });
    }
    if (b.action === 'del') {
      await people().setJSON(`notes:${email}`, list.filter((n) => n.id !== b.id));
      return json({ ok: true });
    }
    return json({ error: 'action' }, 400);
  }

  // ---------- Le coin des superviseurs + les idées des employés (propriétaire 25 oct.) ----------
  //  ideas → [{ id, kind: post | idea, text, about: { kind: task | gym, label }, by, byEmail, at, status, statusBy }]
  // Les superviseurs écrivent quand ils veulent et se lisent entre eux. Un employé envoie une idée;
  // il ne voit que les siennes (avec la réponse : « On essaie », « Pas pour l'instant », « Ça marche »).
  const IDEA_STATUS = ['open', 'try', 'later', 'worked'];
  async function ideasApi(req, me) {
    const store = getStore('ideas');
    const all = (await store.get('all', { type: 'json' })) || [];
    const strip = ({ byEmail, ...x }) => x;
    if (req.method === 'GET') {
      if (lead(me)) return json({ ideas: all.slice().reverse().map(strip) });
      return json({ ideas: all.filter((x) => x.kind === 'idea' && x.byEmail === me.email).reverse().map(strip) });
    }
    const b = await body(req, 20_000);
    if (b.action === 'post' || b.action === 'suggest') {
      const text = String(b.text || '').trim().slice(0, 1500);
      if (!text) return json({ error: 'invalid' }, 400);
      if (b.action === 'post' && !lead(me)) return json({ error: 'boss' }, 403);
      const about = b.about && ['task', 'gym'].includes(b.about.kind) ? { kind: b.about.kind, label: String(b.about.label || '').slice(0, 80) } : null;
      // Pas plus de 20 idées ouvertes par personne : personne ne peut noyer le coin des superviseurs.
      if (b.action === 'suggest' && all.filter((x) => x.kind === 'idea' && x.byEmail === me.email && x.status === 'open').length >= 20) return json({ error: 'limit' }, 429);
      const item = { id: randomBytes(5).toString('hex'), kind: b.action === 'post' ? 'post' : 'idea', text, about, by: me.name, byEmail: me.email, at: new Date().toISOString(), status: 'open', statusBy: '' };
      const next = [...all, item];
      const keep = new Set([...next.filter((x) => x.kind === 'post').slice(-200), ...next.filter((x) => x.kind === 'idea').slice(-300)]);
      await store.setJSON('all', next.filter((x) => keep.has(x)));
      return json({ idea: strip(item) });
    }
    const it = all.find((x) => x.id === b.id);
    if (!it) return json({ error: 'missing' }, 404);
    if (b.action === 'status') {
      if (!lead(me) || !IDEA_STATUS.includes(b.status)) return json({ error: 'boss' }, 403);
      Object.assign(it, { status: b.status, statusBy: b.status === 'open' ? '' : me.name, statusAt: new Date().toISOString() });
      await store.setJSON('all', all);
      return json({ idea: strip(it) });
    }
    if (b.action === 'del') {
      if (!lead(me) && it.byEmail !== me.email) return json({ error: 'boss' }, 403);
      await store.setJSON('all', all.filter((x) => x !== it));
      return json({ ok: true });
    }
    return json({ error: 'action' }, 400);
  }

  // ---------- Avis de l'admin sur les mises à jour (lus par Claude pour la suite) ----------
  async function feedbackApi(req, me) {
    if (me?.role !== 'admin') return json({ error: 'admin' }, 403);
    const fb = getStore('feedback');
    if (req.method === 'POST') {
      const b = await body(req, 20_000);
      const clean = { update: String(b.update || '').slice(0, 60), mood: ['good', 'ok', 'bad'].includes(b.mood) ? b.mood : 'ok', good: String(b.good || '').slice(0, 3000), bad: String(b.bad || '').slice(0, 3000), by: me.name, at: new Date().toISOString() };
      await fb.setJSON(`${Date.now()}`, clean);
      return json({ ok: true });
    }
    const { blobs } = await fb.list();
    const keys = blobs.map((x) => x.key).sort().reverse().slice(0, 30);
    return json({ feedback: (await Promise.all(keys.map((k) => fb.get(k, { type: 'json' })))).filter(Boolean) });
  }

  async function handle(req) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!['GET', 'POST'].includes(req.method)) return json({ error: 'method' }, 405);
    const route = new URL(req.url).pathname.replace(/\/+$/, '').split('/').pop();
    try {
      if (route === 'auth') return await auth(req);
      const routes = { users: team, board: shifts, problems: reports, alerts: alertList, push: pushApi, feedback: feedbackApi, plan: planApi, roster, people: peopleApi, ideas: ideasApi, swaps: swapsApi };
      if (!routes[route]) return json({ error: 'route' }, 404);
      const me = await currentUser(req);
      if (!me) return json({ error: 'auth' }, 401);
      return await routes[route](req, me);
    } catch (err) {
      return json({ error: err.message || 'server' }, err.status || 500);
    }
  }
  handle.remindDue = remindDue;
  return handle;
}

// Magasin en mémoire (serveur local et tests), même interface que Netlify Blobs.
export function memoryStores() {
  const all = new Map();
  return (name) => {
    if (!all.has(name)) all.set(name, new Map());
    const m = all.get(name);
    return {
      async get(key, { type } = {}) {
        if (!m.has(key)) return null;
        const v = m.get(key);
        return type === 'json' ? JSON.parse(v) : v;
      },
      async setJSON(key, value) { m.set(key, JSON.stringify(value)); },
      async set(key, data) { m.set(key, data.buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data); },
      async delete(key) { m.delete(key); },
      async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
    };
  };
}
