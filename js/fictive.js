// « Essayer avec une équipe fictive » (bêta, propriétaire 22 oct.) : un gym inventé, déjà
// rempli — 10 employés, 6 superviseurs, 3 mois de quarts, des signalements, des tâches —
// pour voir l'app comme si tout le monde l'utilisait. Tout se passe dans ce navigateur :
// un faux serveur répond comme le vrai. Rien n'est envoyé; tout s'efface en quittant.

import { buildPlan, detectShift } from './planner.js';
import { sanitizeShift, mergeShift } from './board-shape.js';
import { sanitizeProblem } from './problem-shape.js';

const FLAG = 'gym-fictive';
const DB = 'gym-fictive-db';
const DAYS_BACK = 92; // environ 3 mois (propriétaire)
const MASC = ['lapin', 'ours', 'renard', 'chat', 'faon', 'souris', 'salut', 'coucou']; // chaque mascotte sert deux fois

export const fictiveOn = () => { try { return Boolean(JSON.parse(sessionStorage.getItem(FLAG))); } catch { return false; } };
export const fictiveWho = () => { try { return JSON.parse(sessionStorage.getItem(FLAG))?.who || ''; } catch { return ''; } };

const H = { jour: ['07:30', '15:30'], soir: ['16:30', '23:00'], court: ['18:00', '23:00'], mid: ['15:00', '21:00'], tot: ['06:00', '11:00'], bam: ['08:00', '16:00'], bpm: ['12:00', '19:00'] /* propriétaire : les superviseurs ne finissent pas tard */ };
const day = (k) => ({ start: H[k][0], end: H[k][1] });
// Lundi = 0. Chaque jour a 2 à 4 personnes; quelques horaires « Autre » pour faire vrai.
const EMPLOYEES = [
  ['Noah', { 0: 'jour', 1: 'jour', 2: 'jour', 3: 'jour' }],
  ['Léa', { 3: 'jour', 4: 'jour', 5: 'jour', 6: 'jour' }],
  ['Maya', { 0: 'soir', 1: 'soir', 5: 'soir' }],
  ['Félix', { 2: 'soir', 3: 'soir', 4: 'soir' }],
  ['Zoé', { 6: 'soir', 0: 'court', 4: 'court' }],
  ['Samuel', { 1: 'court', 2: 'court', 5: 'court', 6: 'court' }],
  ['Chloé', { 0: 'mid', 2: 'mid', 4: 'mid' }],
  ['William', { 5: 'jour', 6: 'jour', 1: 'tot' }],
  ['Rosalie', { 3: 'mid', 5: 'mid', 6: 'mid' }],
  ['Thomas', { 1: 'jour', 2: 'tot', 4: 'jour' }],
];
// Les superviseurs ont leurs heures aussi (propriétaire : AM / PM), un ou deux le matin, un le soir.
const BOSSES = [
  ['Martine', { 0: 'bam', 1: 'bam', 2: 'bam', 3: 'bam' }],
  ['Patrick', { 0: 'bpm', 1: 'bpm', 2: 'bpm' }],
  ['Isabelle', { 3: 'bam', 4: 'bam', 5: 'bam', 6: 'bam' }],
  ['Marc-André', { 3: 'bpm', 4: 'bpm', 5: 'bpm' }],
  ['Nathalie', { 4: 'bam', 6: 'bpm', 0: 'bam' }],
  ['Sylvain', { 6: 'bam', 5: 'bpm', 1: 'bam' }],
];
const slug = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-');
const mailOf = (n) => `${slug(n)}@equipe-fictive.ca`;

export const FICTIVE_PEOPLE = [
  ...EMPLOYEES.map(([name, sc], i) => ({ name, email: mailOf(name), role: 'employee', avatar: `m:${MASC[i % 8]}`, schedule: Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, day(v)])) })),
  ...BOSSES.map(([name, sc], i) => ({ name, email: mailOf(name), role: 'boss', avatar: `m:${MASC[(i + 10) % 8]}`, schedule: Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, day(v)])) })),
];

// Hasard « fixe » : le même gym chaque fois.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };
const dow = (s) => (new Date(`${s}T12:00:00`).getDay() + 6) % 7;
const atISO = (date, hhmm) => new Date(`${date}T${hhmm}:00`).toISOString();

