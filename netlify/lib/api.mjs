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
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const SESSION_DAYS = 365;
const MAX_PHOTO_BYTES = 900_000;

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
const publicUser = (u) => ({ name: u.name, email: u.email, role: u.role, alerts: lead(u) && u.alerts === true, schedule: cleanSchedule(u.schedule), avatar: cleanAvatar(u.avatar) });
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
  fr: { remind: (h) => ({ title: 'Ton quart commence bientôt', body: `À ${h}. Bon quart !` }), urgent: (cat, by) => ({ title: `⚑ Urgent : ${cat}`, body: `Signalé par ${by}. Touchez pour voir.` }), test: { title: 'Ça marche !', body: 'Les notifications sont activées.' } },
  en: { remind: (h) => ({ title: 'Your shift starts soon', body: `At ${h}. Have a good shift!` }), urgent: (cat, by) => ({ title: `⚑ Urgent: ${cat}`, body: `Reported by ${by}. Tap to see it.` }), test: { title: 'It works!', body: 'Notifications are on.' } },
};

export function createApi({ getStore, env, push = webPush, fetchFn = (...a) => fetch(...a) }) {
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
      if ((tries[ip] || 0) >= 10 || (tries._all || 0) >= 300) return json({ error: 'tries' }, 429);
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
      const u = await users().get(email, { type: 'json' });
      const ok = u && !u.removed && sameText(hashPassword(String(b.password || ''), u.salt), u.hash);
      if (!ok) return json({ error: 'login' }, 401);
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
      return json({ users: all.filter((u) => u && !u.removed).map((u) => ({ ...publicUser(u), created: u.created })).sort((a, b) => a.name.localeCompare(b.name)) });
    }
    const b = await body(req);
    const email = String(b.email || '').trim().toLowerCase();
    const u = await users().get(email, { type: 'json' });
    if (!u || u.removed) return json({ error: 'user' }, 404);
    if (b.action === 'reset') {
      const password = String(b.password || '');
      if (password.length < 6 || password.length > 200) return json({ error: 'password' }, 400);
      u.salt = randomBytes(16).toString('hex');
      u.hash = hashPassword(password, u.salt);
      await users().setJSON(email, u);
      return json({ ok: true });
    }
    if (b.action === 'remove') {
      if (email === me.email) return json({ error: 'self' }, 400);
      await users().setJSON(email, { ...u, removed: true, hash: '' });
      return json({ ok: true });
    }
    return json({ error: 'action' }, 400);
  }

  // ---------- Historique des quarts ----------
  async function shifts(req, me) {
    const store = board();
    // Propriétaire : pas de surveillance. Un quart encore en cours n'est visible que par la personne
    // qui le fait (sa sauvegarde), et l'heure où chaque case a été cochée n'est jamais renvoyée.
    const mine = (s) => String(s?.name || '').trim().toLowerCase() === String(me?.name || '').trim().toLowerCase();
    const shown = (list) => (list || []).filter((s) => !s.open || mine(s)).map((s) => ({ ...s, items: (s.items || []).map(({ doneAt, ...i }) => i) }));
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
    if (raw?.action === 'delete') {
      if (me?.role !== 'admin') return json({ error: 'admin' }, 403);
      if (!DATE.test(String(raw.date || '')) || ![1, 2].includes(Number(raw.shift))) return json({ error: 'invalid' }, 400);
      const name = String(raw.name || '').trim().toLowerCase();
      const list = (await store.get(raw.date, { type: 'json' })) || [];
      const left = list.filter((x) => !(Number(x.shift) === Number(raw.shift) && String(x.name || '').trim().toLowerCase() === name));
      if (left.length === list.length) return json({ error: 'missing' }, 404);
      await store.setJSON(raw.date, left);
      return json({ ok: true });
    }
    // L'admin corrige les tâches d'un quart déjà enregistré (ex. oublié de cocher), n'importe quel jour.
    // Corriger les cases d'un quart déjà enregistré : l'admin, n'importe quel quart;
    // chaque personne, son propre quart pendant 36 h après le premier envoi (propriétaire).
    if (raw?.action === 'edit') {
      if (!DATE.test(String(raw.date || '')) || ![1, 2].includes(Number(raw.shift)) || !Array.isArray(raw.items)) return json({ error: 'invalid' }, 400);
      const name = String(raw.name || '').trim().toLowerCase();
      const list = (await store.get(raw.date, { type: 'json' })) || [];
      const s = list.find((x) => Number(x.shift) === Number(raw.shift) && String(x.name || '').trim().toLowerCase() === name);
      if (!s) return json({ error: 'missing' }, 404);
      const admin = me?.role === 'admin';
      const own = String(me?.name || '').trim().toLowerCase() === name;
      const firstAt = new Date(s.savedAt || s.submittedAt || 0).getTime();
      if (!admin && !own) return json({ error: 'admin' }, 403);
      if (!admin && (!firstAt || Date.now() - firstAt > 36 * 3600e3)) return json({ error: 'locked' }, 409);
      const ok = new Set(['done', 'notdone', 'unchecked']);
      const prev = new Map((s.items || []).map((i) => [i.id, i]));
      const edited = raw.items.slice(0, 40).filter((i) => i && typeof i.id === 'string' && ok.has(i.status)).map((i) => {
        const { doneAt, ...o } = prev.get(i.id) || { id: i.id.slice(0, 40), reason: '', remark: '' };
        return { ...o, status: i.status, reason: i.status === 'notdone' ? o.reason : '' };
      });
      const seen = new Set(edited.map((i) => i.id));
      s.items = [...(s.items || []).filter((i) => !seen.has(i.id)), ...edited].slice(0, 40); // le pointage et le reste restent tels quels
      s.done = s.items.filter((i) => i.status === 'done').length;
      s.total = Math.max(s.total || 0, s.items.length);
      if (!own) { s.editedBy = me.name || ''; s.editedAt = new Date().toISOString(); } // sa propre correction : pas d'étiquette
      await store.setJSON(raw.date, list);
      return json({ ok: true, shift: s });
    }
    // Un superviseur valide (ou refuse) les activités personnalisées d'un quart.
    if (raw?.action === 'custom') {
      if (!['boss', 'admin'].includes(me?.role)) return json({ error: 'boss' }, 403);
      if (!DATE.test(String(raw.date || '')) || ![1, 2].includes(Number(raw.shift)) || !['approved', 'rejected'].includes(raw.status)) return json({ error: 'invalid' }, 400);
      const name = String(raw.name || '').trim().toLowerCase();
      const list = (await store.get(raw.date, { type: 'json' })) || [];
      const s = list.find((x) => Number(x.shift) === Number(raw.shift) && String(x.name || '').trim().toLowerCase() === name);
      if (!s?.custom?.length) return json({ error: 'missing' }, 404);
      s.customStatus = raw.status;
      s.customBy = me.name || '';
      await store.setJSON(raw.date, list);
      return json({ ok: true });
    }
    const shift = sanitizeShift(raw);
    if (!shift) return json({ error: 'invalid' }, 400);
    const list = (await store.get(shift.date, { type: 'json' })) || [];
    // Propriétaire : un quart enregistré se modifie pendant 36 h après son premier envoi
    // (heure du serveur, pas celle du téléphone). Un quart encore « en cours » se continue toujours.
    const old = list.find((x) => x.shift === shift.shift && x.name.toLowerCase() === shift.name.toLowerCase());
    const today = localDay(new Date());
    const firstAt = old && !old.open ? Date.parse(old.savedAt || old.submittedAt || '') || 0 : 0;
    if (old && !old.open && (!firstAt || Date.now() - firstAt > 36 * 3600e3)) return json({ error: 'locked' }, 409);
    const savedAt = shift.open ? '' : old && !old.open && old.savedAt ? old.savedAt : new Date().toISOString();
    // La validation vient du superviseur, jamais du téléphone : elle reste tant que les
    // activités ne changent pas; une activité changée redevient « à valider ».
    const sameCustom = old && JSON.stringify(old.custom || []) === JSON.stringify(shift.custom);
    shift.customStatus = shift.custom.length ? (sameCustom && old.customStatus) || 'pending' : '';
    shift.customBy = shift.custom.length && sameCustom ? old.customBy || '' : '';
    await store.setJSON(shift.date, mergeShift(list, { ...shift, savedOn: today, savedAt }));
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
      const clean = sanitizeProblem(b);
      if (!clean) return json({ error: 'invalid' }, 400);
      const files = (Array.isArray(b.photos) ? b.photos : []).slice(0, MAX_PROBLEM_PHOTOS)
        .map((s) => (typeof s === 'string' ? Buffer.from(s, 'base64') : null))
        .filter((buf) => buf && buf.length > 3 && buf.length <= MAX_PHOTO_BYTES && buf[0] === 0xff && buf[1] === 0xd8);
      const id = problemId();
      await Promise.all(files.map((buf, i) => photos().set(`${id}-${i}`, buf)));
      await cleanPhotos();
      const p = { ...clean, id, by: me.name, byEmail: me.email, photos: files.length, status: 'open', resolvedBy: '', resolvedAt: '' };
      await problems().setJSON(id, p);
      if (p.urgent) { try { await notifyUrgent(p); } catch { /* l'envoi ne bloque jamais le signalement */ } }
      return json({ id });
    }
    if (!lead(me)) return json({ error: 'boss' }, 403);
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
      return p ? json({ problem: p }) : json({ error: 'missing' }, 404);
    }
    const { blobs } = await problems().list();
    const keys = blobs.map((x) => x.key).filter((k) => PROBLEM_ID.test(k)).sort().reverse().slice(0, 150);
    const list = await Promise.all(keys.map((k) => problems().get(k, { type: 'json' })));
    return json({ problems: list.filter(Boolean) });
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
  // Envoie à tous les appareils d'une personne; les abonnements expirés (404/410) sont retirés.
  async function sendTo(email, make) {
    const rec = await pushes().get(email, { type: 'json' });
    if (!rec?.subs?.length) return 0;
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
      if (rec && rec.urgent !== false) await sendTo(u.email, (T) => ({ ...T.urgent(cat(rec.lang || 'fr'), p.by), tag: `p-${p.id}`, url: './#patron', urgent: true }));
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
      const slot = u && !u.removed ? cleanSchedule(u.schedule)[String(wd)] : null;
      if (!slot) continue;
      const [h, m] = slot.start.split(':').map(Number);
      const until = h * 60 + m - nowMin;
      if (until < 1 || until > 12) continue;
      await pushes().setJSON(key, { ...rec, reminded: day });
      sent += await sendTo(key, (T) => ({ ...T.remind(slot.start), tag: `r-${day}`, url: './' }));
    }
    return sent;
  }
  async function pushApi(req, me) {
    if (req.method === 'GET') {
      const rec = await pushRecord(me.email);
      const n = lead(me) ? await ntfySettings(true) : null;
      return json({ key: (await vapid()).publicKey, devices: rec.subs.length, remind: rec.remind !== false, urgent: rec.urgent !== false, ntfy: n ? { topic: n.topic, on: n.on === true } : null });
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
      if (typeof b.remind === 'boolean') next.remind = b.remind;
      if (typeof b.urgent === 'boolean') next.urgent = b.urgent;
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

  async function handle(req) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!['GET', 'POST'].includes(req.method)) return json({ error: 'method' }, 405);
    const route = new URL(req.url).pathname.replace(/\/+$/, '').split('/').pop();
    try {
      if (route === 'auth') return await auth(req);
      const routes = { users: team, board: shifts, problems: reports, alerts: alertList, push: pushApi };
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
