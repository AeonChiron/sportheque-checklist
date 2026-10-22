import { simulated } from './clock.js';
import { MASCOTS, mascotImg, avatarHTML as avatarOf, shrinkPhoto } from './avatars.js'; // en premier : l'heure simulée de l'admin
import { CONFIG } from './config.js';
import { UI } from './i18n.js';
import { SHIFTS, AREAS, TV_CHANNELS, MANUAL_VERSION, PRIORITY_ORDER, TECHNIQUES, WEEKLY_Q1, WEEKLY_Q2, WALL_TECHNIQUE, FLOOR, GUIDE, guideKey, WEEKDAYS } from './manual.js';
import { buildPlan, detectShift, dayInfo, fmt, fmtDuration, toMin } from './planner.js';
import { SKIP_REASONS, decodeReport, REVIEW, reportLabels } from './report.js';
import { putPhoto, getPhoto, deletePhoto, clearPhotos, shrink } from './photos.js';
import { CATEGORIES, ALL_CATEGORIES as FLAG_CATEGORIES, MAX_PROBLEM_PHOTOS } from './problem-shape.js';
import { mountGlass, playFinish, fxSound, clickTap } from './fx.js';
import { session, accounts, isBoss, isAdmin, isVisitor, ns, startVisitor, initAuth, signIn, signOut, listTeam, teamAction, alertRecipients, setAlerts, request, authEvents, updateMe, isRealAdmin, viewAs, setViewAs } from './auth.js';
import { createProblem, listProblems, getProblem, setProblemStatus, photoSrc } from './problems.js';
import { illustration, zoneMap, tvDiagram } from './illustrations.js';
import { mountPool } from './pool.js';
import { publishShift, flushQueue, loadWeek, loadRecent, keepReport, deleteShift } from './board.js';

const KEY = 'gym-shift-v2';
const PREFS = 'gym-shift-prefs';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Persistance (un rechargement de Safari ne perd rien) ----------
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(ns(key))) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { value == null ? localStorage.removeItem(ns(key)) : localStorage.setItem(ns(key), JSON.stringify(value)); } catch { /* mode privé */ }
}

// prefs : langue, dernier nom, dernier superviseur, langue de rapport par superviseur.
const prefs = { lang: CONFIG.defaultLang, name: '', supervisor: '', supervisorLang: {}, lastTimes: {}, swipeSeen: false, ...read(PREFS, {}) };
const savePrefs = () => write(PREFS, prefs);
let state = read(KEY, null);
const save = () => {
  if (state) state.updatedAt = new Date().toISOString();
  write(KEY, state);
  if (state) queueDraft();
};
let plan = null;
// Le plan du quart en cours, avec le pointage en premier : coché tout seul en commençant (jamais à zéro).
function shiftPlan(st) {
  const p = planOf({ ...st, lang: lang() });
  const S = p.items[0]?.start ?? 0;
  p.forKey = `${st.date}|${st.start}|${st.end}`;
  p.items.unshift({ id: 'pointage', kind: 'task', auto: true, minutes: 0, start: S, end: S, area: 'gym', reminders: [], steps: [], tips: [], title: t('punchTitle'), summary: t('punchSub') });
  return p;
}
const ensurePlan = () => { if (state && !plan) plan = shiftPlan(state); };

const lang = () => (prefs.lang === 'en' ? 'en' : 'fr');
// Un superviseur ne fait pas le ménage : il lit le rapport de son équipe,
// sauf s'il coche « Travailler comme employé·e » (ou l'admin qui fait un quart au nom de quelqu'un).
function bossWatching() { return isBoss() && !prefs.workAsEmp && !(isRealAdmin() && !viewAs() && prefs.actAs?.trim()); }
const t = (key, ...args) => {
  const d = UI[lang()];
  // Un patron qui regarde un quart lit les tâches de son équipe, pas les siennes.
  const v = bossWatching() && d[key + 'Boss'] !== undefined ? d[key + 'Boss'] : d[key];
  return typeof v === 'function' ? v(...args) : v;
};
const f = (min) => fmt(min, lang());
const locale = () => (lang() === 'en' ? 'en-CA' : 'fr-CA');
const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) : '');

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayMonth = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dateOf = (iso) => new Date(`${iso}T12:00:00`);

// ---------- Écrans ----------
// Changement d'écran : glissement doux (View Transitions quand Safari les
// offre), vers la droite pour avancer, vers la gauche pour revenir.
let current = null;
const RANK = { poster: 6, auth: 0, setup: 0, checklist: 1, finish: 2, sent: 3, apercu: 4, history: 5, boss: 5, problem: 6, review: 7 };
// ---------- Retour : iPhone (glisser), Android, flèche de Safari ----------
// Chaque changement d'écran entre dans l'historique du navigateur : « retour » ramène à
// l'écran d'avant au lieu de quitter le site. Une feuille ouverte se ferme d'abord.
let navRestoring = false;
let navPopAt = 0;
const NAV_HASH = { history: '#historique', apercu: '#apercu', boss: '#patron', poster: '#affiche' };
function navRecord(id) {
  if (navRestoring) return;
  const url = location.pathname + (NAV_HASH[id] ?? (['review', 'problem'].includes(id) ? location.hash : ''));
  const st = { scr: id };
  try {
    if (!history.state?.scr) history.replaceState(st, '', url); // entrée toute neuve (chargement, lien #…)
    else if (history.state.scr !== id) history.pushState(st, '', url);
    else if (location.pathname + location.hash !== url) history.replaceState(st, '', url);
  } catch { /* ignore */ }
}
let sheetPopExpected = false;
window.addEventListener('popstate', (e) => {
  navPopAt = Date.now();
  if (sheetPopExpected) { sheetPopExpected = false; return; } // la feuille vient d'être fermée au toucher
  // Une feuille ouverte : « retour » la ferme, et on reste sur l'écran.
  if (!$('#sheet').hidden && $('#sheet').classList.contains('open')) {
    navRestoring = true;
    try { closeSheet(); } finally { navRestoring = false; }
    if (e.state?.scr === current) return;
    try { history.pushState({ scr: current }, '', location.pathname + (NAV_HASH[current] ?? '')); } catch { /* ignore */ }
    return;
  }
  const scr = e.state?.scr;
  navPopAt = Date.now();
  navRestoring = true;
  try {
    if (scr === 'auth' && session.user) goFront();
    else if (scr === 'review' && lastReview) openReview(...lastReview);
    else if (scr === 'checklist' && state) openChecklist();
    else route();
  } finally { navRestoring = false; }
});

function show(id) {
  paintAdminTools();
  const prev = current;
  current = id;
  navRecord(id);
  if (id !== 'checklist' && $('#momentAllDone')?.classList.contains('on')) hideAllDone(); // jamais par-dessus un autre écran
  ensurePlan();
  paintShiftPill();
  const target = document.getElementById(id);
  if (id === 'auth') pool().start(); else poolCtl?.stop();
  document.documentElement.classList.toggle('on-floor', id === 'auth'); // la page du plancher ne défile pas
  if (id === 'auth') requestAnimationFrame(() => window.scrollTo(0, 0));
  placeQuickBar(id);
  if (!target.hidden) return;
  const swap = () => {
    for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
    window.scrollTo(0, 0);
    target.classList.remove('enter');
    void target.offsetWidth; // relance l'entrée
    target.classList.add('enter');
    clearTimeout(target.enterTimer);
    target.enterTimer = setTimeout(() => target.classList.remove('enter'), 800); // pas de reprise à chaque mise à jour
  };
  if (prev && document.startViewTransition && !reducedMotion() && !document.hidden) {
    document.documentElement.dataset.nav = (RANK[id] ?? 0) < (RANK[prev] ?? 0) ? 'back' : 'fwd';
    document.startViewTransition(swap);
  } else swap();
}
if (document.startViewTransition) document.documentElement.classList.add('vt');

// « Mes tâches » : pendant un quart, un toucher ramène à la liste, de n'importe où.
const PILL_HIDDEN = new Set(['checklist', 'finish', 'sent', 'auth']);
function paintShiftPill() {
  const pill = $('#shiftPill');
  const on = Boolean(state && plan && !PILL_HIDDEN.has(current) && !(current === 'history' && !bossWatching())); // Mes shifts : la carte du quart fait déjà ce travail
  pill.hidden = !on;
  document.documentElement.classList.toggle('has-pill', on);
  if (!on) return;
  const tasks = plan.items.filter((it) => it.kind === 'task');
  const done = tasks.filter((x) => state.tasks[x.id]?.done).length;
  pill.style.setProperty('--p', tasks.length ? done / tasks.length : 0);
  pill.querySelector('b').textContent = `${done}/${tasks.length}`;
}
$('#shiftPill').addEventListener('click', () => {
  if (!$('#sheet').hidden) closeSheet();
  window.history.replaceState(history.state, '', location.pathname);
  openChecklist();
});

// Message bref en bas de l'écran; avec onUndo, un bouton « Annuler » reste
// quelques secondes de plus (un toucher de trop se répare tout de suite).
function toast(msg, tone = 'ok', onUndo = null) {
  const el = $('#toast');
  if (tone !== 'muted') sfx('notify'); // chaque message a son petit son (pas de doublon s'il suit un autre son)
  el.innerHTML = `<span>${esc(msg)}</span>${onUndo ? `<button type="button">${esc(t('undo'))}</button>` : ''}`;
  el.dataset.tone = tone;
  el.classList.toggle('has-undo', Boolean(onUndo));
  el.hidden = false;
  el.classList.remove('in');
  void el.offsetWidth;
  el.classList.add('in');
  if (onUndo) el.querySelector('button').onclick = () => { el.hidden = true; onUndo(); };
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, onUndo ? 4500 : 1900);
}

// Petite fête quand tout est coché (rien si « réduire les animations »).
function celebrate() {
  if (reducedMotion()) return;
  const box = $('#burst');
  const colors = ['var(--aqua)', 'var(--coral)', 'var(--sun)', 'var(--brand)'];
  box.innerHTML = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const r = 70 + (i % 3) * 26;
    return `<i style="--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r}px;--c:${colors[i % 4]};--d:${(i % 5) * 30}ms"></i>`;
  }).join('');
  box.classList.remove('go');
  void box.offsetWidth;
  box.classList.add('go');
  setTimeout(() => { box.innerHTML = ''; box.classList.remove('go'); }, 1300);
}

// Les chiffres comptent jusqu'à leur valeur (rien si « réduire les animations »).
function countUp(scope) {
  if (reducedMotion()) return;
  for (const el of scope.querySelectorAll('[data-count]')) {
    const m = el.textContent.match(/^(\d+)(.*)$/);
    if (!m || !+m[1]) continue;
    const end = +m[1];
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 700);
      el.textContent = `${Math.round(end * (1 - (1 - p) ** 3))}${m[2]}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

// ---------- Identité et textes fixes ----------
// Icônes dessinées (pas d'emoji dans l'interface).
const ICON = {
  flag: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  clock: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>',
  info: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  bulb: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  clip: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7"/></svg>',
  mail: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/></svg>',
};
const logoImgs = (light, dark, cls, alt = '') =>
  `<img class="${cls} only-light" src="${esc(light)}" alt="${esc(alt)}"><img class="${cls} only-dark" src="${esc(dark)}" alt="" aria-hidden="true">`;

function renderBrand() {
  const floor = `<span class="brand-floor">${esc(t('floor'))}</span>`;
  for (const el of document.querySelectorAll('[data-mark]')) {
    el.innerHTML = CONFIG.logo ? logoImgs(CONFIG.logo.mark, CONFIG.logo.markDark, 'mark-img') : '';
    el.hidden = !CONFIG.logo;
  }
  const html = CONFIG.logo ? `${logoImgs(CONFIG.logo.full, CONFIG.logo.fullDark, 'brand-logo', CONFIG.gymName)}${floor}`
    : CONFIG.gymName ? `<span class="wordmark">${esc(CONFIG.gymName)}</span>${floor}`
      : `<span class="wordmark">${esc(t('floor'))}</span>`;
  for (const el of document.querySelectorAll('#brand, [data-brand]')) el.innerHTML = html;
}

function paintStatic() {
  document.documentElement.lang = lang() === 'en' ? 'en-CA' : 'fr-CA';
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(roleKey(el.dataset.t));
  for (const el of document.querySelectorAll('[data-ph]')) el.placeholder = t(el.dataset.ph);
  for (const el of document.querySelectorAll('[data-label]')) { el.setAttribute('aria-label', t(el.dataset.label)); el.title = t(el.dataset.label); }
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang()));
  for (const b of document.querySelectorAll('[data-large]')) b.setAttribute('aria-pressed', String(Boolean(prefs.large)));
  for (const b of document.querySelectorAll('[data-sound]')) { b.setAttribute('aria-pressed', String(prefs.sound !== false)); b.classList.toggle('off', prefs.sound === false); }
  paintThemeButtons();
  if ($('#poolStartLabel')) paintFront();
  const gym = $('#poolGym');
  if (gym && gym.dataset.txt !== (CONFIG.gymName || '')) {
    // Le nom du gym lettre par lettre : elles tombent en place, puis font la vague de temps en temps.
    const name = CONFIG.gymName || '';
    gym.dataset.txt = name;
    gym.innerHTML = `<span class="sr-only">${esc(name)}</span><span aria-hidden="true">${[...name].map((c, i) => `<i style="--i:${i}">${esc(c)}</i>`).join('')}</span>`;
    gym.hidden = !name;
  }
  const lines = t('dailyLines'), day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
  if ($('#poolCheer') && Array.isArray(lines)) $('#poolCheer').textContent = lines[day % lines.length];
  $('#manualVersion').textContent = [CONFIG.gymName && CONFIG.since ? `${CONFIG.gymName} · ${t('since', CONFIG.since)}` : '', t('manual', MANUAL_VERSION)].filter(Boolean).join(' · ');
  renderBrand();
  paintCrew();
}

// La mascotte (le lapin) : son seau se remplit avec les tâches faites aujourd'hui.

function todayProgress() {
  const count = (st) => {
    try {
      const p = planOf({ shift: st.shift, date: st.date, start: st.start, end: st.end, special: st.special, lang: lang() });
      const tasks = p.items.filter((it) => it.kind === 'task');
      return { done: tasks.filter((it) => st.tasks?.[it.id]?.done).length, total: tasks.length };
    } catch { return null; }
  };
  if (state && state.date === todayISO()) return count(state);
  const last = editableShift();
  return last ? count(last) : null;
}
function paintCrew() {
  const d = new Date();
  if ($('#homeDate')) $('#homeDate').textContent = d.toLocaleDateString(lang() === 'en' ? 'en-CA' : 'fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
  const pr = todayProgress();
  const lvl = pr && pr.total ? Math.max(0.16, pr.done / pr.total) : 0.16;
  // 0 = seau vide (y 196), 1 = plein (y 8).
  const lv = $('#bucketLevel');
  if (lv) lv.style.transform = `translateY(${196 - 188 * lvl}px)`;
  if ($('#bucketNum')) {
    $('#bucketNum').textContent = pr ? `${pr.done}/${pr.total}` : '';
    $('#bucketNum').hidden = !pr;
    $('#bucketLbl').textContent = t(pr ? (pr.done === pr.total ? 'bucketFull' : 'bucketTasks') : 'bucketReady');
    $('#bucketArt').setAttribute('aria-label', pr ? t('barLabel', pr.done, pr.total) : t('bucketReady'));
  }
  const sent = $('#sentCrew');
  if (sent && !sent.firstChild) sent.innerHTML = '<img class="mascot-img rest" src="icons/rabbit-rest.svg" alt="" draggable="false">';
}
// Toucher la mascotte : il saute et dit un mot d'encouragement.
let sayTimer = 0;
$('#mascotHome')?.addEventListener('click', () => {
  const btn = $('#mascotHome');
  btn.classList.remove('hop'); void btn.offsetWidth; btn.classList.add('hop');
  const say = $('#mascotSay');
  const lines = t('mascotLines');
  say.textContent = lines[Math.floor(Math.random() * lines.length)];
  say.hidden = false;
  say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop');
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { say.hidden = true; }, 2600);
  try { navigator.vibrate?.(10); } catch { /* iPhone */ }
});

// ---------- Thème : suit le téléphone, ou clair / sombre au choix ----------
// Un toucher sur le soleil / la lune bascule; le Menu offre aussi « Auto ».
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
// Clair par défaut (plus lumineux, plus encourageant); « Auto » seulement si on le choisit.
const themePref = () => (prefs.theme === 'dark' || prefs.theme === 'auto' ? prefs.theme : 'light');
const resolvedTheme = () => (themePref() === 'auto' ? (darkMQ.matches ? 'dark' : 'light') : themePref());
function paintThemeButtons() {
  const dark = resolvedTheme() === 'dark';
  for (const b of document.querySelectorAll('[data-theme-btn]')) {
    b.setAttribute('aria-pressed', String(dark));
    b.setAttribute('aria-label', t(dark ? 'toLight' : 'toDark'));
    b.title = t(dark ? 'toLight' : 'toDark');
  }
}
function applyTheme() {
  const th = resolvedTheme();
  document.documentElement.dataset.theme = th;
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.content = th === 'dark' ? '#050708' : '#f4f6fb';
  paintThemeButtons();
}
// La nouvelle couleur s'ouvre en cercle depuis le bouton touché.
function setTheme(next, from) {
  const before = resolvedTheme();
  prefs.theme = next;
  savePrefs();
  const run = () => {
    applyTheme();
    if (current === 'apercu') renderApercu({ animate: false }); // la 3D reprend ses couleurs
  };
  if (resolvedTheme() === before || !document.startViewTransition || reducedMotion() || document.hidden) { run(); return; }
  const r = from?.getBoundingClientRect?.();
  const x = r ? r.left + r.width / 2 : innerWidth / 2;
  const y = r ? r.top + r.height / 2 : 0;
  const root = document.documentElement.style;
  root.setProperty('--vt-x', `${x}px`);
  root.setProperty('--vt-y', `${y}px`);
  root.setProperty('--vt-r', `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
  document.documentElement.dataset.nav = 'theme';
  document.startViewTransition(run).finished.finally(() => { delete document.documentElement.dataset.nav; });
}
darkMQ.addEventListener?.('change', () => { if (themePref() === 'auto') applyTheme(); });
for (const b of document.querySelectorAll('[data-theme-btn]')) {
  b.addEventListener('click', () => setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark', b));
}
applyTheme();

function setLang(l) {
  prefs.lang = l;
  savePrefs();
  paintStatic();
  if (current === 'setup') { renderPresets(); updatePreview(); }
  if (state && plan) plan = shiftPlan(state);
  if (current === 'checklist') renderChecklist();
  if (current === 'finish') openFinish();
  if (current === 'apercu') { refCache.clear(); renderApercu({ animate: false }); }
  if (current === 'history') renderHistory({ animate: false });
  if (current === 'auth') paintAuth();
  if (current === 'boss') renderBoss({ animate: false });
  if (current === 'problem' && lastProblem) renderProblem(lastProblem);
  if (current === 'review' && lastReview) openReview(...lastReview);
}
for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));

// ---------- 1. Début de quart ----------
let manualShift = null;
let editing = false;

// La langue des courriels suit celui qui les reçoit (réglage de l'équipe).
const supLang = (name) => CONFIG.supervisors.find((s) => s.name === name)?.lang || 'fr';

// Date du quart : « Aujourd'hui » en clair; le champ date n'apparaît que si on veut la changer.
function paintDate() {
  const v = $('#fDate').value;
  const label = v ? cap(dateOf(v).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })) : '';
  $('#dateText').textContent = v === todayISO() ? `${t('today')} · ${label}` : label;
}
$('#dateChange').addEventListener('click', () => {
  const input = $('#fDate');
  input.hidden = false;
  $('#dateChange').hidden = true;
  input.focus();
  try { input.showPicker?.(); } catch { /* Safari : le champ suffit */ }
});
$('#fDate').addEventListener('change', paintDate);

// Les heures exactes restent à portée de main, mais cachées tant qu'un quart habituel convient.
function showHours(on) {
  $('#timeRow').hidden = !on;
  $('#moreHours').textContent = t(on ? 'lessHours' : 'moreHours');
  $('#moreHours').setAttribute('aria-expanded', String(on));
}
$('#moreHours').addEventListener('click', () => showHours($('#timeRow').hidden));

