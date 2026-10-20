import { CONFIG } from './config.js';
import { UI } from './i18n.js';
import { SHIFTS, AREAS, TV_CHANNELS, MANUAL_VERSION, PRIORITY_ORDER, TECHNIQUES, WEEKLY_Q1, WEEKLY_Q2, WALL_TECHNIQUE, FLOOR, GUIDE, guideKey, WEEKDAYS } from './manual.js';
import { buildPlan, detectShift, dayInfo, fmt, fmtDuration, toMin } from './planner.js';
import { SKIP_REASONS, decodeReport, REVIEW, reportLabels } from './report.js';
import { putPhoto, getPhoto, deletePhoto, clearPhotos, shrink } from './photos.js';
import { CATEGORIES, ALL_CATEGORIES as FLAG_CATEGORIES, MAX_PROBLEM_PHOTOS } from './problem-shape.js';
import { mountGlass, playFinish, fxSound } from './fx.js';
import { session, accounts, isBoss, isVisitor, ns, startVisitor, initAuth, signIn, signOut, listTeam, teamAction, alertRecipients, setAlerts } from './auth.js';
import { createProblem, listProblems, getProblem, setProblemStatus, photoSrc } from './problems.js';
import { illustration, zoneMap, tvDiagram } from './illustrations.js';
import { mountPool } from './pool.js';
import { publishShift, flushQueue, loadWeek, loadRecent, keepReport } from './board.js';

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
const save = () => write(KEY, state);
let plan = null;
const ensurePlan = () => { if (state && !plan) plan = buildPlan({ ...state, lang: lang() }); };

const lang = () => (prefs.lang === 'en' ? 'en' : 'fr');
const t = (key, ...args) => {
  const v = UI[lang()][key];
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
function show(id) {
  const prev = current;
  current = id;
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
  const on = Boolean(state && plan && !PILL_HIDDEN.has(current));
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
  window.history.replaceState(null, '', location.pathname);
  openChecklist();
});