const NOTES = ['Tout est beau ce soir.', 'Beaucoup de monde vers 18 h.', 'La sécheuse est lente.', 'Le gym était très propre à mon arrivée.', 'Plus de savon dans le vestiaire des hommes.', 'Musique arrêtée vers 20 h, rallumée.'];
const PROBLEMS = [
  ['machine', 'Tapis 3', 'Fait un bruit quand il accélère.', true],
  ['degat', 'Allée cardio', 'Bouteille renversée, plancher glissant.', true],
  ['materiel', '', 'Savon, guenilles', false],
  ['toilettes', 'Vestiaire femmes', 'Une toilette coule.', false],
  ['batiment', 'Studio 2', 'Une lumière clignote.', false],
  ['objet', 'Réception', 'Un cellulaire trouvé près des bancs.', false],
  ['machine', 'Poulie haute', 'Le câble est usé.', true],
  ['difficile', 'Zone C', 'Les plateformes sont très sales, pas eu le temps de tout faire.', false],
  ['materiel', '', 'Sacs à poubelle', false],
  ['batiment', 'Entrée', 'La porte ferme mal.', false],
];

function generate(today) {
  const r = rng(20261022);
  const board = {};
  const problems = [];
  const quality = Object.fromEntries(EMPLOYEES.map(([n]) => [n, 0.86 + r() * 0.13]));
  for (let back = DAYS_BACK; back >= 0; back--) {
    const date = addDays(today, -back);
    const nowMin = back === 0 ? new Date().getHours() * 60 + new Date().getMinutes() : 99999;
    for (const p of FICTIVE_PEOPLE.filter((x) => x.role === 'employee')) {
      const h = p.schedule[dow(date)];
      if (!h) continue;
      const end = +h.end.slice(0, 2) * 60 + +h.end.slice(3);
      if (back === 0 && nowMin < end) continue; // aujourd'hui : seulement les quarts déjà finis
      const shift = detectShift(h.start, h.end);
      const plan = buildPlan({ shift, date, start: h.start, end: h.end, lang: 'fr' });
      const q = quality[p.name];
      const items = [{ id: 'pointage', status: 'done' }];
      for (const it of plan.items.filter((x) => x.kind === 'task')) {
        const x = r();
        if (x < q) items.push({ id: it.id, status: 'done' });
        else if (x < q + (1 - q) * 0.6) items.push({ id: it.id, status: 'notdone', reason: ['temps', 'occupe', 'materiel', 'inaccessible'][Math.floor(r() * 4)] });
        else items.push({ id: it.id, status: 'unchecked' });
      }
      const flags = [];
      if (r() < 0.09) {
        const [category, location, text, urgent] = PROBLEMS[Math.floor(r() * PROBLEMS.length)];
        const at = atISO(date, `${String(Math.floor(end / 60) - 2).padStart(2, '0')}:${String(Math.floor(r() * 50)).padStart(2, '0')}`);
        const id = `${(new Date(at).getTime()).toString(36).padStart(9, '0')}${Math.floor(r() * 1e5).toString(36)}`;
        flags.push({ id, category, location, text, urgent: urgent && r() < 0.7, at });
        const old = back > 3 || (back > 0 && r() < 0.5);
        problems.push({ id, category, location, text, urgent: flags[0].urgent, at, by: p.name, byEmail: p.email, photos: 0, status: old && r() < 0.92 ? 'resolved' : 'open', resolvedBy: BOSSES[Math.floor(r() * 6)][0], resolvedAt: old ? atISO(addDays(date, 1), '10:00') : '' });
      }
      const sent = atISO(date, h.end === '23:00' ? '22:58' : h.end);
      const rec = sanitizeShift({ date, shift, name: p.name, start: h.start, end: h.end, submittedAt: sent, savedAt: sent, items, flags, notes: r() < 0.12 ? NOTES[Math.floor(r() * NOTES.length)] : '', supervisor: '' });
      rec.done = items.filter((i) => i.status === 'done').length; rec.total = items.length;
      for (const pr of problems.filter((x) => x.status === 'resolved' && !x.resolvedAt)) pr.resolvedAt = sent;
      board[date] = [...(board[date] || []), rec];
    }
  }
  // Ce qui s'en vient : quelques tâches et un changement d'horaire, comme dans la vraie vie.
  const tasks = [
    { id: 'f1', date: addDays(today, 1), title: 'Laver les vitres de l’entrée', time: '19:30', minutes: 20, who: '*', by: 'Martine', at: new Date().toISOString() },
    { id: 'f2', date: today, title: 'Vérifier les extincteurs', time: '', minutes: 15, who: mailOf('Noah'), by: 'Patrick', at: new Date().toISOString() },
    { id: 'f3', date: addDays(today, 2), title: 'Ranger le local d’entretien', time: '20:30', minutes: 30, who: mailOf('Félix'), by: 'Isabelle', at: new Date().toISOString() },
  ];
  const overrides = { [mailOf('Maya')]: { [addDays(today, 3)]: { start: '18:00', end: '23:00', by: 'Martine' } } };
  return { today, users: Object.fromEntries(FICTIVE_PEOPLE.map((p) => [p.email, { ...p }])), board, problems: problems.reverse(), tasks, overrides };
}