// Quarts habituels : un toucher remplit les heures (toujours modifiables).
const PRESETS = CONFIG.shiftPresets || [];
// ---------- Quarts spéciaux (une personne, un jour de la semaine) ----------
const SPECIALS = CONFIG.specialShifts || [];
const firstName = (n) => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().split(/\s+/)[0] || '';
// Le quart spécial de la personne connectée pour cette date, s'il y en a un.
function specialFor(iso) {
  const me = firstName(shiftName());
  const sp = me && SPECIALS.find((x) => x.names?.includes(me) && x.weekday === dowOf(iso));
  const base = sp && presetOf(mySchedule()?.[dowOf(iso)]); // les heures : celles de son horaire ce jour-là
  return base?.start ? { ...base, special: sp.id } : null;
}
// Un plan de quart : celui du manuel, ou, pour un quart spécial, seulement ses tâches
// (un titre chacune, rien d'autre), réparties sur les heures du quart.
function planOf({ special = '', custom = [], ...args }) {
  const p = withCustom(specialPlan(buildPlan(args), special, args.lang), custom);
  return p;
}
function specialPlan(p, special, L0) {
  const sp = special && SPECIALS.find((x) => x.id === special);
  if (!sp) return p;
  const L = L0 || lang();
  const n = sp.tasks.length || 1;
  const step = Math.floor((p.end - p.start) / n);
  p.items = sp.tasks.map((x, i) => {
    const start = p.start + i * step;
    const end = i === n - 1 ? p.end : start + step;
    return { id: x.id, kind: 'task', minutes: end - start, start, end, area: 'gym', special: true, reminders: [], steps: [], tips: [], title: x[L] || x.fr, summary: '' };
  });
  p.overflow = [];
  p.deficit = 0;
  p.outOfRange = [];
  p.special = sp.id;
  return p;
}
// Activités personnalisées : chacune prend sa place à ses heures et remplace les tâches
// prévues qui tombent pendant ce temps (les pauses restent). p.replaced : ce qu'elles remplacent.
function withCustom(p, custom) {
  const list = (Array.isArray(custom) ? custom : []).filter((c) => c?.id && c.title && c.start && c.end);
  p.replaced = [];
  if (!list.length) return p;
  const norm = (hm) => { let m = toMin(hm); if (m < p.start && p.end > 1440) m += 1440; return m; };
  const wins = list.map((c) => { const s0 = norm(c.start); let e0 = norm(c.end); if (e0 <= s0) e0 += 1440; return { ...c, s0, e0 }; });
  p.items = p.items.filter((it) => {
    if (it.kind !== 'task' || it.custom) return true;
    const hit = wins.some((w) => it.start < w.e0 && w.s0 < it.end);
    if (hit) p.replaced.push(it.title);
    return !hit;
  });
  for (const w of wins) p.items.push({ id: w.id, kind: 'task', custom: true, special: true, minutes: w.e0 - w.s0, start: w.s0, end: w.e0, area: 'gym', reminders: [], steps: [], tips: [], title: w.title, summary: t('customTag') });
  p.items.sort((a, b) => a.start - b.start);
  return p;
}
function renderPresets() {
  const names = t('presets') || {};
  // Petite barre de 6 h à minuit : on voit d'un coup d'œil où tombe le quart.
  const pos = (hhmm) => Math.max(0, Math.min(100, ((toMin(hhmm) - 360) / 1080) * 100)).toFixed(1);
  $('#presetPick').innerHTML = PRESETS.map((p) => `
    <button type="button" role="radio" data-preset="${p.id}" aria-checked="false">
      <b>${esc(names[p.id] || p.id)}</b>
      <span class="num">${f(toMin(p.start))} – ${f(toMin(p.end))}</span>
      <i class="dayline" aria-hidden="true" style="--s:${pos(p.start)}%;--e:${pos(p.end)}%"></i>
    </button>`).join('');
  for (const b of document.querySelectorAll('[data-preset]')) b.addEventListener('click', () => pickPreset(b.dataset.preset));
  syncPresets();
}
function syncPresets() {
  const s = $('#fStart').value;
  const e = $('#fEnd').value;
  let match = false;
  for (const b of document.querySelectorAll('[data-preset]')) {
    const p = PRESETS.find((x) => x.id === b.dataset.preset);
    const on = p.start === s && p.end === e;
    match ||= on;
    b.setAttribute('aria-checked', String(on));
  }
  if (!match && $('#timeRow').hidden) showHours(true); // heures personnalisées : on les montre
  return match;
}
// ---------- Mon horaire (la semaine type de l'employé) ----------
// Gardé sur le téléphone, par compte. Un jour de travail : un toucher sur
// « Bon retour » part le quart avec les bonnes heures, sans formulaire.
const schedKey = () => session.user?.email || 'local';
const mySchedule = () => (prefs.schedules || {})[schedKey()] || null;
function saveSchedule(sc, { push = true } = {}) {
  prefs.schedules = { ...(prefs.schedules || {}), [schedKey()]: sc };
  savePrefs();
  refreshScheduleStatus();
  if (push && !prefs.simNew && !prefs.simShift) pushSchedule(sc); // aperçu « nouvel employé » : rien ne part au serveur
}
// Recompute every schedule-dependent surface when the local schedule changes.
function refreshScheduleStatus() {
  setupNext = nextShift();
  if (current === 'auth') paintFront();
  if (current === 'history') renderHistory({ animate: false });
  if (current === 'setup') paintSetupSched();
}
// L'horaire suit le compte (serveur) : envoyé un instant après le dernier changement.
// Un serveur pas encore à jour répond « action inconnue » : on garde la copie du téléphone.
function pushSchedule(sc) {
  if (session.mode !== 'accounts' || !session.token) return;
  clearTimeout(pushSchedule.timer);
  pushSchedule.timer = setTimeout(() => request('auth', { method: 'POST', body: { action: 'schedule', schedule: sc } }).catch(() => {}), 900);
}
// Le serveur connaît l'horaire : on le prend. Il ne le connaît pas encore : on lui envoie celui du téléphone.
function adoptSchedule(u) {
  if (!u?.email || prefs.simNew || prefs.simShift) return;
  if (u.schedule && Object.keys(u.schedule).length) {
    if (JSON.stringify(u.schedule) === JSON.stringify(mySchedule())) return;
    saveSchedule(u.schedule, { push: false });
    if (current === 'auth') paintFront();
    if (current === 'history') renderHistory({ animate: false });
  } else if (mySchedule() && Object.keys(mySchedule()).length) pushSchedule(mySchedule());
}
authEvents.user = adoptSchedule;
const dowOf = (iso) => (dateOf(iso).getDay() + 6) % 7; // 0 = lundi
// Un jour = un quart habituel (id) ou des heures perso { start, end }.
const presetOf = (v) => (v && typeof v === 'object' ? { id: 'custom', start: v.start, end: v.end } : PRESETS.find((p) => p.id === v) || null);
const todaySched = () => specialFor(todayISO()) || presetOf(mySchedule()?.[dowOf(todayISO())]);
// Le prochain quart à l'horaire. ready : on peut le partir, de 30 min avant le début jusqu'à la fin.
const EARLY_MIN = 30;
const nb = (x) => String(x).replace(/ /g, '\u00a0'); // « 7 h 30 » ne se coupe pas
function nextShift() {
  const sc = mySchedule() || {};
  if (!mySchedule() && !SPECIALS.length) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayISO();
  for (let i = 0; i < 8; i++) {
    const date = addDays(today, i);
    const p = specialFor(date) || presetOf(sc[dowOf(date)]);
    if (!p?.start || !p?.end) continue;
    if (i > 0) return { ...p, date, ready: false };
    const s0 = toMin(p.start);
    const e0 = toMin(p.end) <= s0 ? toMin(p.end) + 1440 : toMin(p.end);
    const submitted = editableShift();
    if ((submitted?.start === p.start && submitted?.end === p.end) || nowMin >= e0) continue; // déjà envoyé ou fini : on regarde plus loin
    return { ...p, date, ready: nowMin >= s0 - EARLY_MIN };
  }
  return null;
}
// « aujourd'hui », « demain (mer. 21 oct.) », « jeudi 22 oct. »
function whenLabel(iso) {
  const today = todayISO();
  const short = dateOf(iso).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
  if (iso === today) return t('today').toLowerCase();
  if (iso === addDays(today, 1)) return `${t('tomorrow').toLowerCase()} (${nb(short)})`;
  return dateOf(iso).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'short' });
}
const presetName = (id) => (id === 'custom' ? t('schedCustom') : (t('presets') || {})[id] || id);
const SCHED_SHORT = { jour: 'J', soir: 'S', 'soir-court': 'SC' };
// La semaine montre l'heure du début (pas des lettres) : « 7:30 », « 18:00 ».
const schedShort = (v) => { const h = hoursOf(v); return h?.start ? f(toMin(h.start)).replace(' h ', 'h').replace(' h', 'h') : SCHED_SHORT[v] || '•'; };
// Éditeur : chaque jour = un interrupteur. Allumé, on voit Début / Fin
// (modifiables), avec les quarts habituels en raccourcis.
const hoursOf = (v) => (v && typeof v === 'object' ? v : presetOf(v));
function schedEditor(sc) {
  const days = WEEKDAYS[lang()];
  return `<div class="sch-edit">${days.map((d, i) => {
    const h = hoursOf(sc[i]);
    return `<div class="sch-row${h ? ' on' : ''}" data-row="${i}">
      <div class="sch-line"><span class="sch-day">${esc(cap(d))}</span>
        <span class="sch-state">${esc(h ? `${f(toMin(h.start))} – ${f(toMin(h.end))}` : t('schedOff'))}</span>
        <button type="button" class="switch" role="switch" data-sw="${i}" aria-checked="${Boolean(h)}" aria-label="${esc(cap(d))}"><i></i></button></div>
      <div class="sch-hours" ${h ? '' : 'hidden'}>
        <div class="sch-times"><label><span>${t('start')}</span><input type="time" data-cstart="${i}" value="${h?.start || ''}"></label>
          <span class="sch-arrow" aria-hidden="true">→</span>
          <label><span>${t('end')}</span><input type="time" data-cend="${i}" value="${h?.end || ''}"></label></div>
        <div class="sch-quick">${PRESETS.map((p) => `<button type="button" data-qday="${i}" data-qp="${p.id}" aria-pressed="${Boolean(h && h.start === p.start && h.end === p.end)}"><b>${esc(presetName(p.id))}</b><small class="num">${f(toMin(p.start))} – ${f(toMin(p.end))}</small></button>`).join('')}</div>
      </div></div>`;
  }).join('')}</div>`;
}
// Pas encore d'horaire : un choix rapide (le quart habituel + les jours, lundi à vendredi déjà cochés).
// L'horaire jour par jour reste à un toucher, mais ce n'est pas le chemin par défaut.
function openQuickSchedule({ first = false } = {}) {
  // Les jours d'abord : touche un jour, il demande « de quelle heure à quelle heure ».
  // Les quarts habituels (Jour, Soir…) servent juste à remplir les heures d'un toucher.
  const days = WEEKDAYS[lang()];
  const old = mySchedule() || {};
  const p0 = PRESETS[0];
  const pick = Object.fromEntries(days.map((_, i) => {
    const v = presetOf(old[i]);
    return [i, v?.start ? { on: true, start: v.start, end: v.end } : { on: false, start: p0.start, end: p0.end }];
  }));
  const ok = (d) => d.start && d.end && d.start !== d.end;
  const row = (d, i) => `<div class="qs-row${pick[i].on ? ' on' : ''}" data-row="${i}">
      <button type="button" class="qs-day" data-qd="${i}" aria-pressed="${pick[i].on}"><span class="qs-box" aria-hidden="true"></span><b>${esc(cap(d))}</b></button>
      <div class="qs-times"${pick[i].on ? '' : ' hidden'}><span>${esc(t('qsFromShort'))}</span><input type="time" step="900" data-qt="start" data-i="${i}" value="${pick[i].start}" aria-label="${esc(`${cap(d)} · ${t('qsFrom')}`)}"><span>${esc(t('qsToShort'))}</span><input type="time" step="900" data-qt="end" data-i="${i}" value="${pick[i].end}" aria-label="${esc(`${cap(d)} · ${t('qsTo')}`)}"></div>
    </div>`;
  const paint = (root) => {
    for (const [i, d] of Object.entries(pick)) {
      const r = root.querySelector(`[data-row="${i}"]`);
      r.classList.toggle('on', d.on);
      r.querySelector('[data-qd]').setAttribute('aria-pressed', String(d.on));
      r.querySelector('.qs-times').hidden = !d.on;
      for (const inp of r.querySelectorAll('[data-qt]')) if (inp.value !== d[inp.dataset.qt]) inp.value = d[inp.dataset.qt];
    }
    const on = Object.values(pick).filter((d) => d.on);
    $('#qsSave').disabled = !on.length || !on.every(ok);
  };
  openSheet(`<div class="sheet-head sched-head">${first ? '<img class="sched-mascot" src="icons/rabbit-hello.svg" alt="" draggable="false">' : ''}<p class="eyebrow">${ICON.clock}${t('schedEyebrow')}</p><h2>${esc(t('qsTitle'))}</h2><p class="lede">${esc(t('qsLede'))}</p></div>
    <div class="qs-list">${days.map(row).join('')}</div>
    <p class="block-label">${esc(t('qsFill'))}</p>
    <div class="qs-fill">${PRESETS.map((p) => `<button type="button" class="chip" data-qs="${p.id}"><b>${esc(presetName(p.id))}</b> ${nb(f(toMin(p.start)))}–${nb(f(toMin(p.end)))}</button>`).join('')}</div>`, (root) => {
    paint(root);
    root.addEventListener('click', (e) => {
      const d1 = e.target.closest('[data-qd]'), s1 = e.target.closest('[data-qs]');
      if (d1) {
        const i = Number(d1.dataset.qd);
        pick[i].on = !pick[i].on; sfx('toggle'); paint(root);
        if (pick[i].on) root.querySelector(`[data-row="${i}"] [data-qt="start"]`).focus({ preventScroll: true });
      }
      if (s1) { // remplit les jours cochés avec ce quart
        const p = presetOf(s1.dataset.qs);
        for (const d of Object.values(pick)) if (d.on) { d.start = p.start; d.end = p.end; }
        clank('step'); paint(root);
      }
    });
    root.addEventListener('input', (e) => {
      const inp = e.target.closest('[data-qt]');
      if (!inp) return;
      pick[inp.dataset.i][inp.dataset.qt] = inp.value;
      paint(root);
    });
    $('#qsSave').onclick = () => {
      saveSchedule(Object.fromEntries(Object.entries(pick).filter(([, d]) => d.on).map(([i, d]) => [i, { start: d.start, end: d.end }])));
      // Un quart en cours aujourd'hui prend les nouvelles heures du jour (les tâches cochées restent).
      const td = pick[dowOf(todayISO())];
      if (state && state.date === todayISO() && td.on && (td.start !== state.start || td.end !== state.end)) {
        state.start = td.start; state.end = td.end; state.shift = detectShift(td.start, td.end);
        save(); plan = shiftPlan(state);
        if (current === 'checklist') renderChecklist();
      }
      closeSheet(); toast(t('qsSaved')); setTimeout(() => sfx('save'), 120);
      if (current === 'auth') paintFront();
      if (current === 'history') renderHistory({ animate: false });
    };
  }, `<button type="button" class="btn primary" id="qsSave">${esc(t('qsSave'))}</button>`);
}
function openScheduleSheet({ first = false, full = false } = {}) {
  const sc = {};
  for (const [k, v] of Object.entries(mySchedule() || {})) { const h = hoursOf(v); if (h) sc[k] = { start: h.start, end: h.end }; }
  if (!full) { openQuickSchedule({ first }); return; }
  let lastHours = Object.values(sc).at(-1) || { start: PRESETS[0].start, end: PRESETS[0].end };
  openSheet(`<div class="sheet-head sched-head">${first ? '<img class="sched-mascot" src="icons/rabbit-hello.svg" alt="" draggable="false">' : ''}<p class="eyebrow">${ICON.clock}${t('schedEyebrow')}</p><h2>${t(first ? 'schedFirstTitle' : 'schedTitle')}</h2><p class="lede">${t('schedLede')}</p></div>${schedEditor(sc)}`, (root) => {
    const paintRow = (i) => {
      const row = root.querySelector(`[data-row="${i}"]`);
      const h = sc[i];
      row.classList.toggle('on', Boolean(h));
      row.querySelector('.switch').setAttribute('aria-checked', String(Boolean(h)));
      row.querySelector('.sch-hours').hidden = !h;
      row.querySelector('.sch-state').textContent = h && h.start && h.end ? `${f(toMin(h.start))} – ${f(toMin(h.end))}` : t('schedOff');
      for (const q of row.querySelectorAll('[data-qp]')) { const p = presetOf(q.dataset.qp); q.setAttribute('aria-pressed', String(Boolean(h && h.start === p.start && h.end === p.end))); }
      if (h) { row.querySelector('[data-cstart]').value = h.start; row.querySelector('[data-cend]').value = h.end; }
    };
    // Chaque changement est gardé tout de suite : fermer la feuille ne perd rien.
    const commit = () => {
      const clean = {};
      for (const [k, v] of Object.entries(sc)) if (v.start && v.end) clean[k] = { ...v };
      saveSchedule(clean);
      if (current === 'history') renderHistory({ animate: false });
      if (current === 'auth') paintFront();
      if (current === 'setup') {
        paintSetupSched();
        const tp = todaySched(); // aujourd'hui à l'horaire : les heures du formulaire suivent
        if (tp) { $('#fStart').value = tp.start; $('#fEnd').value = tp.end; updatePreview(); }
      }
    };
    for (const sw of root.querySelectorAll('[data-sw]')) {
      sw.onclick = () => {
        const i = Number(sw.dataset.sw);
        if (sc[i]) delete sc[i]; else sc[i] = { ...lastHours }; // un jour allumé reprend les dernières heures
        paintRow(i);
        commit();
        sfx('toggle');
      };
    }
    for (const q of root.querySelectorAll('[data-qp]')) {
      q.onclick = () => {
        const i = Number(q.dataset.qday);
        const p = presetOf(q.dataset.qp);
        sc[i] = { start: p.start, end: p.end };
        lastHours = sc[i];
        paintRow(i);
        commit();
        clank('step');
      };
    }
    for (const inp of root.querySelectorAll('[data-cstart], [data-cend]')) {
      inp.addEventListener('input', () => {
        const i = Number(inp.dataset.cstart ?? inp.dataset.cend);
        sc[i] = { start: root.querySelector(`[data-cstart="${i}"]`).value, end: root.querySelector(`[data-cend="${i}"]`).value };
        if (sc[i].start && sc[i].end) lastHours = sc[i];
        paintRow(i);
        commit();
      });
    }
    $('#schedDone').onclick = () => {
      commit(); closeSheet(); toast(t('schedSaved')); setTimeout(() => sfx('save'), 120);
    };
    $('#schedLater')?.addEventListener('click', () => { closeSheet(); if (first) setTimeout(maybeWelcome, 450); });
    if (first) $('#schedDone').addEventListener('click', () => setTimeout(maybeWelcome, 450));
  }, `<button type="button" class="btn primary" id="schedDone">${t(first ? 'schedDoneFirst' : 'save')}</button>`);
}
// Page « Bon quart » : pas encore d'horaire → on l'invite à l'entrer une fois;
// congé aujourd'hui → une petite ligne pour le modifier.
let setupNext = null; // le prochain quart montré en aperçu sur « Bon quart »
function paintSetupSched() {
  const box = $('#setupSched');
  if (!box) return;
  if (state) { box.hidden = true; return; }
  box.hidden = false;
  const nx = setupNext;
  box.innerHTML = nx && !nx.ready
    ? `<p class="sched-next">${ICON.clock}<span>${esc(t('setupNext', whenLabel(nx.date), nb(f(toMin(nx.start))), nb(f(toMin(nx.end)))))}</span></p>`
    : !mySchedule() || !Object.keys(mySchedule()).length
    ? `<div class="sched-card empty"><div><b>${t('schedTitle')}</b><p>${t('schedEmpty')}</p></div><button type="button" class="btn primary" data-sched>${t('schedSet')}</button></div>`
    : todaySched() ? '' : `<p class="sched-off-line">${esc(t('schedTodayOff'))} · <button type="button" class="link" data-sched>${t('schedEdit')}</button></p>`;
  if (!box.innerHTML) box.hidden = true;
}
// Bienvenue (une fois par compte) : où on en est (jamais à zéro : le compte est déjà fait)
// et les trois endroits à connaître.
function maybeWelcome() {
  const key = session.user?.email;
  if (!key || prefs.welcomed?.[key] || $('#tour')) return;
  // Le tutoriel part tout seul une seule fois, à la toute première connexion. L'admin connaît son app :
  // jamais tout seul pour lui (l'aperçu « Nouveau » ou « Revoir le tutoriel » le relancent).
  if (isRealAdmin() && !prefs.simNew) { prefs.welcomed = { ...(prefs.welcomed || {}), [key]: true }; savePrefs(); return; }
  if (!$('#sheet').hidden) { setTimeout(maybeWelcome, 600); return; } // attend qu'un panneau se ferme
  if (current === 'auth') startTour();
}
// Visite guidée de l'accueil : une lumière sur chaque bouton, une phrase, puis un bravo.
function startTour() {
  const key = session.user?.email;
  if (!key || $('#tour')) return;
  if (current !== 'auth') goFront();
  prefs.welcomed = { ...(prefs.welcomed || {}), [key]: true };
  savePrefs();
  // Les étapes de l'accueil, puis on entre dans « Mon compte » pour montrer l'horaire et ce tutoriel.
  const home = [
    ['#poolStart', bossWatching() ? 'tourStartBoss' : 'tourStart'],
    ['#poolDash .dash-shifts', bossWatching() ? 'tourManual' : isBoss() ? 'tourShiftsTeam' : 'tourShifts'],
    ['#dashFlag', bossWatching() ? 'tourFeedback' : 'tourFlag'],
    ['#dashBoss', 'tourBoss'],
    ['#poolAccount', 'tourAccount'],
  ].filter(([sel]) => { const el = $(sel); return el && !el.hidden && el.offsetParent; });
  const inside = session.user.visitor ? [] : [
    ...(isBoss() ? [['#acWork', 'tourWork', true]] : []),
    ...(bossWatching() ? [] : [['#acSched', 'tourSched', true]]),
    ['#acPic', 'tourPic', true],
    ['#acTour', 'tourAgain', true],
  ];
  const steps = [...home, ...inside];
  const box = document.createElement('div');
  box.id = 'tour';
  box.className = 'tour';
  box.innerHTML = '<div class="tour-hole" aria-hidden="true"></div><div class="tour-tip" role="dialog" aria-modal="true" aria-live="polite" aria-labelledby="tourH"></div>';
  document.body.append(box);
  const hole = box.querySelector('.tour-hole'), tip = box.querySelector('.tour-tip');
  let i = prefs.simNew?.tourStep || 0;
  const sheetOpen = () => !$('#sheet').hidden;
  const end = (then) => {
    if (prefs.simNew && i >= steps.length) { prefs.simNew.tourDone = true; savePrefs(); }
    box.classList.remove('on');
    setTimeout(() => box.remove(), 300);
    removeEventListener('resize', place);
    if (sheetOpen()) closeSheet();
    if (then) setTimeout(then, 380);
  };
  const hasSched = () => Boolean(mySchedule() && Object.keys(mySchedule()).length);
  const finish = () => {
    if (sheetOpen()) closeSheet();
    hole.style.cssText = `left:${innerWidth / 2}px;top:${innerHeight / 2}px;width:0;height:0`; // tout reste sombre derrière le bravo
    tip.className = 'tour-tip done';
    tip.style.cssText = '';
    const need = !hasSched() && !bossWatching();
    tip.innerHTML = `<img class="tour-cheer" src="icons/rabbit-cheer.svg" alt="" draggable="false"><h2 id="tourH">${esc(t('tourDoneTitle'))}</h2><p>${esc(t(need ? 'tourDoneSched' : 'tourDoneText'))}</p>
      <div class="tour-btns"><button type="button" class="btn primary" data-tour="${need ? 'sched' : 'end'}">${esc(t(need ? 'tourDoneSchedGo' : 'tourDoneGo'))}</button></div>`;
    celebrate(); sfx('full'); buzz('plate');
    tip.querySelector('[data-tour]').focus({ preventScroll: true });
  };
  function place() {
    if (i >= steps.length) return;
    const el = $(steps[i][0]);
    if (!el) return;
    const r = el.getBoundingClientRect(), pad = 8;
    hole.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;border-radius:${Math.min(28, r.height / 2 + pad)}px`;
    const below = r.top + r.height / 2 < innerHeight / 2;
    tip.style.cssText = below ? `top:${r.bottom + pad + 14}px` : `bottom:${innerHeight - r.top + pad + 14}px`;
    tip.dataset.side = below ? 'below' : 'above';
    const tr = tip.getBoundingClientRect();
    tip.style.setProperty('--ax', `${Math.min(Math.max(r.left + r.width / 2 - tr.left - 8, 18), tr.width - 34)}px`); // la pointe de la bulle vise le bouton
  }
  const show = () => {
    if (prefs.simNew) { prefs.simNew.tourStep = i; savePrefs(); }
    if (i >= steps.length) { finish(); return; }
    const [sel, k, inSheet] = steps[i];
    // Les étapes du compte : la feuille s'ouvre; revenir à l'accueil la referme.
    if (inSheet && !sheetOpen()) { openAccount(); box.classList.add('wait'); setTimeout(() => { box.classList.remove('wait'); show(); }, 480); return; }
    if (!inSheet && sheetOpen()) { closeSheet(); box.classList.add('wait'); setTimeout(() => { box.classList.remove('wait'); show(); }, 400); return; }
    $(sel)?.scrollIntoView({ block: 'center' });
    tip.className = 'tour-tip';
    tip.innerHTML = `<p class="tour-count">${i + 1} / ${steps.length}</p><h2 id="tourH">${esc(t(`${k}T`))}</h2><p>${esc(t(k))}</p>
      <div class="tour-btns">${k === 'tourPic' // la photo : on la choisit tout de suite, une peluche de préférence
        ? `<button type="button" class="link" data-tour="next">${esc(t('tourLater'))}</button><button type="button" class="btn primary" data-tour="pic">${esc(t('tourPicGo'))}</button>`
        : `<button type="button" class="link" data-tour="skip">${esc(t('tourSkip'))}</button><button type="button" class="btn primary" data-tour="next">${esc(t(i === steps.length - 1 ? 'tourLast' : 'tourNext'))}</button>`}</div>
      <div class="tour-dots">${steps.map((st, j) => `<button type="button" data-tour-go="${j}" class="${j <= i ? 'on' : ''}" aria-label="${esc(t(`${st[1]}T`))}"${j === i ? ' aria-current="step"' : ''}></button>`).join('')}</div>`;
    place();
    sfx('step');
    tip.querySelector('.btn[data-tour]').focus({ preventScroll: true });
  };
  box.addEventListener('click', (e) => {
    if (box.classList.contains('wait')) return;
    const go = e.target.closest('[data-tour-go]');
    if (go) { i = Number(go.dataset.tourGo); show(); return; } // sauter directement à une étape
    const b = e.target.closest('[data-tour]');
    const act = b?.dataset.tour || (e.target === hole || e.target === box ? 'next' : '');
    if (act === 'next') { i += 1; show(); }
    else if (act === 'skip') { i = steps.length; finish(); }
    else if (act === 'pic') {
      // Le tutoriel s'efface le temps de choisir, puis reprend à l'étape suivante.
      box.classList.add('away');
      let back = false;
      // Retour sans saut : le tutoriel reste caché pendant que « Mon compte » se rouvre, puis réapparaît d'un coup sur l'étape suivante.
      const resume = () => {
        if (back) return; back = true; clearInterval(watch); i += 1;
        const inSheet = steps[i]?.[2];
        setTimeout(() => {
          if (inSheet && !sheetOpen()) openAccount();
          setTimeout(() => { show(); requestAnimationFrame(() => box.classList.remove('away')); }, inSheet ? 520 : 0);
        }, 360);
      };
      closeSheet();
      setTimeout(() => openAvatarPicker({ after: resume }), 320);
      const watch = setInterval(() => { if (!back && !sheetOpen() && !$('#sheet').classList.contains('closing')) resume(); }, 700);
    }
    else if (act === 'end') end();
    else if (act === 'sched') end(() => openScheduleSheet({ first: true }));
  });
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') end(); });
  addEventListener('resize', place);
  requestAnimationFrame(() => { box.classList.add('on'); show(); });
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-tour-open]')) { closeSheet(); setTimeout(startTour, 360); } });
// Carte « Mon horaire » en haut de Mes shifts.
function schedCard({ bare = false } = {}) {
  const sc = mySchedule();
  const days = WEEKDAYS[lang()];
  const ti = dowOf(todayISO());
  if (!sc || !Object.keys(sc).length) {
    return `<div class="sched-card empty"><div><b>${t('schedTitle')}</b><p>${t('schedEmpty')}</p></div><button type="button" class="btn primary" data-sched>${t('schedSet')}</button></div>`;
  }
  const tp = todaySched();
  return `<div class="sched-card">${bare ? '' : `<div class="sch-top"><b>${t('schedTitle')}</b><button type="button" class="link" data-sched>${t('schedEdit')}</button></div>`}
    <div class="sch-week">${days.map((d, i) => `<span class="sch-pill${i === ti ? ' today' : ''}${sc[i] ? ' on' : ''}"><small>${esc(cap(d).slice(0, 3))}</small><b>${sc[i] ? schedShort(sc[i]) : '–'}</b></span>`).join('')}</div>
    ${bare ? '' : `<p class="sch-today">${tp ? esc(t('schedTodayIs', f(toMin(tp.start)), f(toMin(tp.end)))) : esc(t('schedTodayOff'))}</p>`}</div>`;
}
document.addEventListener('click', (ev) => { if (ev.target.closest('[data-sched]')) openScheduleSheet(); });
// Les deux cartes sous « Mon horaire » : Bons trucs (jaune) et Aperçu du gym (vert).
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-hlink]');
  if (!b) return;
  ap.modeSet = true;
  if (b.dataset.hlink === 'tips') { ap.mode = 'tips'; ap.tab = 'tips'; } else { ap.mode = 'overview'; ap.tab = 'day'; prefs.apTab = 'day'; savePrefs(); }
  openApercu();
});
// Un jour prévu à l'horaire : le quart part tout seul, avec les bonnes heures.
// Un quart d'aujourd'hui où rien n'est coché suit l'horaire : des heures restées d'avant
// (ex. un soir choisi sur l'ancienne page) ne restent pas collées.
function dropStaleShift() {
  if (prefs.simShift) return;
  const tp = todaySched();
  if (!state || state.date !== todayISO() || !tp?.start) return;
  if (tp.start === state.start && tp.end === state.end && state.name === shiftName()) return;
  // Le pointage seul ne compte pas : avant l'heure, rien n'a vraiment commencé.
  if (Object.entries(state.tasks || {}).some(([id, x]) => x.done && id !== 'pointage') || state.flags?.length) return;
  state = null; save();
}
function startScheduled(p, { simulation = false, quiet = false } = {}) {
  state = {
    name: shiftName(),
    supervisor: '',
    date: p.date || todayISO(),
    simulation,
    start: p.start,
    end: p.end,
    shift: detectShift(p.start, p.end),
    special: p.special || '',
    tasks: {},
    flags: [],
    notes: '',
    view: 'time',
    createdAt: new Date().toISOString(),
  };
  save();
  if (quiet) { paintStatic(); return; }
  window.history.replaceState(history.state, '', location.pathname);
  openChecklist();
}

function pickPreset(id) {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) return;
  $('#fStart').value = p.start;
  $('#fEnd').value = p.end;
  manualShift = null;
  const row = $('#timeRow');
  row.classList.remove('filled');
  void row.offsetWidth; // relance l'animation
  row.classList.add('filled');
  updatePreview();
}

function setupScreen({ next = null } = {}) {
  setupNext = next;
  // Le matin, on propose le quart de jour; l'après-midi, celui du soir.
  // Chaque téléphone retient les dernières heures choisies pour chacun.
  const defShift = new Date().getHours() < 12 ? 1 : 2;
  const last = prefs.lastTimes?.[defShift];
  $('#fName').value = session.user?.name || prefs.name;
  $('#nameField').hidden = Boolean(session.user);
  paintAccount();
  $('#fDate').value = todayISO();
  $('#fDate').hidden = true;
  $('#dateChange').hidden = false;
  const planned = todaySched();
  $('#fStart').value = planned?.start || last?.start || SHIFTS[defShift].start;
  $('#fEnd').value = planned?.end || last?.end || SHIFTS[defShift].end;
  if (next) { $('#fDate').value = next.date; $('#fStart').value = next.start; $('#fEnd').value = next.end; }
  showHours(false);
  renderPresets();
  paintDate();
  paintEditToday();
  $('#editToday').hidden = true; // page « heures » seulement : pas de raccourci vers l'ancien quart
  paintSetupSched();
  manualShift = null;
  setTimeout(paintInstallTip, 0); // après show('setup')
  editing = false;
  paintStatic();
  updatePreview();
  show('setup');
}

function currentShift() {
  const s = $('#fStart').value;
  const e = $('#fEnd').value;
  return manualShift || (s && e ? detectShift(s, e) : 1);
}

// Aperçu du plan : ce qui attend l'employé, sans jargon de règles.
function updatePreview() {
  const s = $('#fStart').value;
  const e = $('#fEnd').value;
  const date = $('#fDate').value;
  const preset = syncPresets();
  paintDate();
  if (!s || !e || !date) { $('#preview').innerHTML = ''; return; }
  const shift = currentShift();
  const p = buildPlan({ shift, date, start: s, end: e, lang: lang() });
  const d = p.day;
  const facts = [
    `<span class="fact"><b>${esc(p.weekdayName)}</b></span>`,
    `<span class="fact num">${esc(fmtDuration(p.totals.presence, lang()))}</span>`,
    `<span class="fact">${t('zoneDeep')} <b>${d.zones[shift]}</b></span>`,
  ];
  if (shift === 2) {
    facts.push(`<span class="fact">${d.surfaces === 'miroirs' ? `${t('mirrorsZone')} <b>${d.zones.third}</b>` : esc(t(d.surfaces === 'tuiles' ? 'tiles' : 'inspection'))}</span>`);
    if (d.walls) facts.push(`<span class="fact">${t('walls')}</span>`);
  }
  facts.push(`<span class="fact"><b>${p.items.filter((i) => i.kind === 'task').length}</b> ${t('tasks')}</span>`);
  // Le choix matin/soir n'est offert que pour des heures inhabituelles.
  const other = SHIFTS[shift === 1 ? 2 : 1][lang()].name;
  $('#preview').innerHTML = `
    <div class="top"><b>${esc(p.shiftName)}</b></div>
    <div class="facts">${facts.join('')}</div>
    ${preset ? '' : `<button type="button" class="link" id="swapShift">${esc(t('switchTo', other))}</button>`}`;
  const sw = $('#swapShift');
  if (sw) sw.onclick = () => { manualShift = shift === 1 ? 2 : 1; updatePreview(); };
}
$('#setupForm').addEventListener('input', (ev) => {
  if (ev.target.id === 'fStart' || ev.target.id === 'fEnd') manualShift = null;
  updatePreview();
});

$('#setupForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const name = session.user ? shiftName() : $('#fName').value.trim();
  if (!name) { $('#fName').focus(); return; }
  if (!$('#fStart').value || !$('#fEnd').value || !$('#fDate').value) return;
  prefs.name = name;
  prefs.lastTimes = { ...prefs.lastTimes, [currentShift()]: { start: $('#fStart').value, end: $('#fEnd').value } };
  savePrefs();
  const keep = editing && state ? { tasks: state.tasks, flags: state.flags, notes: state.notes, view: state.view } : {};
  state = {
    name,
    supervisor: '',
    date: $('#fDate').value,
    start: $('#fStart').value,
    end: $('#fEnd').value,
    shift: currentShift(),
    tasks: {},
    flags: [],
    notes: '',
    view: 'time',
    createdAt: new Date().toISOString(),
    ...keep,
  };
  editing = false;
  save();
  window.history.replaceState(history.state, '', location.pathname);
  openChecklist();
});

// ---------- 2. Checklist ----------
// Le quart a-t-il commencé (l'heure du début est passée)? Le pointage attend ce moment.
// Avant le début (et sans pointage), aucun chiffre de tâches : rien à compter encore.
const counting = () => Boolean(state); // les chiffres se montrent toujours (le quart s'ouvre quand on veut)
const shiftStarted = () => Boolean(state) && Date.now() >= new Date(`${state.date}T${state.start}`).getTime();
// Le mot laissé par le quart d'avant (2 derniers jours), en haut des tâches.
let handoff = null;
async function loadHandoff() {
  if (!state) return;
  const { shifts } = await loadRecent(12).catch(() => ({ shifts: [] }));
  const mine = (s) => s.date === state.date && s.shift === state.shift && s.name === state.name;
  const h = shifts.find((s) => s.handoff && !mine(s) && s.date >= addDays(state.date, -2) && s.date <= state.date);
  handoff = h ? { text: h.handoff, by: h.name, date: h.date } : null;
  if (current === 'checklist') renderChecklist();
}
function openChecklist() {
  if (bossWatching()) { openHistory({ team: true }); return; }
  paintStatic();
  loadHandoff();
  plan = shiftPlan(state);
  setTimeout(() => document.querySelector('#taskList .task.current, #taskList .task:not(.done)')?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }), current === 'checklist' ? 0 : 450);
  renderChecklist();
  show('checklist');
}

const entry = (id) => state.tasks[id] || (state.tasks[id] = {});
const planTasks = () => plan.items.filter((it) => it.kind === 'task');
const findTask = (id) => [...planTasks(), ...plan.overflow].find((x) => x.id === id);
const allDone = () => planTasks().every((x) => state.tasks[x.id]?.done);

function nowMinutes() {
  if (!state || state.date !== todayISO()) return null;
  const d = new Date();
  let m = d.getHours() * 60 + d.getMinutes();
  if (m < plan.start && plan.end > 1440) m += 1440;
  return m;
}

// Chaque type de tâche a la couleur d'un disque olympique (rouge, bleu, jaune, vert…).
const PLATE = { accueil: 'r', fermeture: 'r', buanderie: 'b', spinning: 'b', dechets: 'y', gym: 'g', zone: 'g', surfaces: 'g', cardio: 'w', muscu: 'w', bureaux: 'k' };
const plateOf = (it) => PLATE[it?.area] || 'k';
const icon = (it) => `<span class="t-icon${state?.tasks?.[it.id]?.done ? '' : ' alive'}" data-plate="${plateOf(it)}" style="--pc:var(--plate-${plateOf(it)})" aria-hidden="true">${it.auto ? illustration('pointage') : illustration(it.photo)}</span>`;

function taskRow(it, { extra = false } = {}) {
  const e = state.tasks[it.id] || {};
  const now = nowMinutes();
  const isNow = !extra && now !== null && it.start <= now && now < it.end;
  const punch = it.id === 'pointage';
  const cls = ['task', e.done && 'done', e.skipped && !e.done && 'skipped', isNow && 'current', punch && 'punch', punch && !e.done && 'alive', punch && justPunched && 'stamp'].filter(Boolean).join(' ');
  const tags = [];
  if (isNow) tags.push(`<span class="tag now">${t('now')}</span>`);
  for (const r of it.reminders || []) tags.push(`<span class="tag time">${f(r.at)} · ${esc(r.label)}</span>`);
  if (e.skipped && !e.done) tags.push(`<span class="tag bad">${t('notDone')}${e.reason ? ` · ${esc(SKIP_REASONS[e.reason]?.[lang()] || e.reason)}` : ''}</span>`);
  if (!e.done && e.steps?.length) tags.push(`<span class="tag note num">${Math.min(e.steps.length, it.steps.length)}/${it.steps.length} ${t('stepsShort')}</span>`);
  if (e.remark) tags.push(`<span class="tag note">${t('remark')}</span>`);
  const time = extra
    ? `<span class="t-time num">+<small>${it.minutes} min</small></span>`
    : `<span class="t-time num">${f(it.start)}<small>${it.auto ? '' : `${it.minutes} min`}</small></span>`;
  return `<li class="${cls}" data-id="${esc(it.id)}">
    <span class="swipe-under" aria-hidden="true">✓</span>
    <div class="task-inner">
      <button class="task-main" data-act="open">
        ${time}
        ${icon(it)}
        <span class="t-body">
          <span class="t-title">${esc(it.title)}</span>
          ${it.summary ? `<span class="t-sum">${esc(it.summary)}</span>` : ''}
          ${tags.length ? `<span class="tags">${tags.join('')}</span>` : ''}
          ${!e.done && !punch && !it.auto ? `<span class="t-more">${esc(t('seeDetails'))}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></span>` : ''}
        </span>
      </button>
      ${`<button class="check" data-act="toggle" aria-pressed="${Boolean(e.done)}" aria-label="${esc(it.title)}"><i>${e.skipped && !e.done ? '✕' : '✓'}</i></button>`}
    </div>
  </li>`;
}

function breakRow(it) {
  if (it.kind === 'slack') {
    return `<li class="break slack"><span class="ico num">${f(it.start)}</span><span><b>${esc(it.title)}</b><br><small>${esc(it.summary)}</small></span><span class="t num">${it.minutes} min</span></li>`;
  }
  const sub = it.kind === 'meal' ? t('unpaidMeal') : t('paidBreak');
  const rem = (it.reminders || []).map((r) => `<br><small>${f(r.at)} · ${esc(r.label)}</small>`).join('');
  return `<li class="break"><span class="ico num">${f(it.start)}</span><span><b>${esc(it.title)}</b> <small>· ${sub}</small>${rem}</span><span class="t num">${it.minutes} min</span></li>`;
}

// La barre : chaque tâche finie charge un disque de sa couleur, à gauche puis à
// droite, comme au gym. Barre pleine = quart fini.
let landId = null; // la tâche qui vient d'être cochée : son disque arrive en glissant
let liftNext = false;
// Les étapes d'une tâche : une pastille de sa couleur par étape.
// Les étapes d'une tâche montent un haltère (propriétaire : « plus satisfaisant, gym »).
// La poignée est là dès le début; chaque étape glisse un disque (gauche, droite, en
// alternance, du plus gros au plus petit), les places vides sont en pointillé. La dernière
// étape serre les colliers et l'haltère fait une flexion.
function pipsHTML(done, total, plate, land = -1) {
  const n = Math.max(1, total);
  const H = [24, 20, 16, 13, 11];
  const slots = Array.from({ length: n }, (_, i) => {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    const w = 6, gap = 1.5;
    const x = side < 0 ? 40 - (k + 1) * (w + gap) : 80 + k * (w + gap) + gap;
    return { x, w, h: H[Math.min(k, H.length - 1)], side };
  });
  const full = done >= n;
  const plates = slots.map((p, i) => {
    const y = 15 - p.h / 2;
    return i < done
      ? `<g class="plate${i === land ? ' land' : ''}" style="--dir:${p.side}"><rect x="${p.x}" y="${y}" width="${p.w}" height="${p.h}" rx="1.6"/></g>`
      : `<rect class="ghost" x="${p.x}" y="${y}" width="${p.w}" height="${p.h}" rx="1.6"/>`;
  }).join('');
  const outer = Math.max(...slots.map((p) => (p.side < 0 ? 40 - p.x : p.x + p.w - 80)), 0);
  return `<svg class="db${full && land >= 0 ? ' curl' : ''}${full ? ' full' : ''}" viewBox="${40 - outer - 8} 0 ${40 + 2 * outer + 16} 30" role="img" aria-label="${done}/${n}">
    <rect class="bar" x="${40 - outer - 5}" y="13.4" width="${40 + 2 * outer + 10}" height="3.2" rx="1.6"/>
    <rect class="grip" x="46" y="12.6" width="28" height="4.8" rx="2.4"/>
    ${plates}
    <rect class="collar${full ? ' on' : ''}" x="${40 - outer - 3}" y="11" width="3" height="8" rx="1"/>
    <rect class="collar${full ? ' on' : ''}" x="${80 + outer}" y="11" width="3" height="8" rx="1"/>
  </svg>`;
}
const sfx = (name, opts) => { if (prefs.sound !== false) fxSound(name, opts); };
document.addEventListener('click', (ev) => { if (prefs.sound !== false && ev.target.closest('button, [role="button"], a[href], summary, [data-act]')) clickTap(() => prefs.sound !== false); }, true);
// iPhone : par défaut, le bouton silencieux coupe les sons et la musique de l'employé continue.
// « Sons même en silencieux » (Menu) : les sons jouent quand même (la musique peut s'arrêter).
function applyAudioSession() { try { if (navigator.audioSession) navigator.audioSession.type = prefs.soundSilent ? 'playback' : 'ambient'; } catch { /* ignore */ } }
applyAudioSession();
let glass = null;
// Le pointage : un vrai « clac » (tampon doré, éclats, son) et il remplit le verre plus que les autres.
let justPunched = false;
const PUNCH_W = 3; // le pointage vaut trois tâches dans le verre
function punchIn(manual = false) {
  state.tasks.pointage = { done: true, doneAt: new Date().toISOString(), ...(manual ? { manual: true } : {}) };
  save();
  justPunched = true;
  landId = 'pointage';
  renderChecklist();
  justPunched = false;
  setTimeout(() => { sfx('punch'); buzz('plate'); celebrate(); }, 250);
}
function renderTimeline() {
  const tasks = planTasks();
  const done = tasks.filter((it) => state.tasks[it.id]?.done).length;
  const box = $('#timeline');
  if (!glass || !box.querySelector('.glass')) {
    glass = mountGlass(box);
    box.insertAdjacentHTML('beforeend', '<div class="glass-count"><b class="num"></b><span></span></div>');
  }
  box.querySelector('.glass-count').hidden = !counting();
  box.querySelector('.glass-count b').textContent = `${done}/${tasks.length}`;
  box.querySelector('.glass-count span').textContent = t('tasks');
  const w = (it) => (it.id === 'pointage' ? PUNCH_W : 1);
  const total = tasks.reduce((a, it) => a + w(it), 0);
  glass.set(total ? tasks.filter((it) => state.tasks[it.id]?.done).reduce((a, it) => a + w(it), 0) / total : 0, { pour: Boolean(landId) });
  box.setAttribute('aria-label', t('barLabel', done, tasks.length));
  box.classList.toggle('full', tasks.length > 0 && done === tasks.length);
  if (liftNext && !reducedMotion()) { box.classList.remove('lift'); void box.offsetWidth; box.classList.add('lift'); }
  landId = null;
  liftNext = false;
}

// Le son du disque qui tombe sur la barre (court, discret; coupé dans le Menu).
function clank(kind = 'plate') {
  if (kind === 'step') sfx('step');
  else if (kind === 'lift') sfx('save');
  else sfx('check', { level: 0.15 });
}
function buzz(kind) {
  try { navigator.vibrate?.(kind === 'step' ? 8 : kind === 'lift' ? [20, 40, 20, 40, 60] : [10, 40, 22]); } catch { /* iPhone : pas de vibration */ }
}

// Carte « En cours » : ce qu'il faut faire maintenant, en un toucher.
function renderNow() {
  const now = nowMinutes();
  const box = $('#nowCard');
  if (now === null) { box.innerHTML = ''; return; }
  const quiet = (msg) => `<div class="now-card quiet">${esc(msg)}</div>`;
  if (now < plan.start) { box.innerHTML = quiet(t('startsAt', f(plan.start))); return; }
  if (now >= plan.end) { box.innerHTML = quiet(t('over')); return; }
  const open = (it) => it.kind === 'task' && !state.tasks[it.id]?.done && !state.tasks[it.id]?.skipped;
  // « En cours » = ce qu'on fait vraiment : la première tâche pas encore cochée dont l'heure est arrivée,
  // même en retard. Tout est à jour : ce que l'horaire prévoit maintenant (ou la suivante, si on est en avance).
  const sched = plan.items.find((it) => it.start <= now && now < it.end);
  let cur = plan.items.find((it) => open(it) && it.start <= now);
  if (!cur) {
    if (sched && sched.kind !== 'task') cur = sched; // la pause, à son heure
    else cur = plan.items.find((it) => open(it) && (!sched || it.start >= sched.start)) || plan.items.find(open);
  }
  if (!cur) { box.innerHTML = quiet(t('allDone')); return; }
  const nextIt = plan.items.find((it) => it !== cur && it.start >= cur.start && open(it));
  const next = nextIt ? `<div class="next"><span>${t('next')}</span><b>${esc(nextIt.title)}</b></div>` : '';
  const catchUp = '';
  const late = cur.kind === 'task' && cur.end < now ? now - cur.end : 0;
  const remain = late >= 5 ? `<span class="now-late">${esc(t('nowLate', fmtDuration(late, lang())))}</span>` : '';
  const bar = '';
  if (cur.kind !== 'task') {
    box.innerHTML = `<div class="now-card"><div class="now-head"><span class="live">${t('now')}</span>${remain}</div>
      <h2>${esc(cur.kind === 'slack' ? cur.title : t('breakNow'))}</h2>${bar}${next}${catchUp}</div>`;
    return;
  }
  const e = state.tasks[cur.id] || {};
  const np = plateOf(cur) === 'r' ? 'b' : plateOf(cur); // jamais de grande carte rouge : le rouge veut dire « problème »
  box.innerHTML = `<div class="now-card" data-plate="${np}" style="--pc:var(--plate-${np})"><div class="now-head"><span class="live">${t('now')}</span>${remain}</div>
    <div class="now-main alive">${icon(cur)}<div><h2>${esc(cur.title)}</h2>${cur.summary ? `<p class="sum">${esc(cur.summary)}</p>` : ''}</div></div>
    ${bar}
    <div class="acts" data-id="${esc(cur.id)}">
      <button class="btn ${e.done ? 'ghost' : 'primary'} small" data-act="toggle">${e.done ? '✓ ' : ''}${t('markDone')}</button>
      <button class="btn ghost small" data-act="open">${t('seeDetails')}</button>
    </div>${next}${catchUp}</div>`;
}

function renderChecklist() {
  const lock = shiftLocked();
  // Le pointage se coche seulement à l'heure du début du quart (pas avant, même si le quart est ouvert).
  $('#checklist').classList.toggle('locked', Boolean(lock));
  let note = $('#lockNote');
  if (!note) { note = document.createElement('p'); note.id = 'lockNote'; note.className = 'ov-note lock-note'; $('#taskList').before(note); }
  note.hidden = !lock;
  if (lock) note.textContent = `${t('ovFuture')} ${t('ovLocked', countdown(lock))}.`;
  let hn = $('#handoffNote');
  if (!hn) { hn = document.createElement('div'); hn.id = 'handoffNote'; hn.className = 'handoff-note'; note.after(hn); }
  hn.hidden = !handoff;
  if (handoff) hn.innerHTML = `<small>${esc(t('handoffFrom', handoff.by.split(' ')[0]))}</small><p>${esc(handoff.text)}</p>`;
  const tasks = planTasks();
  const done = tasks.filter((x) => state.tasks[x.id]?.done).length;
  const d = plan.day;

  $('#cEyebrow').textContent = `${SHIFTS[plan.shift][lang()].short} · ${dayMonth(state.date)}`;
  $('#cTitle').textContent = state.name;
  $('#rangeLabel').textContent = `${f(plan.start)} → ${f(plan.end)}`;
  $('#progressLabel').textContent = !counting() ? '' : done === tasks.length && tasks.length ? t('allDone') : t('leftOf', tasks.length - done, done, tasks.length);
  renderTimeline();
  renderNow();

  $('#listCount').textContent = counting() ? `${done}/${tasks.length}` : '';
  paintCustomNote();
  // « Enregistrer » tant qu'il reste des tâches; « Fin du quart » quand tout est coché
  // (ou marqué « Pas pu faire »), ou quand l'heure de fin est passée.
  const ready = canEnd();
  $('#finishBtn').classList.toggle('ready', ready);
  $('#finishBtn').classList.toggle('save-mode', !ready);
  $('#finishBtn').textContent = t(ready ? 'finishReady' : 'saveProgress');
  if (lock) { $('#finishBtn').textContent = t('lockShort', countdown(lock)); $('#finishBtn').disabled = true; } else $('#finishBtn').disabled = false;
  const hint = $('#swipeHint');
  hint.hidden = prefs.swipeSeen || !matchMedia('(pointer: coarse)').matches;
  hint.textContent = t('swipeHint');

  let html = '';
  if (state.view === 'zone') {
    const groups = {};
    for (const it of tasks) (groups[it.area] ||= []).push(it);
    for (const k of Object.keys(groups).sort((a, b) => AREAS[a].order - AREAS[b].order)) {
      const label = k === 'zone' ? `${AREAS.zone[lang()]} — zone ${d.zones[plan.shift]}` : AREAS[k][lang()];
      html += `<li class="group-title">${esc(label)}</li>${groups[k].map((it) => taskRow(it)).join('')}`;
    }
  } else {
    html = plan.items.map((it) => (it.kind === 'task' ? taskRow(it) : breakRow(it))).join('');
  }
  $('#taskList').innerHTML = html;

  // Les tâches qui n'entrent pas dans les heures : on ne les montre plus (demande de l'équipe).
  $('#overflowBlock').innerHTML = '';

  $('#flagsBlock').innerHTML = state.flags.length
    ? `<div class="section-head"><h2>${t('flags')}</h2><span class="num">${state.flags.length}</span></div>
       ${state.flags.map((fl, i) => `<div class="flag-item${fl.urgent ? ' urgent' : ''}">${catIcon(fl.category)}<div><b>${esc(catName(fl.category))}</b>${fl.location ? ` · ${esc(fl.location)}` : ''}<br>${fl.text ? `${esc(fl.text)}<br>` : ''}<small class="num">${clock(fl.at)}${fl.photos?.length ? ` · ${t('photos')} ${fl.photos.length}` : ''}</small>${flagMailLine(fl, i)}</div><button data-del-flag="${i}">${t('remove')}</button></div>`).join('')}`
    : '';
}

// Un quart pas encore commencé (plus de 30 min avant) : on le voit, on coche rien.
function shiftLocked() {
  // Propriétaire : plus de verrou. Le quart s'ouvre et se coche quand on veut, même d'avance.
  return 0;
}
function lockedToast() { const l = shiftLocked(); if (l) { toast(t('ovLocked', countdown(l)), 'muted'); sfx('locked'); } return l; }
function toggleDone(id) {
  if (id === 'pointage') { // le pointage reste coché; on pointe soi-même, à n'importe quelle heure
    if (state.tasks.pointage?.done) return;
    punchIn(true);
    return;
  }
  if (lockedToast()) return;
  const wasAll = allDone();
  const e = entry(id);
  const before = JSON.stringify(e);
  const undo = () => { state.tasks[id] = JSON.parse(before); save(); renderChecklist(); };
  e.done = !e.done;
  if (e.done) { e.skipped = false; delete e.reason; e.doneAt = new Date().toISOString(); } else delete e.doneAt;
  save();
  if (e.done) landId = id;
  if (!wasAll && allDone()) liftNext = true;
  renderChecklist();
  // Propriétaire : la grande fête (lapin, confettis, musique) seulement à « Fin du quart ».
  if (e.done) { const ts = planTasks(); sfx('check', { level: ts.filter((x) => state.tasks[x.id]?.done).length / (ts.length || 1) }); buzz('plate'); } else sfx('uncheck');
  if (!wasAll && allDone()) setTimeout(() => buzz('lift'), reducedMotion() ? 0 : 650);
  if (e.done) document.querySelector(`#taskList [data-id="${CSS.escape(id)}"], #overflowBlock [data-id="${CSS.escape(id)}"]`)?.classList.add('just');
  const tasks = planTasks();
  const left = tasks.filter((x) => !state.tasks[x.id]?.done).length;
  const half = Math.ceil(tasks.length / 2);
  if (!wasAll && allDone()) toast(t('allDoneEnd'), 'ok', undo);
  else if (e.done && left === 1) toast(t('lastOne'), 'ok', undo);
  else if (e.done && tasks.length - left === half && tasks.length > 3) { celebrate(); toast(t('halfway'), 'ok', undo); }
  else toast(e.done ? pickCheer() : t('unchecked'), e.done ? 'ok' : 'muted', undo);
  bump($('#progressLabel'));
}

// Moment spécial : la dernière tâche cochée fait sauter la mascotte de joie.
function showAllDone() {
  const m = $('#momentAllDone');
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('on'));
  $('#momentClose').focus({ preventScroll: true });
}
function hideAllDone() {
  const m = $('#momentAllDone');
  m.classList.remove('on');
  setTimeout(() => { m.hidden = true; }, 300);
}
$('#momentClose').addEventListener('click', () => { hideAllDone(); setTimeout(openFinish, reducedMotion() ? 0 : 250); });
$('#momentAllDone').addEventListener('click', (e) => { if (e.target.id === 'momentAllDone') hideAllDone(); });