// Message bref en bas de l'écran; avec onUndo, un bouton « Annuler » reste
// quelques secondes de plus (un toucher de trop se répare tout de suite).
function toast(msg, tone = 'ok', onUndo = null) {
  const el = $('#toast');
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
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of document.querySelectorAll('[data-ph]')) el.placeholder = t(el.dataset.ph);
  for (const el of document.querySelectorAll('[data-label]')) { el.setAttribute('aria-label', t(el.dataset.label)); el.title = t(el.dataset.label); }
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang()));
  for (const b of document.querySelectorAll('[data-large]')) b.setAttribute('aria-pressed', String(Boolean(prefs.large)));
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
      const p = buildPlan({ shift: st.shift, date: st.date, start: st.start, end: st.end, lang: lang() });
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
  if (state && plan) plan = buildPlan({ ...state, lang: lang() });
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
function saveSchedule(sc) { prefs.schedules = { ...(prefs.schedules || {}), [schedKey()]: sc }; savePrefs(); }
const dowOf = (iso) => (dateOf(iso).getDay() + 6) % 7; // 0 = lundi
// Un jour = un quart habituel (id) ou des heures perso { start, end }.
const presetOf = (v) => (v && typeof v === 'object' ? { id: 'custom', start: v.start, end: v.end } : PRESETS.find((p) => p.id === v) || null);
const todaySched = () => presetOf(mySchedule()?.[dowOf(todayISO())]);
// Le prochain quart à l'horaire. ready : on peut le partir, de 30 min avant le début jusqu'à la fin.
const EARLY_MIN = 30;
const nb = (x) => String(x).replace(/ /g, '\u00a0'); // « 7 h 30 » ne se coupe pas
function nextShift() {
  const sc = mySchedule();
  if (!sc) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayISO();
  for (let i = 0; i < 8; i++) {
    const date = addDays(today, i);
    const p = presetOf(sc[dowOf(date)]);
    if (!p?.start || !p?.end) continue;
    if (i > 0) return { ...p, date, ready: false };
    const s0 = toMin(p.start);
    const e0 = toMin(p.end) <= s0 ? toMin(p.end) + 1440 : toMin(p.end);
    if (editableShift() || nowMin >= e0) continue; // déjà envoyé ou fini : on regarde plus loin
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
const schedShort = (v) => (v && typeof v === 'object' ? f(toMin(v.start)).replace(' h ', 'h').replace(' h', 'h') : SCHED_SHORT[v] || '•');
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
function openScheduleSheet({ first = false } = {}) {
  const sc = {};
  for (const [k, v] of Object.entries(mySchedule() || {})) { const h = hoursOf(v); if (h) sc[k] = { start: h.start, end: h.end }; }
  let lastHours = Object.values(sc).at(-1) || { start: PRESETS[0].start, end: PRESETS[0].end };
  openSheet(`<div class="sheet-head sched-head"><p class="eyebrow">${ICON.clock}${t('schedEyebrow')}</p><h2>${t(first ? 'schedFirstTitle' : 'schedTitle')}</h2><p class="lede">${t('schedLede')}</p></div>${schedEditor(sc)}`, (root) => {
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
        clank('step');
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
      commit(); closeSheet(); toast(t('schedSaved'));
    };
    $('#schedLater')?.addEventListener('click', closeSheet);
  }, `${first ? `<button type="button" class="btn ghost" id="schedLater">${t('schedLater')}</button>` : ''}<button type="button" class="btn primary" id="schedDone">${t(first ? 'schedDoneFirst' : 'save')}</button>`);
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
// Carte « Mon horaire » en haut de Mes shifts.
function schedCard() {
  const sc = mySchedule();
  const days = WEEKDAYS[lang()];
  const ti = dowOf(todayISO());
  if (!sc || !Object.keys(sc).length) {
    return `<div class="sched-card empty"><div><b>${t('schedTitle')}</b><p>${t('schedEmpty')}</p></div><button type="button" class="btn primary" data-sched>${t('schedSet')}</button></div>`;
  }
  const tp = todaySched();
  return `<div class="sched-card"><div class="sch-top"><b>${t('schedTitle')}</b><button type="button" class="link" data-sched>${t('schedEdit')}</button></div>
    <div class="sch-week">${days.map((d, i) => `<span class="sch-pill${i === ti ? ' today' : ''}${sc[i] ? ' on' : ''}"><small>${esc(cap(d).slice(0, 3))}</small><b>${sc[i] ? schedShort(sc[i]) : '–'}</b></span>`).join('')}</div>
    <p class="sch-today">${tp ? esc(t('schedTodayIs', f(toMin(tp.start)), f(toMin(tp.end)))) : esc(t('schedTodayOff'))}</p></div>`;
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
function startScheduled(p) {
  state = {
    name: session.user?.name || prefs.name || '',
    supervisor: '',
    date: todayISO(),
    start: p.start,
    end: p.end,
    shift: detectShift(p.start, p.end),
    tasks: {},
    flags: [],
    notes: '',
    view: 'time',
    createdAt: new Date().toISOString(),
  };
  save();
  window.history.replaceState(null, '', location.pathname);
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
  const name = session.user?.name || $('#fName').value.trim();
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
  window.history.replaceState(null, '', location.pathname);
  openChecklist();
});

// ---------- 2. Checklist ----------
function openChecklist() {
  paintStatic();
  plan = buildPlan({ ...state, lang: lang() });
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
const icon = (it) => `<span class="t-icon" data-plate="${plateOf(it)}" style="--pc:var(--plate-${plateOf(it)})" aria-hidden="true">${illustration(it.photo)}</span>`;

function taskRow(it, { extra = false } = {}) {
  const e = state.tasks[it.id] || {};
  const now = nowMinutes();
  const isNow = !extra && now !== null && it.start <= now && now < it.end;
  const cls = ['task', e.done && 'done', e.skipped && !e.done && 'skipped', isNow && 'current'].filter(Boolean).join(' ');
  const tags = [];
  if (isNow) tags.push(`<span class="tag now">${t('now')}</span>`);
  for (const r of it.reminders || []) tags.push(`<span class="tag time">${f(r.at)} · ${esc(r.label)}</span>`);
  if (e.skipped && !e.done) tags.push(`<span class="tag bad">${t('notDone')}${e.reason ? ` · ${esc(SKIP_REASONS[e.reason]?.[lang()] || e.reason)}` : ''}</span>`);
  if (!e.done && e.steps?.length) tags.push(`<span class="tag note num">${Math.min(e.steps.length, it.steps.length)}/${it.steps.length} ${t('stepsShort')}</span>`);
  if (e.remark) tags.push(`<span class="tag note">${t('remark')}</span>`);
  const time = extra
    ? `<span class="t-time num">+<small>${it.minutes} min</small></span>`
    : `<span class="t-time num">${f(it.start)}<small>${it.minutes} min</small></span>`;
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
        </span>
      </button>
      <button class="check" data-act="toggle" aria-pressed="${Boolean(e.done)}" aria-label="${esc(it.title)}"><i>${e.skipped && !e.done ? '✕' : '✓'}</i></button>
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
function pipsHTML(done, total, plate, land = -1) {
  return Array.from({ length: total }, (_, j) => `<i class="${j < done ? 'on' : ''}${j === land ? ' pop' : ''}"></i>`).join('');
}
const sfx = (name) => { if (prefs.sound !== false) fxSound(name); };
let glass = null;
function renderTimeline() {
  const tasks = planTasks();
  const done = tasks.filter((it) => state.tasks[it.id]?.done).length;
  const box = $('#timeline');
  if (!glass || !box.querySelector('.glass')) {
    glass = mountGlass(box);
    box.insertAdjacentHTML('beforeend', '<div class="glass-count"><b class="num"></b><span></span></div>');
  }
  box.querySelector('.glass-count b').textContent = `${done}/${tasks.length}`;
  box.querySelector('.glass-count span').textContent = t('tasks');
  glass.set(tasks.length ? done / tasks.length : 0, { pour: Boolean(landId) });
  box.setAttribute('aria-label', t('barLabel', done, tasks.length));
  box.classList.toggle('full', tasks.length > 0 && done === tasks.length);
  if (liftNext && !reducedMotion()) { box.classList.remove('lift'); void box.offsetWidth; box.classList.add('lift'); }
  landId = null;
  liftNext = false;
}

// Le son du disque qui tombe sur la barre (court, discret; coupé dans le Menu).
let audio = null;
function clank(kind = 'plate') {
  if (prefs.sound === false) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t0 = audio.currentTime + (kind === 'plate' && !reducedMotion() ? 0.24 : 0);
    const out = audio.createGain();
    out.gain.value = kind === 'step' ? 0.1 : kind === 'lift' ? 0.16 : 0.2;
    out.connect(audio.destination);
    const tones = kind === 'step' ? [[1760, 0.12], [2640, 0.08]] : kind === 'lift' ? [[523, 0.5], [659, 0.5], [784, 0.7]] : [[380, 0.22], [1090, 0.2], [2310, 0.12]];
    tones.forEach(([fq, d], n) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      const s0 = t0 + (kind === 'lift' ? n * 0.09 : 0);
      o.type = kind === 'lift' ? 'triangle' : 'sine';
      o.frequency.value = fq;
      g.gain.setValueAtTime(0.0001, s0);
      g.gain.exponentialRampToValueAtTime(0.7, s0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, s0 + d);
      o.connect(g).connect(out);
      o.start(s0);
      o.stop(s0 + d + 0.03);
    });
    if (kind === 'plate') {
      const len = Math.floor(audio.sampleRate * 0.07);
      const buf = audio.createBuffer(1, len, audio.sampleRate);
      const ch = buf.getChannelData(0);
      for (let n = 0; n < len; n++) ch[n] = (Math.random() * 2 - 1) * (1 - n / len) ** 3;
      const src = audio.createBufferSource();
      const lp = audio.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      src.buffer = buf;
      src.connect(lp).connect(out);
      src.start(t0);
    }
  } catch { /* pas de son ici : tant pis */ }
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
  let cur = plan.items.find((it) => it.start <= now && now < it.end);
  if (!cur) { box.innerHTML = ''; return; }
  // Tâche finie (même en avance) : on passe tout de suite à la suivante.
  if (cur.kind === 'task' && !open(cur)) {
    const ahead = plan.items.find((it) => it.start >= cur.start && open(it)) || plan.items.find(open);
    if (!ahead) { box.innerHTML = quiet(t('allDone')); return; }
    cur = ahead;
  }
  const nextIt = plan.items.find((it) => it !== cur && it.start >= cur.start && open(it));
  const next = nextIt ? `<div class="next"><span>${t('next')}</span><span class="num">${f(nextIt.start)}</span><b>${esc(nextIt.title)}</b></div>` : '';
  // Une tâche dont l'heure est passée et pas encore cochée : un toucher pour rattraper
  // (on coche au fil du quart plutôt que tout à la fin, et l'historique reste juste).
  const missed = [...plan.items].reverse().find((it) => it !== cur && it.kind === 'task' && it.end <= now && !state.tasks[it.id]?.done && !state.tasks[it.id]?.skipped);
  const catchUp = missed ? `<div class="catch-up" data-id="${esc(missed.id)}"><span>${esc(t('catchUp', missed.title))}</span>
      <button class="btn small ghost" data-act="toggle">✓ ${t('catchYes')}</button><button class="btn small ghost cu-open" data-act="open" aria-label="${esc(t('details'))}">…</button></div>` : '';
  const remain = '';
  const bar = '';
  if (cur.kind !== 'task') {
    box.innerHTML = `<div class="now-card"><div class="now-head"><span class="live">${t('now')}</span>${remain}</div>
      <h2>${esc(cur.kind === 'slack' ? cur.title : t('breakNow'))}</h2>${bar}${next}${catchUp}</div>`;
    return;
  }
  const e = state.tasks[cur.id] || {};
  box.innerHTML = `<div class="now-card" data-plate="${plateOf(cur)}" style="--pc:var(--plate-${plateOf(cur)})"><div class="now-head"><span class="live">${t('now')}</span>${remain}</div>
    <div class="now-main alive">${icon(cur)}<div><h2>${esc(cur.title)}</h2>${cur.summary ? `<p class="sum">${esc(cur.summary)}</p>` : ''}</div></div>
    ${bar}
    <div class="acts" data-id="${esc(cur.id)}">
      <button class="btn ${e.done ? 'ghost' : 'primary'} small" data-act="toggle">${e.done ? '✓ ' : ''}${t('markDone')}</button>
      <button class="btn ghost small" data-act="open">${t('details')}</button>
    </div>${next}${catchUp}</div>`;
}

function renderChecklist() {
  const lock = shiftLocked();
  $('#checklist').classList.toggle('locked', Boolean(lock));
  let note = $('#lockNote');
  if (!note) { note = document.createElement('p'); note.id = 'lockNote'; note.className = 'ov-note lock-note'; $('#taskList').before(note); }
  note.hidden = !lock;
  if (lock) note.textContent = `${t('ovFuture')} ${t('ovLocked', countdown(lock))}.`;
  const tasks = planTasks();
  const done = tasks.filter((x) => state.tasks[x.id]?.done).length;
  const d = plan.day;

  $('#cEyebrow').textContent = `${SHIFTS[plan.shift][lang()].short} · ${dayMonth(state.date)}`;
  $('#cTitle').textContent = state.name;
  $('#rangeLabel').textContent = `${f(plan.start)} → ${f(plan.end)}`;
  $('#progressLabel').textContent = done === tasks.length && tasks.length ? t('allDone') : t('leftOf', tasks.length - done, done, tasks.length);
  renderTimeline();
  renderNow();

  $('#listCount').textContent = `${done}/${tasks.length}`;
  const ready = tasks.length > 0 && done === tasks.length;
  $('#finishBtn').classList.toggle('ready', ready);
  $('#finishBtn').textContent = t(ready ? 'finishReady' : 'finish');
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
  if (!state) return 0;
  const at = dateOf(state.date); at.setHours(0, toMin(state.start), 0, 0);
  const left = Math.ceil((at - Date.now()) / 6e4);
  return left > EARLY_MIN ? left : 0;
}
function lockedToast() { const l = shiftLocked(); if (l) toast(t('ovLocked', countdown(l)), 'muted'); return l; }
function toggleDone(id) {
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
  if (e.done) { sfx('pour'); buzz('plate'); }
  if (!wasAll && allDone()) { sfx('full'); setTimeout(() => buzz('lift'), reducedMotion() ? 0 : 650); }
  if (!wasAll && allDone()) setTimeout(showAllDone, reducedMotion() ? 0 : 900);
  if (e.done) document.querySelector(`#taskList [data-id="${CSS.escape(id)}"], #overflowBlock [data-id="${CSS.escape(id)}"]`)?.classList.add('just');
  const tasks = planTasks();
  const left = tasks.filter((x) => !state.tasks[x.id]?.done).length;
  const half = Math.ceil(tasks.length / 2);
  if (!wasAll && allDone()) { celebrate(); toast(t('allDone'), 'ok', undo); }
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
setInterval(() => { if (current === 'checklist' && plan) { renderTimeline(); renderNow(); } }, 30_000);

// ---------- Feuille du bas ----------
let lastFocus = null;
// html : le contenu qui défile; foot : les boutons d'action, toujours visibles en bas.
function openSheet(html, onMount, foot = '') {
  lastFocus = document.activeElement;
  if ($('#sheet').hidden) {
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
        <p class="eyebrow">${esc(AREAS[it.area]?.[lang()] || '')}</p>
        <h2>${esc(it.title)}</h2>
        <div class="meta-row">${pills}</div>
      </div>
    </div>
    <div><p class="block-label steps-head">${t('steps')} <span class="steps-count num">${(e.steps || []).length}/${it.steps.length}</span><span class="pips" style="--pc:var(--plate-${plateOf(it)})">${pipsHTML((e.steps || []).length, it.steps.length)}</span></p>
      <ol class="steps">${it.steps.map((s, i) => `<li><button type="button" class="step" data-step="${i}" aria-pressed="${Boolean(e.done || (e.steps || []).includes(i))}"><span class="step-text">${md(s)}</span><i aria-hidden="true">✓</i></button></li>`).join('')}</ol>
      <p class="hint">${t('stepsHint')}</p></div>
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

const CAT_ICON = {
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
const looseCtx = () => ({ name: session.user?.name || prefs.name, date: todayISO(), shift: null, loose: true });
const LOOSE = 'gym-loose-flags';
const readLoose = () => read(LOOSE, []);

function openFlag({ where = '' } = {}) {
  let category = null;
  let urgent = null; // tant que l'employé n'a pas choisi, suit la catégorie
  const sup = alertNames();
  openSheet(`
    <div class="sheet-head">
      <p class="eyebrow danger">${ICON.flag}${t('flag')}</p>
      <h2>${t('flagTitle')}</h2>
    </div>
    <div class="cat-grid">${Object.entries(CATEGORIES).map(([k, v]) => `<button type="button" data-cat="${k}" aria-pressed="false">${catIcon(k)}<span>${esc(v[lang()])}</span></button>`).join('')}</div>
    <div class="flag-more" hidden>
      <label class="field"><span>${t('where')}</span>
        <input id="flagWhere" list="areaList" placeholder="${esc(t('wherePh'))}" value="${esc(where)}">
        <datalist id="areaList">${Object.values(AREAS).map((a) => `<option value="${esc(a[lang()])}">`).join('')}</datalist>
      </label>
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
    const pick = () => urgent ?? (category ? CATEGORIES[category].urgent : null);
    const paint = () => {
      const u = pick();
      const sup = alertNames(); // la liste peut arriver du serveur après l'ouverture
      root.querySelector('#flagUrgQ').textContent = t('urgentQ', sup);
      root.querySelector('#flagUrgSub').textContent = t('urgentYesSub', sup);
      for (const b of root.querySelectorAll('[data-urg]')) b.setAttribute('aria-checked', String(u !== null && (b.dataset.urg === '1') === u));
      root.querySelector('#flagWhatLabel').textContent = t(category === 'autre' ? 'whatNeeded' : 'whatOpt');
      saveBtn.textContent = u ? t('flagSend', sup) : t('add');
      saveBtn.disabled = !category || (category === 'autre' && !text.value.trim());
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
        if (category === 'autre') text.focus();
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
$('#menuBtn').addEventListener('click', () => {
  openSheet(`
    <div class="sheet-head"><h2>${t('menu')}</h2></div>
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
      <div class="inline-choice"><span>${t('listOrder')}</span>
        <div class="segmented tiny" role="radiogroup">
          <button type="button" role="radio" data-mview="time" aria-checked="${state.view !== 'zone'}">${t('byTime')}</button>
          <button type="button" role="radio" data-mview="zone" aria-checked="${state.view === 'zone'}">${t('byZone')}</button>
        </div>
      </div>
    </div>
    <div class="menu-list">
      <button class="btn ghost menu-item" id="mProto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6M9 11h4"/></svg>${t('protocolMenu')}</button>
      <button class="btn ghost menu-item" id="mEdit"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/></svg>${t('editHours')}</button>
      <button class="btn ghost menu-item danger" id="mReset"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>${t('abandon')}</button>
    </div>
  `, (root) => {
    for (const b of root.querySelectorAll('[data-mlang]')) {
      b.onclick = () => { closeSheet(); setLang(b.dataset.mlang); };
    }
    root.querySelector('#mLarge').onclick = (ev) => setLarge(!prefs.large, ev.currentTarget);
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
    root.querySelector('#mEdit').onclick = () => {
      closeSheet();
      setupScreen();
      $('#fName').value = state.name;
      $('#fDate').value = state.date;
      $('#fStart').value = state.start;
      $('#fEnd').value = state.end;
      showHours(true);
      manualShift = state.shift;
      editing = true; // les tâches cochées sont gardées (mêmes identifiants)
      updatePreview();
    };
    const reset = root.querySelector('#mReset');
    reset.onclick = () => {
      if (!reset.dataset.armed) { reset.dataset.armed = '1'; reset.textContent = t('abandonSure'); return; }
      state = null; save(); clearPhotos(); closeSheet(); setupScreen();
    };
  });
});

// ---------- 3. Fin de quart ----------
$('#finishBtn').addEventListener('click', openFinish);
$('#backBtn').addEventListener('click', () => { renderChecklist(); show('checklist'); });
$('#fNotes').addEventListener('input', (ev) => { state.notes = ev.target.value; save(); });

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
    name: state.name,
    supervisor: state.supervisor || '',
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

// Fin du quart : il s'ajoute à l'historique. Pas de courriel.
async function saveShift() {
  const btn = $('#sendBtn');
  btn.disabled = true;
  btn.textContent = t('saving');
  const { name } = state;
  const summary = boardSummary();
  const where = await publishShift(summary);
  write(LAST_SHIFT, { ...state, savedAt: new Date().toISOString() }); // pour le modifier jusqu'à minuit
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
  const mine = !session.user || last?.name === session.user.name;
  return last && mine && last.savedAt && isoOf(new Date(last.savedAt)) === todayISO() ? last : null;
}
function paintEditToday() {
  const last = editableShift();
  const box = $('#editToday');
  box.hidden = !last || Boolean(state);
  if (last) box.querySelector('span').textContent = t('editToday', SHIFTS[last.shift][lang()].short.toLowerCase());
}
function reopenShift() {
  const last = editableShift();
  if (!last) { toast(t('editLocked'), 'bad'); setupScreen(); return; }
  const { savedAt, ...rest } = last;
  state = rest;
  save();
  window.history.replaceState(null, '', location.pathname);
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
  const row = (i) => `<li class="rv-row ${i.status}">
      <span class="rv-mark">${STATUS_MARK[i.status]}</span>
      <span class="rv-main"><span class="rv-title">${esc(i.title)}</span>${detail(i)}</span>
      <span class="rv-time num">${esc(i.time.split('–')[0] || `${i.minutes} min`)}</span>
    </li>`;
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
      <p class="rv-sub">${esc(r.shiftName)} · ${esc(r.weekday)} ${esc(dayMonth(r.date))} · <span class="num">${esc(r.hours)}</span></p>
      ${r.supervisor ? `<p class="rv-sub">${esc(t('supShort'))} : ${esc(r.supervisor)}</p>` : ''}
    </div>
    <div class="rv-verdict ${nAttention ? 'warn' : 'ok'}">
      <div class="rv-ring" style="--p:${pct}"><span class="num">${pct}%</span></div>
      <div>
        <b>${nAttention ? esc(R.toSee(nAttention)) : esc(R.allGood)}</b>
        <span class="num">${r.completion.done}/${r.completion.total} ${esc(T.done)}</span>
      </div>
    </div>
    ${attention.length ? `<div class="section-head"><h2>${esc(R.attention)}</h2><span class="num">${attention.length}</span></div><ul class="rv-list attention">${attention.join('')}</ul>` : ''}
    ${r.notes ? `<div class="section-head"><h2>${esc(T.notes)}</h2></div><div class="panel rv-notes">${esc(r.notes)}</div>` : ''}
    <div class="section-head"><h2>${esc(R.full)}</h2><span class="num">${r.completion.done}/${r.completion.total}</span></div>
    <ul class="rv-list">${r.items.map(row).join('')}</ul>
    ${r.overflow.length ? `<div class="section-head"><h2>${esc(T.overflow)}</h2></div><p class="section-note">${esc(T.overflowNote(r.deficit))}</p><ul class="rv-list">${r.overflow.map(row).join('')}</ul>` : ''}
    ${r.outOfRange.length ? `<p class="section-note">${esc(T.fixed)} : ${esc(r.outOfRange.join(', '))}</p>` : ''}
    ${nPhotos ? `<p class="section-note">${esc(R.photos(nPhotos))}</p>` : ''}
    ${from ? '' : `<button class="btn ghost big overview-link" type="button" data-go="history">${esc(t('seeHistory'))}</button>`}`;
  paintStatic();
  show('review');
}

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
    <div class="panel"><h2>${esc(t('protoRules'))}</h2><ul class="proto-rules">${t('protoRuleList').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="callout tip"><div class="c-head">${ICON.info}${t('priorities')}</div>${PRIORITY_ORDER[L].map((x, i) => `<p><b class="num">${i + 1}.</b> ${esc(x)}</p>`).join('')}</div>`;
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
  const p = buildPlan({ shift: s.shift, date: s.date, start: s.start || SHIFTS[s.shift].start, end: s.end || SHIFTS[s.shift].end, lang: L });
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
const hist = { mode: 'upcoming', period: 'all', up: '', week: '', recent: [], days: {}, weekLoaded: '', loaded: false, live: false, sig: '', view: [] };

function openHistory({ keep = false } = {}) {
  $('#history .back span').dataset.t = state ? 'myShift' : 'home';
  paintStatic();
  if (!keep || !hist.week) hist.week = mondayOf(todayISO());
  if (!keep || !hist.up) { hist.up = mondayOf(todayISO()); hist.mode = 'upcoming'; }
  renderHistory({ animate: !keep });
  show('history');
  refreshHistory();
}

async function refreshHistory() {
  const { mode, week } = hist;
  if (mode === 'upcoming') return;
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
    m.flags ? `<span class="tag bad">⚑ ${esc(t('nFlags', m.flags))}${urgent ? ` · ${esc(t('nUrgent', urgent))}` : ''}</span>` : '',
    m.notdone ? `<span class="tag bad">${esc(t('nNotDone', m.notdone))}</span>` : '',
    !all && unchecked ? `<span class="tag time">${esc(t('nUnchecked', unchecked))}</span>` : '',
    s.notes || s.items.some((x) => x.remark) ? `<span class="tag note">${esc(t('remarks'))}</span>` : '',
  ].join('');
  return `<button type="button" class="rp-card hi-card ${tone(m)}" data-hi="${i}" style="--k:${Math.min(i, 8)}">
    <span class="rv-ring small ${all ? 'r-ok' : 'r-warn'}" style="--p:${m.pct}"><span class="num">${m.pct}%</span></span>
    <span class="rp-main">
      <span class="hi-top"><b>${esc(s.name)}</b><span class="hi-meta num">${esc(SHIFTS[s.shift][L].short)}${s.start ? ` · ${hhmm(s.start)} – ${hhmm(s.end)}` : ''}</span></span>
      <span class="hi-result ${all ? 'ok' : ''}">${all ? '✓ ' : ''}${esc(t('tasksDone', m.done, m.total))}</span>
      ${tags ? `<span class="tags">${tags}</span>` : ''}
    </span>${CHEV_R}</button>`;
}

// À venir : les quarts de l'horaire, semaine par semaine, sans fin.
function upcomingList() {
  const sc = mySchedule();
  if (!sc || !Object.keys(sc).length) return `<div class="folder-empty alive"><span aria-hidden="true">${illustration('dossier')}</span><p>${esc(t('upEmpty'))}</p></div>`;
  const today = todayISO();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const rows = weekDates(hist.up).map((d) => {
    const p = presetOf(sc[dowOf(d)]);
    if (!p?.start || d < today) return '';
    if (d === today && (editableShift() || nowMin >= toMin(p.end))) return '';
    const left = Math.ceil((startAt({ date: d, start: p.start }) - Date.now()) / 6e4);
    return `<button type="button" class="up-card" data-up="${d}"><span class="up-day"><b>${esc(dayWord(d))}</b><small>${esc(dateOf(d).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }))}</small></span><span class="up-main"><b class="num">${nb(f(toMin(p.start)))} – ${nb(f(toMin(p.end)))}</b><small>${esc(SHIFTS[detectShift(p.start, p.end)][lang()].short)}</small></span><span class="up-left num">${left > 0 ? esc(countdown(left)) : esc(t('nbGo'))}</span>${CHEV_R}</button>`;
  }).join('');
  return rows || `<p class="section-note">${esc(t('upNoneWeek'))}</p>`;
}

function renderHistory({ animate = true } = {}) {
  const isWeek = hist.mode === 'week';
  const isUp = hist.mode === 'upcoming';
  const ready = isUp || (isWeek ? hist.weekLoaded === hist.week : hist.loaded);
  const today = todayISO();
  const since = hist.period === 'week' ? mondayOf(today) : hist.period === 'month' ? `${today.slice(0, 8)}01` : '';
  const shifts = isWeek ? weekDates(hist.week).flatMap((d) => hist.days[d] || []) : hist.recent.filter((x) => x.date >= since);
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

  let k = 0;
  const groups = dates.map((d) => `<section class="hi-day">
      <div class="hi-dayhead"><h2>${esc(dayTitle(d))}</h2><span class="num">${esc(t('nShifts', byDate.get(d).length))}</span></div>
      ${byDate.get(d).map((s) => histCard(s, k++)).join('')}
    </section>`).join('');

  $('#historyBody').innerHTML = `
    ${schedCard()}
    <div class="hi-links">
      <button type="button" class="hi-link tips" data-hlink="tips">${HERO_ICONS.tips}<span><b>${esc(t('dashTips'))}</b><small>${esc(t('dashTipsSub'))}</small></span></button>
      <button type="button" class="hi-link overview" data-hlink="overview">${HERO_ICONS.overview}<span><b>${esc(t('dashOverview'))}</b><small>${esc(t('dashOverviewSub'))}</small></span></button>
    </div>
    <div class="segmented hi-mode" role="tablist">
      <button type="button" role="tab" data-hmode="upcoming" aria-selected="${isUp}">${esc(t('upcoming'))}</button>
      <button type="button" role="tab" data-hmode="recent" aria-selected="${hist.mode === 'recent'}">${esc(t('recent'))}</button>
      <button type="button" role="tab" data-hmode="week" aria-selected="${isWeek}">${esc(t('byWeek'))}</button>
    </div>
    ${isWeek ? `<div class="ap-weekbar">
      <button type="button" class="icon-btn" data-hwk="-1" aria-label="${esc(t('prevWeek'))}">${CHEV_L}</button>
      <div class="ap-weekmid"><b class="num">${esc(weekRange(hist.week))}</b>${hist.week !== mondayOf(today) ? `<button type="button" class="link" data-hwk="0">${esc(t('thisWeek'))}</button>` : `<span class="pill">${esc(t('thisWeek'))}</span>`}</div>
      <button type="button" class="icon-btn" data-hwk="1" aria-label="${esc(t('nextWeek'))}" ${hist.week >= mondayOf(today) ? 'disabled' : ''}>${CHEV_R}</button>
    </div>` : ''}
    ${isUp ? `<div class="ap-weekbar">
      <button type="button" class="icon-btn" data-upwk="-1" aria-label="${esc(t('prevWeek'))}" ${hist.up <= mondayOf(today) ? 'disabled' : ''}>${CHEV_L}</button>
      <div class="ap-weekmid"><b class="num">${esc(weekRange(hist.up))}</b>${hist.up !== mondayOf(today) ? `<button type="button" class="link" data-upwk="0">${esc(t('thisWeek'))}</button>` : `<span class="pill">${esc(t('thisWeek'))}</span>`}</div>
      <button type="button" class="icon-btn" data-upwk="1" aria-label="${esc(t('nextWeek'))}">${CHEV_R}</button>
    </div><div class="up-list">${upcomingList()}</div>` : `<div class="hi-list${animate && ready ? ' cascade' : ''}">
      ${!ready ? '<div class="hi-skel" aria-hidden="true"><i></i><i></i><i></i></div>'
        : `${isWeek || !hist.recent.length ? '' : `<div class="segmented hi-period" role="tablist">${['week', 'month', 'all'].map((k) => `<button type="button" role="tab" data-hper="${k}" aria-selected="${hist.period === k}">${esc(t(`per_${k}`))}</button>`).join('')}</div>`}${strip}${groups || `<div class="folder-empty alive"><span aria-hidden="true">${illustration('dossier')}</span><p>${esc(t(isWeek ? 'histEmptyWeek' : 'histEmpty'))}</p></div>`}`}
    </div>`}
    ${ready && !isUp ? `<p class="section-note">${esc(hist.live ? t('histLive') : t('histLocal'))}</p>` : ''}`;
  if (animate && ready) countUp($('#historyBody'));
}

$('#historyBody').addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-hmode], [data-hwk], [data-hi], [data-upwk], [data-up], [data-hper]');
  if (!el || el.disabled) return;
  const ds = el.dataset;
  if (ds.up) { const p = presetOf(mySchedule()?.[dowOf(ds.up)]); const nx = nextShift(); openNextOverview(nx?.date === ds.up ? nx : { ...p, date: ds.up, ready: false }); return; }
  if (ds.upwk !== undefined) { const n = Number(ds.upwk); hist.up = n ? addDays(hist.up, 7 * n) : mondayOf(todayISO()); renderHistory(); return; }
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
const AUTH_ERRORS = { code: 'errCode', exists: 'errExists', login: 'errLogin', email: 'errEmail', password: 'errPassword', name: 'errName', 'codes-missing': 'errCodesMissing' };

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
    window.history.replaceState(null, '', location.pathname);
    if (state) { route(); return; } // quart en cours : retour aux tâches
    // Horaire connu : le quart part tout de suite avec ses heures, sans formulaire.
    const nx = nextShift();
    if (nx?.ready) { startScheduled(nx); return; }
    if (nx) { openNextOverview(); return; } // trop tôt : l'aperçu, sans pouvoir cocher
    openScheduleSheet({ first: true }); // pas encore d'horaire : on l'entre, une fois
  };
  if (reducedMotion()) { go(); return; }
  btn.classList.add('lifting');
  clank('plate'); buzz('plate');
  setTimeout(() => { clank('lift'); pool().cheer(); }, 380);
  setTimeout(() => { go(); btn.classList.remove('lifting'); }, 1150);
});
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
  $('#restartBtn').hidden = id !== 'checklist';
  $('#qbTasks').hidden = !state || id === 'checklist';
  $('#qbBoss').hidden = !isBoss() || id === 'boss';
  $('#qbVisit').hidden = !isVisitor();
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
function paintFront() {
  const inside = Boolean(session.user);
  const first = (session.user?.name || '').split(' ')[0];
  const label = $('#poolStartLabel');
  if (inside) {
    // Carte « Bon retour » : initiale, nom, où en est le quart, flèche.
    let sub = t('wbStart');
    const nx = !state && nextShift();
    if (state && plan) { const ts = planTasks(); sub = t('wbResume', ts.filter((x) => state.tasks[x.id]?.done).length, ts.length); }
    else if (nx?.ready) sub = t('wbReady');
    else if (nx) sub = t('wbPeek');
    label.innerHTML = `<span class="wb-avatar">${esc((first[0] || '?').toUpperCase())}</span><span class="wb-text"><small>${esc(t('wbHello'))}</small><b>${esc(first || '')}</b><em>${esc(sub)}</em></span><span class="wb-go"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>`;
    $('#poolStart').setAttribute('aria-label', t('welcomeBackName', first));
  } else {
    label.textContent = t('getStarted');
    $('#poolStart').removeAttribute('aria-label');
  }
  paintNextBox(inside);
  $('#poolDash').hidden = !inside;
  $('#dashBoss').hidden = !isBoss();
  $('#poolLogin').hidden = inside;
  $('#poolVisit').hidden = inside;
  $('#auth').classList.toggle('inside', inside);
}
$('#dashFlag').addEventListener('click', () => openFlag());
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
  const nx = inside && nextShift();
  box.hidden = !nx;
  if (!nx) return;
  const at = startAt(nx);
  const left = Math.ceil((at - Date.now()) / 6e4);
  const go = left <= 0;
  box.classList.toggle('ready', nx.ready);
  box.setAttribute('aria-label', `${t(nx.ready ? 'nbNow' : 'nbNext')} : ${whenLabel(nx.date)}, ${f(toMin(nx.start))} – ${f(toMin(nx.end))}. ${go ? t('nbGo') : `${t('nbIn')} ${countdown(left)}`}`);
  box.innerHTML = `<span class="nb-ico" aria-hidden="true">${ICON.clock}</span>
    <span class="nb-text"><small>${esc(t(nx.ready ? 'nbNow' : 'nbNext'))}</small><b>${esc(dayWord(nx.date))}</b><em>${nx.date === todayISO() ? `${nb(f(toMin(nx.start)))} – ${nb(f(toMin(nx.end)))}` : `${nb(dateOf(nx.date).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }))} · ${nb(f(toMin(nx.start)))}`}</em></span>
    <span class="nb-count"><small>${esc(go ? t('nbGo') : t('nbIn'))}</small><b class="num">${esc(go ? t('nbGoBig') : countdown(left))}</b></span>`;
}
// La boîte dorée : l'aperçu du quart en bref, puis « Commencer » ou « Changer l'heure ».
function openNextOverview(pick) {
  const nx = pick?.date ? pick : nextShift();
  if (!nx) return;
  const live = Boolean(state) && nx.date === todayISO(); // le quart en cours
  const p = buildPlan({ shift: detectShift(nx.start, nx.end), date: nx.date, start: nx.start, end: nx.end, lang: lang() });
  // Chaque tâche s'ouvre pour lire ses étapes et ses trucs (rien à cocher ici).
  const rows = p.items.filter((it) => it.kind === 'task' || it.kind === 'break').map((it) => (it.kind === 'task' && (it.steps?.length || it.summary)
    ? `<li class="task"><details><summary><span class="ov-row"><span class="num">${nb(f(it.start))}</span><b>${esc(it.title)}</b>${CHEV_R}</span></summary><div class="ov-more">${it.summary ? `<p>${md(it.summary)}</p>` : ''}${it.steps?.length ? `<ol>${it.steps.map((x) => `<li>${md(x)}</li>`).join('')}</ol>` : ''}${tipsOf(it).length ? `<p class="ov-tips-h">${esc(t('tips'))}</p><ul>${tipsOf(it).map((x) => `<li>${md(x)}</li>`).join('')}</ul>` : ''}</div></details></li>`
    : `<li class="${it.kind}"><span class="num">${nb(f(it.start))}</span><b>${esc(it.title)}</b></li>`)).join('');
  openSheet(`<div class="sheet-head"><p class="eyebrow">${ICON.clock}${esc(t('nbNext'))}</p><h2>${esc(dayWord(nx.date))}${nx.date > addDays(todayISO(), 1) ? ` ${nb(dateOf(nx.date).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }))}` : ''} · ${nb(f(toMin(nx.start)))} – ${nb(f(toMin(nx.end)))}</h2></div>${live || nx.ready ? '' : `<p class="ov-note">${esc(t('ovFuture'))}</p>`}<ol class="ov-list">${rows}</ol>`, () => {
    $('#ovGo').onclick = () => { closeSheet(); if (live) openChecklist(); else if (nx.ready && !state) startScheduled(nx); };
    $('#ovTime').onclick = () => { closeSheet(); window.history.replaceState(null, '', location.pathname); setupScreen(); };
  }, `<button type="button" class="btn ghost" id="ovTime">${t('ovChangeTime')}</button><button type="button" class="btn primary" id="ovGo"${live || (nx.ready && !state) ? '' : ' disabled'}>${live ? t('ovBack') : nx.ready ? t('ovStart') : esc(t('ovLocked', countdown(Math.ceil((startAt(nx) - Date.now()) / 6e4))))}</button>`);
}
$('#poolNext').addEventListener('click', () => openNextOverview());
// Le compte à rebours avance; 30 min avant, la carte passe à « C'est l'heure ».
setInterval(() => { if (current === 'auth' && session.user && !document.hidden) paintFront(); }, 20000);

// « Accueil » : retour à la page du plancher, toujours à portée de pouce.
function goFront() {
  paintStatic();
  authSheet(false);
  show('auth');
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
  $('#aCodeLabel').textContent = t(authUI.role === 'boss' ? 'bossCode' : 'teamCode');
  $('#aCodeHint').textContent = t(authUI.role === 'boss' ? 'bossCodeHint' : 'teamCodeHint');
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
    savePrefs();
    $('#aPass').value = '';
    $('#aCode').value = '';
    $('#authError').innerHTML = '';
    flushQueue();
    refreshAlerts().then(retryLoose);
    toast(t('welcomeName', user.name));
    route();
    if (authUI.tab === 'signup' && !mySchedule()) setTimeout(() => openScheduleSheet({ first: true }), 700);
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
  line.innerHTML = `<span class="who">${esc(u.name)} · ${esc(t(u.role === 'boss' ? 'roleBoss' : 'roleEmployee'))}</span><button type="button" class="link" id="signOutBtn">${t('signOut')}</button>`;
  const b = $('#signOutBtn');
  b.onclick = async () => {
    if (!b.dataset.armed) {
      b.dataset.armed = '1';
      b.textContent = t('signOutSure');
      setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = t('signOut'); } }, 3000);
      return;
    }
    const wasVisitor = isVisitor();
    await signOut();
    if (wasVisitor) { location.reload(); return; }
    boss.problems = [];
    boss.team = [];
    boss.loaded = false;
    boss.teamLoaded = false;
    window.history.replaceState(null, '', location.pathname);
    route();
  };
  if (isBoss()) refreshBossCount();
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
}
async function refreshBossCount() {
  try { boss.problems = await listProblems(); boss.loaded = true; } catch { /* le compte reste à jour au prochain coup */ }
  paintBossCount();
}

function openBoss({ keep = false } = {}) {
  if (!isBoss()) { window.history.replaceState(null, '', location.pathname); route(); return; }
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
      <span class="hi-meta">${p.location ? `${esc(p.location)} · ` : ''}${esc(p.by)} · ${esc(whenShort(p.at))}</span>
      ${p.text ? `<span class="pb-text">${esc(p.text)}</span>` : ''}
      ${tags ? `<span class="tags">${tags}</span>` : ''}
    </span>${CHEV_R}</button>`;
}

function renderBoss({ animate = true } = {}) {
  $('#bossEyebrow').textContent = [CONFIG.gymName, session.user?.name].filter(Boolean).join(' · ');
  const n = openCount();
  let panel = '';
  if (boss.tab === 'trends') panel = boss.trendLoaded ? trendsPanel() : '<div class="hi-skel" aria-hidden="true"><i></i><i></i><i></i></div>';
  else if (boss.tab === 'team') {
    panel = !boss.teamLoaded ? '<div class="hi-skel" aria-hidden="true"><i></i><i></i></div>'
      : `<p class="section-note">${esc(t('teamHint'))}</p>
        <div class="panel team-list">${boss.team.map((u) => `<div class="team-row" data-email="${esc(u.email)}">
          <div class="team-who"><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div>
          <span class="pill">${esc(t(u.role === 'boss' ? 'roleBoss' : 'roleEmployee'))}</span>
          ${u.email === session.user?.email ? `<span class="team-you">${esc(t('you'))}</span>` : `<div class="team-acts">
            ${session.mode === 'demo' ? '' : `<button type="button" class="link" data-reset>${esc(t('newPassword'))}</button>`}
            <button type="button" class="link danger" data-remove>${esc(t('removeUser'))}</button></div>`}
        </div>`).join('')}</div>`;
  } else {
    const list = boss.filter === 'open' ? boss.problems.filter((p) => p.status !== 'resolved') : boss.problems;
    panel = !boss.loaded ? '<div class="hi-skel" aria-hidden="true"><i></i><i></i><i></i></div>'
      : `<div class="segmented tiny pb-filter" role="tablist">
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
  if (!trendPlans.has(k)) trendPlans.set(k, buildPlan({ shift: s.shift, date: s.date, start: s.start || SHIFTS[s.shift].start, end: s.end || SHIFTS[s.shift].end, lang: lang() }));
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
  if (current === 'apercu') renderApercu({ animate: false }); // la 3D se remet à la bonne taille
}
document.documentElement.classList.toggle('large', Boolean(prefs.large));
for (const b of document.querySelectorAll('[data-large]')) b.addEventListener('click', () => setLarge(!prefs.large));

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
  if (go.dataset.go === 'boss-keep') { window.history.replaceState(null, '', '#patron'); openBoss({ keep: true }); return; }
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
  window.history.replaceState(null, '', location.pathname);
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
  if (state?.name && state?.date) return openChecklist();
  return setupScreen();
}
window.addEventListener('hashchange', route);

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

// Demande au navigateur de ne jamais effacer nos données (connexion, horaire).
// Firefox afficherait une question : on s'en passe là.
if (!/Firefox/.test(navigator.userAgent)) navigator.storage?.persist?.().catch(() => {});
paintStatic();
initAuth(() => { route(); flushQueue(); refreshAlerts(); }); // le serveur a répondu autre chose que prévu
if (isVisitor()) {
  let seen = false;
  try { seen = sessionStorage.getItem('visit-hello') === '1'; sessionStorage.setItem('visit-hello', '1'); } catch { /* ignore */ }
  if (!seen) setTimeout(() => toast(t('visitorHello'), 'muted'), 700);
  if (!seen && !mySchedule()) setTimeout(() => openScheduleSheet({ first: true }), 1600);
}
route();

// Un quart ou un signalement enregistré sans réseau part tout seul dès que le réseau revient.
flushQueue();
if (session.user) refreshAlerts().then(retryLoose);
window.addEventListener('online', () => {
  retryLoose();
  flushQueue().then(() => { if (current === 'history') refreshHistory(); });
});

// Hors ligne (si le service worker est disponible).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