let db = null;
function load() {
  if (db) return db;
  const today = iso(new Date());
  try { db = JSON.parse(sessionStorage.getItem(DB)); } catch { db = null; }
  if (!db || db.today !== today) { db = generate(today); persist(); }
  return db;
}
function persist() { try { sessionStorage.setItem(DB, JSON.stringify(db)); } catch { /* trop gros : on garde en mémoire */ } }

export function fictiveUser() { const d = load(); return d.users[fictiveWho()] || null; }
export function fictiveBoardSize() { const d = load(); return Object.values(d.board).flat().length; }

const pub = (u) => ({ name: u.name, email: u.email, role: u.role, alerts: u.role === 'boss', schedule: u.schedule || {}, scheduleBy: u.scheduleBy || '', scheduleAt: u.scheduleAt || '', avatar: u.avatar || '' });
const err = (status, error = 'fictive') => Object.assign(new Error(error), { status });

// Le faux serveur : mêmes routes, mêmes réponses que netlify/lib/api.mjs.
export async function fakeRequest(path, { method = 'GET', body } = {}) {
  const d = load();
  const me = d.users[fictiveWho()];
  if (!me) throw err(401, 'auth');
  const url = new URL(path, 'http://fictif/');
  const route = url.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  const P = url.searchParams;
  const lead = me.role === 'boss';
  const mine = (s) => s.name.toLowerCase() === me.name.toLowerCase();
  const shown = (list) => (list || []).filter((s) => !s.open || mine(s));
  await new Promise((r) => setTimeout(r, 60)); // un petit délai, comme un vrai réseau
  if (route === 'auth') {
    if (method === 'GET') return { user: pub(me) };
    if (body?.action === 'schedule') { me.schedule = body.schedule || {}; me.scheduleBy = ''; persist(); return { user: pub(me) }; }
    if (body?.action === 'avatar') { me.avatar = body.avatar || ''; persist(); return { user: pub(me) }; }
    return { ok: true, user: pub(me) };
  }
  if (route === 'users') {
    if (!lead) throw err(403, 'boss');
    if (method === 'GET') return { users: Object.values(d.users).map(pub).sort((a, b) => a.name.localeCompare(b.name)) };
    const u = d.users[String(body?.email || '').toLowerCase()];
    if (!u) throw err(404, 'user');
    if (body.action === 'schedule') { u.schedule = body.schedule || {}; u.scheduleBy = me.name; u.scheduleAt = new Date().toISOString(); persist(); return { user: pub(u) }; }
    return { ok: true };
  }
  if (route === 'board') {
    if (method === 'GET') {
      if (P.has('recent')) {
        const want = Math.min(Math.max(Number(P.get('recent')) || 40, 1), 1000);
        const days = {}; let n = 0;
        for (const date of Object.keys(d.board).sort().reverse()) { days[date] = shown(d.board[date]); n += days[date].length; if (n >= want) break; }
        return { days };
      }
      const dates = String(P.get('dates') || '').split(',').filter(Boolean);
      return { days: Object.fromEntries(dates.map((x) => [x, shown(d.board[x])])) };
    }
    const find = () => (d.board[body.date] || []).find((x) => x.shift === Number(body.shift) && x.name.toLowerCase() === String(body.name || '').toLowerCase());
    if (body?.action === 'delete') { d.board[body.date] = (d.board[body.date] || []).filter((x) => x !== find()); persist(); return { ok: true }; }
    if (body?.action === 'custom') { const s = find(); if (s) { s.customStatus = body.status; s.customBy = me.name; persist(); } return { ok: true }; }
    if (body?.action === 'edit') {
      const s = find(); if (!s) throw err(404, 'missing');
      const by = new Map((body.items || []).map((i) => [i.id, i.status]));
      s.items = s.items.map((i) => (by.has(i.id) ? { ...i, status: by.get(i.id) } : i));
      for (const [id, status] of by) if (!s.items.some((i) => i.id === id)) s.items.push({ id, status });
      s.done = s.items.filter((i) => i.status === 'done').length; s.total = Math.max(s.total || 0, s.items.length);
      persist(); return { ok: true, shift: s };
    }
    const shift = sanitizeShift(body);
    if (!shift) throw err(400, 'invalid');
    const old = (d.board[shift.date] || []).find((x) => x.shift === shift.shift && x.name.toLowerCase() === shift.name.toLowerCase());
    const savedAt = shift.open ? '' : old?.savedAt && !old.open ? old.savedAt : new Date().toISOString();
    d.board[shift.date] = mergeShift(d.board[shift.date] || [], { ...shift, savedAt });
    persist();
    return { ok: true };
  }
  if (route === 'problems') {
    if (method === 'POST' && body?.action === 'status') {
      if (!lead) throw err(403, 'boss');
      const p = d.problems.find((x) => x.id === body.id); if (!p) throw err(404, 'missing');
      const resolved = body.status === 'resolved';
      Object.assign(p, { status: resolved ? 'resolved' : 'open', resolvedBy: resolved ? me.name : '', resolvedAt: resolved ? new Date().toISOString() : '' });
      persist(); return { problem: p };
    }
    if (method === 'POST') {
      const clean = sanitizeProblem(body); if (!clean) throw err(400, 'invalid');
      const id = `${Date.now().toString(36).padStart(9, '0')}${Math.random().toString(36).slice(2, 7)}`;
      d.problems.unshift({ ...clean, id, by: me.name, byEmail: me.email, photos: 0, status: 'open', resolvedBy: '', resolvedAt: '' });
      persist(); return { id };
    }
    if (!lead) throw err(403, 'boss');
    if (P.has('photo')) throw err(404, 'missing');
    if (P.has('id')) { const p = d.problems.find((x) => x.id === P.get('id')); if (!p) throw err(404, 'missing'); return { problem: p }; }
    return { problems: d.problems.slice(0, 150) };
  }
  if (route === 'roster') { // l'horaire de toute l'équipe, pour tout le monde
    const from = P.get('from') || d.today, to = P.get('to') || from;
    const people = Object.values(d.users).map((u) => ({ id: u.email.split('@')[0], name: u.name, role: u.role, avatar: u.avatar || '', schedule: u.schedule || {}, overrides: Object.fromEntries(Object.entries(d.overrides[u.email] || {}).filter(([k]) => k >= from && k <= to).map(([k, v]) => [k, v.off ? { off: true } : { start: v.start, end: v.end }])), ...(u.email === me.email ? { me: true } : {}) }));
    return { people: people.sort((a, b) => a.name.localeCompare(b.name)) };
  }
  if (route === 'alerts') return { to: Object.values(d.users).filter((u) => u.role === 'boss').slice(0, 1).map((u) => ({ name: u.name, email: '' })) };
  if (route === 'plan') {
    if (method === 'GET') {
      const from = P.get('from') || d.today, to = P.get('to') || from;
      const team = P.has('team') && lead;
      const tasks = d.tasks.filter((x) => x.date >= from && x.date <= to && (team || x.who === '*' || x.who === me.email));
      const pick = (all) => Object.fromEntries(Object.entries(all || {}).filter(([k]) => k >= from && k <= to));
      const overrides = team ? Object.fromEntries(Object.entries(d.overrides).map(([e, all]) => [e, pick(all)])) : { [me.email]: pick(d.overrides[me.email]) };
      return { overrides, tasks };
    }
    if (!lead) throw err(403, 'boss');
    if (body.action === 'override') {
      const all = (d.overrides[body.email] ||= {});
      if (body.clear) delete all[body.date]; else if (body.off) all[body.date] = { off: true, by: me.name }; else all[body.date] = { start: body.start, end: body.end, by: me.name };
      persist(); return { ok: true };
    }
    if (body.action === 'task') {
      const task = { id: Math.random().toString(36).slice(2, 10), date: body.date, title: String(body.title || '').slice(0, 80), time: body.time || '', minutes: Number(body.minutes) || 15, who: body.who, by: me.name, at: new Date().toISOString() };
      d.tasks.push(task); persist(); return { task };
    }
    if (body.action === 'deltask') { d.tasks = d.tasks.filter((x) => x.id !== body.id); persist(); return { ok: true }; }
  }
  throw err(404, 'route'); // notifications, avis… : pas dans l'équipe fictive
}