// Un mot différent à chaque tâche cochée (moins robotique).
let cheerAt = -1;
function pickCheer() {
  const list = t('cheers');
  cheerAt = (cheerAt + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  return list[cheerAt];
}
function bump(el) {
  if (!el || reducedMotion()) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// Glisser vers la droite pour cocher (le toucher simple marche toujours).
let swipe = null;
let suppressClick = false;
function bindSwipe(list) {
  list.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('.task');
    if (!li || e.pointerType === 'mouse') return;
    swipe = { li, x: e.clientX, y: e.clientY, dx: 0, active: false, id: e.pointerId };
  });
  list.addEventListener('pointermove', (e) => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    if (!swipe.active) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { swipe = null; return; }
      if (dx > 12 && dx > Math.abs(dy) * 1.4) {
        swipe.active = true;
        swipe.li.classList.add('swiping');
        try { swipe.li.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      } else return;
    }
    swipe.dx = Math.max(0, Math.min(dx - 12, 150));
    swipe.li.style.setProperty('--sx', `${swipe.dx}px`);
    swipe.li.classList.toggle('armed', swipe.dx > 84);
  });
  const end = () => {
    if (!swipe) return;
    const { li, dx, active } = swipe;
    swipe = null;
    if (!active) return;
    li.classList.remove('swiping', 'armed');
    li.style.removeProperty('--sx');
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 80);
    if (dx > 84) {
      if (!prefs.swipeSeen) { prefs.swipeSeen = true; savePrefs(); }
      toggleDone(li.dataset.id);
    }
  };
  list.addEventListener('pointerup', end);
  list.addEventListener('pointercancel', end);
}

for (const sel of ['#taskList', '#overflowBlock', '#nowCard']) {
  const el = $(sel);
  if (sel !== '#nowCard') bindSwipe(el);
  el.addEventListener('click', (ev) => {
    if (suppressClick) return;
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('[data-id]').dataset.id;
    if (btn.dataset.act === 'toggle') toggleDone(id);
    else openTask(id);
  });
}

// Retirer un signalement : deux touchers (pas de confirm(), plus doux sur iPhone).
$('#flagsBlock').addEventListener('click', (ev) => {
  const retry = ev.target.closest('[data-retry-flag]');
  if (retry) { const fl = state.flags[+retry.dataset.retryFlag]; if (fl) submitProblem(fl); return; }
  const b = ev.target.closest('[data-del-flag]');
  if (!b) return;
  if (!b.dataset.armed) {
    b.dataset.armed = '1';
    b.textContent = t('confirmRemove');
    setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = t('remove'); } }, 3000);
    return;
  }
  const [gone] = state.flags.splice(+b.dataset.delFlag, 1);
  (gone.photos || []).forEach(deletePhoto);
  save();
  renderChecklist();
});

// « En cours » et le couloir avancent toutes les 30 secondes.
setInterval(() => {
  if (current !== 'checklist' || !plan) return;
  if (state && !state.tasks.pointage?.done && shiftStarted() && $('#taskList .check-wait')) { renderChecklist(); return; } // l'heure du début : le rond pour pointer apparaît
  renderTimeline(); renderNow();
}, 30_000);

// ---------- Feuille du bas ----------
let lastFocus = null;
// html : le contenu qui défile; foot : les boutons d'action, toujours visibles en bas.
function openSheet(html, onMount, foot = '') {
  lastFocus = document.activeElement;
  if ($('#sheet').hidden || !$('#sheet').classList.contains('open')) {
    // « Retour » doit pouvoir fermer la feuille : elle prend sa place dans l'historique.
    if (!history.state?.sheet) { try { history.pushState({ ...(history.state || { scr: current }), sheet: true }, '', location.href); } catch { /* ignore */ } }
    sfx('open');
    // Première ouverture : le contenu arrive en cascade (pas aux mises à jour).
    $('#sheet').classList.add('fresh');
    clearTimeout(openSheet.timer);
    openSheet.timer = setTimeout(() => $('#sheet').classList.remove('fresh'), 700);
  }
  $('#sheetBody').innerHTML = html;
  $('#sheetBody').scrollTop = 0;
  // Lecteur d'écran : la feuille porte le nom de son titre.
  const head = $('#sheetBody').querySelector('h1, h2, h3');
  if (head) { head.id = 'sheetTitle'; $('#sheet').setAttribute('aria-labelledby', 'sheetTitle'); $('#sheet').removeAttribute('aria-label'); }
  else { $('#sheet').removeAttribute('aria-labelledby'); $('#sheet').setAttribute('aria-label', t('details')); }
  $('#sheetFoot').innerHTML = foot;
  $('#sheetFoot').hidden = !foot;
  $('#sheet').classList.toggle('has-foot', Boolean(foot));
  $('#backdrop').hidden = false;
  $('#sheet').hidden = false;
  requestAnimationFrame(() => { $('#backdrop').classList.add('open'); $('#sheet').classList.add('open'); });
  onMount?.($('#sheet'));
  $('#sheet').focus({ preventScroll: true });
}
function closeSheet() {
  if (!$('#sheet').hidden && $('#sheet').classList.contains('open')) sfx('close');
  // Fermée au toucher (X, fond, glisser) : on retire aussi son entrée d'historique.
  if (history.state?.sheet && !navRestoring) { sheetPopExpected = true; history.back(); }
  $('#backdrop').classList.remove('open');
  $('#sheet').classList.remove('open');
  setTimeout(() => { $('#backdrop').hidden = true; $('#sheet').hidden = true; }, 300);
  lastFocus?.focus?.({ preventScroll: true });
}
$('#sheet').tabIndex = -1;
$('#backdrop').addEventListener('click', closeSheet);
$('#sheetX').addEventListener('click', closeSheet);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });

// Glisser la feuille vers le bas pour la fermer.
(() => {
  let y0 = null;
  const sheet = $('#sheet');
  sheet.addEventListener('touchstart', (e) => { if ($('#sheetBody').scrollTop <= 0 && !e.target.closest('.gym3d')) y0 = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy > 0) { sheet.classList.add('dragging'); sheet.style.setProperty('--drag', `${dy}px`); }
  }, { passive: true });
  sheet.addEventListener('touchend', (e) => {
    if (y0 === null) return;
    const dy = e.changedTouches[0].clientY - y0;
    sheet.classList.remove('dragging');
    sheet.style.removeProperty('--drag');
    y0 = null;
    if (dy > 90) closeSheet();
  });
})();

// ---------- Photos d'un problème (elles vont avec le signalement, dans l'Espace superviseur) ----------

const CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const photoFieldHtml = () => `<div data-photofield><p class="block-label">${t('photosOpt')}</p><div class="shots" data-shots></div></div>`;

// ids : tableau modifié sur place (au plus 3 photos par signalement).
function mountPhotos(root, ids, onChange) {
  const box = root.querySelector('[data-shots]');
  const urls = [];
  const draw = async () => {
    urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
    const thumbs = await Promise.all(ids.map(async (pid) => {
      const blob = await getPhoto(pid);
      if (!blob) return '';
      const u = URL.createObjectURL(blob);
      urls.push(u);
      return `<div class="shot"><img src="${u}" alt=""><button type="button" data-del="${esc(pid)}" aria-label="${t('remove')}">×</button></div>`;
    }));
    const full = ids.length >= MAX_PROBLEM_PHOTOS;
    box.innerHTML = thumbs.join('') + (full
      ? `<p class="shots-full">${t('photosMax', MAX_PROBLEM_PHOTOS)}</p>`
      : `<label class="add-shot"><input type="file" accept="image/*">${CAMERA}${t('addPhoto')}</label>`);
    box.querySelector('input')?.addEventListener('change', async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      try {
        const pid = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        await putPhoto(pid, await shrink(file));
        ids.push(pid);
        onChange();
        toast(t('photoAdded'));
      } catch {
        toast(t('photoBad'), 'bad');
      }
      draw();
    });
    for (const b of box.querySelectorAll('[data-del]')) {
      b.onclick = async () => {
        ids.splice(ids.indexOf(b.dataset.del), 1);
        await deletePhoto(b.dataset.del);
        onChange();
        draw();
      };
    }
  };
  draw();
}

// ---------- Plan du gym (interactif) ----------
const MAP_LABELS = {
  fr: { A: 'Cardio', B: 'Bas du corps', C: 'Haut du corps', 1: 'Entrée', 2: 'Évier', 3: 'Vestiaire femmes', 4: 'Studio de spinning', 5: 'Vestiaire hommes', r1: 'Entrée', stretch: 'Étirement', r2: 'Évier', r3: 'Femmes', r4: 'Spinning', r5: 'Hommes' },
  en: { A: 'Cardio', B: 'Lower body', C: 'Upper body', 1: 'Entrance', 2: 'Sink', 3: 'Women’s locker room', 4: 'Spin studio', 5: 'Men’s locker room', r1: 'Entrance', stretch: 'Stretching', r2: 'Sink', r3: 'Women', r4: 'Spin studio', r5: 'Men' },
};

// Ce qui se passe aujourd'hui dans une zone ou une pièce (selon le plan du jour).
function todayIn(area, day) {
  const out = [];
  if (day.zones[1] === area) out.push(`${t('morning')} · ${t('deepClean')}`);
  if (day.zones[2] === area) out.push(`${t('evening')} · ${t('deepClean')}`);
  if (day.surfaces === 'miroirs' && day.zones.third === area) out.push(`${t('evening')} · ${t('mirrorsTask')}`);
  if (area === '3' || area === '5') out.push(t('roomTrash'));
  if (area === '4') out.push(`${t('morning')} · ${t('spinRoom')}`);
  if (area === '2') out.push(t('roomSink'));
  if (area === 'A') out.push(`${t('morning')} · ${t('cardioVac')}`);
  if (area === 'B' || area === 'C') out.push(`${t('morning')} · ${t('blackMats')}`);
  return out;
}

// Monte le plan dans un conteneur : toucher une zone ou une pièce montre ce
// qu'il y a dedans et ce qui est prévu aujourd'hui.
// La 3D pèse ~650 Ko : sur un vieux téléphone ou un réseau lent, on commence
// par le plan (on peut toujours toucher « 3D »), et on ne la charge qu'en vue.
const lowPower = () => {
  const c = navigator.connection;
  return Boolean(c?.saveData || /(^|-)2g|3g/.test(c?.effectiveType || '') || (navigator.deviceMemory && navigator.deviceMemory < 4));
};
const nearView = (el) => new Promise((resolve) => {
  if (!('IntersectionObserver' in window)) return resolve();
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting) || !el.isConnected) { io.disconnect(); resolve(); }
  }, { rootMargin: '200px' });
  io.observe(el);
});

function mountMap(box, { highlight = null, mirrors = null, states = {}, date = todayISO(), dayLabel = t('today') } = {}) {
  const day = dayInfo(date);
  // Étiquettes du jour sur les zones : profondeur du matin, du soir, miroirs.
  const tags = {};
  const tag = (z, text, state) => (tags[z] ||= []).push({ text, state });
  // L'heure réelle du nettoyage en profondeur : celle de mon quart s'il est ce
  // jour-là, sinon celle de l'horaire de référence.
  const deepAt = (shift) => {
    const p = plan && plan.shift === shift && state?.date === date ? plan : refPlan(date, shift);
    const it = p.items.find((x) => x.deep);
    return it ? ` · ${f(it.start)}` : '';
  };
  tag(day.zones[1], t('morning') + deepAt(1), states[1] || 'planned');
  tag(day.zones[2], t('evening') + deepAt(2), states[2] || 'planned');
  let selected = highlight || mirrors || null;
  let mode = prefs.mapMode === 'plan' || (!prefs.mapMode && lowPower()) ? 'plan' : '3d'; // la 3D par défaut
  let view3d = null;
  const L = MAP_LABELS[lang()];
  box.innerHTML = `<div class="map-bar"><div class="segmented tiny map-mode" role="tablist">
      <button type="button" role="tab" data-mode="plan" aria-selected="${mode === 'plan'}">${t('mapPlan')}</button>
      <button type="button" role="tab" data-mode="3d" aria-selected="${mode === '3d'}">3D</button></div>
</div>
    <div class="map-wrap"><div class="map-stage"></div><span class="map-tip" ${mode === '3d' ? '' : 'hidden'}>${esc(t('map3dHint'))}</span></div><div class="map-info" aria-live="polite"></div>`;
  const stage = box.querySelector('.map-stage');
  const infoBox = box.querySelector('.map-info');
  const drawInfo = () => {
    const info = selected ? FLOOR[selected][lang()] : null;
    const today = selected ? todayIn(selected, day) : [];
    infoBox.innerHTML = info
      ? `<b>${esc(info.name)}</b><ul>${info.what.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>${today.length ? `<p class="map-today"><span>${esc(dayLabel)}</span>${today.map((x) => `<em>${esc(x)}</em>`).join('')}</p>` : ''}`
      : `<p class="map-hint">${t('mapHint')}</p>`;
    infoBox.classList.remove('swap');
    void infoBox.offsetWidth;
    infoBox.classList.add('swap');
  };
  const drawStage = async () => {
    if (mode === 'plan') {
      view3d?.destroy();
      view3d = null;
      stage.className = 'map-stage';
      stage.innerHTML = zoneMap({ highlight, tags, selected, labels: L });
      return;
    }
    if (view3d) { view3d.setSelected(selected); return; }
    stage.className = 'map-stage is-3d loading';
    stage.innerHTML = '<div class="gym3d"></div>';
    try {
      await nearView(stage);
      if (mode !== '3d' || !stage.isConnected) return;
      const { mountGym3D } = await import('./gym3d.js');
      if (mode !== '3d' || !stage.isConnected) return;
      view3d = mountGym3D(stage.firstElementChild, { highlight, selected, tags, labels: L, onPick: (a) => pick(a) });
      stage.classList.remove('loading');
    } catch {
      mode = 'plan';
      toast(t('map3dFail'), 'bad');
      drawStage();
    }
  };
  const pick = (area) => {
    if (!area) return;
    selected = selected === area && !highlight ? null : area;
    if (mode === 'plan') {
      stage.innerHTML = zoneMap({ highlight, tags, selected, labels: L });
      stage.querySelector(`[data-area="${area}"]`)?.focus({ preventScroll: true });
    } else view3d?.setSelected(selected);
    drawInfo();
  };
  box.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]');
    if (m) {
      if (m.dataset.mode === mode) return;
      mode = m.dataset.mode;
      prefs.mapMode = mode;
      savePrefs();
      for (const b of box.querySelectorAll('[data-mode]')) b.setAttribute('aria-selected', String(b === m));
      box.querySelector('.map-tip').hidden = mode !== '3d';
      drawStage();
      return;
    }
    pick(e.target.closest('[data-area]')?.dataset.area);
  });
  box.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-area]')) { e.preventDefault(); pick(e.target.closest('[data-area]').dataset.area); } });
  drawStage();
  drawInfo();
}

// ---------- Détail d'une tâche ----------
function taskVisual(it) {
  if (it.deep || (it.zone && it.photo === 'miroirs')) {
    return `<figure class="visual map-visual"><figcaption class="block-label">${t('zoneMap')}</figcaption><div data-map></div></figure>`;
  }
  return `<figure class="visual alive">${illustration(it.photo, it.title)}</figure>`;
}

function openTask(id) {
  const it = findTask(id);
  const e = entry(id);
  if (e.steps) e.steps = e.steps.filter((i) => i < it.steps.length); // étapes d'une ancienne version du manuel
  const extra = plan.overflow.includes(it);
  const pills = [
    extra ? '' : `<span class="pill num">${f(it.start)} – ${f(it.end)}</span>`,
    `<span class="pill num">${it.minutes} min</span>`,
    it.zone ? `<span class="pill">Zone ${it.zone}</span>` : '',
  ].join('');
  const tv = it.tvTable
    ? `<figure class="visual map-visual"><figcaption class="block-label">${t('channels')}</figcaption>${tvDiagram(TV_CHANNELS)}</figure>`
    : '';
  const clockBox = (it.reminders || []).length
    ? `<div class="callout clock"><div class="c-head">${ICON.clock}${t('atTime')}</div>${it.reminders.map((r) => `<p><b class="num">${f(r.at)}</b> · ${esc(r.label)}</p>`).join('')}</div>`
    : '';
  const tips = tipsCallout(it);
  const skipped = e.skipped && !e.done;
  // Le plan ou la 3D de la zone vient à la fin : les étapes d'abord.
  const mapLast = it.deep || (it.zone && it.photo === 'miroirs');

  openSheet(`
    <div class="sheet-hero">
      ${mapLast ? '' : taskVisual(it)}
      <div class="sheet-head">
        ${it.special ? '' : `<p class="eyebrow">${esc(AREAS[it.area]?.[lang()] || '')}</p>`}
        <h2>${esc(it.title)}</h2>
        <div class="meta-row">${pills}</div>
      </div>
    </div>
    ${it.steps.length ? `<div><p class="block-label steps-head">${t('steps')} <span class="steps-count num">${(e.steps || []).length}/${it.steps.length}</span><span class="pips" style="--pc:var(--plate-${plateOf(it)})">${pipsHTML((e.steps || []).length, it.steps.length)}</span></p>
      <ol class="steps">${it.steps.map((s, i) => `<li><button type="button" class="step" data-step="${i}" aria-pressed="${Boolean(e.done || (e.steps || []).includes(i))}"><span class="step-text">${md(s)}</span><i aria-hidden="true">✓</i></button></li>`).join('')}</ol>
      <p class="hint">${t('stepsHint')}</p></div>` : ''}
    ${tv}
    ${clockBox}
    ${tips}
    ${skipped ? `<div><p class="block-label">${t('why')}</p><div class="reasons">${Object.entries(SKIP_REASONS).map(([k, v]) => `<button type="button" data-reason="${k}" aria-pressed="${e.reason === k}">${esc(v[lang()])}</button>`).join('')}</div></div>` : ''}
    <label class="field"><span>${t('remark')}</span>
      <textarea id="remark" rows="2" placeholder="${esc(t(e.skipped ? 'remarkSkipPh' : 'remarkPh'))}">${esc(e.remark || '')}</textarea>
    </label>
    <button type="button" class="link flag-link" data-flagtask>${ICON.flag}${t('flagThisTask')}</button>
    ${mapLast ? taskVisual(it) : ''}
  `, (root) => {
    const mapBox = root.querySelector('[data-map]');
    if (mapBox) mountMap(mapBox, it.deep ? { highlight: it.zone, date: state.date } : { mirrors: it.zone, date: state.date });
    // Tâche finie depuis la feuille : sa petite scène et son son, puis cochée.
    let finishing = false;
    const finishWithFx = () => {
      if (finishing) return;
      finishing = true;
      playFinish({ ...it, plate: plateOf(it) }, $('#sheet'), { sound: prefs.sound !== false, still: reducedMotion() })
        .then(() => { closeSheet(); toggleDone(id); });
    };
    // Étapes : chaque toucher coche une étape; toutes faites = tâche cochée.
    for (const b of root.querySelectorAll('[data-step]')) {
      b.onclick = () => {
        if (lockedToast()) return;
        const i = Number(b.dataset.step);
        const set = new Set(e.steps || []);
        if (set.has(i)) set.delete(i); else set.add(i);
        e.steps = [...set].sort((x, y) => x - y);
        b.setAttribute('aria-pressed', String(set.has(i)));
        root.querySelector('.steps-count').textContent = `${set.size}/${it.steps.length}`;
        const added = set.has(i);
        root.querySelector('.pips').innerHTML = pipsHTML(set.size, it.steps.length, null, added ? set.size - 1 : -1);
        if (added) { clank('step'); buzz('step'); }
        save();
        if (set.size === it.steps.length && !e.done) finishWithFx();
        else renderChecklist();
      };
    }
    root.querySelector('#remark').addEventListener('input', (ev) => { e.remark = ev.target.value; save(); renderChecklist(); });
    root.querySelector('[data-flagtask]').onclick = () => openFlag({ where: it.title });
    root.querySelector('[data-status="done"]').onclick = () => {
      if (e.done) { closeSheet(); toggleDone(id); return; }
      finishWithFx();
    };
    root.querySelector('[data-status="skip"]').onclick = () => {
      const on = !(e.skipped && !e.done);
      e.skipped = on;
      if (on) { e.done = false; delete e.doneAt; } else delete e.reason;
      save(); renderChecklist(); openTask(id);
    };
    for (const b of root.querySelectorAll('[data-reason]')) {
      b.onclick = () => {
        e.reason = b.dataset.reason;
        for (const o of root.querySelectorAll('[data-reason]')) o.setAttribute('aria-pressed', String(o === b));
        save(); renderChecklist();
      };
    }
  }, `<div class="status-row">
      <button class="btn ${skipped ? 'on-skip' : 'ghost'}" data-status="skip">✕ ${t('notDone')}</button>
      <button class="btn ${e.done ? 'on-done' : 'primary'}" data-status="done">✓ ${t(e.done ? 'done' : 'markDone')}</button>
    </div>`);
}

// ---------- Signaler un problème ----------
// Un toucher sur une catégorie suffit (« Autre » demande quelques mots).
// Le signalement va dans l'Espace superviseur, avec ses photos. Urgent : le
// superviseur reçoit aussi un courriel très court avec le lien. Pas urgent :
// pas de courriel.
$('#flagBtn').addEventListener('click', () => openFlag());
$('#flagHome').addEventListener('click', () => openFlag());
// Fin du quart : signaler au superviseur (urgent proposé d'office), puis on revient au résumé à jour.
$('#finishFlag').addEventListener('click', () => {
  state.notes = $('#fNotes').value; state.handoff = $('#fHandoff').value; save(); // rien de tapé ne se perd
  openFlag({ urgentFirst: true, after: () => { if (current === 'finish') openFinish(); } });
});

const CAT_ICON = {
  difficile: '<path d="M4 18c2-6 5-9 8-9s6 3 8 9"/><path d="M12 9V4M9 6l3-2 3 2"/>',
  app: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  machine: '<path d="M15 3.5a4.5 4.5 0 0 0-4.3 5.9l-6.3 6.3a2 2 0 0 0 2.8 2.8l6.3-6.3A4.5 4.5 0 0 0 19.4 7l-2.7 2.7-2.4-.5-.5-2.4L16.5 4a4.5 4.5 0 0 0-1.5-.5z"/>',
  degat: '<path d="M12 3c3 4 5 6.6 5 9.2A5 5 0 0 1 7 12.2C7 9.6 9 7 12 3z"/><path d="M4 20c2-1 4-1 6 0s4 1 6 0 3-1 4 0"/>',
  blessure: '<rect x="4" y="8" width="16" height="10" rx="2"/><path d="M9 8V6h6v2M12 10.5v5M9.5 13h5"/>',
  altercation: '<path d="M4 6h10v7H8l-4 3z"/><path d="M14 9h6v7l-3-2h-5v-1"/>',
  materiel: '<path d="M5 8l7-4 7 4v8l-7 4-7-4z"/><path d="M5 8l7 4 7-4M12 12v8"/>',
  toilettes: '<path d="M7 4h4v7H7zM5 11h14a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6zM10 17v3h4v-3"/>',
  batiment: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  objet: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  autre: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.6v.2"/>',
};
const catIcon = (k) => `<svg class="ico cat-ico" viewBox="0 0 24 24" aria-hidden="true">${CAT_ICON[k] || CAT_ICON.autre}</svg>`;
const catName = (k, L = lang()) => FLAG_CATEGORIES[k]?.[L] || k;

// Qui reçoit les courriels urgents : Daniel d'office, plus les superviseurs
// qui s'y abonnent (mis à jour depuis le serveur après la connexion).
let alertTo = (CONFIG.supervisors || []).filter((x) => x.alerts).map((x) => ({ name: x.name, email: x.email || '' }));
const listNames = (a) => (a.length < 2 ? a[0] || '' : `${a.slice(0, -1).join(', ')} ${t('and')} ${a.at(-1)}`);
const alertNames = () => listNames([...new Set(alertTo.map((x) => x.name))]) || t('theSupervisor');
async function refreshAlerts() {
  try { alertTo = await alertRecipients(); } catch { /* on garde la liste connue */ }
}

// Hors quart (bouton de l'accueil) : le signalement part seul, sans quart.
const looseCtx = () => ({ name: shiftName(), date: todayISO(), shift: null, loose: true });
const LOOSE = 'gym-loose-flags';
const readLoose = () => read(LOOSE, []);

// Les tâches du jour à proposer (« quelle tâche était difficile? ») : le quart en cours, sinon l'horaire du jour.
function flagTaskItems() {
  if (plan?.items) return plan.items;
  const tp = todaySched() || SHIFTS[1];
  try { return buildPlan({ shift: detectShift(tp.start, tp.end), date: todayISO(), start: tp.start, end: tp.end, lang: lang() }).items; } catch { return []; }
}
function openFlag({ where = '', urgentFirst = false, after = null } = {}) {
  let category = null;
  let urgent = urgentFirst ? true : null; // tant que l'employé n'a pas choisi, suit la catégorie (fin de quart : urgent d'office)
  const sup = alertNames();
  openSheet(`
    <div class="sheet-head">
      <p class="eyebrow danger">${ICON.flag}${t('flag')}</p>
      <h2>${t('flagTitle')}</h2>
    </div>
    <div class="cat-grid">${Object.entries(CATEGORIES).map(([k, v]) => `<button type="button" data-cat="${k}" aria-pressed="false">${catIcon(k)}<span>${esc(v[lang()])}</span></button>`).join('')}</div>
    <div class="flag-more" hidden>
      <label class="field"><span id="flagWhereLabel">${t('where')}</span>
        <input id="flagWhere" list="areaList" placeholder="${esc(t('wherePh'))}" value="${esc(where)}">
        <datalist id="flagTasks">${flagTaskItems().filter((x) => x.kind === 'task' && !x.auto).map((x) => `<option value="${esc(x.title)}">`).join('')}</datalist>
        <datalist id="areaList">${Object.values(AREAS).map((a) => `<option value="${esc(a[lang()])}">`).join('')}</datalist>
      </label>
      <div class="flag-chips" id="flagChips" hidden>${t('supplyChips').map((c) => `<button type="button" class="chip" data-supply="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <label class="field"><span id="flagWhatLabel">${t('whatOpt')}</span>
        <textarea id="flagText" rows="2" placeholder="${esc(t('whatPh'))}"></textarea>
      </label>
      ${photoFieldHtml()}
      <div class="field"><span id="flagUrgQ">${esc(t('urgentQ', sup))}</span>
        <div class="urgency" role="radiogroup">
          <button type="button" role="radio" data-urg="1" aria-checked="false"><b>${t('urgentYes')}</b><small id="flagUrgSub">${esc(t('urgentYesSub', sup))}</small></button>
          <button type="button" role="radio" data-urg="0" aria-checked="false"><b>${t('urgentNo')}</b><small>${esc(t(accounts() ? 'urgentNoSubBoss' : 'urgentNoSub'))}</small></button>
        </div>
      </div>
    </div>
    <div class="callout clock"><p>${t('danger')}</p></div>
  `, (root) => {
    const saveBtn = root.querySelector('#flagSave');
    const text = root.querySelector('#flagText');
    const photos = [];
    const pick = () => (category === 'difficile' ? false : urgent ?? (category ? CATEGORIES[category].urgent : null));
    const paint = () => {
      const u = pick();
      const sup = alertNames(); // la liste peut arriver du serveur après l'ouverture
      root.querySelector('#flagUrgQ').textContent = t('urgentQ', sup);
      root.querySelector('#flagUrgSub').textContent = t('urgentYesSub', sup);
      for (const b of root.querySelectorAll('[data-urg]')) b.setAttribute('aria-checked', String(u !== null && (b.dataset.urg === '1') === u));
      const needText = category === 'autre' || category === 'app';
      root.querySelector('#flagWhatLabel').textContent = t(category === 'app' ? 'appWhat' : needText ? 'whatNeeded' : 'whatOpt');
      root.querySelector('#flagChips').hidden = category !== 'materiel';
      // Tâche difficile : quelle tâche, ce qui était dur; jamais urgent.
      const hard = category === 'difficile';
      root.querySelector('#flagWhereLabel').textContent = t(hard ? 'hardWhich' : 'where');
      root.querySelector('#flagWhere').setAttribute('list', hard ? 'flagTasks' : 'areaList');
      if (hard) root.querySelector('#flagWhatLabel').textContent = t('hardWhat');
      root.querySelector('.urgency').closest('.field').hidden = hard;
      saveBtn.textContent = u ? t('flagSend', sup) : t('add');
      saveBtn.disabled = !category || (needText && !text.value.trim());
    };
    mountPhotos(root, photos, () => {});
    refreshAlerts().then(() => { if (root.contains(text)) paint(); });
    for (const b of root.querySelectorAll('[data-cat]')) {
      b.onclick = () => {
        category = b.dataset.cat;
        for (const o of root.querySelectorAll('[data-cat]')) o.setAttribute('aria-pressed', String(o === b));
        const more = root.querySelector('.flag-more');
        if (more.hidden) { more.hidden = false; more.classList.add('reveal'); }
        paint();
        if (category === 'autre' || category === 'app') text.focus();
      };
    }
    // Matériel manquant : un toucher ajoute l'item (sacs, produit, papier…).
    for (const c of root.querySelectorAll('[data-supply]')) {
      c.onclick = () => {
        const items = text.value.split(',').map((x) => x.trim()).filter(Boolean);
        const on = !items.includes(c.dataset.supply);
        text.value = (on ? [...items, c.dataset.supply] : items.filter((x) => x !== c.dataset.supply)).join(', ');
        c.setAttribute('aria-pressed', String(on));
        paint();
      };
    }
    for (const b of root.querySelectorAll('[data-urg]')) b.onclick = () => { urgent = b.dataset.urg === '1'; paint(); };
    text.addEventListener('input', paint);
    root.querySelector('[data-close]').onclick = () => { photos.forEach(deletePhoto); closeSheet(); };
    saveBtn.onclick = () => {
      const fl = { category, location: root.querySelector('#flagWhere').value.trim(), text: text.value.trim(), at: new Date().toISOString(), photos, urgent: Boolean(pick()) };
      closeSheet();
      if (state) {
        state.flags.push(fl);
        save(); renderChecklist();
        submitProblem(fl);
      } else submitProblem(fl, looseCtx());
      after?.();
    };
    paint();
  }, `<div class="sheet-actions">
      <button class="btn ghost" data-close>${t('cancel')}</button>
      <button class="btn primary" id="flagSave" disabled>${t('add')}</button>
    </div>`);
}

// Où en est le signalement : envoyé aux superviseurs? courriel parti?
const sending = new WeakSet();
const flagNeedsWork = (fl) => (accounts() && !fl.id) || (fl.urgent && !fl.emailed && session.mode !== 'demo');
function flagMailLine(fl, i) {
  const sup = alertNames();
  if (sending.has(fl)) return `<span class="mail-line">${ICON.mail}${esc(t('flagSending'))}</span>`;
  if (flagNeedsWork(fl)) {
    return `<span class="mail-line bad">${ICON.mail}${esc(t(accounts() && !fl.id ? 'flagNotSaved' : 'flagMailFail'))} <button type="button" class="link" data-retry-flag="${i}">${t('retryMail')}</button></span>`;
  }
  if (fl.urgent) return `<span class="mail-line ok">${ICON.mail}${esc(session.mode === 'demo' ? t('flagDemo') : t('flagSent', sup))}</span>`;
  return accounts() ? `<span class="mail-line ok">${esc(t('flagInBoss'))}</span>` : '';
}

async function submitProblem(fl, s = state) {
  if (prefs.simShift || prefs.simNew) { toast(t('simulationLocal')); return; }
  sfx(fl.urgent ? 'urgent' : 'flag');
  if (sending.has(fl) || !flagNeedsWork(fl)) {
    if (!sending.has(fl)) toast(t(fl.urgent ? 'flagDemo' : s.loose ? 'flagInBoss' : 'flagNoted'));
    return;
  }
  sending.add(fl);
  if (state === s && current === 'checklist') renderChecklist();
  try {
    if (accounts() && !fl.id) {
      const blobs = (await Promise.all((fl.photos || []).map(getPhoto))).filter(Boolean);
      fl.id = await createProblem({ category: fl.category, location: fl.location, text: fl.text, urgent: fl.urgent, at: fl.at, shiftDate: s.date, shift: s.shift }, blobs);
      if (state === s) save();
    }
    if (fl.urgent && !fl.emailed && session.mode !== 'demo') {
      await sendFlagEmail(fl, s);
      fl.emailed = true;
    }
    toast(fl.urgent ? (session.mode === 'demo' ? t('flagDemo') : t('flagSent', alertNames())) : t(s.loose ? 'flagInBoss' : 'flagNoted'));
  } catch {
    toast(t(s.loose ? 'flagLater' : accounts() && !fl.id ? 'flagNotSaved' : 'flagMailFail'), 'bad');
  }
  sending.delete(fl);
  if (state === s) { save(); if (current === 'checklist') renderChecklist(); }
  if (s.loose) {
    // Pas de réseau : gardé sur le téléphone et renvoyé tout seul plus tard.
    const rest = readLoose().filter((x) => x.fl.at !== fl.at);
    write(LOOSE, flagNeedsWork(fl) ? [...rest, { fl, ctx: s }] : rest);
    if (!flagNeedsWork(fl)) (fl.photos || []).forEach(deletePhoto);
  }
}
const retryLoose = () => readLoose().forEach(({ fl, ctx }) => submitProblem(fl, ctx));

// Le courriel : une ligne et un lien. Les détails et les photos sont sur le site.
// Période de test (CONFIG.reportTo) : un seul courriel, à l'adresse de test,
// qui dit à qui il serait allé.
const problemLink = (id) => `${location.origin}${location.pathname}${id ? `#probleme=${id}` : ''}`;
async function sendFlagEmail(fl, s) {
  const L = supLang(alertTo[0]?.name) === 'en' ? 'en' : 'fr';
  const T = UI[L];
  const cat = catName(fl.category, L);
  const when = new Date(fl.at).toLocaleTimeString(L === 'en' ? 'en-CA' : 'fr-CA', { hour: '2-digit', minute: '2-digit' });
  const fd = new FormData();
  fd.append('_subject', T.mailSubject(cat, s.name));
  fd.append('_template', 'table');
  fd.append('_captcha', 'false');
  fd.append(T.mailWhat, T.mailLine(cat, fl.location, s.name, when));
  fd.append(T.mailLink, problemLink(fl.id));
  await refreshAlerts();
  const targets = CONFIG.reportTo ? [CONFIG.reportTo] : [...new Set(alertTo.map((x) => x.email).filter(Boolean))];
  if (!targets.length) throw new Error('recipient');
  if (CONFIG.reportTo) fd.append(T.mailFor, listNames(alertTo.map((x) => x.name)));
  for (const to of targets) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, { method: 'POST', body: fd, headers: { Accept: 'application/json' }, signal: ctrl.signal });
      const out = await r.json().catch(() => ({}));
      if (!r.ok || String(out.success) === 'false') throw new Error(out.message || `HTTP ${r.status}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------- Menu ----------
// Tout ce qui sert moins souvent, en mots clairs (pas d'icône à deviner).
const switchRow = (id, label, on) => `<div class="inline-choice"><span id="${id}-label">${esc(label)}</span>
  <button type="button" class="switch" role="switch" id="${id}" aria-checked="${on}" aria-labelledby="${id}-label"><i></i></button></div>`;
// ---------- Réglages : un seul endroit, la roue dentée, sur chaque écran ----------
$('#menuBtn').addEventListener('click', () => openSettings());
document.addEventListener('click', (ev) => { if (ev.target.closest('[data-settings]')) openSettings(); });
function openSettings() {
  const shift = Boolean(state && plan);
  const signed = Boolean(session.user);
  openSheet(`
    <div class="sheet-head"><h2>${t('settings')}</h2></div>
    <div class="menu-group">
      <div class="inline-choice"><span>${t('language')}</span>
        <div class="segmented tiny" role="radiogroup">
          <button type="button" role="radio" data-mlang="fr" aria-checked="${lang() === 'fr'}">Français</button>
          <button type="button" role="radio" data-mlang="en" aria-checked="${lang() === 'en'}">English</button>
        </div>
      </div>
      <div class="inline-choice"><span>${t('theme')}</span>
        <div class="segmented tiny" role="radiogroup">
          ${['light', 'dark', 'auto'].map((k) => `<button type="button" role="radio" data-mtheme="${k}" aria-checked="${themePref() === k}">${t(`theme_${k}`)}</button>`).join('')}
        </div>
      </div>
      ${switchRow('mLarge', t('largeText'), Boolean(prefs.large))}
      ${switchRow('mSound', t('sounds'), prefs.sound !== false)}
      ${navigator.audioSession ? switchRow('mSilent', t('soundSilent'), Boolean(prefs.soundSilent)) : ''}
      ${shift ? `<div class="inline-choice"><span>${t('listOrder')}</span>
        <div class="segmented tiny" role="radiogroup">
          <button type="button" role="radio" data-mview="time" aria-checked="${state.view !== 'zone'}">${t('byTime')}</button>
          <button type="button" role="radio" data-mview="zone" aria-checked="${state.view === 'zone'}">${t('byZone')}</button>
        </div>
      </div>` : ''}
    </div>
    <div class="menu-list">
      ${signed ? `<button class="btn ghost menu-item" id="mAccount"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>${t('account')}</button>` : ''}
      ${signed && !bossWatching() ? `<button class="btn ghost menu-item" id="mEdit"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/></svg>${t('editHours')}</button>` : ''}
      <button class="btn ghost menu-item" id="mProto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6M9 11h4"/></svg>${t('protocolMenu')}</button>
      ${isRealAdmin() ? `<button class="btn ghost menu-item" id="mView"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>${t('viewAsTitle')}</button>` : ''}
      ${shift ? `<button class="btn ghost menu-item" id="mRestart"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/></svg>${t('restartShort')}</button>
      <button class="btn ghost menu-item danger" id="mReset"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>${t('abandon')}</button>` : ''}
    </div>
  `, (root) => {
    for (const b of root.querySelectorAll('[data-mlang]')) {
      b.onclick = () => { closeSheet(); setLang(b.dataset.mlang); };
    }
    root.querySelector('#mLarge').onclick = (ev) => setLarge(!prefs.large, ev.currentTarget);
    root.querySelector('#mSilent')?.addEventListener('click', (ev) => {
      prefs.soundSilent = !prefs.soundSilent; savePrefs(); applyAudioSession();
      ev.currentTarget.setAttribute('aria-checked', String(prefs.soundSilent));
      sfx('tap');
    });
    root.querySelector('#mSound').onclick = (ev) => {
      prefs.sound = prefs.sound === false;
      savePrefs();
      ev.currentTarget.setAttribute('aria-checked', String(prefs.sound));
      if (prefs.sound) clank('step');
    };
    for (const b of root.querySelectorAll('[data-mtheme]')) {
      b.onclick = () => {
        for (const o of root.querySelectorAll('[data-mtheme]')) o.setAttribute('aria-checked', String(o === b));
        setTheme(b.dataset.mtheme, b);
      };
    }
    for (const b of root.querySelectorAll('[data-mview]')) {
      b.onclick = () => {
        state.view = b.dataset.mview;
        save();
        for (const o of root.querySelectorAll('[data-mview]')) o.setAttribute('aria-checked', String(o === b));
        renderChecklist();
      };
    }
    root.querySelector('#mProto').onclick = () => { closeSheet(); goProtocol(); };
    root.querySelector('#mEdit')?.addEventListener('click', () => { closeSheet(); setTimeout(() => openScheduleSheet(), 340); });
    root.querySelector('#mAccount')?.addEventListener('click', () => { closeSheet(); setTimeout(openAccount, 340); });
    root.querySelector('#mView')?.addEventListener('click', () => { closeSheet(); setTimeout(openViewMenu, 340); });
    root.querySelector('#mRestart')?.addEventListener('click', () => { closeSheet(); setTimeout(() => $('#restartBtn').click(), 340); });
    const reset = root.querySelector('#mReset');
    if (reset) reset.onclick = () => {
      if (!reset.dataset.armed) { reset.dataset.armed = '1'; reset.textContent = t('abandonSure'); return; }
      state = null; save(); clearPhotos(); closeSheet(); goFront();
    };
  });
}

// ---------- 3. Fin de quart ----------
$('#finishBtn').addEventListener('click', () => {
  if (!canEnd()) { saveDraft({ manual: true }); return; }
  // Tout est coché : « Fin du quart » lance la fête (lapin, confettis, accord), puis le résumé.
  if (allDone()) { showAllDone(); celebrate(); sfx('celebrate'); buzz('lift'); return; }
  openFinish();
});
// Le quart peut se fermer : chaque tâche cochée ou marquée « Pas pu faire », ou l'heure de fin passée.
function canEnd() {
  const tasks = planTasks();
  return tasks.length > 0 && (tasks.every((x) => state.tasks[x.id]?.done || state.tasks[x.id]?.skipped) || shiftOver());
}
$('#backBtn').addEventListener('click', () => { renderChecklist(); show('checklist'); });
$('#fNotes').addEventListener('input', (ev) => { state.notes = ev.target.value; save(); });
$('#fHandoff').addEventListener('input', (ev) => { state.handoff = ev.target.value; save(); });

function openFinish() {
  paintStatic();
  const tasks = planTasks();
  const st = (x) => state.tasks[x.id] || {};
  const done = tasks.filter((x) => st(x).done).length;
  const skipped = tasks.filter((x) => st(x).skipped && !st(x).done).length;
  const open = tasks.filter((x) => !st(x).done && !st(x).skipped);

  $('#finishSummary').innerHTML = `
    <div class="stat-grid">
      <div class="stat ok"><b class="num" data-count>${done}</b><span>${t('statDone', done)}</span></div>
      <div class="stat bad"><b class="num" data-count>${skipped}</b><span>${t('statNot', skipped)}</span></div>
      <div class="stat warn"><b class="num" data-count>${state.flags.length}</b><span>${t('statFlags', state.flags.length)}</span></div>
    </div>
    ${open.length ? `<div class="panel">
      <div class="section-head" style="margin-top:0"><h2>${t('pending')}</h2><span class="num">${open.length}</span></div>
      <p class="section-note">${t('finishHint')}</p>
      ${open.map((x) => `<div class="pending" data-id="${esc(x.id)}">${icon(x)}<div class="t">${esc(x.title)}<small class="num">${f(x.start)} – ${f(x.end)}</small></div>
        <button class="btn small ghost" data-act="done" aria-label="${esc(t('done'))}">✓</button><button class="btn small flag" data-act="skip" aria-label="${esc(t('notDone'))}">✕</button></div>`).join('')}
    </div>` : `<div class="notice ok"><b>${t('allChecked')}</b></div>`}`;
  $('#fNotes').value = state.notes || '';
  $('#fHandoff').value = state.handoff || '';
  $('#sendBtn').textContent = t('saveShift');
  $('#sendBtn').disabled = false;
  if (current !== 'finish') countUp($('#finishSummary'));
  show('finish');
}

$('#finishSummary').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  const id = b.closest('[data-id]').dataset.id;
  const e = entry(id);
  if (b.dataset.act === 'done') {
    e.done = true; e.skipped = false; e.doneAt = new Date().toISOString();
    save(); openFinish();
  } else {
    e.skipped = true; e.done = false;
    save();
    openTask(id);
    const back = () => { if ($('#sheet').hidden) openFinish(); else setTimeout(back, 300); };
    setTimeout(back, 400);
  }
});

$('#sendBtn').addEventListener('click', saveShift);

// Le quart tel qu'il va dans l'historique : statuts, remarques, notes et
// problèmes (les photos sont déjà parties avec les courriels urgents).
function boardSummary() {
  return {
    date: state.date,
    shift: state.shift,
    special: state.special || '',
    custom: state.custom || [],
    name: state.name,
    supervisor: state.supervisor || '',
    handoff: (state.handoff || '').trim(),
    done: planTasks().filter((x) => state.tasks[x.id]?.done).length,
    total: planTasks().length,
    start: state.start,
    end: state.end,
    submittedAt: new Date().toISOString(),
    notes: state.notes || '',
    items: [...planTasks(), ...plan.overflow].map((it) => {
      const e = state.tasks[it.id] || {};
      return { id: it.id, status: e.done ? 'done' : e.skipped ? 'notdone' : 'unchecked', doneAt: e.doneAt || '', reason: e.skipped ? e.reason || '' : '', remark: e.remark || '' };
    }),
    flags: state.flags.map((fl) => ({ id: fl.id || '', category: fl.category, location: fl.location, text: fl.text, at: fl.at, urgent: Boolean(fl.urgent), emailed: Boolean(fl.emailed), photos: (fl.photos || []).length })),
  };
}

// ---------- Sauvegarde du quart en cours (propriétaire : « rien ne doit se perdre ») ----------
// Le téléphone garde tout à chaque toucher. En plus, le quart en cours part au serveur
// (marqué « en cours ») quelques secondes après chaque changement, quand l'app passe en
// arrière-plan, et avec le bouton « Enregistrer ». Si le téléphone le perd (Safari vidé,
// autre appareil, autre adresse du site), il revient tout seul depuis le serveur.
var draftTimer = null; // var : save() peut tourner avant cette ligne au démarrage
var lastDraftSig = '';
const hasProgress = (st) => Boolean(st) && (Object.entries(st.tasks || {}).some(([id, x]) => id !== 'pointage' && (x.done || x.skipped || x.remark)) || st.flags?.length > 0 || Boolean(st.notes?.trim()));
function queueDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => saveDraft(), 8000);
}
async function saveDraft({ manual = false } = {}) {
  clearTimeout(draftTimer);
  if (!state?.name || !state?.date) return;
  const offline = prefs.simShift || prefs.simNew || state.simulation; // simulations : rien ne part au serveur
  if (!offline && (manual || hasProgress(state))) {
    if (!plan || plan.forKey !== `${state.date}|${state.start}|${state.end}`) plan = shiftPlan(state);
    const summary = { ...boardSummary(), open: true };
    const sig = JSON.stringify({ ...summary, submittedAt: '' });
    if (manual || sig !== lastDraftSig) {
      const where = await publishShift(summary);
      if (where !== 'queued') lastDraftSig = sig;
      if (manual) { toast(t(where === 'queued' ? 'savedProgressLocal' : 'savedProgress'), 'ok'); sfx('save'); }
      return;
    }
  }
  if (manual) { toast(t('savedProgress'), 'ok'); sfx('save'); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && state) saveDraft(); });
addEventListener('pagehide', () => { if (state) saveDraft(); });

// Un quart « en cours » sur le serveur, à moi, d'aujourd'hui ou d'hier : on le reprend si
// ce téléphone ne l'a plus (ou en a une copie plus vieille et vide).
async function restoreDraft() {
  if (!session.user || session.mode !== 'accounts' || prefs.simShift || prefs.simNew || bossWatching()) return;
  const me = shiftName().trim().toLowerCase();
  if (!me) return;
  const { live, shifts } = await loadRecent(20).catch(() => ({ live: false, shifts: [] }));
  if (!live) return;
  const today = todayISO();
  const d = shifts.find((x) => x.open && x.name.trim().toLowerCase() === me && x.date >= addDays(today, -1) && x.date <= addDays(today, 7));
  if (!d) return;
  const same = state && state.date === d.date && state.shift === d.shift;
  if (state && !same) return; // un autre quart est ouvert ici : on n'y touche pas
  if (same && hasProgress(state) && (state.updatedAt || '') >= (d.submittedAt || '')) return; // la copie du téléphone est la plus récente
  const tasks = {};
  for (const it of d.items || []) {
    const e = {};
    if (it.status === 'done') { e.done = true; if (it.doneAt) e.doneAt = it.doneAt; }
    if (it.status === 'notdone') { e.skipped = true; if (it.reason) e.reason = it.reason; }
    if (it.remark) e.remark = it.remark;
    if (Object.keys(e).length) tasks[it.id] = it.id === 'pointage' && e.done ? { ...e, manual: true } : e;
  }
  state = {
    name: d.name, supervisor: d.supervisor || '', date: d.date, simulation: false,
    start: d.start, end: d.end, shift: d.shift, special: d.special || '', custom: d.custom || [], tasks,
    flags: (d.flags || []).map((fl) => ({ ...fl, photos: [] })),
    notes: d.notes || '', handoff: d.handoff || '', view: 'time',
    createdAt: d.submittedAt || new Date().toISOString(),
  };
  write(KEY, { ...state, updatedAt: d.submittedAt || new Date().toISOString() });
  state.updatedAt = d.submittedAt || '';
  plan = null;
  if (['auth', 'setup', 'checklist'].includes(current)) openChecklist();
  else paintStatic();
  toast(t('draftRestored'), 'ok');
}

// Fin du quart : il s'ajoute à l'historique. Pas de courriel.
async function saveShift() {
  if (prefs.simShift || prefs.simNew) { toast(t('simulationLocal')); return; }
  clearTimeout(draftTimer); // plus de brouillon : le quart final le remplace
  const btn = $('#sendBtn');
  btn.disabled = true;
  btn.textContent = t('saving');
  const { name } = state;
  const summary = boardSummary();
  const where = await publishShift(summary);
  sfx('save');
  const prevSave = editableShift();
  const keepAt = prevSave && prevSave.date === state.date && prevSave.shift === state.shift ? prevSave.savedAt : '';
  write(LAST_SHIFT, { ...state, savedAt: keepAt || new Date().toISOString() }); // 24 h après le premier envoi
  state = null;
  save();
  clearPhotos();
  hist.loaded = false; // l'historique se recharge avec ce quart
  hist.weekLoaded = '';
  $('#sentText').textContent = t(where === 'queued' ? 'savedQueued' : 'savedText', name);
  $('#sentWin').textContent = winLine(name, summary);
  $('#editShiftBtn').hidden = false;
  paintStatic();
  show('sent');
  celebrate();
}

// Une petite victoire à la fin : quart parfait, ou série de quarts complets.
function winLine(name, summary) {
  const all = Object.values(read('gym-board-local', {})).flat()
    .filter((x) => x.name?.toLowerCase() === name.toLowerCase())
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  let streak = 0;
  for (const x of all) { if (x.total && x.done === x.total) streak += 1; else break; }
  if (streak >= 2) return t('streak', streak);
  return summary.total && summary.done === summary.total ? t('perfect', summary.total) : '';
}

$('#newShiftBtn').addEventListener('click', () => goFront());
$('#editShiftBtn').addEventListener('click', reopenShift);

// Le quart enregistré aujourd'hui sur ce téléphone se modifie jusqu'à minuit
// (même quart, même personne : la nouvelle version remplace l'ancienne).
const LAST_SHIFT = 'gym-last-shift';
function editableShift() {
  const last = read(LAST_SHIFT, null);
  const mine = !session.user || last?.name === shiftName();
  return last && mine && last.savedAt && Date.now() - new Date(last.savedAt).getTime() < 24 * 3600e3 ? last : null; // 24 h pour corriger
}
function paintEditToday() {
  const last = editableShift();
  const box = $('#editToday');
  box.hidden = !last || Boolean(state);
  if (last) box.querySelector('span').textContent = t('editToday', SHIFTS[last.shift][lang()].short.toLowerCase());
}
function reopenShift() {
  const last = editableShift();
  if (!last) { toast(t('editLocked'), 'bad'); goFront(); return; }
  const { savedAt, ...rest } = last;
  state = rest;
  save();
  window.history.replaceState(history.state, '', location.pathname);
  openChecklist();
  toast(t('editing'));
}
$('#editToday').addEventListener('click', reopenShift);

// ---------- 5. Un quart en détail (depuis l'historique, l'Aperçu ou un ancien courriel) ----------
const STATUS_MARK = { done: '✓', notdone: '✕', unchecked: '○' };
const REVIEW_BACK = { apercu: ['apercu-keep', 'overviewShort'], history: ['history-keep', 'history'] };

let lastReview = null;
function openReview(r, opts = {}) {
  const { from = '' } = opts;
  lastReview = [r, opts];
  const back = $('#review .back');
  const [go, label] = REVIEW_BACK[from] || ['home', state ? 'myShift' : 'home'];
  back.dataset.go = go;
  back.querySelector('span').dataset.t = label;
  const R = REVIEW[r.lang] || REVIEW.fr;
  const T = reportLabels(r);
  const notDone = r.items.filter((i) => i.status === 'notdone');
  const unchecked = r.items.filter((i) => i.status === 'unchecked');
  const nAttention = r.flags.length + notDone.length + unchecked.length;
  const pct = r.completion.total ? Math.round((100 * r.completion.done) / r.completion.total) : 0;
  const detail = (i) => [
    i.reason ? `<span class="rv-reason">${esc(i.reason)}</span>` : '',
    i.remark ? `<span class="rv-quote">« ${esc(i.remark)} »</span>` : '',
    i.photos?.length ? `<span class="rv-meta">${ICON.clip}${esc(i.photos.join(', '))}</span>` : '',
  ].join('');
  // Admin : « Corriger les tâches » — un toucher change le statut d'une tâche (oubli de cocher).
  const editing = Boolean(opts.edit);
  const row = (i) => editing && i.id
    ? `<li class="rv-row ${i.status} rv-editable"><button type="button" class="rv-editbtn" data-rid="${esc(i.id)}" aria-label="${esc(i.title)} : ${esc(t(`st_${i.status}`))}">
      <span class="rv-mark">${STATUS_MARK[i.status]}</span>
      <span class="rv-main"><span class="rv-title">${esc(i.title)}</span><span class="rv-meta">${esc(t(`st_${i.status}`))}</span></span>
      <span class="rv-time num">${esc(i.time.split('–')[0] || `${i.minutes} min`)}</span></button></li>`
    : `<li class="rv-row ${i.status}">
      <span class="rv-mark">${STATUS_MARK[i.status]}</span>
      <span class="rv-main"><span class="rv-title">${esc(i.title)}</span>${detail(i)}</span>
      <span class="rv-time num">${esc(i.time.split('–')[0] || `${i.minutes} min`)}</span>
    </li>`;
  const canEdit = adminPowers() && r.src && opts.from === 'history';
  const attention = [
    ...r.flags.map((fl) => `<li class="rv-flag"><span class="rv-mark">${ICON.flag}</span><span class="rv-main"><span class="rv-title">${esc(fl.category)}${fl.location ? ` · ${esc(fl.location)}` : ''}</span>${fl.text ? `<span class="rv-quote">« ${esc(fl.text)} »</span>` : ''}${fl.photos?.length ? `<span class="rv-meta">${ICON.clip}${esc(fl.photos.join(', '))}</span>` : ''}${fl.emailed ? `<span class="rv-meta">${ICON.mail}${esc(t('flagEmailed'))}</span>` : fl.urgent ? `<span class="rv-meta">${esc(t('urgentShort'))}</span>` : ''}${fl.id && isBoss() ? `<button type="button" class="link rv-open" data-go="problem" data-id="${esc(fl.id)}">${esc(t('openProblem'))}</button>` : ''}</span><span class="rv-time num">${esc(fl.at)}</span></li>`),
    ...notDone.map(row),
    ...unchecked.map(row),
  ];
  const nPhotos = [...r.items, ...r.flags, ...r.overflow].reduce((n, x) => n + (x.photos?.length || 0), 0);

  $('#reviewBody').innerHTML = `
    <div class="rv-head">
      <p class="eyebrow">${[r.gymName, R.title].filter(Boolean).map(esc).join(' · ')}</p>
      <h1>${esc(r.name)}</h1>
      <p class="rv-sub">${esc(r.shiftName)} · ${esc(r.weekday)} ${esc(dayMonth(r.date))} · <span class="num nowrap">${esc(r.hours)}</span></p>
      ${r.supervisor ? `<p class="rv-sub">${esc(t('supShort'))} : ${esc(r.supervisor)}</p>` : ''}
    </div>
    <div class="rv-verdict ${nAttention ? 'warn' : 'ok'}">
      <div class="rv-ring" style="--p:${pct}"><span class="num">${pct}%</span></div>
      <div>
        <b>${nAttention ? esc(R.toSee(nAttention)) : esc(R.allGood)}</b>
        <span class="num">${r.completion.done}/${r.completion.total} ${esc(T.done)}</span>
      </div>
    </div>
    ${customPanel(r)}
    ${attention.length ? `<div class="section-head"><h2>${esc(R.attention)}</h2><span class="num">${attention.length}</span></div><ul class="rv-list attention">${attention.join('')}</ul>` : ''}
    ${r.notes ? `<div class="section-head"><h2>${esc(T.notes)}</h2></div><div class="panel rv-notes">${esc(r.notes)}</div>` : ''}
    <div class="section-head"><h2>${esc(R.full)}</h2><span class="num">${r.completion.done}/${r.completion.total}</span></div>
    ${r.editedBy ? `<p class="section-note">${esc(t('editedBy', r.editedBy))}</p>` : ''}
    ${canEdit ? (editing
      ? `<div class="rv-editbar"><p>${esc(t('editHint'))}</p><div class="rv-editacts"><button type="button" class="btn ghost small" data-rvedit="cancel">${esc(t('cancel2'))}</button><button type="button" class="btn primary small" data-rvedit="save">${esc(t('editSave'))}</button></div></div>`
      : `<button type="button" class="btn ghost rv-editopen" data-rvedit="open">${esc(t('editTasks'))}</button>`) : ''}
    <ul class="rv-list${editing ? ' editing' : ''}">${r.items.map(row).join('')}</ul>
    ${r.overflow.length ? `<div class="section-head"><h2>${esc(T.overflow)}</h2></div><p class="section-note">${esc(T.overflowNote(r.deficit))}</p><ul class="rv-list">${r.overflow.map(row).join('')}</ul>` : ''}
    ${r.outOfRange.length ? `<p class="section-note">${esc(T.fixed)} : ${esc(r.outOfRange.join(', '))}</p>` : ''}
    ${nPhotos ? `<p class="section-note">${esc(R.photos(nPhotos))}</p>` : ''}
    ${from ? '' : `<button class="btn ghost big overview-link" type="button" data-go="history">${esc(t('seeHistory'))}</button>`}`;
  paintStatic();
  show('review');
}
// ---------- Personnaliser mon quart (propriétaire) ----------
// L'employé met ses propres activités, avec leurs heures; elles remplacent les tâches prévues
// à ces heures. Un superviseur doit les valider : l'employé le sait avant d'ajouter, et le
// superviseur le voit dans l'historique (Valider / Refuser).
function paintCustomNote() {
  const box = $('#customNote');
  const n = state?.custom?.length || 0;
  box.hidden = false;
  box.innerHTML = n
    ? `<button type="button" class="custom-banner" data-customize><span><b>${esc(t('customBanner', n))}</b><small>${esc(t('customPending'))}</small></span>${CHEV_R}</button>`
    : `<button type="button" class="btn ghost small custom-open" data-customize>${esc(t('customize'))}</button>`;
}
document.addEventListener('click', (ev) => { if (ev.target.closest('[data-customize]') && state) openCustomize(); });
function openCustomize() {
  const nowHM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes() < 30 ? 0 : 30).padStart(2, '0')}`; };
  const draw = (root) => {
    const list = state.custom || [];
    root.querySelector('#cuList').innerHTML = list.length ? list.map((c) => `<li class="cu-row"><span class="num">${esc(f(toMin(c.start)))} – ${esc(f(toMin(c.end)))}</span><b>${esc(c.title)}</b><button type="button" class="btn small ghost" data-cu-del="${esc(c.id)}" aria-label="${esc(t('customRemove'))} ${esc(c.title)}">✕</button></li>`).join('') : '';
    const pv = root.querySelector('#cuPreview');
    const s0 = root.querySelector('#cuStart').value, e0 = root.querySelector('#cuEnd').value;
    if (s0 && e0) {
      const test = withCustom(planOf({ shift: state.shift, date: state.date, start: state.start, end: state.end, special: state.special, custom: list, lang: lang() }), [{ id: 'cpreview', title: 'x', start: s0, end: e0 }]);
      pv.textContent = test.replaced.length ? t('customReplaces', test.replaced.join(', ')) : t('customNone');
    } else pv.textContent = '';
  };
  openSheet(`<div class="sheet-head"><p class="eyebrow">${ICON.clock}${esc(t('customize'))}</p><h2>${esc(t('customTitle'))}</h2></div>
    <div class="notice warn"><b>${esc(t('customWarnTitle'))}</b>${esc(t('customWarn'))}</div>
    <ul class="cu-list" id="cuList"></ul>
    <div class="cu-form">
      <label class="field"><span>${esc(t('customName'))}</span><input id="cuTitle" maxlength="60" autocomplete="off" placeholder="${esc(t('customNamePh'))}"></label>
      <div class="cu-times">
        <label class="field"><span>${esc(t('customFrom'))}</span><input id="cuStart" type="time" value="${esc(nowHM())}"></label>
        <label class="field"><span>${esc(t('customTo'))}</span><input id="cuEnd" type="time"></label>
      </div>
      <p class="section-note" id="cuPreview" aria-live="polite"></p>
      <p class="section-note bad" id="cuMsg" aria-live="polite"></p>
    </div>`, (root) => {
    draw(root);
    root.addEventListener('input', () => { root.querySelector('#cuMsg').textContent = ''; draw(root); });
    root.addEventListener('click', (ev) => {
      const del = ev.target.closest('[data-cu-del]');
      if (!del) return;
      state.custom = (state.custom || []).filter((c) => c.id !== del.dataset.cuDel);
      save(); plan = shiftPlan(state); renderChecklist(); draw(root);
    });
    $('#cuAdd').onclick = () => {
      const title = root.querySelector('#cuTitle').value.trim();
      const start = root.querySelector('#cuStart').value, end = root.querySelector('#cuEnd').value;
      const msg = root.querySelector('#cuMsg');
      if (!title) { msg.textContent = t('customNeedName'); root.querySelector('#cuTitle').focus(); return; }
      if (!start || !end || start === end) { msg.textContent = t('customBadTime'); return; }
      state.custom = [...(state.custom || []), { id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, title, start, end }].slice(0, 8);
      save(); plan = shiftPlan(state); renderChecklist();
      root.querySelector('#cuTitle').value = ''; root.querySelector('#cuEnd').value = '';
      draw(root); sfx('save'); toast(t('customAdded'), 'ok');
    };
    $('#cuDone').onclick = closeSheet;
  }, `<button type="button" class="btn ghost" id="cuDone">${esc(t('close'))}</button><button type="button" class="btn primary" id="cuAdd">${esc(t('customAdd'))}</button>`);
}

// Le panneau « Activités personnalisées » d'un quart : ce que l'employé a mis à la place,
// ce que ça remplace, et la décision du superviseur (Valider / Refuser).
function customPanel(r) {
  const c = r.custom;
  if (!c) return '';
  const status = c.status === 'approved' ? `<span class="tag ok">${esc(t('customApproved', c.by))}</span>` : c.status === 'rejected' ? `<span class="tag bad">${esc(t('customRejected', c.by))}</span>` : `<span class="tag time">${esc(t('customToApprove'))}</span>`;
  const rows = c.list.map((x) => `<li class="rv-row"><span class="rv-mark">${ICON.clock}</span><span class="rv-main"><span class="rv-title">${esc(x.title)}</span></span><span class="rv-time num">${esc(f(toMin(x.start)))} – ${esc(f(toMin(x.end)))}</span></li>`).join('');
  const acts = isBoss() && !r.local ? `<div class="custom-acts"><button type="button" class="btn small ghost" data-custom="rejected">${esc(t('customReject'))}</button><button type="button" class="btn small primary" data-custom="approved">${esc(t('customApprove'))}</button></div>` : '';
  return `<div class="section-head"><h2>${esc(t('customSection'))}</h2>${status}</div>
    <div class="panel custom-panel" data-cdate="${esc(r.date)}" data-cshift="${c.shift}" data-cname="${esc(r.name)}"><ul class="rv-list">${rows}</ul>
    <p class="section-note">${esc(c.replaced.length ? t('customReplaces', c.replaced.join(', ')) : t('customNone'))}</p>${acts}</div>`;
}
$('#reviewBody').addEventListener('click', async (ev) => {
  const [r, opts] = lastReview || [];
  const rid = ev.target.closest('[data-rid]')?.dataset.rid;
  if (rid && opts?.edit) { // non coché → fait → pas pu faire → non coché
    const it = r.items.find((x) => x.id === rid);
    it.status = { unchecked: 'done', done: 'notdone', notdone: 'unchecked' }[it.status] || 'done';
    r.completion = { done: r.items.filter((x) => x.status === 'done').length, total: r.items.length };
    sfx(it.status === 'done' ? 'check' : 'tick', { level: r.completion.done / (r.completion.total || 1) });
    const y = scrollY; openReview(r, opts); scrollTo(0, y);
    return;
  }
  const act = ev.target.closest('[data-rvedit]')?.dataset.rvedit;
  if (act === 'open') { r.backup = JSON.stringify(r.items); openReview(r, { ...opts, edit: true }); return; }
  if (act === 'cancel') { r.items = JSON.parse(r.backup || '[]'); r.completion = { done: r.items.filter((x) => x.status === 'done').length, total: r.items.length }; openReview(r, { ...opts, edit: false }); return; }
  if (act === 'save') {
    const s = r.src;
    const items = r.items.map((x) => ({ id: x.id, status: x.status }));
    try {
      const res = await request('board', { method: 'POST', body: { action: 'edit', date: s.date, shift: s.shift, name: s.name, items } });
      const saved = res?.shift || { ...s, items: items.map((x) => ({ ...(s.items.find((o) => o.id === x.id) || {}), ...x })), done: r.completion.done, editedBy: session.user?.name || '' };
      keepReport(saved);
      r.src = saved; r.editedBy = saved.editedBy;
      hist.loaded = false; hist.weekLoaded = ''; hist.sig = '';
      sfx('save'); toast(t('editSaved'), 'muted');
      openReview(r, { ...opts, edit: false });
    } catch { toast(t('customLater'), 'muted'); }
    return;
  }
});
$('#reviewBody').addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-custom]');
  if (!b) return;
  const box = b.closest('.custom-panel');
  for (const x of box.querySelectorAll('button')) x.disabled = true;
  try {
    await request('board', { method: 'POST', body: { action: 'custom', date: box.dataset.cdate, shift: Number(box.dataset.cshift), name: box.dataset.cname, status: b.dataset.custom } });
    sfx('save');
    const [r, opts] = lastReview;
    r.custom.status = b.dataset.custom;
    r.custom.by = session.user?.name || '';
    hist.loaded = false; hist.weekLoaded = '';
    openReview(r, opts);
  } catch {
    toast(t('customLater'), 'muted');
    for (const x of box.querySelectorAll('button')) x.disabled = false;
  }
});

async function openReviewFromHash() {
  try {
    const code = location.hash.slice(3);
    const r = await decodeReport(code);
    keepReport(reportEntry(r), code); // le rapport s'ajoute au dossier de ce téléphone
    openReview(r);
  } catch {
    $('#reviewBody').innerHTML = `<div class="notice bad"><b>${esc(t('reportBad'))}</b></div>`;
    paintStatic();
    show('review');
  }
}

// ---------- 6. Aperçu du gym : la semaine, le protocole, les trucs ----------
const CHEV_L = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const CHEV_R = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => { const d = dateOf(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const mondayOf = (iso) => addDays(iso, -((dateOf(iso).getDay() + 6) % 7));
const weekDates = (mon) => Array.from({ length: 7 }, (_, i) => addDays(mon, i));
const longDay = (iso) => cap(dateOf(iso).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }));
function weekRange(mon) {
  const a = dateOf(mon);
  const b = dateOf(addDays(mon, 6));
  const m = (d) => d.toLocaleDateString(locale(), { month: 'short' });
  return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${m(b)}` : `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`;
}
const hhmm = (s) => (s ? f(toMin(s)) : '');