// Entrer : un espace à part (clés « fict: »), les réglages de langue et de thème suivent.
export function enterFictive(email) {
  const real = (() => { try { return JSON.parse(localStorage.getItem('gym-shift-prefs')) || {}; } catch { return {}; } })();
  clearFictiveKeys();
  sessionStorage.removeItem(DB);
  sessionStorage.setItem(FLAG, JSON.stringify({ who: email }));
  const u = FICTIVE_PEOPLE.find((p) => p.email === email);
  try {
    localStorage.setItem('fict:gym-shift-prefs', JSON.stringify({ lang: real.lang || 'fr', theme: real.theme || 'light', sound: real.sound, welcomed: { [email]: true }, installSeen: true, swipeSeen: true, schedules: { [email]: u?.schedule || {} } }));
  } catch { /* ignore */ }
  // Propriétaire : on arrive sur le tableau de bord, pas dans un quart. (Changer seulement le « # »
  // ne recharge pas la page : on pose l'adresse, puis on recharge.)
  history.replaceState(null, '', `${location.pathname}#accueil`);
  location.reload();
}
export function exitFictive() {
  clearFictiveKeys();
  sessionStorage.removeItem(FLAG);
  sessionStorage.removeItem(DB);
  location.replace(location.pathname);
}
function clearFictiveKeys() { try { for (const k of Object.keys(localStorage)) if (k.startsWith('fict:')) localStorage.removeItem(k); } catch { /* ignore */ } }