const AP_TABS = ['day', 'protocol', 'tips'];
const ap = { week: '', day: '', tab: AP_TABS.includes(prefs.apTab) ? prefs.apTab : 'day', tipShift: 0, data: {}, live: false, sig: '', keepNext: false };

// Plans de référence d'un jour (matin et soir), gardés en mémoire.
const refCache = new Map();
function refPlan(date, shift) {
  const k = `${date}|${shift}|${lang()}`;
  if (!refCache.has(k)) refCache.set(k, buildPlan({ shift, date, start: SHIFTS[shift].start, end: SHIFTS[shift].end, lang: lang() }));
  return refCache.get(k);
}

// Les trucs d'une tâche : ceux du bloc, plus les techniques du manuel qui vont avec.
// Pendant le quart : seulement les trucs essentiels de la tâche (3 au plus).
function tipsOf(it) {
  const key = (x) => x.replace(/\*\*/g, '').replace(/^[^:]{2,28}:\s*/, '').toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
  const seen = new Set();
  return (it.tips || []).filter((x) => !seen.has(key(x)) && seen.add(key(x))).slice(0, 3);
}
// Onglet « Trucs » : tous les trucs de la tâche (le guide complet).
const guideOf = (it) => GUIDE[lang()][guideKey(it)] || tipsOf(it);
const tipsCallout = (it) => {
  const tips = tipsOf(it);
  return tips.length ? `<div class="callout tip"><div class="c-head">${ICON.bulb}${t('goodToKnow')}<span class="c-note">${t('tipsNote')}</span></div>${tips.map((x) => `<p>${md(x)}</p>`).join('')}</div>` : '';
};

// Statut d'une tâche dans les quarts envoyés : fait l'emporte, puis pas fait.
function statusIn(list, id) {
  let res = null;
  for (const s of list) {
    const it = s.items.find((x) => x.id === id);
    if (!it) continue;
    if (it.status === 'done') return { kind: 'done', by: s.name };
    if (it.status === 'notdone') res = { kind: 'notdone', by: s.name, reason: it.reason };
    else res ||= { kind: 'unchecked', by: s.name };
  }
  return res || { kind: list.length ? 'unchecked' : 'planned' };
}
function stateLine(st) {
  if (st.kind === 'done') return `<span class="st ok">✓ ${esc(t('doneBy', st.by, st.at))}</span>`;
  if (st.kind === 'notdone') return `<span class="st bad">✕ ${esc(t('notDoneBy', SKIP_REASONS[st.reason]?.[lang()] || st.by))}</span>`;
  if (st.kind === 'unchecked') return `<span class="st warn">○ ${esc(t('notChecked'))}</span>`;
  return `<span class="st">${esc(t('planned'))}</span>`;
}
function metrics(s) {
  const done = s.done ?? s.items.filter((i) => i.status === 'done').length;
  const total = s.total ?? s.items.length;
  return { done, total, pct: total ? Math.round((100 * done) / total) : 0, notdone: s.items.filter((i) => i.status === 'notdone').length, flags: s.flags.length, urgent: s.flags.filter((fl) => fl.urgent).length };
}
// Rouge : urgent ou pas fait. Ambre : il reste quelque chose à voir. Vert : tout fait, rien à signaler.
const tone = (m) => (m.urgent || m.notdone ? 'bad' : m.flags || m.pct < 100 ? 'warn' : 'ok');

const HERO_ICONS = {
  shifts: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h6"/></svg>',
  tips: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  overview: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
};
async function openApercu({ keep = false } = {}) {
  if (!ap.modeSet) ap.mode = 'overview';
  ap.modeSet = false;
  // Pendant un quart, « retour » ramène à la checklist : on le dit.
  $('#apercu .back span').dataset.t = state ? 'myShift' : 'home';
  paintStatic();
  const today = todayISO();
  if (!(keep || ap.keepNext) || !ap.day) { ap.day = today; ap.week = mondayOf(today); }
  ap.keepNext = false;
  renderApercu();
  show('apercu');
  refreshWeek();
}

async function refreshWeek() {
  const wk = ap.week;
  const { live, days } = await loadWeek(weekDates(wk));
  if (current !== 'apercu' || ap.week !== wk) return; // l'utilisateur est parti entre-temps
  const sig = `${wk}|${live}|${JSON.stringify(days)}`;
  if (sig === ap.sig) return; // rien de neuf : on ne redessine pas
  ap.sig = sig;
  ap.live = live;
  ap.data = days;
  renderApercu({ animate: false });
}

function renderApercu({ animate = true, dir = 0 } = {}) {
  const today = todayISO();
  const tipsMode = ap.mode === 'tips';
  $('#apercu').classList.toggle('mode-tips', tipsMode);
  $('#apercu').classList.toggle('mode-overview', !tipsMode);
  $('#apTitle').textContent = t(tipsMode ? 'dashTips' : 'overview');
  $('#apIcon').innerHTML = tipsMode ? HERO_ICONS.tips : HERO_ICONS.overview;
  if (tipsMode) ap.tab = 'tips';
  const dates = weekDates(ap.week);
  $('#apEyebrow').textContent = tipsMode ? [CONFIG.gymName, t('floor')].filter(Boolean).join(' · ') : [CONFIG.gymName, ap.week === mondayOf(today) ? t('thisWeek') : weekRange(ap.week)].filter(Boolean).join(' · ');
  const dayBtn = (d) => {
    const info = dayInfo(d);
    const dt = dateOf(d);
    return `<button type="button" class="wk-day${d === today ? ' today' : ''}" role="tab" aria-selected="${d === ap.day}" data-day="${d}" aria-label="${esc(longDay(d))}">
      <span class="wk-dow">${esc(dt.toLocaleDateString(locale(), { weekday: 'short' }).replace('.', ''))}</span>
      <span class="wk-num num">${dt.getDate()}</span>
      <span class="wk-z"><i class="z${info.zones[1]}">${info.zones[1]}</i><i class="z${info.zones[2]}">${info.zones[2]}</i></span>
      <span class="wk-dots">${(ap.data[d] || []).slice(0, 3).map((s) => `<i class="${tone(metrics(s))}"></i>`).join('')}</span>
    </button>`;
  };
  $('#apercuBody').innerHTML = `
    <div class="ap-weekbar">
      <button type="button" class="icon-btn" data-wk="-1" aria-label="${esc(t('prevWeek'))}">${CHEV_L}</button>
      <div class="ap-weekmid">
        <b class="num">${esc(weekRange(ap.week))}</b>
        ${ap.week !== mondayOf(today)
          ? `<button type="button" class="link" data-wk="0">${esc(t('thisWeek'))}</button>`
          : `<span class="pill ${ap.live ? 'is-live' : ''}">${esc(ap.live ? t('live') : t('thisWeek'))}</span>`}
      </div>
      <button type="button" class="icon-btn" data-wk="1" aria-label="${esc(t('nextWeek'))}">${CHEV_R}</button>
    </div>
    <div class="week" role="tablist" style="--i:${dates.indexOf(ap.day)}">${dates.map(dayBtn).join('')}</div>
    <div class="segmented ap-tabs" role="tablist">
      ${AP_TABS.map((k) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${ap.tab === k}">${esc(t(`tab_${k}`))}</button>`).join('')}
    </div>
    <div class="ap-panel" id="apPanel"></div>
    ${state ? '' : `<button class="btn primary big" type="button" data-go="home">${esc(t('startShift'))}</button>`}`;
  renderPanel({ animate, dir });
}

function renderPanel({ animate = true, dir = 0 } = {}) {
  const box = $('#apPanel');
  box.innerHTML = { tips: tipsPanel, protocol: protocolPanel }[ap.tab]?.() ?? dayPanel();
  if (ap.tab === 'day') {
    const info = dayInfo(ap.day);
    const list = ap.data[ap.day] || [];
    const st = (shift, id) => statusIn(list.filter((s) => s.shift === shift), id).kind;
    mountMap(box.querySelector('[data-map]'), {
      states: { 1: st(1, 'q1-profondeur'), 2: st(2, 'q2-profondeur') },
      mirrors: info.surfaces === 'miroirs' ? info.zones.third : null,
      date: ap.day,
      dayLabel: ap.day === todayISO() ? t('today') : cap(dateOf(ap.day).toLocaleDateString(locale(), { weekday: 'long' })),
    });
  }
  if (animate && !reducedMotion()) {
    countUp(box);
    box.style.setProperty('--dir', dir);
    box.classList.remove('swap');
    void box.offsetWidth;
    box.classList.add('swap');
  }
}

// Le jour : le plan (carte + ce qui change selon le jour) croisé avec les rapports.
function dayPanel() {
  const d = ap.day;
  const today = todayISO();
  const info = dayInfo(d);
  const L = lang();
  const list = ap.data[d] || [];
  const sent = { 1: list.filter((s) => s.shift === 1), 2: list.filter((s) => s.shift === 2) };
  const surf = info.surfaces === 'miroirs' ? `${t('mirrorsOf')} · zone ${info.zones.third}` : cap(t(info.surfaces === 'tuiles' ? 'tiles' : 'inspection'));
  const rows = {
    1: [['q1-profondeur', `${t('deepClean')} · zone ${info.zones[1]}`], ['q1-hebdo', `${t('weekly')} · ${WEEKLY_Q1[info.weekday][L].short}`], ['q1-spinning', t('spinRoom')]],
    2: [
      ['q2-profondeur', `${t('deepClean')} · zone ${info.zones[2]}`],
      ['q2-hebdo', `${t('weekly')} · ${WEEKLY_Q2[info.weekday][L].short.replace(/\*\*/g, '')}${info.walls ? ` + ${t('walls')}` : ''}`],
      ['q2-surfaces', surf],
      ['q2-poubelles', info.weekday === 2 ? t('compostWed') : t('compost')],
    ],
  };
  const sentLine = (shift) => {
    if (sent[shift].length) {
      return sent[shift].map((s) => {
        const m = metrics(s);
        return `<button type="button" class="ap-sent ${tone(m)}" data-rp="${list.indexOf(s)}"><b>${esc(s.name)}</b><span class="num">${m.done}/${m.total}</span>${CHEV_R}</button>`;
      }).join('');
    }
    return `<span class="ap-sent none">${esc(d > today ? t('upcoming') : d < today ? t('noReportDay') : t('notSent'))}</span>`;
  };
  const card = (shift) => {
    const p = refPlan(d, shift);
    return `<div class="panel ap-card">
      <div class="ap-card-head"><b>${esc(SHIFTS[shift][L].name)}</b><span class="num">${f(p.start)} – ${f(p.end)}</span></div>
      <div class="ap-sents">${sentLine(shift)}</div>
      <ul class="ap-tasks">${rows[shift].map(([id, label]) => {
        const it = p.items.find((x) => x.id === id);
        return `<li><button type="button" class="ap-task" ${it ? `data-info="${shift}|${id}"` : 'disabled'}>
          <span class="t-icon" aria-hidden="true">${it ? illustration(it.photo) : ''}</span>
          <span class="ap-what"><b>${esc(label)}</b>${stateLine(statusIn(sent[shift], id))}</span>
          ${it ? CHEV_R : ''}</button></li>`;
      }).join('')}</ul>
    </div>`;
  };

  // Ce qui a été envoyé sans être fait, et les problèmes signalés ce jour-là.
  const left = [];
  for (const shift of [1, 2]) {
    for (const s of sent[shift]) {
      for (const it of s.items) {
        if (it.status === 'done' || statusIn(sent[shift], it.id).kind === 'done' || left.some((l) => l.id === it.id)) continue;
        const ref = [...refPlan(d, shift).items, ...refPlan(d, shift).overflow].find((x) => x.id === it.id);
        left.push({ id: it.id, shift, title: ref?.title || it.id, kind: it.status, reason: it.reason });
      }
    }
  }
  const flags = list.flatMap((s) => s.flags.map((fl) => ({ ...fl, by: s.name })));

  return `
    <div class="panel ap-mapcard">
      <div class="ap-dayhead"><h2>${esc(longDay(d))}</h2>${d === today ? `<span class="pill is-live">${esc(t('today'))}</span>` : ''}</div>
      <div data-map></div>
      <div class="legend">${['done', 'planned', 'unchecked', 'notdone'].map((k) => `<span><i class="sw ${k}"></i>${esc(t('legend')[k])}</span>`).join('')}</div>
    </div>
    <div class="ap-cards">${card(1)}${card(2)}</div>
    ${left.length ? `<div class="panel"><div class="ap-card-head"><h2>${t('stillToDo')}</h2><span class="num">${left.length}</span></div>
      ${left.some((l) => l.kind === 'notdone') ? `<ul class="ap-list">${left.filter((l) => l.kind === 'notdone').map((l) => `<li class="ap-row"><span class="ap-who">${esc(SHIFTS[l.shift][L].short)}</span><span class="ap-what">${esc(l.title)}</span><span class="st bad">✕ ${esc(SKIP_REASONS[l.reason]?.[L] || t('notDone'))}</span></li>`).join('')}</ul>` : ''}
      ${left.some((l) => l.kind !== 'notdone') ? `<p class="block-label left-label">○ ${esc(t('notChecked'))}</p><div class="left-chips">${left.filter((l) => l.kind !== 'notdone').map((l) => `<span>${esc(l.title)}</span>`).join('')}</div>` : ''}</div>` : ''}
    ${flags.length ? `<div class="panel"><h2>${t('flags')}</h2>${flags.map((fl) => `<div class="flag-item">${ICON.flag}<div><b>${esc(FLAG_CATEGORIES[fl.category]?.[L] || fl.category)}</b>${fl.location ? ` · ${esc(fl.location)}` : ''}<br>${esc(fl.text)}<br><small class="num">${esc(fl.by)}${fl.at ? ` · ${clock(fl.at)}` : ''}</small></div></div>`).join('')}</div>` : ''}`;
}

// Le protocole : toute la journée, matin et soir, tel que le manuel le prévoit
// (horaires de référence), avec les règles du roulement et les priorités.
function protocolPanel() {
  const d = ap.day;
  const info = dayInfo(d);
  const L = lang();
  const col = (shift) => {
    const p = refPlan(d, shift);
    return `<div class="panel proto-col">
      <div class="ap-card-head"><b>${esc(SHIFTS[shift][L].name)}</b><span class="num">${f(p.start)} – ${f(p.end)}</span></div>
      <ol class="proto-list">${p.items.map((it) => (it.kind === 'task'
        ? `<li><button type="button" class="proto-row" data-info="${shift}|${it.id}">
            <span class="num proto-t">${f(it.start)}</span>
            <span class="t-icon" aria-hidden="true">${illustration(it.photo)}</span>
            <span class="proto-what"><b>${esc(it.title)}</b>${it.summary ? `<small>${esc(it.summary)}</small>` : ''}</span>
            <span class="num proto-m">${it.minutes} min</span></button></li>`
        : `<li class="proto-break"><span class="num proto-t">${f(it.start)}</span><span>${esc(it.title)} · <span class="num">${it.minutes} min</span></span></li>`)).join('')}</ol>
    </div>`;
  };
  const surf = info.surfaces === 'miroirs' ? `${t('mirrorsOf')} · zone ${info.zones.third}` : cap(t(info.surfaces === 'tuiles' ? 'tiles' : 'inspection'));
  const glance = [
    t('deepShort', t('morning'), info.zones[1]),
    t('deepShort', t('evening'), info.zones[2]),
    `${t('evening')} : ${surf}`,
    ...(info.walls ? [`${t('evening')} : ${t('walls')}`] : []),
    info.weekday === 2 ? t('compostWed') : t('compost'),
  ];
  return `<p class="section-note">${esc(t('protoLede'))}</p>
    <div class="panel proto-glance"><h2>${esc(longDay(d))}</h2><div class="facts">${glance.map((g) => `<span class="fact">${esc(g)}</span>`).join('')}</div></div>
    <div class="ap-cards">${col(1)}${col(2)}</div>
    ${rotationPanel(d)}`;
}
// « Comment ça tourne » (propriétaire : plus beau, et écrit pour les employés) :
// les 6 prochaines zones en profondeur, puis chaque règle avec son image.
function rotationPanel(d) {
  const L = lang();
  const sessions = [];
  for (let i = 0; sessions.length < 6; i++) {
    const day = addDays(d, i), z = dayInfo(day).zones;
    const wd = cap(dateOf(day).toLocaleDateString(locale(), { weekday: 'short' }).replace('.', ''));
    sessions.push({ wd, part: t('morning'), z: z[1], first: i === 0 }, { wd, part: t('evening'), z: z[2], first: false });
  }
  const strip = sessions.slice(0, 6).map((x, i) => `<li class="rot-s z${x.z}${i === 0 ? ' now' : ''}"><small>${esc(x.wd)} · ${esc(x.part)}</small><b>${esc(x.z)}</b></li>`).join('<li class="rot-arrow" aria-hidden="true">›</li>');
  const rules = t('rotRules').map((r) => `<li class="rot-rule"><span class="t-icon" aria-hidden="true">${illustration(r.icon)}</span><span class="rot-txt"><b>${esc(r.title)}</b><span>${esc(r.text)}</span></span></li>`).join('');
  return `<section class="panel proto-rot" aria-labelledby="rotH">
    <h2 id="rotH">${esc(t('protoRules'))}</h2>
    <p class="rot-lede">${esc(t('rotLede'))}</p>
    <ol class="rot-strip">${strip}</ol>
    <ul class="rot-rules">${rules}</ul>
  </section>`;
}

// Les trucs : par tâche du quart choisi, ou les bases du manuel.
function tipsPanel() {
  const shift = ap.tipShift || state?.shift || (new Date().getHours() < 12 ? 1 : 2);
  return `<div class="segmented ap-sub" role="tablist">${[[1, t('morning')], [2, t('evening')], [3, t('basics')]].map(([k, l]) => `<button type="button" role="tab" data-tipshift="${k}" aria-selected="${k === shift}">${esc(l)}</button>`).join('')}</div>
    <div id="tipList">${tipList(shift)}</div>`;
}
function tipList(shift) {
  const L = lang();
  if (shift === 3) {
    return `<div class="callout tip"><div class="c-head">${ICON.info}${t('priorities')}</div>${PRIORITY_ORDER[L].map((p, i) => `<p><b class="num">${i + 1}.</b> ${esc(p)}</p>`).join('')}</div>
      <div class="panel ap-tips"><h2>${t('techniques')}</h2>
        ${[...TECHNIQUES[L], { area: 'bureaux', text: WALL_TECHNIQUE[L] }].filter((x) => x.key !== 'murs').map((tip) => `<div class="tip-row">${illustration(tipIcon(tip.area, tip.key))}<p>${md(tip.text)}</p></div>`).join('')}
      </div>`;
  }
  const p = refPlan(ap.day, shift);
  const seenKey = new Set(); // les guenilles (3 tournées) et les miroirs (2 moitiés) : une seule carte
  const tasks = p.items.filter((x) => x.kind === 'task' && !seenKey.has(guideKey(x) || x.id) && seenKey.add(guideKey(x) || x.id))
    .map((it) => ({ it, tips: guideOf(it) })).filter((x) => x.tips.length);
  return `<p class="section-note">${esc(t('tipsLede'))}</p>
    <div class="tipcards">${tasks.map(({ it, tips }) => `
      <div class="tipcard">
        <button type="button" class="tc-head" aria-expanded="false">
          <span class="t-icon" aria-hidden="true">${illustration(it.photo)}</span>
          <span class="tc-title"><b>${esc(it.title)}</b><small class="num">${f(it.start)} · ${esc(t('nTips', tips.length))}</small></span>
          ${CHEV_R}
        </button>
        <div class="tc-body"><div><ul>${tips.map((x) => `<li>${md(x)}</li>`).join('')}</ul>
          <button type="button" class="link" data-info="${shift}|${it.id}">${esc(t('seeSteps'))}</button></div></div>
      </div>`).join('')}</div>`;
}

const TIP_ICONS = { accueil: 'ouverture', gym: 'points-contact', cardio: 'desinfection', zone: 'inspection', surfaces: 'miroirs', bureaux: 'bureaux', muscu: 'aspirateur', buanderie: 'guenilles', dechets: 'poubelles' };
const tipIcon = (area, key) => (key === 'tuiles' ? 'tuiles' : TIP_ICONS[area] || 'inspection');

// Consignes d'une tâche, en lecture (depuis l'Aperçu).
function openTaskInfo(shift, id) {
  const it = refPlan(ap.day, shift).items.find((x) => x.id === id);
  if (!it) return;
  const L = lang();
  openSheet(`
    <div class="sheet-hero">
      ${taskVisual(it)}
      <div class="sheet-head">
        <p class="eyebrow">${esc(SHIFTS[shift][L].short)} · ${esc(AREAS[it.area]?.[L] || '')}</p>
        <h2>${esc(it.title)}</h2>
        <div class="meta-row"><span class="pill num">${f(it.start)} – ${f(it.end)}</span><span class="pill num">${it.minutes} min</span>${it.zone ? `<span class="pill">Zone ${it.zone}</span>` : ''}</div>
      </div>
    </div>
    <div><p class="block-label">${t('steps')}</p><ol class="steps static">${it.steps.map((s) => `<li><span class="step"><span class="step-text">${md(s)}</span></span></li>`).join('')}</ol></div>
    ${it.tvTable ? `<figure class="visual map-visual"><figcaption class="block-label">${t('channels')}</figcaption>${tvDiagram(TV_CHANNELS)}</figure>` : ''}
    ${tipsCallout(it)}
  `, (root) => {
    const mapBox = root.querySelector('[data-map]');
    if (mapBox) mountMap(mapBox, it.deep ? { highlight: it.zone, date: ap.day } : { mirrors: it.zone, date: ap.day });
  });
}

function changeWeek(n) {
  const today = todayISO();
  if (n === 0) { ap.week = mondayOf(today); ap.day = today; } else { ap.week = addDays(ap.week, 7 * n); ap.day = addDays(ap.day, 7 * n); }
  ap.data = {};
  ap.sig = '';
  renderApercu({ dir: n || 0 });
  refreshWeek();
}
function selectDay(d) {
  if (d === ap.day) return;
  const dir = d > ap.day ? 1 : -1;
  if (mondayOf(d) !== ap.week) { ap.day = d; changeWeek(dir); ap.day = d; return; }
  ap.day = d;
  const week = $('#apercuBody .week');
  week.style.setProperty('--i', weekDates(ap.week).indexOf(d));
  for (const b of week.querySelectorAll('[data-day]')) b.setAttribute('aria-selected', String(b.dataset.day === d));
  renderPanel({ dir });
}

function openDayReport(i) {
  const s = (ap.data[ap.day] || [])[Number(i)];
  if (s) openReview(summaryReport(s), { from: 'apercu' });
}

// Un quart de l'historique, présenté en détail dans la langue de celui qui regarde
// (les remarques restent telles qu'écrites).
function summaryReport(s) {
  const L = lang();
  const p = planOf({ shift: s.shift, date: s.date, start: s.start || SHIFTS[s.shift].start, end: s.end || SHIFTS[s.shift].end, special: s.special, custom: s.custom, lang: L });
  const st = new Map(s.items.map((i) => [i.id, i]));
  const line = (it, withTime = true) => {
    const x = st.get(it.id) || {};
    return { id: it.id, time: withTime ? `${f(it.start)}–${f(it.end)}` : '', title: it.title, minutes: it.minutes, status: x.status || 'unchecked', doneAt: clock(x.doneAt), reason: x.reason ? SKIP_REASONS[x.reason]?.[L] || '' : '', remark: x.remark || '', photos: [] };
  };
  const items = p.items.filter((x) => x.kind === 'task').map((it) => line(it));
  return {
    lang: L, gymName: CONFIG.gymName, supervisor: s.supervisor || '', name: s.name, date: s.date, weekday: p.weekdayName, shiftName: p.shiftName, submittedAt: s.submittedAt || '',
    hours: `${f(p.start)} – ${f(p.end)}`, items, overflow: p.overflow.map((it) => line(it, false)).filter((i) => i.status !== 'unchecked'), deficit: fmtDuration(p.deficit, L), outOfRange: [],
    flags: s.flags.map((fl) => ({ category: FLAG_CATEGORIES[fl.category]?.[L] || fl.category, location: fl.location, text: fl.text, at: clock(fl.at), photos: [], urgent: fl.urgent, emailed: fl.emailed, id: fl.id || '' })),
    notes: s.notes || '', completion: { done: items.filter((i) => i.status === 'done').length, total: items.length },
    custom: s.custom?.length ? { list: s.custom, replaced: p.replaced, status: s.customStatus || 'pending', by: s.customBy || '', shift: s.shift } : null,
    src: s, editedBy: s.editedBy || '',
  };
}

// Un rapport ouvert depuis un courriel, rangé dans le dossier de ce téléphone.
function reportEntry(r) {
  const back = (table, label) => Object.keys(table).find((k) => table[k].fr === label || table[k].en === label) || '';
  return {
    date: r.date,
    shift: r.shift || (Object.values(SHIFTS).find((s) => s.fr.name === r.shiftName || s.en.name === r.shiftName)?.id ?? 2),
    name: r.name, supervisor: r.supervisor || '', start: r.start || '', end: r.end || '', submittedAt: r.submittedAt || '',
    done: r.completion?.done, total: r.completion?.total,
    items: [...r.items, ...(r.overflow || [])].filter((i) => i.id).map((i) => ({ id: i.id, status: i.status, doneAt: '', reason: back(SKIP_REASONS, i.reason) })),
    flags: r.flags.map((fl) => ({ category: back(FLAG_CATEGORIES, fl.category) || 'autre', location: fl.location || '', text: fl.text, at: '' })),
  };
}

$('#apercuBody').addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-wk], [data-day], [data-tab], [data-tipshift], [data-rp], [data-info], .tc-head');
  if (!el || el.disabled) return;
  const ds = el.dataset;
  if (ds.wk !== undefined) changeWeek(Number(ds.wk));
  else if (ds.day) selectDay(ds.day);
  else if (ds.tab) {
    if (ds.tab === ap.tab) return;
    const dir = AP_TABS.indexOf(ds.tab) > AP_TABS.indexOf(ap.tab) ? 1 : -1;
    ap.tab = ds.tab;
    prefs.apTab = ap.tab;
    savePrefs();
    for (const b of document.querySelectorAll('#apercuBody [data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === ap.tab));
    renderPanel({ dir });
  } else if (ds.tipshift) {
    ap.tipShift = Number(ds.tipshift);
    for (const b of document.querySelectorAll('#apercuBody [data-tipshift]')) b.setAttribute('aria-selected', String(b === el));
    const list = $('#tipList');
    list.innerHTML = tipList(ap.tipShift);
    list.classList.remove('swap'); void list.offsetWidth; list.classList.add('swap');
  } else if (ds.rp !== undefined) openDayReport(ds.rp);
  else if (ds.info) { const [s, id] = ds.info.split('|'); openTaskInfo(Number(s), id); }
  else if (el.classList.contains('tc-head')) {
    const card = el.closest('.tipcard');
    const open = !card.classList.contains('open');
    card.classList.toggle('open', open);
    card.classList.toggle('alive', open);
    el.setAttribute('aria-expanded', String(open));
  }
});

// Glisser le panneau vers la gauche ou la droite : jour suivant ou précédent.
(() => {
  let g = null;
  const body = $('#apercuBody');
  body.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.target.closest('#apPanel') || e.target.closest('.floor, .gym3d')) return;
    g = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  body.addEventListener('pointerup', (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    g = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 45) selectDay(addDays(ap.day, dx < 0 ? 1 : -1));
  });
  body.addEventListener('pointercancel', () => { g = null; });
})();

// ---------- 7. Historique : chaque quart enregistré, le plus récent en haut ----------
// Pas de journées vides ni de « manqué » : seulement ce qui a été enregistré.
// Le superviseur ouvre la page et voit d'un coup d'œil si tout a été fait.
const hist = { mode: 'upcoming', period: 'all', who: '', up: '', week: '', recent: [], days: {}, weekLoaded: '', loaded: false, live: false, sig: '', view: [] };

function openHistory({ keep = false, team = false } = {}) {
  $('#history .back span').dataset.t = state ? 'myShift' : 'home';
  paintStatic();
  if (!keep || !hist.week) hist.week = mondayOf(todayISO());
  if (!keep || !hist.up) { hist.up = mondayOf(todayISO()); hist.mode = 'upcoming'; }
  if (team || (!keep && bossWatching())) { hist.mode = 'recent'; hist.period = 'day'; hist.who = ''; } // le patron arrive sur la journée de toute l'équipe
  renderHistory({ animate: !keep });
  show('history');
  refreshHistory();
  if (bossWatching()) refreshBossCount();
}

async function refreshHistory() {
  const { mode, week } = hist;
  if (mode === 'upcoming') { // le tableau de bord a besoin des quarts passés pour ses chiffres
    if (hist.loaded || bossWatching()) return;
    const r = await loadRecent(500);
    if (current !== 'history' || hist.mode !== 'upcoming') return;
    hist.recent = r.shifts; hist.loaded = true; hist.live = r.live;
    renderHistory({ animate: false });
    return;
  }
  const res = mode === 'week' ? await loadWeek(weekDates(week)) : await loadRecent(500);
  if (current !== 'history' || hist.mode !== mode || hist.week !== week) return; // parti entre-temps
  const fresh = mode === 'week' ? hist.weekLoaded !== week : !hist.loaded;
  if (mode === 'week') { hist.days = res.days; hist.weekLoaded = week; } else { hist.recent = res.shifts; hist.loaded = true; }
  hist.live = res.live;
  const sig = JSON.stringify([mode, week, res.live, mode === 'week' ? res.days : res.shifts]);
  if (sig === hist.sig && !fresh) return; // rien de neuf : on ne redessine pas
  hist.sig = sig;
  renderHistory({ animate: fresh });
}

const dayTitle = (d) => {
  const today = todayISO();
  return d === today ? `${t('today')} · ${dayMonth(d)}` : d === addDays(today, -1) ? `${t('yesterday')} · ${dayMonth(d)}` : longDay(d);
};

function histCard(s, i) {
  const m = metrics(s);
  const L = lang();
  const { urgent } = m;
  const unchecked = Math.max(0, m.total - m.done - m.notdone);
  const all = m.total && m.done === m.total;
  const tags = [
    s.open ? `<span class="tag now">${esc(t('inProgress'))}</span>` : '',
    s.custom?.length ? `<span class="tag ${s.customStatus === 'approved' ? 'ok' : s.customStatus === 'rejected' ? 'bad' : 'time'}">${esc(t(s.customStatus === 'approved' ? 'customTagOk' : s.customStatus === 'rejected' ? 'customTagNo' : 'customTagPending'))}</span>` : '',
    m.flags ? `<span class="tag bad">⚑ ${esc(t('nFlags', m.flags))}${urgent ? ` · ${esc(t('nUrgent', urgent))}` : ''}</span>` : '',
    m.notdone ? `<span class="tag bad">${esc(t('nNotDone', m.notdone))}</span>` : '',
    !all && unchecked && !s.open ? `<span class="tag time">${esc(t('nUnchecked', unchecked))}</span>` : '',
    s.notes || s.items.some((x) => x.remark) ? `<span class="tag note">${esc(t('remarks'))}</span>` : '',
  ].join('');
  return `<button type="button" class="rp-card hi-card ${tone(m)}" data-hi="${i}" style="--k:${Math.min(i, 8)}">
    <span class="rv-ring small ${all ? 'r-ok' : 'r-warn'}" style="--p:${m.pct}"><span class="num">${m.pct}%</span></span>
    <span class="rp-main">
      <span class="hi-top"><b>${esc(s.name?.trim() || t('employeeUnknown'))}</b><span class="hi-meta num">${esc(SHIFTS[s.shift][L].short)}${s.start ? ` · ${hhmm(s.start)} – ${hhmm(s.end)}` : ''}</span></span>
      <span class="hi-result ${all ? 'ok' : ''}">${all ? '✓ ' : ''}${esc(t('tasksDone', m.done, m.total))}</span>
      ${tags ? `<span class="tags">${tags}</span>` : ''}
    </span>${CHEV_R}</button>`;
}

// Le tableau de bord « Mes shifts » : la carte du quart (la seule pièce forte), deux chiffres,
// la semaine, la liste, les raccourcis.
function heroCard() {
  const live = state?.name && state?.date ? state : null;
  const nx = !live && nextShift();
  if (!live && !nx) {
    return { skip: '', html: `<section class="d-hero empty"><p class="dh-label">${esc(t('schedTitle'))}</p><p class="dh-empty">${esc(t('schedEmpty'))}</p><button type="button" class="dh-btn" data-sched>${esc(t('schedSet'))}</button></section>` };
  }
  const date = live ? live.date : nx.date;
  const start = live ? live.start : nx.start, end = live ? live.end : nx.end;
  const left = Math.ceil((startAt({ date, start }) - Date.now()) / 6e4);
  let side;
  if (live) {
    const tasks = shiftPlan(live).items.filter((x) => x.kind === 'task');
    const done = tasks.filter((x) => live.tasks?.[x.id]?.done).length;
    const pct = tasks.length ? Math.round((100 * done) / tasks.length) : 0;
    side = `<span class="dh-ring" style="--p:${pct}" role="img" aria-label="${esc(`${done}/${tasks.length} ${t('tasks')}`)}"><b class="num">${done}/${tasks.length}</b></span>`;
  } else side = `<span class="dh-chip num">${esc(left > 0 ? countdown(left) : t('nbGo'))}</span>`;
  return { skip: date, html: `<section class="d-hero${live ? ' is-live' : ''}">
    <div class="dh-top"><p class="dh-label">${esc(t(live ? 'nowShiftLabel' : 'nbNext'))}</p>${side}</div>
    <p class="dh-day">${esc(cap(dayWord(date)))}<span>${esc(SHIFTS[detectShift(start, end)][lang()].short)}</span></p>
    <p class="dh-time num">${nb(f(toMin(start)))}<span> – ${nb(f(toMin(end)))}</span></p>
    <button type="button" class="dh-btn" data-hnext>${esc(t(live ? 'ovBack' : 'ovStart'))}</button>
  </section>` };
}
// Deux chiffres : les quarts faits cette semaine (sur ceux prévus) et les tâches faites sur 30 jours.
function myDoneShifts() {
  const me = shiftName().trim().toLowerCase();
  return (hist.recent || []).filter((x) => !x.open && (x.name || '').trim().toLowerCase() === me);
}
function dashStats() {
  const today = todayISO(), mon = mondayOf(today);
  const mine = myDoneShifts();
  const sc = mySchedule() || {};
  const planned = [0, 1, 2, 3, 4, 5, 6].filter((i) => specialFor(addDays(mon, i)) || presetOf(sc[i])).length;
  const week = new Set(mine.filter((x) => x.date >= mon && x.date <= today).map((x) => x.date)).size;
  const span = mine.filter((x) => x.date >= addDays(today, -29));
  const tot = span.reduce((a, x) => a + metrics(x).total, 0), dn = span.reduce((a, x) => a + metrics(x).done, 0);
  const pct = tot ? Math.round((100 * dn) / tot) : null;
  const wait = !hist.loaded;
  return `<div class="d-stats">
    <div class="d-stat"><p class="ds-label wk">${esc(t('dsWeek'))}</p><p class="ds-num num">${wait ? '–' : week}<small>/${planned}</small></p><p class="ds-sub">${esc(t('dsWeekSub'))}</p></div>
    <div class="d-stat"><p class="ds-label mo">${esc(t('dsMonth'))}</p><p class="ds-num num">${wait || pct === null ? '–' : `${pct}<small>%</small>`}</p><p class="ds-sub">${esc(t('dsMonthSub'))}</p></div>
  </div>`;
}
// Le bas du tableau de bord (propriétaire : « plus ergonomique ») : de grandes rangées à toucher,
// sans flèches de semaine. À venir : les prochains quarts de l'horaire. Derniers quarts : les 3
// derniers enregistrés, « Tout voir » ouvre la liste complète.
const dDate = (d) => `<span class="d-date" aria-hidden="true"><small>${esc(cap(dateOf(d).toLocaleDateString(locale(), { weekday: 'short' }).replace('.', '')))}</small><b class="num">${dateOf(d).getDate()}</b></span>`;
function upcomingShifts(skip, n = 4) {
  const sc = mySchedule() || {};
  const today = todayISO();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const out = [];
  for (let i = 0; i < 28 && out.length < n; i++) {
    const d = addDays(today, i);
    const p = specialFor(d) || presetOf(sc[dowOf(d)]);
    if (!p?.start) continue;
    if (d === today && (editableShift() || nowMin >= toMin(p.end))) continue;
    if (d === skip && state?.date === d) continue; // le quart déjà ouvert vit dans la carte du haut
    out.push({ ...p, date: d });
  }
  return out;
}
function dashUpcoming(skip) {
  const list = upcomingShifts(skip);
  const rows = list.map((p) => {
    const left = Math.ceil((startAt(p) - Date.now()) / 6e4);
    const first = p.date === skip;
    return `<button type="button" class="d-shift${first ? ' is-next' : ''}" data-up="${p.date}">${dDate(p.date)}<span class="d-st"><b class="num">${nb(f(toMin(p.start)))} – ${nb(f(toMin(p.end)))}</b><small>${esc(first ? t('nbNext') : p.date === todayISO() || p.date === addDays(todayISO(), 1) ? cap(dayWord(p.date)) : SHIFTS[detectShift(p.start, p.end)][lang()].short)}</small></span><span class="d-left num">${esc(left > 0 ? countdown(left) : t('nbGo'))}</span>${CHEV_R}</button>`;
  }).join('');
  return `<section class="d-card d-up" aria-labelledby="dUpH"><div class="d-head"><h2 id="dUpH">${esc(t('upcoming'))}</h2></div>
    ${rows || `<p class="d-none">${esc(t(mySchedule() && Object.keys(mySchedule()).length ? 'upNoneSoon' : 'upEmpty'))}</p>`}</section>`;
}
function dashRecent() {
  const mine = myDoneShifts().sort((a, b) => b.date.localeCompare(a.date) || (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  hist.view = mine;
  const row = (x, i) => { const m = metrics(x); const all = m.total && m.done === m.total; return `<button type="button" class="d-shift" data-hi="${i}">${dDate(x.date)}<span class="d-st"><b class="num">${x.start ? `${nb(hhmm(x.start))} – ${nb(hhmm(x.end))}` : esc(SHIFTS[x.shift][lang()].short)}</b><small>${esc(SHIFTS[x.shift][lang()].short)}</small></span><span class="rv-ring small ${all ? 'r-ok' : 'r-warn'}" style="--p:${m.pct}"><span class="num">${m.pct}%</span></span>${CHEV_R}</button>`; };
  const body = !hist.loaded ? '<div class="hi-skel" aria-hidden="true"><i></i><i></i></div>' : mine.length ? mine.slice(0, 3).map(row).join('') : `<p class="d-none">${esc(t('histEmpty'))}</p>`;
  return `<section class="d-card d-past" aria-labelledby="dPastH"><div class="d-head"><h2 id="dPastH">${esc(t('dashRecent'))}</h2>${mine.length > 3 ? `<button type="button" class="link" data-allpast>${esc(t('seeAll'))}</button>` : ''}</div>${body}</section>`;
}
document.addEventListener('click', (ev) => {
  if (!ev.target.closest('[data-allpast]')) return;
  const mine = hist.view;
  openSheet(`<div class="sheet-head"><h2>${esc(t('dashRecent'))}</h2></div><div class="d-sheetlist">${mine.map((x, i) => { const m = metrics(x); const all = m.total && m.done === m.total; return `<button type="button" class="d-shift" data-pastone="${i}">${dDate(x.date)}<span class="d-st"><b class="num">${x.start ? `${nb(hhmm(x.start))} – ${nb(hhmm(x.end))}` : ''}</b><small>${esc(dateOf(x.date).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }))}</small></span><span class="rv-ring small ${all ? 'r-ok' : 'r-warn'}" style="--p:${m.pct}"><span class="num">${m.pct}%</span></span>${CHEV_R}</button>`; }).join('')}</div>`, (root) => {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pastone]');
      if (!b) return;
      closeSheet();
      openReview(summaryReport(mine[Number(b.dataset.pastone)]), { from: 'history' });
    });
  }, `<button type="button" class="btn primary" data-close-sheet>${esc(t('close'))}</button>`);
});

// La semaine en cours : une colonne par jour, l'heure du début, un crochet quand c'est fait.
function dashWeek() {
  const today = todayISO(), mon = mondayOf(today);
  const sc = mySchedule() || {};
  const doneDays = new Set(myDoneShifts().map((x) => x.date));
  const names = WEEKDAYS[lang()];
  return `<ol class="dw">${[0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = addDays(mon, i);
    const p = specialFor(d) || presetOf(sc[i]);
    const done = doneDays.has(d);
    const cls = ['dw-day', d === today && 'today', p && 'on', done && 'done', d < today && 'past'].filter(Boolean).join(' ');
    const label = `${cap(names[i])}${p ? ` ${f(toMin(p.start))} – ${f(toMin(p.end))}` : ` ${t('schedOff')}`}${done ? ` ✓` : ''}`;
    return `<li class="${cls}" aria-label="${esc(label)}"><span class="dw-name" aria-hidden="true">${esc(cap(names[i]).slice(0, 3))}</span><span class="dw-dot" aria-hidden="true">${done ? '✓' : new Date(`${d}T12:00:00`).getDate()}</span><span class="dw-time num" aria-hidden="true">${p ? esc(f(toMin(p.start)).replace(/\s/g, '')) : '—'}</span></li>`;
  }).join('')}</ol>`;
}
document.addEventListener('click', (ev) => {
  if (!ev.target.closest('[data-hnext]')) return;
  if (state?.name && state?.date) { openChecklist(); return; }
  const nx = nextShift();
  if (nx) startScheduled(nx);
});

// À venir : les quarts de l'horaire, semaine par semaine, sans fin.
function upcomingList(skip = '') {
  const sc = mySchedule() || {};
  const mineSpecial = SPECIALS.some((x) => x.names?.includes(firstName(shiftName())));
  if (!Object.keys(sc).length && !mineSpecial) return `<div class="folder-empty alive"><span aria-hidden="true">${illustration('dossier')}</span><p>${esc(t('upEmpty'))}</p></div>`;
  const today = todayISO();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const rows = weekDates(hist.up).map((d) => {
    const p = specialFor(d) || presetOf(sc[dowOf(d)]);
    if (!p?.start || d < today || d === skip) return '';
    if (d === today && (editableShift() || nowMin >= toMin(p.end))) return '';
    const left = Math.ceil((startAt({ date: d, start: p.start }) - Date.now()) / 6e4);
    return `<button type="button" class="up-card" data-up="${d}"><span class="up-day"><b>${esc(dayWord(d))}</b><small>${esc(dateOf(d).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }))}</small></span><span class="up-main"><b class="num">${nb(f(toMin(p.start)))} – ${nb(f(toMin(p.end)))}</b><small>${esc(SHIFTS[detectShift(p.start, p.end)][lang()].short)}</small></span><span class="up-left num">${left > 0 ? esc(countdown(left)) : esc(t('nbGo'))}</span>${CHEV_R}</button>`;
  }).join('');
  return rows || `<p class="section-note">${esc(t('upNoneWeek'))}</p>`;
}

// L'analyse du superviseur : quelques phrases simples sur la période choisie,
// comparées à la période d'avant. Jamais de classement d'employés.
function teamAnalysis(span) {
  if (!span.length) return '';
  const today = todayISO();
  const pct = (list) => { const m = list.map(metrics); const tot = m.reduce((a, x) => a + x.total, 0); return tot ? Math.round((100 * m.reduce((a, x) => a + x.done, 0)) / tot) : null; };
  const range = {
    day: [addDays(today, -1), addDays(today, -1)],
    week: [addDays(mondayOf(today), -7), addDays(mondayOf(today), -1)],
    month: [`${addDays(`${today.slice(0, 8)}01`, -1).slice(0, 8)}01`, addDays(`${today.slice(0, 8)}01`, -1)],
    year: [`${Number(today.slice(0, 4)) - 1}-01-01`, `${Number(today.slice(0, 4)) - 1}-12-31`],
  }[hist.period];
  const who = (x) => !hist.who || (hist.by === 'shift' ? String(x.shift) : (x.name || '').trim() || '?') === hist.who;
  const prev = range ? hist.recent.filter((x) => x.date >= range[0] && x.date <= range[1] && who(x)) : [];
  const now = pct(span), before = prev.length ? pct(prev) : null;
  const lines = [];
  if (now !== null) {
    const d = before === null ? '' : now === before ? t('anSame') : t(now > before ? 'anUp' : 'anDown', Math.abs(now - before));
    lines.push(`<li><b class="num">${now}%</b> ${esc(t('anDone'))}${d ? ` <span class="an-trend ${now >= before ? 'up' : 'down'}">${esc(d)}</span>` : ''}</li>`);
  }
  const full = span.filter((x) => { const m = metrics(x); return m.total && m.done === m.total; }).length;
  lines.push(`<li>${esc(t('anFull', full, span.length))}</li>`);
  const count = (arr) => [...arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const flags = span.flatMap((x) => x.flags || []);
  const hard = count(flags.filter((f) => f.category === 'difficile').map((f) => f.location || t('anHardAny')));
  if (hard.length) lines.push(`<li>${esc(t('anHard'))} ${hard.map(([k, n]) => `<b>${esc(k)}</b>${n > 1 ? ` ×${n}` : ''}`).join(', ')}</li>`);
  const probs = count(flags.filter((f) => f.category !== 'difficile').map((f) => catName(f.category)));
  lines.push(probs.length ? `<li>${esc(t('anProbs'))} ${probs.map(([k, n]) => `<b>${esc(k)}</b>${n > 1 ? ` ×${n}` : ''}`).join(', ')}</li>` : `<li>${esc(t('anNoProbs'))}</li>`);
  return `<section class="hi-tally an-card"><h2>${esc(t('anTitle'))}</h2><ul class="an-list">${lines.join('')}</ul></section>`;
}

function renderHistory({ animate = true } = {}) {
  const isWeek = hist.mode === 'week';
  const isUp = hist.mode === 'upcoming';
  const ready = isUp || (isWeek ? hist.weekLoaded === hist.week : hist.loaded);
  const today = todayISO();
  const since = hist.period === 'year' ? `${today.slice(0, 4)}-01-01` : hist.period === 'day' ? addDays(today, -1) : hist.period === 'week' ? mondayOf(today) : hist.period === 'month' ? `${today.slice(0, 8)}01` : '';
  const me = shiftName().trim().toLowerCase();
  // Un employé voit ses quarts; les superviseurs et l'admin voient ceux de toute l'équipe.
  let shifts = (isWeek ? weekDates(hist.week).flatMap((d) => hist.days[d] || []) : hist.recent.filter((x) => x.date >= since))
    .filter((x) => isBoss() || !me || (x.name || '').trim().toLowerCase() === me);
  // Le patron voit toute l'équipe par défaut, ou un·e employé·e à la fois.
  // Par employé·e ou par quart (matin, soir). Sans nom connu, on écrit simplement « Employé·e ».
  const keyOf = (x) => (hist.by === 'shift' ? String(x.shift) : (x.name || '').trim() || '?');
  const labelOf = (v) => (hist.by === 'shift' ? SHIFTS[v]?.[lang()].short || v : v === '?' ? t('employeeUnknown') : v);
  const names = isBoss() ? [...new Set(shifts.map(keyOf))].sort((a, b) => a.localeCompare(b)) : [];
  if (hist.who && !names.includes(hist.who)) hist.who = '';
  const whoBar = isBoss() && shifts.length ? `<div class="segmented hi-by" role="tablist">${['who', 'shift'].map((b) => `<button type="button" role="tab" data-hby="${b}" aria-selected="${(hist.by || 'who') === b}">${esc(t(b === 'who' ? 'byEmployee' : 'byShift'))}</button>`).join('')}</div>
    <div class="hi-who">${['', ...names].map((n) => `<button type="button" class="chip" data-hwho="${esc(n)}" aria-pressed="${hist.who === n}">${esc(n ? labelOf(n) : t('teamAll'))}</button>`).join('')}</div>` : '';
  if (hist.who) shifts = shifts.filter((x) => keyOf(x) === hist.who);
  $('#hiEyebrow').textContent = [CONFIG.gymName, t('floor')].filter(Boolean).join(' · ');

  // Par jour, le plus récent en haut; dans un jour, le dernier enregistré en haut.
  const byDate = new Map();
  for (const s of shifts) (byDate.get(s.date) || byDate.set(s.date, []).get(s.date)).push(s);
  const dates = [...byDate.keys()].sort().reverse();
  hist.view = dates.flatMap((d) => byDate.get(d).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')));

  // Le coup d'œil : les 7 derniers jours (Récents) ou la semaine choisie.
  const span = shifts;
  const ms = span.map(metrics);
  const complete = ms.filter((m) => m.total && m.done === m.total).length;
  const nFlags = ms.reduce((a, m) => a + m.flags, 0);
  const strip = span.length ? `
    <div class="ap-stats hi-stats">
      <div><b class="num" data-count>${span.length}</b><span>${esc(t('statShifts', span.length))}</span></div>
      <div class="${complete === span.length ? 'ok' : ''}"><b class="num">${complete}/${span.length}</b><span>${esc(t('statComplete'))}</span></div>
      <div class="${nFlags ? 'bad' : ''}"><b class="num" data-count>${nFlags}</b><span>${esc(t('statFlags', nFlags))}</span></div>
    </div>` : '';

  // Le rapport simple : chaque tâche, combien de fois faite sur la période (matin et soir ensemble).
  let tally = '';
  if (isBoss() && span.length) {
    const by = new Map();
    for (const s of span) for (const it of summaryReport(s).items) {
      const r = by.get(it.title) || by.set(it.title, { title: it.title, done: 0, n: 0 }).get(it.title);
      r.n++; if (it.status === 'done') r.done++;
    }
    const rows = [...by.values()].sort((a, b) => a.done / a.n - b.done / b.n || a.title.localeCompare(b.title));
    const li = (r) => `<li class="${r.done === r.n ? 'ok' : r.done ? '' : 'bad'}"><span>${esc(r.title)}</span><b class="num">${r.done}/${r.n}</b></li>`;
    // D'abord ce qui demande l'attention; le reste se déplie au besoin.
    const missed = rows.filter((r) => r.done < r.n);
    tally = `<section class="hi-tally"><h2>${esc(t(missed.length ? 'teamWatch' : 'teamAllDone'))}</h2>${missed.length ? `<ul>${missed.slice(0, 6).map(li).join('')}</ul>` : `<p class="section-note">${esc(t('teamAllDoneSub'))}</p>`}
      <details><summary>${esc(t('teamSeeAll', rows.length))}</summary><ul>${rows.map(li).join('')}</ul></details></section>`;
    // Le même calcul que les cartes et l'analyse (tâches faites sur tâches prévues de chaque quart) :
    // un seul pourcentage à l'écran, jamais deux chiffres qui se contredisent.
    const tot = span.reduce((a, s) => a + metrics(s).total, 0), dn = span.reduce((a, s) => a + metrics(s).done, 0);
    hist.pctDone = tot ? Math.round((100 * dn) / tot) : 0;
  }

  let k = 0;
  const groups = dates.map((d) => `<section class="hi-day">
      <div class="hi-dayhead"><h2>${esc(dayTitle(d))}</h2><span class="num">${esc(t('nShifts', byDate.get(d).length))}</span></div>
      ${byDate.get(d).map((s) => { const i = k++; return adminPowers() ? `<div class="hi-row">${histCard(s, i)}<button type="button" class="hi-del" data-hdel="${i}" aria-label="${esc(t('histDelete'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></div>` : histCard(s, i); }).join('')}
    </section>`).join('');

  $('#history').classList.remove('dash-mode');
  if (bossWatching()) {
    // La page du patron : une phrase, les filtres, ce qui manque, puis les quarts. Rien d'autre.
    const per = `<div class="segmented hi-period" role="tablist">${['day', 'week', 'month', 'year'].map((k2) => `<button type="button" role="tab" data-hper="${k2}" aria-selected="${hist.period === k2}">${esc(t(`per_${k2}`))}</button>`).join('')}</div>`;
    const sum = !ready ? '' : span.length ? t('teamSum', span.length, hist.pctDone, nFlags) : t('teamNone');
    const bstrip = span.length ? `<div class="ap-stats hi-stats">
      <div><b class="num" data-count>${span.length}</b><span>${esc(t('statShifts', span.length))}</span></div>
      <div class="${hist.pctDone === 100 ? 'ok' : ''}"><b class="num">${hist.pctDone}%</b><span>${esc(t('statTasksDone'))}</span></div>
      <div class="${nFlags ? 'bad' : ''}"><b class="num" data-count>${nFlags}</b><span>${esc(t('statFlags', nFlags))}</span></div>
    </div>` : '';
    $('#historyBody').innerHTML = `${urgentBlock()}${per}${ready ? `<p class="team-sum">${esc(sum)}</p>${whoBar}${bstrip}${teamAnalysis(span)}${tally}<div class="hi-list${animate ? ' cascade' : ''}">${groups}</div>` : '<div class="hi-skel" aria-hidden="true"><i></i><i></i><i></i></div>'}
      <div class="hi-links">
        <button type="button" class="hi-link tips" data-hlink="tips">${HERO_ICONS.tips}<span><b>${esc(t('dashTips'))}</b><small>${esc(t('dashTipsSub'))}</small></span></button>
        <button type="button" class="hi-link overview" data-hlink="overview">${HERO_ICONS.overview}<span><b>${esc(t('dashOverview'))}</b><small>${esc(t('dashOverviewSub'))}</small></span></button>
      </div>`;
    if (animate && ready) countUp($('#historyBody'));
    return;
  }

  const dashHero = heroCard();
  $('#history').classList.add('dash-mode');
  $('#hiEyebrow').textContent = cap(dateOf(today).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }));
  // Employé : un tableau de bord (propriétaire : « professionnel, épuré, style Apple »).
  // Mêmes polices que le reste de l'app; seule la mise en page change.
  $('#historyBody').innerHTML = `<div class="dash">
    ${dashHero.html}
    ${dashStats()}
    <section class="d-card d-week" aria-labelledby="dWeekH">
      <div class="d-head"><h2 id="dWeekH">${esc(t('schedTitle'))}</h2><button type="button" class="link" data-sched>${esc(t(mySchedule() && Object.keys(mySchedule()).length ? 'schedEdit' : 'schedSet'))}</button></div>
      ${dashWeek()}
    </section>
    ${dashUpcoming(dashHero.skip)}
    ${dashRecent()}
    <div class="d-tiles">
      <button type="button" class="d-tile" data-hlink="tips"><span class="d-ico tips">${HERO_ICONS.tips}</span><b>${esc(t('dashTips'))}</b><small>${esc(t('dashTipsSub'))}</small></button>
      <button type="button" class="d-tile" data-hlink="overview"><span class="d-ico overview">${HERO_ICONS.overview}</span><b>${esc(t('dashOverview'))}</b><small>${esc(t('dashOverviewSub'))}</small></button>
    </div>
  </div>`;
  if (animate && ready) countUp($('#historyBody'));
}

$('#historyBody').addEventListener('click', (ev) => {
  const pid = ev.target.closest('[data-pid]')?.dataset.pid;
  if (pid) { location.hash = `probleme=${encodeURIComponent(pid)}`; return; }
  const el = ev.target.closest('[data-hmode], [data-hwk], [data-hi], [data-upwk], [data-up], [data-hper], [data-hdel], [data-hwho], [data-hby]');
  if (!el || el.disabled) return;
  const ds = el.dataset;
  if (ds.hdel !== undefined) { // admin seulement : deux touchers pour effacer un quart de l'historique
    const s = hist.view[Number(ds.hdel)];
    if (!s || !adminPowers()) return;
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.classList.add('armed'); el.setAttribute('aria-label', t('histDeleteSure')); sfx('locked'); toast(t('histDeleteSure')); setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.classList.remove('armed'); } }, 3000); return; }
    deleteShift(s).then((ok) => {
      if (!ok) { toast(t('histDeleteFail'), 'bad'); return; }
      hist.recent = hist.recent.filter((x) => x !== s);
      for (const d of Object.keys(hist.days || {})) hist.days[d] = hist.days[d].filter((x) => x !== s);
      hist.sig = ''; renderHistory({ animate: false }); toast(t('histDeleted')); sfx('toggle');
    });
    return;
  }
  if (ds.up) { const p = specialFor(ds.up) || presetOf(mySchedule()?.[dowOf(ds.up)]); const nx = nextShift(); openNextOverview(nx?.date === ds.up ? nx : { ...p, date: ds.up, ready: false }); return; }
  if (ds.upwk !== undefined) { const n = Number(ds.upwk); hist.up = n ? addDays(hist.up, 7 * n) : mondayOf(todayISO()); renderHistory(); return; }
  if (ds.hper || ds.hmode || ds.upwk !== undefined) sfx('tab');
  if (ds.hby) { hist.by = ds.hby; hist.who = ''; sfx('tab'); renderHistory({ animate: false }); return; }
  if (ds.hwho !== undefined) { hist.who = ds.hwho; sfx('tab'); renderHistory({ animate: false }); return; }
  if (ds.hper) { hist.period = ds.hper; renderHistory({ animate: false }); return; }
  if (ds.hmode) {
    if (ds.hmode === hist.mode) return;
    hist.mode = ds.hmode;
    renderHistory();
    refreshHistory();
  } else if (ds.hwk !== undefined) {
    const n = Number(ds.hwk);
    hist.week = n ? addDays(hist.week, 7 * n) : mondayOf(todayISO());
    renderHistory();
    refreshHistory();
  } else if (ds.hi !== undefined) {
    const s = hist.view[Number(ds.hi)];
    if (s) openReview(summaryReport(s), { from: 'history' });
  }
});

// Retour sur la page (téléphone sorti de la poche) : l'historique se met à jour.
document.addEventListener('visibilitychange', () => { if (!document.hidden && current === 'history') refreshHistory(); });

// ---------- 0. Connexion : une fois, le téléphone s'en souvient ----------
const authUI = { tab: 'login', role: 'employee' };
// « Admin » n'apparaît à l'inscription qu'avec un lien admin (…?admin) : les employés ne le voient jamais.
if (!/[?&#]admin\b/.test(location.href)) document.querySelector('[data-role="admin"]')?.remove();
const AUTH_ERRORS = { code: 'errCode', exists: 'errExists', login: 'errLogin', email: 'errEmail', password: 'errPassword', name: 'errName', 'codes-missing': 'errCodesMissing', tries: 'codeTries' };

// Le plancher mouillé de la connexion (créé au premier affichage).
let poolCtl = null;
const pool = () => (poolCtl ||= mountPool($('#pool')));
function openAuth() {
  const fromLink = location.hash.startsWith('#probleme=');
  if (fromLink) authUI.role = 'boss'; // le lien d'un courriel va aux superviseurs
  paintAuth();
  $('#authError').innerHTML = '';
  show('auth');
  if (fromLink) authSheet(true, 'login');
}
// Le formulaire monte par-dessus la piscine, comme une feuille.
function authSheet(open, tab) {
  if (tab) { authUI.tab = tab; paintAuth(); }
  const sheet = $('#authSheet');
  const back = $('#authBackdrop');
  if (open) {
    sheet.hidden = false; back.hidden = false;
    requestAnimationFrame(() => { sheet.classList.add('up'); back.classList.add('up'); });
    setTimeout(() => (authUI.tab === 'signup' ? $('#aName') : $('#aEmail')).focus({ preventScroll: true }), 420);
  } else {
    sheet.classList.remove('up'); back.classList.remove('up');
    setTimeout(() => { if (!sheet.classList.contains('up')) { sheet.hidden = true; back.hidden = true; } }, 380);
  }
}
$('#poolStart').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  if (btn.classList.contains('lifting')) return;
  const go = () => {
    if (!session.user) { authSheet(true, 'signup'); return; }
    window.history.replaceState(history.state, '', location.pathname);
    if (bossWatching()) { openHistory({ team: true }); return; } // le patron : sa bande ouvre l'espace superviseur, le reste la journée de l'équipe
    dropStaleShift();
    if (state && shiftOver()) { openFinish(); return; } // fini mais pas envoyé : on l'envoie
    if (state) { route(); return; } // quart en cours : retour aux tâches
    // Horaire connu : le quart part tout de suite avec ses heures, sans formulaire.
    const nx = nextShift();
    if (nx) { startScheduled(nx); return; } // propriétaire : la vraie liste tout de suite, même avant l'heure
    openScheduleSheet({ first: true }); // pas encore d'horaire : on l'entre, une fois
  };
  if (reducedMotion()) { go(); return; }
  btn.classList.add('lifting');
  clank('plate'); buzz('plate');
  setTimeout(() => { clank('lift'); pool().cheer(); }, 380);
  setTimeout(() => { go(); btn.classList.remove('lifting'); }, 1150);
});
// La bande « prochain quart » fait partie de la carte : un seul bouton, une seule action.
$('#poolNext').addEventListener('click', () => {});
$('#poolLogin').addEventListener('click', () => authSheet(true, 'login'));
// Barre rapide : Accueil, Mes tâches, Recommencer, Superviseur, visiteur,
// thème et langue. Un seul élément, déplacé en haut de l'écran affiché
// (dans l'en-tête collant de la checklist, pour qu'il reste visible).
function placeQuickBar(id) {
  const bar = $('#quickBar');
  const on = id !== 'auth' && Boolean(session.user || !accounts());
  bar.hidden = !on;
  if (!on) return;
  const target = document.getElementById(id);
  const head = target.querySelector(':scope > .topbar:not(.plain)');
  if (head) {
    // Checklist : le titre défile, la barre et le support restent collés en haut.
    const row = head.querySelector('.topbar-row');
    if (bar.previousElementSibling !== row) row.after(bar);
  } else if (bar.parentElement !== target) target.prepend(bar);
  $('#restartBtn').hidden = true; // dans Réglages maintenant
  $('#qbTasks').hidden = !state || id === 'checklist';
  $('#qbBoss').hidden = !isBoss() || id === 'boss';
  $('#qbVisit').hidden = !isVisitor();
  $('#qbAccount').hidden = true; // dans Réglages maintenant
  bar.classList.toggle('no-tools', id === 'setup'); // l'accueil a déjà ses boutons
}
$('#qbTasks').addEventListener('click', () => { if (state) openChecklist(); });
// La hauteur du titre de la checklist (il défile; le reste de l'en-tête colle).
{
  const head = $('#checklist > .topbar'), row = head.querySelector('.topbar-row');
  new ResizeObserver(() => { if (row.offsetHeight) head.style.setProperty('--tb-skip', `${row.offsetHeight + 10}px`); }).observe(row);
}

// Visiteur : essaie l'app sans compte; rien ne part vers l'équipe.
function enterVisitor() { startVisitor(t('visitorName')); location.reload(); }
$('#poolVisit').addEventListener('click', enterVisitor);
$('#authVisit').addEventListener('click', enterVisitor);
$('#qbVisit').addEventListener('click', () => {
  openSheet(`<div class="sheet-head"><h2>${t('visitorLeave')}</h2></div><p class="lede">${t('visitorLeaveBody')}</p>`, () => {
    $('#visitYes').onclick = async () => { await signOut(); location.reload(); };
    $('#visitNo').onclick = closeSheet;
  }, `<button type="button" class="btn ghost" id="visitNo">${t('cancel2')}</button><button type="button" class="btn primary" id="visitYes">${t('visitorExit')}</button>`);
});

// La page du plancher : « Commencer » pour les nouveaux; une fois connecté,
// « Bon retour » + le tableau de bord (quarts, trucs, signaler, aperçu).
// Le quart ouvert est terminé (heure de fin passée) mais pas encore envoyé.
function shiftOver() {
  if (!state?.end) return false;
  const end = dateOf(state.date);
  end.setHours(0, toMin(state.end) + (toMin(state.end) <= toMin(state.start) ? 1440 : 0), 0, 0);
  return Date.now() > end.getTime();
}
function paintFront() {
  const inside = Boolean(session.user);
  const first = shiftName().split(' ')[0];
  const label = $('#poolStartLabel');
  if (inside) {
    // Carte « Bon retour » : initiale, nom, où en est le quart, flèche.
    let sub = t('wbStart');
    const nx = !state && nextShift();
    if (bossWatching()) sub = urgentOpen().length ? t('wbUrgent', urgentOpen().length) : t('wbTeam');
    else if (state && plan && shiftOver()) { const n = planTasks().filter((x) => state.tasks[x.id]?.done).length; sub = t('wbUnsent', n); }
    else if (state && plan) { const ts = planTasks(); sub = counting() ? t('wbResume', ts.filter((x) => state.tasks[x.id]?.done).length, ts.length) : t('wbWaiting'); }
    else if (nx?.ready) sub = t('wbReady');
    else if (nx) sub = t('wbPeek');
    label.innerHTML = `<span class="wb-avatar">${avatarHTML(session.user, esc((first[0] || '?').toUpperCase()))}</span><span class="wb-text"><small>${esc(t('wbHello'))}</small><b>${esc(first || '')}</b><em>${esc(sub)}</em></span><span class="wb-go"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>`;
    $('#poolStart').setAttribute('aria-label', t('welcomeBackName', first));
    $('#poolStart').classList.toggle('unsent', Boolean(state && plan && shiftOver()));
    $('#poolStart').classList.toggle('has-urgent', bossWatching() && urgentOpen().length > 0);
  } else {
    // Propriétaire : « Commencer » au même niveau que la carte « Bon retour » (premium, pas de disques).
    label.innerHTML = `<span class="wb-text gs-text"><b>${esc(t('getStarted'))}</b><em>${esc(t('getStartedSub'))}</em></span><span class="wb-go"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>`;
    $('#poolStart').setAttribute('aria-label', t('getStarted'));
  }
  paintNextBox(inside);
  if (inside && !prefs.welcomed?.[session.user.email] && !paintFront.welcomeQueued) { paintFront.welcomeQueued = true; setTimeout(() => { paintFront.welcomeQueued = false; if (current === 'auth') maybeWelcome(); }, 1200); }
  $('#poolDash').hidden = !inside;
  $('#poolAccount').hidden = !inside;
  if (inside) { $('#poolAccount').innerHTML = avatarHTML(session.user, esc((first[0] || '?').toUpperCase())); $('#poolAccount').setAttribute('aria-label', t('account')); }
  $('#dashBoss').hidden = !isBoss() || bossWatching();
  // Le manuel a son livre; Mes shifts garde son horloge.
  const ds = $('#poolDash .dash-shifts svg');
  if (ds) ds.innerHTML = bossWatching() ? '<path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z"/>' : '<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4M12 8v4l3 2"/>'; // en suivi, l'espace superviseur est dans la grande carte
  $('#poolLogin').hidden = inside;
  $('#poolVisit').hidden = inside;
  $('#auth').classList.toggle('inside', inside);
}
$('#dashFlag').addEventListener('click', () => (bossWatching() ? openBoss() : openFlag())); // le superviseur : les retours de l'équipe
// Le superviseur : la tuile bleue ouvre le manuel du quart (protocole, trucs, aperçu).
$('#poolDash .dash-shifts').addEventListener('click', (e) => { if (bossWatching()) { e.stopImmediatePropagation(); e.preventDefault(); openManual(); } }, true);
function openManual() {
  const row = (id, ico, k) => `<button type="button" class="acct-row" data-man="${id}">${ico}<span>${esc(t(k))}<small>${esc(t(`${k}Sub`))}</small></span>${CHEV_R}</button>`;
  openSheet(`<div class="sheet-head"><h2>${esc(t('dashManual'))}</h2><p class="lede">${esc(t('manLede'))}</p></div>
    <div class="acct-list man-list">
      ${row('proto', '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>', 'manProto')}
      ${row('tips', `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${HERO_ICONS.tips.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`, 'manTips')}
      ${row('overview', `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${HERO_ICONS.overview.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`, 'manOverview')}
    </div>`, (root) => {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-man]');
      if (!b) return;
      closeSheet();
      setTimeout(() => {
        if (b.dataset.man === 'proto') { goProtocol(); return; }
        ap.modeSet = true;
        if (b.dataset.man === 'tips') { ap.mode = 'tips'; ap.tab = 'tips'; } else { ap.mode = 'overview'; ap.tab = 'day'; }
        openApercu();
      }, 320);
    });
  });
}
document.addEventListener('click', (ev) => { if (ev.target.closest('[data-account]')) openAccount(); });
// Heure simulée (admin) : un rappel toujours visible, pour ne pas l'oublier.
if (simulated) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'sim-badge'; b.dataset.account = '';
  b.textContent = `🕒 ${new Date().toLocaleString(CONFIG.defaultLang === 'en' ? 'en-CA' : 'fr-CA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
  document.body.append(b);
}
// La boîte du prochain quart, sous « Bon retour » : le jour, les heures et le
// compte à rebours. Un toucher fait la même chose que la carte.
function countdown(min) {
  if (min >= 1440) return t('cdDays', Math.floor(min / 1440), Math.floor((min % 1440) / 60));
  if (min >= 60) return t('cdHours', Math.floor(min / 60), String(min % 60).padStart(2, '0'));
  return t('cdMin', Math.max(1, min));
}
// « Aujourd'hui », « Demain », sinon le jour de la semaine.
function dayWord(iso) {
  const today = todayISO();
  if (iso === today) return t('today');
  if (iso === addDays(today, 1)) return t('tomorrow');
  return cap(dateOf(iso).toLocaleDateString(locale(), { weekday: 'long' }));
}
function startAt(nx) { const at = dateOf(nx.date); at.setHours(0, toMin(nx.start), 0, 0); return at; }
function paintNextBox(inside) {
  const box = $('#poolNext');
  if (inside && bossWatching()) { box.hidden = true; return; } // le superviseur ne fait pas de quart : la carte ouvre ses rapports
  box.classList.remove('nb-boss');
  delete box.dataset.boss;
  const nx = inside && nextShift();
  box.hidden = !nx;
  if (!nx) return;
  const at = startAt(nx);
  const left = Math.ceil((at - Date.now()) / 6e4);
  const go = left <= 0;
  box.classList.toggle('ready', nx.ready);
  // Une seule carte : la bande dorée fait partie du bouton « Bon retour » (le lecteur d'écran lit tout).
  $('#poolStart').setAttribute('aria-label', `${t('welcomeBackName', (session.user?.name || '').split(' ')[0])}. ${t(nx.ready ? 'nbNow' : 'nbNext')} : ${whenLabel(nx.date)}, ${f(toMin(nx.start))} – ${f(toMin(nx.end))}. ${go ? t('nbGo') : `${t('nbIn')} ${countdown(left)}`}`);
  box.innerHTML = `<span class="nb-ico" aria-hidden="true">${ICON.clock}</span>
    <span class="nb-text"><small>${esc(t(nx.ready ? 'nbNow' : 'nbNext'))}</small><b>${esc(dayWord(nx.date))}</b><em>${nx.date === todayISO() ? `${nb(f(toMin(nx.start)))} – ${nb(f(toMin(nx.end)))}` : `${nb(dateOf(nx.date).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }))} · ${nb(f(toMin(nx.start)))}`}</em></span>
    <span class="nb-count"><small>${esc(go ? t('nbGo') : t('nbIn'))}</small><b class="num">${esc(go ? t('nbGoBig') : countdown(left))}</b></span>`;
}
// La boîte dorée : l'aperçu du quart en bref, puis « Commencer » ou « Changer l'heure ».
function openNextOverview(pick) {
  const found = pick?.date ? pick : nextShift();
  if (!found) return;
  const nx = found;
  const live = Boolean(state) && state.date === nx.date && state.start === nx.start && state.end === nx.end; // le quart en cours
  const p = planOf({ shift: detectShift(nx.start, nx.end), date: nx.date, start: nx.start, end: nx.end, special: nx.special, lang: lang() });
  // Chaque tâche s'ouvre pour lire ses étapes et ses trucs (rien à cocher ici).
  const rows = p.items.filter((it) => it.kind === 'task' || it.kind === 'break').map((it) => (it.kind === 'task' && (it.steps?.length || it.summary)
    ? `<li class="task"><details><summary><span class="ov-row"><span class="num">${nb(f(it.start))}</span><b>${esc(it.title)}</b>${CHEV_R}</span></summary><div class="ov-more">${it.summary ? `<p>${md(it.summary)}</p>` : ''}${it.steps?.length ? `<ol>${it.steps.map((x) => `<li>${md(x)}</li>`).join('')}</ol>` : ''}${tipsOf(it).length ? `<p class="ov-tips-h">${esc(t('tips'))}</p><ul>${tipsOf(it).map((x) => `<li>${md(x)}</li>`).join('')}</ul>` : ''}</div></details></li>`
    : `<li class="${it.kind}"><span class="num">${nb(f(it.start))}</span><b>${esc(it.title)}</b></li>`)).join('');
  openSheet(`<div class="sheet-head"><p class="eyebrow">${ICON.clock}${esc(t('nbNext'))}</p><h2>${esc(dayWord(nx.date))}${nx.date > addDays(todayISO(), 1) ? ` ${nb(dateOf(nx.date).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }))}` : ''} · ${nb(f(toMin(nx.start)))} – ${nb(f(toMin(nx.end)))}</h2></div>${live || nx.ready ? '' : `<p class="ov-note">${esc(t('ovFuture'))}</p>`}<ol class="ov-list">${rows}</ol>`, () => {
    $('#ovGo').onclick = () => { closeSheet(); if (live) openChecklist(); else if (!state) startScheduled(nx); };
    $('#ovSim')?.addEventListener('click', () => confirmShiftSimulation(nx));
    $('#ovTime').onclick = () => { closeSheet(); setTimeout(() => openScheduleSheet(), 340); }; // les heures se changent dans « Quand travailles-tu? »
  }, `${isRealAdmin() ? `<button type="button" class="btn primary" id="ovSim">${t('simulationStart')}</button>` : ''}<button type="button" class="btn ghost" id="ovTime">${t('ovChangeTime')}</button><button type="button" class="btn primary" id="ovGo"${live || !state ? '' : ' disabled'}>${live ? t('ovBack') : t('ovStart')}</button>`);
}
// Le compte à rebours avance; 30 min avant, la carte passe à « C'est l'heure ».
setInterval(() => {
  if (document.hidden || !session.user) return;
  if (autoStart()) return;
  if (current === 'auth') paintFront();
}, 20000);
// Propriétaire : le jour d'un quart à l'horaire, dès 10 min avant le début, le quart
// s'installe tout seul (les bonnes heures, la liste prête). Rien à toucher.
const AUTO_MIN = 10;
function autoStart() {
  if (state || !session.user || bossWatching() || prefs.simShift || prefs.simNew || isVisitor()) return false;
  if (location.hash && location.hash !== '#') return false; // un lien précis (rapport, historique) passe d'abord
  const nx = nextShift();
  if (!nx || nx.date !== todayISO()) return false;
  if (Date.now() < startAt(nx).getTime() - AUTO_MIN * 6e4) return false;
  if (!['auth', 'setup', null].includes(current)) { startScheduled(nx, { quiet: true }); return true; } // ailleurs : prêt, la pastille y mène
  startScheduled(nx);
  return true;
}

// « Accueil » : retour à la page du plancher, toujours à portée de pouce.
function goFront() {
  paintStatic(); // (l'adresse de l'accueil, sans #, est posée par show : un rafraîchissement reste sur l'accueil)
  authSheet(false);
  show('auth');
  if (bossWatching()) refreshBossCount(); // Daniel voit tout de suite s'il y a un problème urgent
}
for (const b of document.querySelectorAll('[data-front]')) b.addEventListener('click', goFront);
// « Recommencer le quart » : on demande une fois avant de tout décocher.
$('#restartBtn').addEventListener('click', () => {
  openSheet(`<div class="sheet-head"><h2>${t('restartTitle')}</h2></div><p class="lede">${t('restartBody')}</p>`, (root) => {
    $('#restartYes').onclick = () => { state.tasks = {}; save(); closeSheet(); renderChecklist(); toast(t('restartShift'), 'muted'); };
    $('#restartNo').onclick = closeSheet;
  }, `<button type="button" class="btn ghost" id="restartNo">${t('cancel2')}</button><button type="button" class="btn primary danger" id="restartYes">${t('restartYes')}</button>`);
});
$('#authClose').addEventListener('click', () => authSheet(false));
$('#authBackdrop').addEventListener('click', () => authSheet(false));
function paintAuth() {
  paintStatic();
  const up = authUI.tab === 'signup';
  for (const b of document.querySelectorAll('[data-authtab]')) b.setAttribute('aria-selected', String(b.dataset.authtab === authUI.tab));
  for (const el of document.querySelectorAll('#authForm [data-only="signup"]')) el.hidden = !up;
  for (const b of document.querySelectorAll('[data-role]')) b.setAttribute('aria-checked', String(b.dataset.role === authUI.role));
  $('#aCodeLabel').textContent = t({ boss: 'bossCode', admin: 'adminCode' }[authUI.role] || 'teamCode');
  $('#aCodeHint').textContent = t({ boss: 'bossCodeHint', admin: 'adminCodeHint' }[authUI.role] || 'teamCodeHint');
  $('#aPass').autocomplete = up ? 'new-password' : 'current-password';
  $('#aShow').textContent = t($('#aPass').type === 'password' ? 'show' : 'hide');
  $('#authSubmit').textContent = t(up ? 'signupBtn' : 'loginBtn');
  $('#authNote').textContent = session.mode === 'demo' ? t('authDemo') : t(up ? 'authNoteUp' : 'authNoteIn');
  $('#authForgot').hidden = up;
  // Arrivé par le lien d'un courriel : on dit pourquoi il faut se connecter.
  const fromLink = location.hash.startsWith('#probleme=');
  $('#authContext').hidden = !fromLink;
  if (fromLink) $('#authContext').textContent = t('authFromLink');
  if (!$('#aName').value && prefs.name) $('#aName').value = prefs.name;
}
for (const b of document.querySelectorAll('[data-authtab]')) {
  b.addEventListener('click', () => { authUI.tab = b.dataset.authtab; $('#authError').innerHTML = ''; paintAuth(); });
}
for (const b of document.querySelectorAll('[data-role]')) b.addEventListener('click', () => { authUI.role = b.dataset.role; paintAuth(); });
$('#aShow').addEventListener('click', () => {
  const pw = $('#aPass');
  pw.type = pw.type === 'password' ? 'text' : 'password';
  $('#aShow').textContent = t(pw.type === 'password' ? 'show' : 'hide');
});
$('#authForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const up = authUI.tab === 'signup';
  const fields = { email: $('#aEmail').value.trim(), password: $('#aPass').value };
  if (up) Object.assign(fields, { name: $('#aName').value.trim(), role: authUI.role, code: $('#aCode').value.trim() });
  const fail = (key) => { $('#authError').innerHTML = `<div class="notice bad">${esc(t(key))}</div>`; };
  if (up && !fields.name) return fail('errName');
  if (!/^\S+@\S+\.\S+$/.test(fields.email)) return fail('errEmail');
  if (fields.password.length < 6) return fail('errPassword');
  if (up && !fields.code && session.mode !== 'demo') return fail('errCode');
  const btn = $('#authSubmit');
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const user = await signIn(up ? 'signup' : 'login', fields, $('#aRemember').checked);
    prefs.name = user.name;
    if (!mySchedule() && prefs.schedules?.local) saveSchedule(prefs.schedules.local); // l'horaire suit la personne
    adoptSchedule(user);
    savePrefs();
    $('#aPass').value = '';
    $('#aCode').value = '';
    $('#authError').innerHTML = '';
    flushQueue();
    refreshAlerts().then(retryLoose);
    toast(t('welcomeName', user.name));
    route();
    // Nouveau compte : l'horaire d'abord; la visite guidée suit quand il se ferme.
    // Nouveau compte : la visite guidée d'abord (elle part toute seule); l'horaire vient à la fin.
  } catch (err) {
    fail(err.status === 0 ? 'errNetwork' : AUTH_ERRORS[err.message] || (session.mode === 'demo' && err.message === 'login' ? 'errLogin' : 'errServer'));
  } finally {
    btn.disabled = false;
    paintAuth();
  }
});

// Sur l'accueil : qui est connecté, et la porte de l'Espace superviseur.
function paintAccount() {
  const line = $('#accountLine');
  const u = session.user;
  line.hidden = !u;
  document.querySelector('.boss-link').hidden = !isBoss();
  $('#flagHome').hidden = !u; // hors quart, il faut savoir qui signale
  if (!u) return;
  line.innerHTML = `<span class="who">${esc(u.name)} · ${esc(roleName(u.role))}</span><button type="button" class="link" id="signOutBtn">${t('signOut')}</button>`;
  const b = $('#signOutBtn');
  b.onclick = async () => {
    if (!b.dataset.armed) {
      b.dataset.armed = '1';
      b.textContent = t('signOutSure');
      setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = t('signOut'); } }, 3000);
      return;
    }
    await doSignOut();
  };
  if (isBoss()) refreshBossCount();
}
// Les mots changent selon le rôle : « Shifts de l'équipe » pour un superviseur, « Admin » pour l'admin.
function roleKey(k) {
  if (bossWatching() && ['dashShifts', 'dashShiftsSub', 'dashFlag', 'dashFlagSub'].includes(k)) return { dashShifts: 'dashManual', dashShiftsSub: 'dashManualSub', dashFlag: 'dashFeedback', dashFlagSub: 'dashFeedbackSub' }[k];
  if (k === 'histTitle') return bossWatching() ? 'reportsTitle' : 'dashShifts';
  if (k === 'dashShifts' && isBoss()) return 'dashShiftsTeam';
  if (k === 'bossMode' && isAdmin()) return 'roleAdmin';
  return k;
}
// Le nom inscrit sur les quarts. L'admin peut faire un quart au nom d'un employé (ex. Esteban)
// tout en restant connecté à son compte admin.
function shiftName() { return (isRealAdmin() && prefs.actAs?.trim()) || session.user?.name || prefs.name || ''; }
const roleName = (r) => t({ boss: 'roleBoss', admin: 'roleAdmin' }[r] || 'roleEmployee');
async function doSignOut() {
  const wasVisitor = isVisitor();
  const hadClock = prefs.clockOffset;
  restoreNewbie();
  if (prefs.simShift) { const back = prefs.simShift; state = back.state || null; save(); delete prefs.simShift; }
  delete prefs.clockOffset; delete prefs.actAs; delete prefs.workAsEmp; setViewAs(''); // l'heure simulée, l'aperçu et le nom emprunté ne restent pas pour la prochaine personne
  savePrefs();
  await signOut();
  if (wasVisitor || hadClock) { location.reload(); return; }
  boss.problems = [];
  boss.team = [];
  boss.loaded = false;
  boss.teamLoaded = false;
  window.history.replaceState(history.state, '', location.pathname);
  route();
}

// ---------- Mon compte : nom, statut, déconnexion; pour l'admin, les codes et les outils de test ----------
// Choisir sa photo : une mascotte en peluche, une photo du téléphone, ou rien (l'initiale).
function openAvatarPicker({ after } = {}) {
  const u = session.user;
  if (!u) return;
  const cur = (prefs.simNew ? prefs.simNew.avatar : u.avatar) || '';
  openSheet(`<div class="sheet-head"><h2>${esc(t('picTitle'))}</h2><p class="lede">${esc(t('picLede'))}</p></div>
    <div class="pic-grid">${Object.entries(MASCOTS).map(([id, m]) => `<button type="button" class="pic-opt${cur === `m:${id}` ? ' on' : ''}" data-pic="m:${id}" aria-pressed="${cur === `m:${id}`}">${mascotImg(id)}<small>${esc(m[lang()] || m.fr)}</small></button>`).join('')}</div>
    <div class="acct-btns pic-more"><label class="btn ghost pic-upload">${esc(t('picUpload'))}<input type="file" accept="image/*" id="picFile" hidden></label>${cur ? `<button type="button" class="btn ghost" data-pic="">${esc(t('picNone'))}</button>` : ''}</div>
    <p class="section-note" id="picMsg" aria-live="polite"></p>`, (root) => {
    const pick = async (v) => {
      try {
        if (prefs.simNew) { prefs.simNew.avatar = v; savePrefs(); } else await updateMe('avatar', { avatar: v });
        sfx('save'); paintFront();
        if (!after) { closeSheet(); setTimeout(openAccount, 360); return; }
        // Pendant le tutoriel : on reste ici, un mot d'encouragement, puis « Suivant » continue.
        for (const b of root.querySelectorAll('.pic-opt')) { const on = b.dataset.pic === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
        const m = MASCOTS[v.slice(2)];
        const msg = $('#picMsg');
        msg.textContent = v.startsWith('m:') && m ? t('picCheerMascot', m[lang()] || m.fr) : t('picCheer');
        msg.classList.add('pic-cheer');
        buzz('tap');
        $('#sheetFoot .btn')?.focus({ preventScroll: true });
      }
      catch { $('#picMsg').textContent = t('adminCodesLater'); sfx('locked'); }
    };
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-pic]'); if (b) pick(b.dataset.pic); });
    $('#picFile').onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try { pick(await shrinkPhoto(f)); } catch { $('#picMsg').textContent = t('picBad'); }
    };
  }, `<button type="button" class="btn primary" data-close-sheet>${t(after ? 'tourNext' : 'close')}</button>`);
  $('#sheetFoot [data-close-sheet]')?.addEventListener('click', closeSheet);
}
// Le choix « Voir comme » actuel : nouveau (première visite), employé, superviseur ou admin.
const curView = () => (prefs.simNew ? (prefs.simNew.role === 'boss' ? 'newBoss' : 'newEmployee') : viewAs() || 'admin');
// Revivre la première visite : vu comme un employé, sans horaire, le tutoriel au début.
// L'horaire réel est gardé de côté; « revenir » le remet.
// L'aperçu « nouveau » montre la vraie première connexion : pas encore de photo
// (celle choisie pendant l'aperçu reste sur ce téléphone, le vrai compte ne change pas).
function avatarHTML(user, letter) {
  if (prefs.simNew && user === session.user) return avatarOf({ avatar: prefs.simNew.avatar || '' }, letter);
  return avatarOf(user, letter);
}
function startNewbie(role = 'employee') {
  const u = session.user;
  if (!u || !isRealAdmin()) return;
  if (!prefs.simNew) prefs.simNew = { sched: mySchedule() || {}, state, welcomed: prefs.welcomed?.[u.email], workAsEmp: prefs.workAsEmp };
  state = null; plan = null; save();
  clearTimeout(pushSchedule.timer);
  prefs.simNew.tourStep = 0;
  prefs.simNew.tourDone = false;
  prefs.simNew.role = role; // nouvel employé ou nouveau superviseur
  delete prefs.simNew.avatar;
  delete prefs.workAsEmp;
  delete prefs.welcomed?.[u.email];
  savePrefs();
  saveSchedule({}, { push: false });
  setViewAs(role);
  closeSheet(); paintViewAs(); goFront(); paintFront();
  setTimeout(startTour, 420);
}
// Pastille « Aperçu : Employé » tant que l'admin regarde l'app avec un autre rôle; un toucher revient à Admin.
function paintViewAs() { paintAdminTools(); }
// Admin : « Voir comme » dans la barre du haut de chaque écran, et sur la page bleue
// (propriétaire : toujours là, pas de bouton flottant). Un toucher ouvre le choix des rôles.
const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
// Propriétaire : dans chaque vue (employé, superviseur, nouveaux), l'admin choisit de garder ou non
// ses outils (corriger un quart, effacer de l'historique). Personne d'autre ne les voit jamais.
const adminPowers = () => isRealAdmin() && ((curView() === 'admin' && !prefs.simShift) || prefs.viewAdmin !== false);
function adminViewLabel() {
  const view = curView();
  return prefs.simShift ? t('simulationShort') : view === 'admin' ? t('roleAdmin') : view.startsWith('new') ? t(view) : roleName(view);
}
function paintAdminTools() {
  $('#adminSimulator')?.remove(); // ancienne version (bouton violet flottant)
  const admin = isRealAdmin();
  const html = `${EYE}<span>${esc(t('viewShort'))} : ${esc(adminViewLabel())}</span>`;
  for (const [id, host, cls] of [['qbView', '#quickBar .qb-left', 'quick-btn qb-view'], ['poolView', '#auth .pool-top .setup-tools', 'quick-btn qb-view pool-view']]) {
    let b = document.getElementById(id);
    if (!admin) { b?.remove(); continue; }
    if (!b) {
      b = document.createElement('button');
      b.type = 'button'; b.id = id; b.className = cls;
      b.addEventListener('click', openViewMenu);
      const box = $(host);
      if (!box) continue;
      if (id === 'qbView') box.append(b); else box.prepend(b);
    }
    b.innerHTML = html;
    b.setAttribute('aria-label', `${t('viewAsTitle')} : ${adminViewLabel()}`);
  }
}
function openViewMenu() {
  if (!isRealAdmin()) return;
  const view = curView();
  const opt = (v, name) => `<button type="button" class="view-opt" role="radio" aria-checked="${view === v && !prefs.simShift}" data-adminview="${v}">${esc(name)}</button>`;
  const nx = !prefs.simShift && nextShift();
  openSheet(`<div class="sheet-head"><p class="eyebrow">${esc(t('roleAdmin'))}</p><h2>${esc(t('viewAsTitle'))}</h2></div>
    <div class="view-opts" role="radiogroup">${opt('admin', t('roleAdmin'))}${opt('employee', roleName('employee'))}${opt('boss', roleName('boss'))}${opt('newEmployee', t('newEmployee'))}${opt('newBoss', t('newBoss'))}</div>
    ${switchRow('vAdmin', t('viewKeepAdmin'), prefs.viewAdmin !== false)}
    <p class="section-note">${esc(t('viewKeepAdminSub'))}</p>
    ${prefs.simShift ? `<button type="button" class="btn ghost big" data-adminact="exit">${esc(t('simulationExit'))}</button>` : nx ? `<button type="button" class="btn ghost big" data-adminact="sim">${esc(t('simulationStart'))}</button>` : ''}`, (root) => {
    root.querySelector('#vAdmin').onclick = (ev) => {
      prefs.viewAdmin = prefs.viewAdmin === false; savePrefs();
      ev.currentTarget.setAttribute('aria-checked', String(prefs.viewAdmin !== false));
      if (current === 'history') renderHistory({ animate: false });
      if (current === 'review' && lastReview) openReview(...lastReview);
    };
    root.addEventListener('click', (ev) => {
      const v = ev.target.closest('[data-adminview]')?.dataset.adminview;
      const act = ev.target.closest('[data-adminact]')?.dataset.adminact;
      if (act === 'exit') { closeSheet(); exitShiftSimulation(); return; }
      if (act === 'sim') { const n = nextShift(); if (n) confirmShiftSimulation(n); return; }
      if (v) applyAdminView(v);
    });
    $('#viewTools').onclick = () => { closeSheet(); setTimeout(openAccount, 340); };
  }, `<button type="button" class="btn ghost" id="viewTools">${esc(t('adminTools'))}</button><button type="button" class="btn primary" data-close-sheet>${esc(t('close'))}</button>`);
}
// Un toucher dans le menu : on voit l'app comme ce rôle, tout de suite.
function applyAdminView(v) {
  if (!isRealAdmin() || !v) return;
  if (prefs.simShift) exitShiftSimulation();
  closeSheet();
  if (v === curView()) { paintAdminTools(); return; }
  if (v.startsWith('new')) { startNewbie(v === 'newBoss' ? 'boss' : 'employee'); paintAdminTools(); return; }
  restoreNewbie();
  delete prefs.workAsEmp; savePrefs();
  setViewAs(v); sfx('save'); paintViewAs(); goFront(); paintFront();
  toast(v === 'admin' ? t('viewAsBack') : t('viewAsNow', roleName(v)));
}
function restoreNewbie() {
  const back = prefs.simNew;
  if (!back) return;
  // Keep server writes suppressed until the real schedule has been restored.
  saveSchedule(back.sched, { push: false });
  state = back.state || null; plan = null; save();
  prefs.workAsEmp = back.workAsEmp;
  if (back.welcomed === undefined) delete prefs.welcomed?.[session.user.email];
  else prefs.welcomed = { ...prefs.welcomed, [session.user.email]: back.welcomed };
  delete prefs.simNew; savePrefs();
}
function confirmShiftSimulation(nx) {
  if (!isRealAdmin()) return;
  openSheet(`<div class="sheet-head"><h2>${esc(t('simulationSure'))}</h2></div><p class="lede">${esc(t('simulationBody'))}</p>`, () => {
    $('#simulationNo').onclick = () => openNextOverview(nx);
    $('#simulationYes').onclick = () => {
      if (!isRealAdmin()) return;
      if (prefs.simShift) return;
      clearTimeout(pushSchedule.timer);
      prefs.simShift = { state, sched: mySchedule(), clockOffset: prefs.clockOffset || 0, workAsEmp: prefs.workAsEmp };
      prefs.workAsEmp = true;
      const realNow = Date.now() - (prefs.clockOffset || 0);
      prefs.clockOffset = startAt(nx).getTime() - realNow;
      savePrefs();
      startScheduled(nx, { simulation: true });
      location.reload();
    };
  }, `<button type="button" class="btn ghost" id="simulationNo">${t('cancel2')}</button><button type="button" class="btn primary" id="simulationYes">${t('simulationYes')}</button>`);
}
function exitShiftSimulation() {
  const back = prefs.simShift;
  if (!back) return;
  if ('sched' in back) saveSchedule(back.sched, { push: false });
  state = back.state || null; save();
  prefs.clockOffset = back.clockOffset;
  prefs.workAsEmp = back.workAsEmp;
  delete prefs.simShift; savePrefs();
  location.reload();
}

function openAccount() {
  let pendingView = '';
  const u = session.user;
  if (!u) return;
  const admin = isRealAdmin();
  const live = session.mode === 'accounts';
  const sim = prefs.clockOffset ? new Date() : null;
  const local = (d) => `${isoOf(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  openSheet(`<div class="acct-head"><button type="button" class="wb-avatar acct-pic" id="acPic" aria-label="${esc(t('picChange'))}">${avatarHTML(u, esc((u.name[0] || '?').toUpperCase()))}<i aria-hidden="true">✎</i></button><div><h2>${esc(u.name)}</h2><p>${u.email && !u.visitor ? `${esc(u.email)} · ` : ''}<span class="pill">${esc(u.visitor ? t('visitorMode') : roleName(prefs.simNew ? viewAs() : u.role))}</span>${viewAs() && !prefs.simNew ? ` <span class="pill sim">${esc(t('viewAsNow', roleName(viewAs())))}</span>` : ''}</p></div></div>
    ${isRealAdmin() && !prefs.simNew ? `<p class="block-label">${esc(t('viewAsTitle'))}</p><div class="view-as" role="radiogroup">${['employee', 'boss', 'newEmployee', 'newBoss', 'admin'].map((r) => `<button type="button" role="radio" data-viewas="${r}" aria-checked="${curView() === r}"${r === 'admin' ? ' class="va-wide"' : ''}>${esc(r.startsWith('new') ? t(r) : roleName(r))}</button>`).join('')}</div><p class="section-note">${esc(t('viewAsNote'))}</p>
    <label class="field act-as"><span>${esc(t('actAsLabel'))}</span><div class="acct-btns"><input id="acActAs" autocomplete="off" maxlength="40" value="${esc(prefs.actAs || '')}" placeholder="${esc(u.name)}"><button type="button" class="btn ghost" id="acActAsSave">${esc(t('save'))}</button></div></label>
    <p class="section-note">${esc(prefs.actAs ? t('actAsOn', prefs.actAs) : t('actAsNote'))}</p>` : ''}
    <div class="acct-list">
      ${isBoss() && !u.visitor ? `<button type="button" class="acct-row work-row" id="acWork" role="switch" aria-checked="${Boolean(prefs.workAsEmp)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21v-6l-2-3 3-6h8l3 6-2 3v6M9 6l3 4 3-4"/></svg><span>${esc(t('workAsEmp'))}<small>${esc(t(prefs.workAsEmp ? 'workAsEmpOn' : 'workAsEmpOff'))}</small></span><i class="switch" aria-hidden="true"></i></button>` : ''}
      <button type="button" class="acct-row" id="acSched">${ICON.clock}<span>${esc(t('schedTitle'))}</span>${CHEV_R}</button>
      ${u.visitor ? '' : `<details class="acct-code"><summary class="acct-row"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="14" r="4"/><path d="M11 11l8-8M16 6l3 3M14 8l2 2"/></svg><span>${esc(t('codeRow'))}</span>${CHEV_R}</summary>
        <div class="acct-code-body"><p class="section-note">${esc(t('codeRowNote'))}</p><div class="acct-btns"><input id="acRoleCode" inputmode="text" autocomplete="off" aria-label="${esc(t('codeRow'))}"><button type="button" class="btn primary" id="acRoleGo">${esc(t('codeApply'))}</button></div><p class="section-note" id="acRoleMsg" aria-live="polite"></p></div></details>`}
      <button type="button" class="acct-row" id="acTour" data-tour-open><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/></svg><span>${esc(t('tourRow'))}</span>${CHEV_R}</button>
      
    </div>
    ${admin ? `<p class="block-label">${esc(t('adminTools'))}</p>
    <div class="panel acct-admin">
      <label class="field"><span>${esc(t('simClock'))}</span><input type="datetime-local" id="acClock" value="${local(new Date())}"></label>
      <div class="acct-btns"><button type="button" class="btn ghost" id="acClockSet">${esc(t('simApply'))}</button>${sim ? `<button type="button" class="btn ghost" id="acClockReal">${esc(t('simReal'))}</button>` : ''}</div>
      <p class="section-note">${esc(t('adminUnlock'))}</p>
      <div class="acct-btns">
        ${state ? `<button type="button" class="btn ghost" id="acFill">${esc(t('adminFill'))}</button>` : ''}
        <button type="button" class="btn ghost" id="acWipe">${esc(t('adminWipe'))}</button>
      </div>
    </div>
    <p class="block-label">${esc(t('adminCodes'))}</p>
    <div class="panel acct-admin">
      ${live ? `<div class="row2"><label class="field"><span>${esc(t('teamCode'))}</span><input id="acTeam" autocomplete="off"></label><label class="field"><span>${esc(t('bossCode'))}</span><input id="acBossCode" autocomplete="off"></label></div>
      <label class="field"><span>${esc(t('adminCodeLabel'))}</span><input id="acAdminCode" autocomplete="off"></label>
      <button type="button" class="btn ghost" id="acCodes">${esc(t('save'))}</button><p class="section-note" id="acCodesMsg">${esc(t('adminCodesNote'))}</p>` : `<p class="section-note">${esc(t('adminCodesDemo'))}</p>`}
    </div>` : ''}`,
  (root) => {
    $('#acSched').onclick = () => { closeSheet(); setTimeout(() => openScheduleSheet(), 320); };
    if ($('#acWork')) $('#acWork').onclick = () => { prefs.workAsEmp = !prefs.workAsEmp; savePrefs(); sfx('toggle'); paintStatic(); paintFront(); toast(t(prefs.workAsEmp ? 'workAsEmpOn' : 'workAsEmpOff')); closeSheet(); setTimeout(openAccount, 340); };
    $('#acPic').onclick = () => { closeSheet(); setTimeout(openAvatarPicker, 320); };
    $('#acRoleGo')?.addEventListener('click', async () => {
      const code = $('#acRoleCode').value.trim(), msg = $('#acRoleMsg');
      if (!code) return;
      try {
        if (session.mode === 'accounts') await updateMe('role', { code });
        else await updateMe('role', { role: /admin/i.test(code) ? 'admin' : 'boss' }); // démo : rien n'est vérifié
        sfx('save'); toast(t('codeOk', roleName(session.user.role))); closeSheet(); paintFront(); setTimeout(openAccount, 360);
      } catch (err) { msg.textContent = t(err.status === 429 ? 'codeTries' : err.status === 403 ? 'codeBad' : 'adminCodesLater'); sfx('locked'); }
    });
    $('#acActAs')?.closest('label').querySelector('#acActAsSave').addEventListener('click', () => {
      const v = $('#acActAs').value.trim().slice(0, 40);
      if (v && v.toLowerCase() !== u.name.toLowerCase()) prefs.actAs = v; else delete prefs.actAs;
      savePrefs(); sfx('save'); toast(prefs.actAs ? t('actAsOn', prefs.actAs) : t('actAsOff'));
      paintViewAs(); paintFront(); closeSheet(); setTimeout(openAccount, 360);
    });
    // Choisir un rôle le sélectionne seulement; « Appliquer » (le bouton du bas) le met en place.
    root.querySelectorAll('[data-viewas]').forEach((b) => { b.onclick = () => {
      pendingView = b.dataset.viewas;
      root.querySelectorAll('[data-viewas]').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
      const foot = $('#sheetFoot [data-close-sheet]');
      if (foot) foot.textContent = t(pendingView === curView() ? 'close' : 'apply');
      sfx('tab');
    }; });
    $('#acSignOut').onclick = (e) => {
      const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = t('signOutSure'); sfx('locked'); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = t('signOut'); } }, 3000); return; }
      closeSheet(); doSignOut();
    };
    if (!admin) return;
    const setClock = (ms) => { if (ms) prefs.clockOffset = ms; else delete prefs.clockOffset; savePrefs(); location.reload(); };
    $('#acClockSet').onclick = () => { const v = $('#acClock').value; if (v) setClock(new Date(v).getTime() - (Date.now() - (prefs.clockOffset || 0))); }; // décalage = heure voulue − heure réelle
    $('#acClockReal')?.addEventListener('click', () => setClock(0));
    $('#acFill')?.addEventListener('click', () => { for (const it of planTasks()) state.tasks[it.id] = { ...(state.tasks[it.id] || {}), done: true, skipped: false, doneAt: new Date().toISOString() }; save(); closeSheet(); openChecklist(); sfx('full'); });
    $('#acWipe').onclick = (e) => {
      const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = t('adminWipeSure'); return; }
      try { for (const k of Object.keys(localStorage)) if (!['gym-auth', 'gym-auth-mode'].includes(k)) localStorage.removeItem(k); } catch { /* ignore */ }
      location.reload();
    };
    // Les codes actuels, déjà remplis : l'admin les voit et les change au même endroit.
    if ($('#acCodes')) request('auth', { method: 'POST', body: { action: 'codes', read: true } }).then(({ codes }) => {
      if (!$('#acTeam')) return;
      $('#acTeam').value = codes.team; $('#acBossCode').value = codes.boss; $('#acAdminCode').value = codes.admin;
    }).catch(() => {});
    $('#acCodes')?.addEventListener('click', async () => {
      const msg = $('#acCodesMsg');
      try { await request('auth', { method: 'POST', body: { action: 'codes', team: $('#acTeam').value, boss: $('#acBossCode').value, admin: $('#acAdminCode').value } }); msg.textContent = t('adminCodesSaved'); sfx('save'); } catch (err) { msg.textContent = t(err.status === 400 ? 'adminCodesBad' : 'adminCodesLater'); sfx('locked'); }
    });
  }, `<button type="button" class="btn ghost danger" id="acSignOut">${t('signOut')}</button><button type="button" class="btn primary" data-close-sheet>${t('close')}</button>`);
  $('#sheetFoot [data-close-sheet]')?.addEventListener('click', () => {
    if (pendingView && pendingView !== curView()) {
      if (pendingView.startsWith('new')) { startNewbie(pendingView === 'newBoss' ? 'boss' : 'employee'); return; } // première visite : sans horaire, tutoriel du rôle
      restoreNewbie();
      delete prefs.workAsEmp; savePrefs();
      setViewAs(pendingView); sfx('save'); paintViewAs(); closeSheet(); goFront(); paintFront();
      toast(pendingView === 'admin' ? t('viewAsBack') : t('viewAsNow', roleName(pendingView)));
      return;
    }
    closeSheet();
  });
}

// ---------- 8. Espace superviseur : les signalements, l'équipe ----------
const boss = { tab: 'problems', filter: 'open', problems: [], team: [], loaded: false, teamLoaded: false, error: '' };
const openCount = () => boss.problems.filter((p) => p.status !== 'resolved').length;
const whenShort = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const day = isoOf(d);
  const today = todayISO();
  return `${day === today ? t('today') : day === addDays(today, -1) ? t('yesterday') : dayMonth(day)} · ${clock(iso)}`;
};

function paintBossCount() {
  const n = openCount();
  const el = $('#bossCount');
  el.hidden = !n;
  el.textContent = n;
  // Daniel : le nombre de signalements à régler sur sa tuile, et l'urgent sur sa grande carte.
  const tile = $('#dashFlag');
  let badge = tile.querySelector('.dash-badge');
  if (!badge) { badge = document.createElement('span'); badge.className = 'dash-badge num'; tile.append(badge); }
  badge.hidden = !(bossWatching() && n);
  badge.textContent = n;
  if (current === 'auth' && bossWatching()) paintFront();
  if (current === 'history' && bossWatching()) renderHistory({ animate: false });
}
const urgentOpen = () => boss.problems.filter((p) => p.status !== 'resolved' && p.urgent);
// En haut des rapports de Daniel : ce qui presse. Rien d'urgent? Une ligne verte, c'est tout.
function urgentBlock() {
  if (!boss.loaded) return '';
  const list = urgentOpen();
  if (!list.length) return `<p class="boss-ok">✓ ${esc(t('noUrgent'))}</p>`;
  return `<section class="boss-urgent"><h2>${esc(t('urgentTitle', list.length))}</h2>${list.map((p, i) => problemCard(p, i)).join('')}</section>`;
}
async function refreshBossCount() {
  try { boss.problems = await listProblems(); boss.loaded = true; } catch { /* le compte reste à jour au prochain coup */ }
  paintBossCount();
}

function openBoss({ keep = false } = {}) {
  if (!isBoss()) { window.history.replaceState(history.state, '', location.pathname); route(); return; }
  $('#boss .back span').dataset.t = state ? 'myShift' : 'home';
  paintStatic();
  renderBoss({ animate: !keep });
  show('boss');
  refreshBoss();
}

async function refreshBoss() {
  const tab = boss.tab;
  try {
    if (tab === 'team') { boss.team = await listTeam(); boss.teamLoaded = true; }
    else if (tab === 'trends') {
      const [{ shifts }, problems] = await Promise.all([loadRecent(120), listProblems().catch(() => boss.problems)]);
      boss.trendShifts = shifts;
      boss.problems = problems;
      boss.trendLoaded = true;
    } else { boss.problems = await listProblems(); boss.loaded = true; }
    boss.error = '';
  } catch (err) {
    boss.error = err.status === 0 ? 'errNetwork' : 'errServer';
    if (tab === 'team') boss.teamLoaded = true; else if (tab === 'trends') boss.trendLoaded = true; else boss.loaded = true;
  }
  paintBossCount();
  if (current === 'boss' && boss.tab === tab) renderBoss({ animate: false });
}

// « Ouvert depuis 3 jours » : un problème oublié se voit (propriétaire : rien de plus, aucune pression).
function openFor(at) {
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 864e5);
  return days < 1 ? '' : t('openDays', days);
}
function problemCard(p, i) {
  const tone = p.status === 'resolved' ? 'ok' : p.urgent ? 'bad' : 'warn';
  const tags = [
    p.urgent && p.status !== 'resolved' ? `<span class="tag bad">${esc(t('urgentYes'))}</span>` : '',
    p.status === 'resolved' ? `<span class="tag ok">✓ ${esc(t('resolvedBy', p.resolvedBy))}</span>` : '',
    p.photos ? `<span class="tag note">${esc(t('photosN', p.photos))}</span>` : '',
  ].join('');
  return `<button type="button" class="rp-card pb-card ${tone}" data-pid="${esc(p.id)}" style="--k:${Math.min(i, 8)}">
    <span class="pb-ico">${catIcon(p.category)}</span>
    <span class="rp-main">
      <b>${esc(catName(p.category))}</b>
      <span class="hi-meta">${p.location ? `${esc(p.location)} · ` : ''}${esc(p.by)} · <span class="nowrap">${esc(whenShort(p.at))}</span>${p.status !== 'resolved' ? ` ${openFor(p.at) ? `· <span class="nowrap pb-age">${esc(openFor(p.at))}</span>` : ''}` : ''}</span>
      ${p.text ? `<span class="pb-text">${esc(p.text)}</span>` : ''}
      ${tags ? `<span class="tags">${tags}</span>` : ''}
    </span>${CHEV_R}</button>`;
}

// La semaine de l'équipe : qui travaille quel jour (l'horaire que chacun a entré).
function teamWeek() {
  // Démo : les horaires gardés sur ce téléphone font l'affaire.
  const rows = (boss.team || []).map((u) => ({ ...u, schedule: u.schedule && Object.keys(u.schedule).length ? u.schedule : prefs.schedules?.[u.email] })).filter((u) => u.schedule && Object.keys(u.schedule).length);
  if (!rows.length) return '';
  const days = WEEKDAYS[lang()];
  const ti = dowOf(todayISO());
  return `<div class="panel team-week"><h2>${esc(t('teamWeek'))}</h2><div class="tw-grid" style="--n:${rows.length}">
    <span></span>${days.map((d, i) => `<span class="tw-day${i === ti ? ' today' : ''}">${esc(cap(d).slice(0, 3))}</span>`).join('')}
    ${rows.map((u) => `<b class="tw-name">${esc(u.name.split(' ')[0])}</b>${days.map((_, i) => { const v = u.schedule[i]; return `<span class="tw-cell${v ? ' on' : ''}${i === ti ? ' today' : ''}">${v ? esc(schedShort(v)) : ''}</span>`; }).join('')}`).join('')}
  </div></div>`;
}
function renderBoss({ animate = true } = {}) {
  $('#bossEyebrow').textContent = [CONFIG.gymName, session.user?.name].filter(Boolean).join(' · ');
  const n = openCount();
  let panel = '';
  if (boss.tab === 'trends') panel = boss.trendLoaded ? trendsPanel() : '<div class="hi-skel" aria-hidden="true"><i></i><i></i><i></i></div>';
  else if (boss.tab === 'team') {
    panel = !boss.teamLoaded ? '<div class="hi-skel" aria-hidden="true"><i></i><i></i></div>'
      : `${teamWeek()}<p class="section-note">${esc(t('teamHint'))}</p>
        <div class="panel team-list">${boss.team.map((u) => `<div class="team-row" data-email="${esc(u.email)}">
          <div class="team-who"><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div>
          <span class="pill">${esc(roleName(u.role))}</span>
          ${u.email === session.user?.email ? `<span class="team-you">${esc(t('you'))}</span>` : `<div class="team-acts">
            ${session.mode === 'demo' ? '' : `<button type="button" class="link" data-reset>${esc(t('newPassword'))}</button>`}
            <button type="button" class="link danger" data-remove>${esc(t('removeUser'))}</button></div>`}
        </div>`).join('')}</div>`;
  } else {
    const list = boss.filter === 'open' ? boss.problems.filter((p) => p.status !== 'resolved') : boss.problems;
    // À commander : ce que les signalements « Matériel manquant » encore ouverts demandent.
    const need = new Map();
    for (const p of boss.problems.filter((x) => x.category === 'materiel' && x.status !== 'resolved')) {
      for (const it of (p.text || t('materielNoText')).split(',').map((x) => x.trim()).filter(Boolean)) need.set(it, (need.get(it) || 0) + 1);
    }
    const supplies = need.size ? `<div class="panel supplies"><h2>${esc(t('toOrder'))}</h2><div class="flag-chips">${[...need].sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="chip"><b>${esc(k)}</b>${n > 1 ? ` ×${n}` : ''}</span>`).join('')}</div></div>` : '';
    panel = !boss.loaded ? '<div class="hi-skel" aria-hidden="true"><i></i><i></i><i></i></div>'
      : `${supplies}<div class="segmented tiny pb-filter" role="tablist">
          <button type="button" role="tab" data-pfilter="open" aria-selected="${boss.filter === 'open'}">${esc(t('toFix'))}${n ? ` · ${n}` : ''}</button>
          <button type="button" role="tab" data-pfilter="all" aria-selected="${boss.filter === 'all'}">${esc(t('allProblems'))}</button>
        </div>
        <div class="pb-list${animate ? ' cascade' : ''}">${list.length ? list.map(problemCard).join('')
          : `<div class="folder-empty alive"><span aria-hidden="true">${illustration('dossier')}</span><p>${esc(t(boss.filter === 'open' ? 'nothingToFix' : 'noProblems'))}</p></div>`}</div>`;
  }
  $('#bossBody').innerHTML = `
    <button type="button" class="rp-card boss-hist" data-go="history">
      <span class="pb-ico"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4v4.5h4.5M12 7.5V12l3 2"/></svg></span>
      <span class="rp-main"><b>${esc(t('shiftsHistory'))}</b><span class="hi-meta">${esc(t('shiftsHistorySub'))}</span></span>${CHEV_R}
    </button>
    <button type="button" class="rp-card boss-hist" data-go="poster">
      <span class="pb-ico"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/></svg></span>
      <span class="rp-main"><b>${esc(t('posterCard'))}</b><span class="hi-meta">${esc(t('posterCardSub'))}</span></span>${CHEV_R}
    </button>
    <div class="panel alerts-row">${switchRow('bAlerts', t('alertsMe'), Boolean(session.user?.alerts))}<p class="section-note">${esc(t('alertsMeSub', alertNames()))}</p></div>
    <div class="segmented boss-tabs" role="tablist">
      <button type="button" role="tab" data-btab="problems" aria-selected="${boss.tab === 'problems'}">${esc(t('tabProblems'))}</button>
      <button type="button" role="tab" data-btab="trends" aria-selected="${boss.tab === 'trends'}">${esc(t('tabTrends'))}</button>
      <button type="button" role="tab" data-btab="team" aria-selected="${boss.tab === 'team'}">${esc(t('tabTeam'))}</button>
    </div>
    ${boss.error ? `<div class="notice bad">${esc(t(boss.error))}</div>` : ''}
    ${panel}`;
}

$('#bossBody').addEventListener('click', async (ev) => {
  const sw = ev.target.closest('#bAlerts');
  if (sw) {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    try {
      await setAlerts(on);
      await refreshAlerts();
      toast(t(on ? 'alertsOn' : 'alertsOff'));
    } catch (err) {
      sw.setAttribute('aria-checked', String(!on));
      toast(t(err.status === 0 ? 'errNetwork' : 'errServer'), 'bad');
    }
    renderBoss({ animate: false });
    return;
  }
  const el = ev.target.closest('[data-btab], [data-pfilter], [data-pid], [data-reset], [data-remove]');
  if (!el) return;
  const ds = el.dataset;
  if (ds.btab) {
    if (ds.btab === boss.tab) return;
    sfx('tab');
    boss.tab = ds.btab;
    renderBoss();
    refreshBoss();
  } else if (ds.pfilter) {
    boss.filter = ds.pfilter;
    renderBoss();
  } else if (ds.pid) {
    location.hash = `probleme=${ds.pid}`;
  } else if (ds.reset !== undefined) {
    const email = el.closest('[data-email]').dataset.email;
    const u = boss.team.find((x) => x.email === email);
    openSheet(`<div class="sheet-head"><h2>${esc(t('newPasswordFor', u?.name || email))}</h2><p class="lede">${esc(t('newPasswordLede'))}</p></div>
      <label class="field"><span>${t('password')}</span><input id="npw" type="text" autocomplete="off" minlength="6"></label>`, (root) => {
      const input = root.querySelector('#npw');
      const ok = root.querySelector('#npwSave');
      input.addEventListener('input', () => { ok.disabled = input.value.length < 6; });
      root.querySelector('[data-close]').onclick = closeSheet;
      ok.onclick = async () => {
        ok.disabled = true;
        try { await teamAction('reset', email, { password: input.value }); closeSheet(); toast(t('passwordSet', u?.name || email)); } catch (err) { ok.disabled = false; toast(t(err.status === 0 ? 'errNetwork' : 'errServer'), 'bad'); }
      };
    }, `<div class="sheet-actions"><button class="btn ghost" data-close>${t('cancel')}</button><button class="btn primary" id="npwSave" disabled>${t('save')}</button></div>`);
  } else if (ds.remove !== undefined) {
    if (!el.dataset.armed) {
      el.dataset.armed = '1';
      el.textContent = t('removeSure');
      setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.textContent = t('removeUser'); } }, 3000);
      return;
    }
    const email = el.closest('[data-email]').dataset.email;
    try {
      await teamAction('remove', email);
      boss.team = boss.team.filter((x) => x.email !== email);
      renderBoss({ animate: false });
      toast(t('removed'));
    } catch (err) { toast(t(err.status === 0 ? 'errNetwork' : 'errServer'), 'bad'); }
  }
});

// ---------- 9. Un signalement (le lien du courriel arrive ici) ----------
let lastProblem = null;
async function openProblem(id) {
  lastProblem = null;
  paintStatic();
  if (!isBoss()) {
    $('#problemBody').innerHTML = `<div class="notice bad"><b>${esc(t('bossOnly'))}</b></div>`;
    show('problem');
    return;
  }
  const cached = boss.problems.find((p) => p.id === id);
  if (cached) renderProblem(cached); else $('#problemBody').innerHTML = '<div class="hi-skel" aria-hidden="true"><i></i><i></i></div>';
  show('problem');
  try {
    const p = await getProblem(id);
    if (current === 'problem' && (!cached || JSON.stringify(p) !== JSON.stringify(cached))) renderProblem(p);
  } catch (err) {
    if (!cached) $('#problemBody').innerHTML = `<div class="notice bad"><b>${esc(t(err.status === 404 ? 'problemMissing' : err.status === 0 ? 'errNetwork' : 'errServer'))}</b></div>`;
  }
}

function renderProblem(p) {
  lastProblem = p;
  const done = p.status === 'resolved';
  const tone = done ? 'ok' : p.urgent ? 'bad' : 'warn';
  const day = p.at ? isoOf(new Date(p.at)) : '';
  const facts = [
    [t('reportedBy'), p.by],
    [t('whenLabel'), day ? `${longDay(day)} · ${clock(p.at)}` : ''],
    [t('whereLabel'), p.location],
    [t('shiftLabel'), p.shift ? SHIFTS[p.shift][lang()].name : ''],
  ].filter(([, v]) => v);
  $('#problemBody').innerHTML = `
    <div class="pb-head ${tone}">
      <span class="pb-big">${catIcon(p.category)}</span>
      <div>
        <p class="eyebrow">${esc(t(p.urgent ? 'urgentYes' : 'problem'))}${done ? ` · ${esc(t('resolved'))}` : ''}</p>
        <h1>${esc(catName(p.category))}</h1>
      </div>
    </div>
    <div class="panel pb-facts">${facts.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
    ${p.text ? `<div class="panel rv-notes pb-quote">« ${esc(p.text)} »</div>` : ''}
    ${p.photos ? `<div class="pb-photos">${Array.from({ length: p.photos }, (_, i) => `<button type="button" class="pb-photo loading" data-ph="${i}" aria-label="${esc(t('photos'))} ${i + 1}"></button>`).join('')}</div>` : ''}
    ${p.photosExpired ? `<p class="section-note">${esc(t('photosExpired', p.photosExpired))}</p>` : ''}
    ${done ? `<div class="notice ok"><b>✓ ${esc(t('resolvedOn', p.resolvedBy, whenShort(p.resolvedAt)))}</b></div>
      <button class="btn ghost big" id="pbToggle">${esc(t('reopen'))}</button>`
      : `<button class="btn primary big" id="pbToggle">✓ ${esc(t('markResolved'))}</button>`}`;
  $('#pbToggle').onclick = async (ev) => {
    ev.currentTarget.disabled = true;
    try {
      const next = await setProblemStatus(p.id, done ? 'open' : 'resolved');
      boss.problems = boss.problems.map((x) => (x.id === next.id ? next : x));
      paintBossCount();
      renderProblem(next);
      toast(t(done ? 'reopened' : 'markedResolved'));
      if (!done) celebrate();
    } catch (err) {
      ev.currentTarget.disabled = false;
      toast(t(err.status === 0 ? 'errNetwork' : 'errServer'), 'bad');
    }
  };
  for (const b of document.querySelectorAll('#problemBody [data-ph]')) {
    photoSrc(p, Number(b.dataset.ph)).then((src) => {
      if (!src || !b.isConnected) return;
      b.innerHTML = `<img src="${src}" alt="">`;
      b.classList.remove('loading');
      b.onclick = () => openSheet(`<img class="pb-full" src="${src}" alt="">`);
    }).catch(() => { b.classList.remove('loading'); b.classList.add('broken'); });
  }
}

// ---------- Tendances (superviseur) : ce qui glisse, sans rien envoyer ----------
// 30 derniers jours, calculé à partir de l'historique : quarts complets, tâches
// le plus souvent pas faites (et pourquoi), problèmes par catégorie. Pas de
// classement des employés : on regarde le travail, pas les personnes.
const trendPlans = new Map();
function trendPlan(s) {
  const k = `${s.date}|${s.shift}|${s.start}|${s.end}|${lang()}`;
  if (!trendPlans.has(k)) trendPlans.set(k, planOf({ shift: s.shift, date: s.date, start: s.start || SHIFTS[s.shift].start, end: s.end || SHIFTS[s.shift].end, special: s.special, lang: lang() }));
  return trendPlans.get(k);
}
function trendsPanel() {
  const L = lang();
  const since = addDays(todayISO(), -29);
  const shifts = (boss.trendShifts || []).filter((s) => s.date >= since);
  if (!shifts.length) return `<div class="folder-empty alive"><span aria-hidden="true">${illustration('dossier')}</span><p>${esc(t('trendEmpty'))}</p></div>`;
  const ms = shifts.map(metrics);
  const complete = ms.filter((m) => m.total && m.done === m.total).length;
  const avg = Math.round(ms.reduce((a, m) => a + m.pct, 0) / ms.length);
  // Tâches qui glissent : par tâche du plan (le titre sans la zone du jour).
  const tasks = new Map();
  for (const s of shifts) {
    const p = trendPlan(s);
    const st = new Map(s.items.map((i) => [i.id, i]));
    for (const it of p.items.filter((x) => x.kind === 'task')) {
      const label = it.title.split(' — ')[0];
      const row = tasks.get(label) || { label, planned: 0, missed: 0, reasons: {} };
      row.planned += 1;
      const x = st.get(it.id);
      if (!x || x.status !== 'done') {
        row.missed += 1;
        const why = x?.status === 'notdone' ? (SKIP_REASONS[x.reason]?.[L] || t('notDone')) : t('notChecked');
        row.reasons[why] = (row.reasons[why] || 0) + 1;
      }
      tasks.set(label, row);
    }
  }
  const slipping = [...tasks.values()].filter((r) => r.missed).sort((a, b) => b.missed / b.planned - a.missed / a.planned || b.missed - a.missed).slice(0, 6);
  const problems = (boss.problems || []).filter((x) => x.at && isoOf(new Date(x.at)) >= since);
  const byCat = Object.entries(problems.reduce((acc, x) => ({ ...acc, [x.category]: (acc[x.category] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...byCat.map(([, n]) => n));
  const meter = (pct) => `<span class="tr-bar" aria-hidden="true"><i style="--w:${Math.max(4, Math.round(pct))}%"></i></span>`;
  return `
    <p class="block-label hi-span">${esc(t('last30'))}</p>
    <div class="ap-stats">
      <div><b class="num" data-count>${shifts.length}</b><span>${esc(t('statShifts', shifts.length))}</span></div>
      <div class="${complete === shifts.length ? 'ok' : ''}"><b class="num">${complete}/${shifts.length}</b><span>${esc(t('statComplete'))}</span></div>
      <div><b class="num" data-count>${avg}%</b><span>${esc(t('statAvgDone'))}</span></div>
    </div>
    <div class="panel trend">
      <h2>${esc(t('slipTitle'))}</h2>
      <p class="section-note">${esc(t('slipNote'))}</p>
      ${slipping.length ? slipping.map((r) => {
        const top = Object.entries(r.reasons).sort((a, b) => b[1] - a[1])[0];
        return `<div class="tr-row">
          <div class="tr-top"><b>${esc(r.label)}</b><span class="num">${esc(t('missedOf', r.missed, r.planned))}</span></div>
          ${meter((100 * r.missed) / r.planned)}
          <small>${esc(t('mostlyBecause', top[0], top[1]))}</small>
        </div>`;
      }).join('') : `<p class="tr-good">✓ ${esc(t('nothingSlips'))}</p>`}
    </div>
    ${(() => {
      // Revient souvent : même catégorie au même endroit, au moins deux fois en 30 jours.
      const rep = new Map();
      for (const x of problems) { const k = `${x.category}|${(x.location || '').trim().toLowerCase()}`; const r = rep.get(k) || { cat: x.category, where: x.location || '', n: 0 }; r.n += 1; rep.set(k, r); }
      const often = [...rep.values()].filter((r) => r.n >= 2).sort((a, b) => b.n - a.n).slice(0, 5);
      return often.length ? `<div class="panel trend"><h2>${esc(t('oftenTitle'))}</h2>${often.map((r) => `<div class="tr-row"><div class="tr-top"><b>${esc(catName(r.cat))}${r.where ? ` · ${esc(r.where)}` : ''}</b><span class="num">${esc(t('nTimes', r.n))}</span></div></div>`).join('')}</div>` : '';
    })()}
    <div class="panel trend">
      <h2>${esc(t('problemsByCat'))}</h2>
      ${byCat.length ? byCat.map(([k, n]) => `<div class="tr-row">
          <div class="tr-top"><span class="tr-cat">${catIcon(k)}<b>${esc(catName(k))}</b></span><span class="num">${n}</span></div>
          ${meter((100 * n) / maxCat)}
        </div>`).join('') : `<p class="tr-good">✓ ${esc(t('noProblems30'))}</p>`}
    </div>`;
}

// ---------- Affiche : le chemin vers le site, à coller dans le local d'entretien ----------
async function openPoster() {
  paintStatic();
  const url = `${location.origin}${location.pathname}`;
  $('#posterUrl').textContent = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  show('poster');
  try {
    const { default: qrcode } = await import('../vendor/qrcode.js');
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    $('#posterQr').innerHTML = `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" role="img" aria-label="QR code : ${esc(url)}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
  } catch {
    $('#posterQr').innerHTML = '';
  }
}
$('#posterPrint').addEventListener('click', () => window.print());

// ---------- « Ajoute-le à ton écran d'accueil » (une seule fois) ----------
// Sans ça, l'employé cherche le lien à chaque quart. iPhone : Partager → Écran
// d'accueil. Android : le navigateur peut installer d'un toucher.
let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; paintInstallTip(); });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function paintInstallTip() {
  const box = $('#installTip');
  const visible = Boolean(session.user || session.mode === 'none') && !standalone() && !prefs.installSeen && current === 'setup';
  box.hidden = !visible;
  if (!visible) return;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  box.innerHTML = `<div class="it-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/><path d="M12 7v6M9.5 10.5L12 13l2.5-2.5"/></svg></div>
    <div class="it-text"><b>${esc(t('installTitle'))}</b><span>${esc(t(ios ? 'installIos' : installEvent ? 'installAndroid' : 'installOther'))}</span></div>
    <div class="it-acts">${installEvent ? `<button type="button" class="btn primary small" data-install>${esc(t('installBtn'))}</button>` : ''}<button type="button" class="link" data-install-ok>${esc(t('installOk'))}</button></div>`;
}
$('#installTip').addEventListener('click', async (ev) => {
  if (ev.target.closest('[data-install]') && installEvent) {
    installEvent.prompt();
    await installEvent.userChoice.catch(() => null);
    installEvent = null;
  } else if (!ev.target.closest('[data-install-ok]')) return;
  prefs.installSeen = true;
  savePrefs();
  paintInstallTip();
});

// ---------- Confort : texte plus grand ----------
function setLarge(on, sw) {
  prefs.large = on;
  savePrefs();
  document.documentElement.classList.toggle('large', on);
  sw?.setAttribute('aria-checked', String(on));
  for (const b of document.querySelectorAll('[data-large]')) b.setAttribute('aria-pressed', String(on));
  applyTextSize();
  if (current === 'apercu') renderApercu({ animate: false }); // la 3D se remet à la bonne taille
}
// La taille du texte suit l'iPhone (Réglages › Affichage › Taille du texte) : plus grand là-bas,
// plus grand ici, sans rien chercher. « Texte plus grand » dans nos Réglages ajoute 15 % par-dessus.
function iosTextRatio() {
  try {
    if (!CSS.supports('font', '-apple-system-body')) return 1;
    const p = document.createElement('p');
    p.style.cssText = 'font:-apple-system-body;position:absolute;visibility:hidden;margin:0';
    document.body.append(p);
    const px = parseFloat(getComputedStyle(p).fontSize);
    p.remove();
    return px ? Math.min(1.45, Math.max(1, px / 17)) : 1; // 17 px = taille normale de l'iPhone
  } catch { return 1; }
}
function applyTextSize() {
  const z = Math.round(iosTextRatio() * (prefs.large ? 1.15 : 1) * 100) / 100;
  document.documentElement.style.zoom = z === 1 ? '' : String(z);
}
document.documentElement.classList.toggle('large', Boolean(prefs.large));
applyTextSize();
document.addEventListener('visibilitychange', () => { if (!document.hidden) applyTextSize(); }); // changé dans les Réglages de l'iPhone
for (const b of document.querySelectorAll('[data-large]')) b.addEventListener('click', () => setLarge(!prefs.large));
// Propriétaire : le bouton du haut (à côté du thème et de la langue) coupe ou remet les sons, partout.
// « Texte plus grand » vit dans le Menu.
document.addEventListener('click', (ev) => {
  if (!ev.target.closest('[data-sound]')) return;
  prefs.sound = prefs.sound === false;
  savePrefs();
  paintStatic();
  if (prefs.sound !== false) sfx('save');
  toast(t(prefs.sound !== false ? 'soundOn' : 'soundOff'), 'muted');
});

// Le protocole : un onglet de l'Aperçu, ouvert sur aujourd'hui.
function goProtocol() {
  ap.tab = 'protocol';
  ap.day = todayISO();
  ap.week = mondayOf(ap.day);
  ap.keepNext = true;
  if (location.hash === '#apercu') openApercu({ keep: true }); else location.hash = 'apercu';
}

// ---------- Navigation ----------
document.addEventListener('click', (ev) => {
  const go = ev.target.closest('[data-go]');
  if (!go) return;
  if (go.dataset.go === 'apercu-keep') { openApercu({ keep: true }); return; }
  if (go.dataset.go === 'protocol') { goProtocol(); return; }
  if (go.dataset.go === 'history-keep') { openHistory({ keep: true }); return; }
  if (go.dataset.go === 'boss-keep') { window.history.replaceState(history.state, '', '#patron'); openBoss({ keep: true }); return; }
  if (go.dataset.go === 'boss') {
    if (location.hash === '#patron') openBoss(); else location.hash = 'patron';
    return;
  }
  if (go.dataset.go === 'poster') { location.hash = 'affiche'; return; }
  if (go.dataset.go === 'problem') { location.hash = `probleme=${go.dataset.id}`; return; }
  if (go.dataset.go === 'history') {
    if (location.hash === '#historique') openHistory(); else location.hash = 'historique';
    return;
  }
  if (go.dataset.go === 'apercu') {
    if (location.hash === '#apercu') openApercu(); else location.hash = 'apercu';
    return;
  }
  window.history.replaceState(history.state, '', location.pathname);
  route();
});

function route() {
  const h = location.hash;
  if (h.startsWith('#r=')) return openReviewFromHash();
  if (accounts() && !session.user) return openAuth(); // le lien demandé s'ouvre après la connexion
  if (h.startsWith('#probleme=')) return openProblem(decodeURIComponent(h.slice(10)));
  if (h === '#patron') return openBoss();
  if (h === '#affiche') return openPoster();
  if (location.hash === '#apercu') return openApercu();
  if (location.hash === '#historique') return openHistory();
  dropStaleShift();
  if (state?.name && state?.date) return openChecklist();
  if (autoStart()) return;
  if (session.user) return goFront(); // l'accueil (lapin, horaire) fait tout; la page « heures » sert aux heures spéciales
  return setupScreen();
}
// Un « retour » change aussi le # : le popstate s'en est déjà occupé, on ne refait pas le travail.
window.addEventListener('hashchange', () => { if (navPopAt && Date.now() - navPopAt < 400) return; route(); });

// Sélecteurs : la pastille glisse vers le choix actif, où qu'il soit dans la page.
function syncThumb(seg) {
  const btns = [...seg.children].filter((b) => b.tagName === 'BUTTON');
  const i = btns.findIndex((b) => ['aria-checked', 'aria-selected', 'aria-pressed'].some((a) => b.getAttribute(a) === 'true'));
  seg.style.setProperty('--n', btns.length);
  if (i >= 0) seg.style.setProperty('--i', i);
  seg.classList.toggle('has-pick', i >= 0);
}
const THUMBS = '.segmented, .lang-switch';
new MutationObserver((muts) => {
  const seen = new Set();
  for (const m of muts) {
    const t0 = m.target.nodeType === 1 ? m.target : m.target.parentElement;
    const own = t0?.closest(THUMBS);
    if (own) seen.add(own);
    if (m.type === 'childList') t0?.querySelectorAll?.(THUMBS).forEach((x) => seen.add(x));
  }
  seen.forEach(syncThumb);
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-checked', 'aria-selected', 'aria-pressed'] });
document.querySelectorAll(THUMBS).forEach(syncThumb);

// iPhone : sans écouteur touchstart, Safari n'affiche pas l'état « appuyé ».
document.addEventListener('touchstart', () => {}, { passive: true });

// Calme après 12 s sans toucher : les lumières décoratives se figent; un toucher les relance.
let calmTimer = null;
const wake = () => {
  if (document.body.classList.contains('calm')) document.body.classList.remove('calm');
  clearTimeout(calmTimer);
  calmTimer = setTimeout(() => document.body.classList.add('calm'), 12_000);
};
for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart']) addEventListener(ev, wake, { passive: true, capture: true });
wake();

// Animations en pause quand l'onglet est caché (batterie).
document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));
// iPad : au retour (page restaurée, autre app), les animations repartent toujours.
for (const ev of ['pageshow', 'focus', 'pointerdown']) addEventListener(ev, () => { if (!document.hidden) document.body.classList.remove('paused'); }, { passive: true });

// Demande au navigateur de ne jamais effacer nos données (connexion, horaire).
// Firefox afficherait une question : on s'en passe là.
if (!/Firefox/.test(navigator.userAgent)) navigator.storage?.persist?.().catch(() => {});
paintStatic();
paintViewAs();
initAuth(() => { route(); flushQueue(); refreshAlerts(); restoreDraft(); }); // le serveur a répondu autre chose que prévu
if (isVisitor()) {
  let seen = false;
  try { seen = sessionStorage.getItem('visit-hello') === '1'; sessionStorage.setItem('visit-hello', '1'); } catch { /* ignore */ }
  if (!seen) setTimeout(() => toast(t('visitorHello'), 'muted'), 700);
  if (!seen && !mySchedule()) setTimeout(() => openScheduleSheet({ first: true }), 1600);
}
route();
if (isRealAdmin() && prefs.simNew && !prefs.simNew.tourDone && !prefs.simShift) setTimeout(startTour, 450);

// Un quart ou un signalement enregistré sans réseau part tout seul dès que le réseau revient.
flushQueue().then(() => restoreDraft());
if (session.user) refreshAlerts().then(retryLoose);
window.addEventListener('online', () => {
  retryLoose();
  flushQueue().then(() => { if (current === 'history') refreshHistory(); });
});

// Hors ligne (si le service worker est disponible).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  // Une nouvelle version vient de s'installer : on recharge une fois (le quart en cours est déjà enregistré).
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
}
