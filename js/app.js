import { CONFIG } from './config.js';
import { UI } from './i18n.js';
import { SHIFTS, AREAS, TV_CHANNELS, MANUAL_VERSION, PRIORITY_ORDER, TECHNIQUES, WEEKLY_Q1, WEEKLY_Q2, WALL_TECHNIQUE, FLOOR } from './manual.js';
import { buildPlan, detectShift, dayInfo, fmt, fmtDuration, toMin } from './planner.js';
import { buildReport, renderReportText, reportSubject, FLAG_CATEGORIES, SKIP_REASONS, encodeReport, decodeReport, reportGlance, REVIEW, reportLabels } from './report.js';
import { MAX_PHOTOS, putPhoto, getPhoto, deletePhoto, clearPhotos, shrink, blobToBase64 } from './photos.js';
import { illustration, zoneMap, tvDiagram } from './illustrations.js';
import { publishShift, loadWeek, keepReport } from './board.js';

const KEY = 'gym-shift-v2';
const PREFS = 'gym-shift-prefs';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Persistance (un rechargement de Safari ne perd rien) ----------
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch { /* mode privé */ }
}

// prefs : langue, dernier nom, dernier superviseur, langue de rapport par superviseur.
const prefs = { lang: CONFIG.defaultLang, name: '', supervisor: '', supervisorLang: {}, lastTimes: {}, swipeSeen: false, ...read(PREFS, {}) };
const savePrefs = () => write(PREFS, prefs);
let state = read(KEY, null);
const save = () => write(KEY, state);
let plan = null;

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

// ---------- Écrans ----------
// Changement d'écran : glissement doux (View Transitions quand Safari les
// offre), vers la droite pour avancer, vers la gauche pour revenir.
let current = null;
const RANK = { setup: 0, checklist: 1, finish: 2, sent: 3, apercu: 4, review: 5 };
function show(id) {
  const prev = current;
  current = id;
  const target = document.getElementById(id);
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

function toast(msg, tone = 'ok') {
  const el = $('#toast');
  el.textContent = msg;
  el.dataset.tone = tone;
  el.hidden = false;
  el.classList.remove('in');
  void el.offsetWidth;
  el.classList.add('in');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 1900);
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
  clip: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7"/></svg>',
};
const logoImgs = (light, dark, cls, alt = '') =>
  `<img class="${cls} only-light" src="${esc(light)}" alt="${esc(alt)}"><img class="${cls} only-dark" src="${esc(dark)}" alt="" aria-hidden="true">`;

function renderBrand() {
  const floor = `<span class="brand-floor">${esc(t('floor'))}</span>`;
  for (const el of document.querySelectorAll('[data-mark]')) {
    el.innerHTML = CONFIG.logo ? logoImgs(CONFIG.logo.mark, CONFIG.logo.markDark, 'mark-img') : '';
    el.hidden = !CONFIG.logo;
  }
  if (CONFIG.logo) {
    $('#brand').innerHTML = `${logoImgs(CONFIG.logo.full, CONFIG.logo.fullDark, 'brand-logo', CONFIG.gymName)}${floor}`;
  } else if (CONFIG.gymName) {
    $('#brand').innerHTML = `<span class="wordmark">${esc(CONFIG.gymName)}</span>${floor}`;
  } else {
    $('#brand').innerHTML = `<span class="wordmark">${esc(t('floor'))}</span>`;
  }
}

function paintStatic() {
  document.documentElement.lang = lang() === 'en' ? 'en-CA' : 'fr-CA';
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of document.querySelectorAll('[data-ph]')) el.placeholder = t(el.dataset.ph);
  for (const el of document.querySelectorAll('[data-label]')) el.setAttribute('aria-label', t(el.dataset.label));
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang()));
  $('#manualVersion').textContent = [CONFIG.gymName && CONFIG.since ? `${CONFIG.gymName} · ${t('since', CONFIG.since)}` : '', t('manual', MANUAL_VERSION)].filter(Boolean).join(' · ');
  renderBrand();
}

function setLang(l) {
  prefs.lang = l;
  savePrefs();
  paintStatic();
  if (current === 'setup') { renderPresets(); updatePreview(); }
  if (state && plan) plan = buildPlan({ ...state, lang: lang() });
  if (current === 'checklist') renderChecklist();
  if (current === 'finish') openFinish();
  if (current === 'apercu') { refCache.clear(); renderApercu({ animate: false }); }
  if (current === 'review' && lastReview) openReview(...lastReview);
}
for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));

// ---------- 1. Début de quart ----------
let manualShift = null;
let editing = false;
let supervisor = '';
let reportLang = 'fr';

function setSupervisor(name) {
  supervisor = name;
  for (const b of document.querySelectorAll('[data-sup]')) b.setAttribute('aria-checked', String(b.dataset.sup === name));
  setReportLang(prefs.supervisorLang[name] || reportLang || lang());
}
function setReportLang(l) {
  reportLang = l === 'en' ? 'en' : 'fr';
  for (const b of document.querySelectorAll('[data-rlang]')) b.setAttribute('aria-checked', String(b.dataset.rlang === reportLang));
}
for (const b of document.querySelectorAll('[data-rlang]')) b.addEventListener('click', () => setReportLang(b.dataset.rlang));

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
  for (const b of document.querySelectorAll('[data-preset]')) {
    const p = PRESETS.find((x) => x.id === b.dataset.preset);
    b.setAttribute('aria-checked', String(p.start === s && p.end === e));
  }
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

function setupScreen() {
  // Le matin, on propose le quart de jour; l'après-midi, celui du soir.
  // Chaque téléphone retient les dernières heures choisies pour chacun.
  const defShift = new Date().getHours() < 12 ? 1 : 2;
  const last = prefs.lastTimes?.[defShift];
  $('#fName').value = prefs.name;
  $('#fDate').value = todayISO();
  $('#fStart').value = last?.start || SHIFTS[defShift].start;
  $('#fEnd').value = last?.end || SHIFTS[defShift].end;
  renderPresets();
  $('#supervisorPick').innerHTML = CONFIG.supervisors
    .map((s) => `<button type="button" role="radio" data-sup="${esc(s.name)}">${esc(s.name)}</button>`).join('');
  for (const b of document.querySelectorAll('[data-sup]')) b.addEventListener('click', () => setSupervisor(b.dataset.sup));
  const known = CONFIG.supervisors.some((s) => s.name === prefs.supervisor);
  setSupervisor(known ? prefs.supervisor : CONFIG.supervisors[0]?.name || '');
  manualShift = null;
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
  syncPresets();
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
  $('#preview').innerHTML = `
    <div class="top"><b>${esc(p.shiftName)}</b><button type="button" class="link" id="swapShift">${t('change')}</button></div>
    <div class="facts">${facts.join('')}</div>`;
  $('#swapShift').onclick = () => { manualShift = shift === 1 ? 2 : 1; updatePreview(); };
}
$('#setupForm').addEventListener('input', (ev) => {
  if (ev.target.id === 'fStart' || ev.target.id === 'fEnd') manualShift = null;
  updatePreview();
});

$('#setupForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const name = $('#fName').value.trim();
  if (!name) { $('#fName').focus(); return; }
  if (!$('#fStart').value || !$('#fEnd').value || !$('#fDate').value) return;
  prefs.name = name;
  prefs.supervisor = supervisor;
  if (supervisor) prefs.supervisorLang[supervisor] = reportLang;
  prefs.lastTimes = { ...prefs.lastTimes, [currentShift()]: { start: $('#fStart').value, end: $('#fEnd').value } };
  savePrefs();
  const keep = editing && state ? { tasks: state.tasks, flags: state.flags, notes: state.notes, view: state.view } : {};
  state = {
    name,
    supervisor,
    reportLang,
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

const icon = (it) => `<span class="t-icon" aria-hidden="true">${illustration(it.photo)}</span>`;

function taskRow(it, { extra = false } = {}) {
  const e = state.tasks[it.id] || {};
  const now = nowMinutes();
  const isNow = !extra && now !== null && it.start <= now && now < it.end;
  const cls = ['task', e.done && 'done', e.skipped && !e.done && 'skipped', isNow && 'current'].filter(Boolean).join(' ');
  const tags = [];
  if (isNow) tags.push(`<span class="tag now">${t('now')}</span>`);
  for (const r of it.reminders || []) tags.push(`<span class="tag time">${f(r.at)} · ${esc(r.label)}</span>`);
  if (e.skipped && !e.done) tags.push(`<span class="tag bad">${t('notDone')}${e.reason ? ` · ${esc(SKIP_REASONS[e.reason]?.[lang()] || e.reason)}` : ''}</span>`);
  if (!e.done && e.steps?.length) tags.push(`<span class="tag note num">${e.steps.length}/${it.steps.length} ${t('stepsShort')}</span>`);
  if (e.remark) tags.push(`<span class="tag note">${t('remark')}</span>`);
  if (e.photos?.length) tags.push(`<span class="tag note">${t('photos')} · ${e.photos.length}</span>`);
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

// Le « couloir » : la ligne du temps du quart, comme un couloir de piscine.
function renderTimeline() {
  const now = nowMinutes();
  const segs = plan.items.map((it) => {
    const e = state.tasks[it.id] || {};
    const cls = it.kind !== 'task' ? 'rest' : e.done ? 'done' : e.skipped ? 'skipped' : '';
    const cur = now !== null && it.start <= now && now < it.end ? ' current' : '';
    return `<span class="seg ${cls}${cur}" style="--w:${it.minutes}"></span>`;
  });
  const swimmer = now !== null && now >= plan.start && now <= plan.end
    ? `<span class="swimmer" style="--x:${(100 * (now - plan.start)) / (plan.end - plan.start)}%"></span>` : '';
  $('#timeline').innerHTML = segs.join('') + swimmer;
}

// Carte « En cours » : ce qu'il faut faire maintenant, en un toucher.
function renderNow() {
  const now = nowMinutes();
  const box = $('#nowCard');
  if (now === null) { box.innerHTML = ''; return; }
  const quiet = (msg) => `<div class="now-card quiet">${esc(msg)}</div>`;
  if (now < plan.start) { box.innerHTML = quiet(t('startsAt', f(plan.start))); return; }
  if (now >= plan.end) { box.innerHTML = quiet(t('over')); return; }
  const cur = plan.items.find((it) => it.start <= now && now < it.end);
  if (!cur) { box.innerHTML = ''; return; }
  const nextIt = plan.items.find((it) => it.start >= cur.end && it.kind === 'task' && !state.tasks[it.id]?.done);
  const next = nextIt ? `<div class="next">${t('next')} · <span class="num">${f(nextIt.start)}</span> <b>${esc(nextIt.title)}</b></div>` : '';
  const pct = Math.round((100 * (now - cur.start)) / (cur.end - cur.start));
  const remain = `<span class="remain num">${t('left', cur.end - now)}</span>`;
  const bar = `<div class="now-bar" style="--p:${pct}%"></div>`;
  if (cur.kind !== 'task') {
    box.innerHTML = `<div class="now-card"><div class="now-head"><span class="live">${t('now')}</span>${remain}</div>
      <h3>${esc(cur.kind === 'slack' ? cur.title : t('breakNow'))}</h3>${bar}${next}</div>`;
    return;
  }
  const e = state.tasks[cur.id] || {};
  box.innerHTML = `<div class="now-card"><div class="now-head"><span class="live">${t('now')}</span>${remain}</div>
    <div class="now-main alive">${icon(cur)}<div><h3>${esc(cur.title)}</h3>${cur.summary ? `<p class="sum">${esc(cur.summary)}</p>` : ''}</div></div>
    ${bar}
    <div class="acts" data-id="${esc(cur.id)}">
      <button class="btn ${e.done ? 'ghost' : 'primary'} small" data-act="toggle">${e.done ? '✓ ' : ''}${t('markDone')}</button>
      <button class="btn ghost small" data-act="open">${t('details')}</button>
    </div>${next}</div>`;
}

function renderChecklist() {
  const tasks = planTasks();
  const done = tasks.filter((x) => state.tasks[x.id]?.done).length;
  const d = plan.day;

  $('#cEyebrow').textContent = [CONFIG.gymName, SHIFTS[plan.shift][lang()].short, `${plan.weekdayName.slice(0, 3)}. ${dayMonth(state.date)}`].filter(Boolean).join(' · ');
  $('#cTitle').textContent = state.name;
  $('#rangeLabel').textContent = `${f(plan.start)} → ${f(plan.end)}`;
  $('#progressLabel').textContent = done === tasks.length && tasks.length ? t('allDone') : t('doneOf', done, tasks.length);
  renderTimeline();
  renderNow();

  const chips = [`<span class="chip">${t('zoneDeep')} <b>${d.zones[plan.shift]}</b></span>`];
  if (plan.shift === 2) {
    chips.push(`<span class="chip">${d.surfaces === 'miroirs' ? `${t('mirrorsZone')} <b>${d.zones.third}</b>` : esc(t(d.surfaces === 'tuiles' ? 'tiles' : 'inspection'))}</span>`);
    if (d.walls) chips.push(`<span class="chip">${t('walls')}</span>`);
  }
  for (const r of plan.items.flatMap((it) => it.reminders || [])) chips.push(`<span class="chip"><b class="num">${f(r.at)}</b> ${esc(r.label)}</span>`);
  $('#dayStrip').innerHTML = chips.join('');

  for (const b of document.querySelectorAll('.view-toggle [data-view]')) b.setAttribute('aria-selected', String(b.dataset.view === state.view));
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

  $('#overflowBlock').innerHTML = plan.overflow.length
    ? `<div class="section-head"><h3>${t('extra')}</h3></div><p class="section-note">${t('extraNote')}</p>
       <ol class="tasks">${plan.overflow.map((it) => taskRow(it, { extra: true })).join('')}</ol>`
    : '';

  $('#flagsBlock').innerHTML = state.flags.length
    ? `<div class="section-head"><h3>${t('flags')}</h3><span class="num">${state.flags.length}</span></div>
       ${state.flags.map((fl, i) => `<div class="flag-item">${ICON.flag}<div><b>${esc(FLAG_CATEGORIES[fl.category]?.[lang()] || fl.category)}</b>${fl.location ? ` · ${esc(fl.location)}` : ''}<br>${esc(fl.text)}<br><small class="num">${clock(fl.at)}${fl.photos?.length ? ` · ${t('photos')} ${fl.photos.length}` : ''}</small></div><button data-del-flag="${i}">${t('remove')}</button></div>`).join('')}`
    : '';
}

function toggleDone(id) {
  const wasAll = allDone();
  const e = entry(id);
  e.done = !e.done;
  if (e.done) { e.skipped = false; delete e.reason; e.doneAt = new Date().toISOString(); } else delete e.doneAt;
  save();
  renderChecklist();
  if (e.done) document.querySelector(`#taskList [data-id="${CSS.escape(id)}"], #overflowBlock [data-id="${CSS.escape(id)}"]`)?.classList.add('just');
  if (!wasAll && allDone()) { celebrate(); toast(t('allDone')); } else toast(t(e.done ? 'checked' : 'unchecked'), e.done ? 'ok' : 'muted');
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

for (const b of document.querySelectorAll('.view-toggle [data-view]')) {
  b.addEventListener('click', () => { state.view = b.dataset.view; save(); renderChecklist(); });
}

// « En cours » et le couloir avancent toutes les 30 secondes.
setInterval(() => { if (current === 'checklist' && plan) { renderTimeline(); renderNow(); } }, 30_000);

// ---------- Feuille du bas ----------
let lastFocus = null;
function openSheet(html, onMount) {
  lastFocus = document.activeElement;
  if ($('#sheet').hidden) {
    // Première ouverture : le contenu arrive en cascade (pas aux mises à jour).
    $('#sheet').classList.add('fresh');
    clearTimeout(openSheet.timer);
    openSheet.timer = setTimeout(() => $('#sheet').classList.remove('fresh'), 700);
  }
  $('#sheetBody').innerHTML = html;
  $('#sheetBody').scrollTop = 0;
  $('#backdrop').hidden = false;
  $('#sheet').hidden = false;
  requestAnimationFrame(() => { $('#backdrop').classList.add('open'); $('#sheet').classList.add('open'); });
  onMount?.($('#sheetBody'));
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

// ---------- Photos prises pendant le quart ----------
const allPhotoIds = () => [
  ...Object.values(state.tasks).flatMap((e) => e.photos || []),
  ...state.flags.flatMap((fl) => fl.photos || []),
];

const CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const photoFieldHtml = () => `<div><p class="block-label">${t('photos')}</p><div class="shots" data-shots></div></div>`;

// ids : tableau modifié sur place; pending : photos pas encore dans l'état
// (feuille de signalement), comptées dans la limite.
function mountPhotos(root, ids, onChange, pending = []) {
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
    const full = allPhotoIds().length + pending.length >= MAX_PHOTOS;
    box.innerHTML = thumbs.join('') + (full
      ? `<p class="shots-full">${t('photosMax', MAX_PHOTOS)}</p>`
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
  fr: { A: 'Cardio', B: 'Bas du corps', C: 'Haut du corps', 1: 'Entrée', 2: 'Évier', 3: 'Vestiaire femmes', 4: 'Studio de spinning', 5: 'Vestiaire hommes', r1: 'Entrée', r2: 'Évier', r3: 'Femmes', r4: 'Spinning', r5: 'Hommes' },
  en: { A: 'Cardio', B: 'Lower body', C: 'Upper body', 1: 'Entrance', 2: 'Sink', 3: 'Women’s locker room', 4: 'Spin studio', 5: 'Men’s locker room', r1: 'Entrance', r2: 'Sink', r3: 'Women', r4: 'Spin studio', r5: 'Men' },
};

// Ce qui se passe aujourd'hui dans une zone ou une pièce (selon le plan du jour).
function todayIn(area, day) {
  const out = [];
  if (day.zones[1] === area) out.push(`${t('morning')} · ${t('deepClean')}`);
  if (day.zones[2] === area) out.push(`${t('evening')} · ${t('deepClean')}`);
  if (day.surfaces === 'miroirs' && day.zones.third === area) out.push(`${t('evening')} · ${t('mirrorsOf')}`);
  if (area === '3' || area === '5') out.push(t('roomTrash'));
  if (area === '4') out.push(`${t('morning')} · ${t('spinRoom')}`);
  if (area === '2') out.push(t('roomSink'));
  if (area === 'A') out.push(`${t('morning')} · ${t('cardioVac')}`);
  if (area === 'B' || area === 'C') out.push(`${t('morning')} · ${t('blackMats')}`);
  return out;
}

// Monte le plan dans un conteneur : toucher une zone ou une pièce montre ce
// qu'il y a dedans et ce qui est prévu aujourd'hui.
function mountMap(box, { highlight = null, mirrors = null, states = {}, date = todayISO(), dayLabel = t('today') } = {}) {
  const day = dayInfo(date);
  // Étiquettes du jour sur les zones : profondeur du matin, du soir, miroirs.
  const tags = {};
  const tag = (z, text, state) => (tags[z] ||= []).push({ text, state });
  tag(day.zones[1], t('morning'), states[1] || 'planned');
  tag(day.zones[2], t('evening'), states[2] || 'planned');
  if (day.surfaces === 'miroirs') tag(day.zones.third, t('mirrorsOf'), 'planned');
  let selected = highlight || mirrors || null;
  let mode = prefs.mapMode === '3d' ? '3d' : 'plan';
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

  openSheet(`
    <div class="sheet-hero">
      ${taskVisual(it)}
      <div class="sheet-head">
        <p class="eyebrow">${esc(AREAS[it.area]?.[lang()] || '')}</p>
        <h3>${esc(it.title)}</h3>
        <div class="meta-row">${pills}</div>
      </div>
    </div>
    <div><p class="block-label">${t('steps')} <span class="steps-count num">${(e.steps || []).length}/${it.steps.length}</span></p>
      <ol class="steps">${it.steps.map((s, i) => `<li><button type="button" class="step" data-step="${i}" aria-pressed="${Boolean(e.done || (e.steps || []).includes(i))}"><span class="step-text">${md(s)}</span><i aria-hidden="true">✓</i></button></li>`).join('')}</ol>
      <p class="hint">${t('stepsHint')}</p></div>
    ${tv}
    ${clockBox}
    ${tips}
    <div class="status-row">
      <button class="btn ${e.done ? 'on-done' : 'ghost'}" data-status="done">✓ ${t('done')}</button>
      <button class="btn ${skipped ? 'on-skip' : 'ghost'}" data-status="skip">✕ ${t('notDone')}</button>
    </div>
    ${skipped ? `<div><p class="block-label">${t('why')}</p><div class="reasons">${Object.entries(SKIP_REASONS).map(([k, v]) => `<button type="button" data-reason="${k}" aria-pressed="${e.reason === k}">${esc(v[lang()])}</button>`).join('')}</div></div>` : ''}
    <label class="field"><span>${t('remark')}</span>
      <textarea id="remark" rows="2" placeholder="${esc(t(e.skipped ? 'remarkSkipPh' : 'remarkPh'))}">${esc(e.remark || '')}</textarea>
    </label>
    ${photoFieldHtml()}
    <div class="sheet-actions"><button class="btn primary" data-close>${t('close')}</button></div>
  `, (root) => {
    root.querySelector('[data-close]').onclick = closeSheet;
    const mapBox = root.querySelector('[data-map]');
    if (mapBox) mountMap(mapBox, it.deep ? { highlight: it.zone, date: state.date } : { mirrors: it.zone, date: state.date });
    // Étapes : chaque toucher coche une étape; toutes faites = tâche cochée.
    for (const b of root.querySelectorAll('[data-step]')) {
      b.onclick = () => {
        const i = Number(b.dataset.step);
        const set = new Set(e.steps || []);
        if (set.has(i)) set.delete(i); else set.add(i);
        e.steps = [...set].sort((x, y) => x - y);
        b.setAttribute('aria-pressed', String(set.has(i)));
        root.querySelector('.steps-count').textContent = `${set.size}/${it.steps.length}`;
        save();
        if (set.size === it.steps.length && !e.done) {
          setTimeout(() => { closeSheet(); toggleDone(id); }, 450);
        } else renderChecklist();
      };
    }
    root.querySelector('#remark').addEventListener('input', (ev) => { e.remark = ev.target.value; save(); renderChecklist(); });
    e.photos ||= [];
    mountPhotos(root, e.photos, () => { save(); renderChecklist(); });
    root.querySelector('[data-status="done"]').onclick = () => {
      closeSheet();
      toggleDone(id);
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
  });
}

// ---------- Signaler un problème ----------
$('#flagBtn').addEventListener('click', openFlag);

function openFlag() {
  let category = null;
  openSheet(`
    <div class="sheet-head">
      <p class="eyebrow danger">${ICON.flag}${t('flag')}</p>
      <h3>${t('flagTitle')}</h3>
      <p class="lede">${t('flagLede')}</p>
    </div>
    <div class="reasons cat">${Object.entries(FLAG_CATEGORIES).map(([k, v]) => `<button type="button" data-cat="${k}" aria-pressed="false">${esc(v[lang()])}</button>`).join('')}</div>
    <label class="field"><span>${t('where')}</span>
      <input id="flagWhere" list="areaList" placeholder="${esc(t('wherePh'))}">
      <datalist id="areaList">${Object.values(AREAS).map((a) => `<option value="${esc(a[lang()])}">`).join('')}</datalist>
    </label>
    <label class="field"><span>${t('what')}</span>
      <textarea id="flagText" rows="3" placeholder="${esc(t('whatPh'))}"></textarea>
    </label>
    ${photoFieldHtml()}
    <div class="callout clock"><p>${t('danger')}</p></div>
    <div class="sheet-actions">
      <button class="btn ghost" data-close>${t('cancel')}</button>
      <button class="btn primary" id="flagSave" disabled>${t('add')}</button>
    </div>
  `, (root) => {
    const saveBtn = root.querySelector('#flagSave');
    const text = root.querySelector('#flagText');
    const photos = [];
    const check = () => { saveBtn.disabled = !(category && text.value.trim()); };
    mountPhotos(root, photos, () => {}, photos);
    for (const b of root.querySelectorAll('[data-cat]')) {
      b.onclick = () => {
        category = b.dataset.cat;
        for (const o of root.querySelectorAll('[data-cat]')) o.setAttribute('aria-pressed', String(o === b));
        check();
      };
    }
    text.addEventListener('input', check);
    root.querySelector('[data-close]').onclick = () => { photos.forEach(deletePhoto); closeSheet(); };
    saveBtn.onclick = () => {
      state.flags.push({ category, location: root.querySelector('#flagWhere').value.trim(), text: text.value.trim(), at: new Date().toISOString(), photos });
      save(); renderChecklist(); closeSheet();
      toast(t('flagged'));
    };
  });
}

// ---------- Options ----------
$('#menuBtn').addEventListener('click', () => {
  openSheet(`
    <div class="sheet-head"><h3>${t('options')}</h3></div>
    <div class="inline-choice"><span>${t('language')}</span>
      <div class="segmented tiny" role="radiogroup">
        <button type="button" role="radio" data-mlang="fr" aria-checked="${lang() === 'fr'}">Français</button>
        <button type="button" role="radio" data-mlang="en" aria-checked="${lang() === 'en'}">English</button>
      </div>
    </div>
    <div class="callout tip"><div class="c-head">${ICON.info}${t('priorities')}</div>${PRIORITY_ORDER[lang()].map((p, i) => `<p><b class="num">${i + 1}.</b> ${esc(p)}</p>`).join('')}</div>
    <div class="menu-list">
      <button class="btn ghost" id="mEdit">${t('editHours')}</button>
      <button class="btn ghost danger" id="mReset">${t('abandon')}</button>
      <button class="btn primary" data-close>${t('close')}</button>
    </div>
  `, (root) => {
    root.querySelector('[data-close]').onclick = closeSheet;
    for (const b of root.querySelectorAll('[data-mlang]')) {
      b.onclick = () => { closeSheet(); setLang(b.dataset.mlang); };
    }
    root.querySelector('#mEdit').onclick = () => {
      closeSheet();
      setupScreen();
      $('#fName').value = state.name;
      $('#fDate').value = state.date;
      $('#fStart').value = state.start;
      $('#fEnd').value = state.end;
      if (state.supervisor) setSupervisor(state.supervisor);
      setReportLang(state.reportLang);
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
  const nPhotos = allPhotoIds().length;

  $('#finishSummary').innerHTML = `
    <div class="stat-grid">
      <div class="stat ok"><b class="num" data-count>${done}</b><span>${t('statDone')}</span></div>
      <div class="stat bad"><b class="num" data-count>${skipped}</b><span>${t('statNot')}</span></div>
      <div class="stat warn"><b class="num" data-count>${state.flags.length}</b><span>${t('statFlags')}</span></div>
    </div>
    ${nPhotos ? `<p class="photo-count">${t('photosAttached', nPhotos)}</p>` : ''}
    ${open.length ? `<div class="panel">
      <div class="section-head" style="margin-top:0"><h3>${t('pending')}</h3><span class="num">${open.length}</span></div>
      ${open.map((x) => `<div class="pending" data-id="${esc(x.id)}">${icon(x)}<div class="t">${esc(x.title)}<small class="num">${f(x.start)} – ${f(x.end)}</small></div>
        <button class="btn small ghost" data-act="done">✓</button><button class="btn small flag" data-act="skip">✕</button></div>`).join('')}
    </div>` : `<div class="notice ok"><b>${t('allChecked')}</b></div>`}`;
  $('#fNotes').value = state.notes || '';
  $('#sendError').innerHTML = '';
  $('#sendBtn').textContent = t('sendTo', state.supervisor);
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

$('#sendBtn').addEventListener('click', send);

// Résumé du quart pour l'Aperçu (statuts seulement, pas de remarques).
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
    items: [...planTasks(), ...plan.overflow].map((it) => {
      const e = state.tasks[it.id] || {};
      return { id: it.id, status: e.done ? 'done' : e.skipped ? 'notdone' : 'unchecked', doneAt: e.doneAt || '', reason: e.skipped ? e.reason || '' : '' };
    }),
    flags: state.flags.map((fl) => ({ category: fl.category, location: fl.location, text: fl.text, at: fl.at })),
  };
}

const recipientFor = (name) => CONFIG.supervisors.find((s) => s.name === name)?.email || CONFIG.reportTo;

async function send() {
  const btn = $('#sendBtn');
  btn.disabled = true;
  btn.textContent = t('sending');

  // Photos numérotées dans l'ordre du rapport : photo-1.jpg, photo-2.jpg…
  const names = new Map();
  const blobs = [];
  const ordered = [...state.flags.flatMap((fl) => fl.photos || []), ...[...plan.items, ...plan.overflow].flatMap((it) => state.tasks[it.id]?.photos || [])];
  for (const pid of ordered) {
    const blob = await getPhoto(pid);
    if (!blob || names.has(pid)) continue;
    names.set(pid, `photo-${names.size + 1}.jpg`);
    blobs.push([names.get(pid), blob]);
  }
  // Rapport dans la langue du superviseur; les remarques restent telles quelles.
  const reportPlan = buildPlan({ ...state, lang: state.reportLang || 'fr' });
  const report = buildReport(reportPlan, state, names);
  const code = await encodeReport(report);
  const link = `${location.origin}${location.pathname}#r=${code}`;
  const summary = boardSummary();

  const finish = () => {
    const { supervisor: sup, name } = state;
    publishShift(summary, code);
    state = null;
    save();
    clearPhotos();
    return { sup, name };
  };

  if (CONFIG.demo) {
    const { sup } = finish();
    window.history.replaceState(null, '', `#r=${code}`);
    openReview(report, { demo: true, sup });
    return;
  }
  try {
    if (CONFIG.sendVia === 'formsubmit') {
      const R = REVIEW[report.lang];
      const fd = new FormData();
      fd.append('_subject', reportSubject(report));
      fd.append('_template', 'box');
      fd.append('_captcha', 'false');
      fd.append(R.title, reportGlance(report));
      fd.append(R.open, link);
      if (report.notes) fd.append(reportLabels(report).notes, report.notes);
      for (const [filename, b] of blobs) fd.append('attachment', new File([b], filename, { type: 'image/jpeg' }));
      const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipientFor(state.supervisor))}`, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      const out = await r.json().catch(() => ({}));
      if (!r.ok || String(out.success) === 'false') throw new Error(out.message || `HTTP ${r.status}`);
    } else {
      const r = await fetch(CONFIG.reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...report,
          link,
          attachments: await Promise.all(blobs.map(async ([filename, b]) => ({ filename, content: await blobToBase64(b) }))),
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
    }
    const { sup, name } = finish();
    $('#sentText').textContent = t('sentText', sup, name);
    paintStatic();
    show('sent');
    celebrate();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = t('retry');
    showFallback(report, err.message, blobs.length > 0, link);
  }
}

function showFallback(report, msg, hasPhotos, link) {
  const subject = reportSubject(report);
  const body = `${renderReportText(report)}\n\n${REVIEW[report.lang].open} : ${link}`;
  const mailto = `mailto:${encodeURIComponent(recipientFor(state.supervisor))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $('#sendError').innerHTML = `
    <div class="notice bad"><b>${t('sendFail')}</b>${esc(msg)}. ${t('sendFailMore')}${hasPhotos ? t('photosByHand') : ''}</div>
    <div class="menu-list">
      <a class="btn ghost" href="${esc(mailto)}" style="text-decoration:none;text-align:center">${t('viaMail')}</a>
      <button class="btn ghost" id="copyReport">${t('copy')}</button>
    </div>`;
  $('#copyReport').onclick = async () => {
    try { await navigator.clipboard.writeText(`${subject}\n\n${body}`); toast(t('copied')); } catch { toast(t('copyFail'), 'bad'); }
  };
}

$('#newShiftBtn').addEventListener('click', setupScreen);

// ---------- 5. Rapport ouvert depuis le courriel ----------
const STATUS_MARK = { done: '✓', notdone: '✕', unchecked: '○' };

let lastReview = null;
function openReview(r, opts = {}) {
  const { demo = false, sup = '', from = '', partial = false } = opts;
  lastReview = [r, opts];
  const back = $('#review .back');
  back.dataset.go = from === 'apercu' ? 'apercu-keep' : 'home';
  back.querySelector('span').dataset.t = from === 'apercu' ? 'overviewShort' : 'home';
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
      <span class="rv-time num">${esc(i.time.split('–')[0] || `${i.minutes} min`)}${i.doneAt ? `<small>✓ ${esc(i.doneAt)}</small>` : ''}</span>
    </li>`;
  const attention = [
    ...r.flags.map((fl) => `<li class="rv-flag"><span class="rv-mark">${ICON.flag}</span><span class="rv-main"><span class="rv-title">${esc(fl.category)}${fl.location ? ` · ${esc(fl.location)}` : ''}</span><span class="rv-quote">« ${esc(fl.text)} »</span>${fl.photos?.length ? `<span class="rv-meta">${ICON.clip}${esc(fl.photos.join(', '))}</span>` : ''}</span><span class="rv-time num">${esc(fl.at)}</span></li>`),
    ...notDone.map(row),
    ...unchecked.map(row),
  ];
  const nPhotos = [...r.items, ...r.flags, ...r.overflow].reduce((n, x) => n + (x.photos?.length || 0), 0);

  $('#reviewBody').innerHTML = `
    ${demo ? `<div class="notice ok"><b>${esc(t('demoText', sup || r.supervisor))}</b></div>` : ''}
    ${partial ? `<div class="notice ok">${esc(t('partialNote'))}</div>` : ''}
    <div class="rv-head">
      <p class="eyebrow">${[r.gymName, R.title].filter(Boolean).map(esc).join(' · ')}</p>
      <h1>${esc(r.name)}</h1>
      <p class="rv-sub">${esc(r.shiftName)} · ${esc(r.weekday)} ${esc(dayMonth(r.date))} · <span class="num">${esc(r.hours)}</span></p>
      ${r.supervisor ? `<p class="rv-sub">${esc(T.to)} ${esc(r.supervisor)}</p>` : ''}
    </div>
    <div class="rv-verdict ${nAttention ? 'warn' : 'ok'}">
      <div class="rv-ring" style="--p:${pct}"><span class="num">${pct}%</span></div>
      <div>
        <b>${nAttention ? esc(R.toSee(nAttention)) : esc(R.allGood)}</b>
        <span class="num">${r.completion.done}/${r.completion.total} ${esc(T.done)}</span>
      </div>
    </div>
    ${attention.length ? `<div class="section-head"><h3>${esc(R.attention)}</h3><span class="num">${attention.length}</span></div><ul class="rv-list attention">${attention.join('')}</ul>` : ''}
    ${r.notes ? `<div class="section-head"><h3>${esc(T.notes)}</h3></div><div class="panel rv-notes">${esc(r.notes)}</div>` : ''}
    <div class="section-head"><h3>${esc(R.full)}</h3><span class="num">${r.completion.done}/${r.completion.total}</span></div>
    <ul class="rv-list">${r.items.map(row).join('')}</ul>
    ${r.overflow.length ? `<div class="section-head"><h3>${esc(T.overflow)}</h3></div><p class="section-note">${esc(T.overflowNote(r.deficit))}</p><ul class="rv-list">${r.overflow.map(row).join('')}</ul>` : ''}
    ${r.outOfRange.length ? `<p class="section-note">${esc(T.fixed)} : ${esc(r.outOfRange.join(', '))}</p>` : ''}
    ${nPhotos && !demo ? `<p class="section-note">${esc(R.photos(nPhotos))}</p>` : ''}
    ${from ? '' : `<button class="btn ghost big overview-link" type="button" data-go="folder" data-date="${esc(r.date)}">${esc(t('seeFolder'))}</button>`}`;
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

// ---------- 6. Aperçu du gym : la semaine, le dossier des rapports, les trucs ----------
const CHEV_L = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const CHEV_R = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dateOf = (iso) => new Date(`${iso}T12:00:00`);
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

const ap = { week: '', day: '', tab: ['day', 'reports', 'tips'].includes(prefs.apTab) ? prefs.apTab : 'day', tipShift: 0, data: {}, live: false, sig: '', keepNext: false };

// Plans de référence d'un jour (matin et soir), gardés en mémoire.
const refCache = new Map();
function refPlan(date, shift) {
  const k = `${date}|${shift}|${lang()}`;
  if (!refCache.has(k)) refCache.set(k, buildPlan({ shift, date, start: SHIFTS[shift].start, end: SHIFTS[shift].end, lang: lang() }));
  return refCache.get(k);
}

// Les trucs d'une tâche : ceux du bloc, plus les techniques du manuel qui vont avec.
const TIP_AREAS = { buanderie: ['buanderie'], gym: ['gym'], cardio: ['cardio'], muscu: ['muscu'], zone: ['zone', 'gym'], surfaces: ['surfaces'], dechets: ['dechets'], spinning: ['gym'] };
function tipsOf(it) {
  const extra = TECHNIQUES[lang()].filter((x) => (TIP_AREAS[it.area] || []).includes(x.area) && (!x.key || x.key === it.photo)).map((x) => x.text);
  return [...new Set([...(it.tips || []), ...extra])];
}
const tipsCallout = (it) => {
  const tips = tipsOf(it);
  return tips.length ? `<div class="callout tip"><div class="c-head">${ICON.info}${t('goodToKnow')}</div>${tips.map((x) => `<p>${md(x)}</p>`).join('')}</div>` : '';
};

// Statut d'une tâche dans les quarts envoyés : fait l'emporte, puis pas fait.
function statusIn(list, id) {
  let res = null;
  for (const s of list) {
    const it = s.items.find((x) => x.id === id);
    if (!it) continue;
    if (it.status === 'done') return { kind: 'done', by: s.name, at: clock(it.doneAt) };
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
  return { done, total, pct: total ? Math.round((100 * done) / total) : 0, notdone: s.items.filter((i) => i.status === 'notdone').length, flags: s.flags.length };
}
const tone = (m) => (m.flags || m.notdone ? 'bad' : m.pct === 100 ? 'ok' : 'warn');

async function openApercu({ keep = false } = {}) {
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
  const dates = weekDates(ap.week);
  const nReports = dates.reduce((n, d) => n + (ap.data[d]?.length || 0), 0);
  $('#apEyebrow').textContent = [CONFIG.gymName, ap.week === mondayOf(today) ? t('thisWeek') : weekRange(ap.week)].filter(Boolean).join(' · ');
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
      ${['day', 'reports', 'tips'].map((k) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${ap.tab === k}">${esc(t(`tab_${k}`))}${k === 'reports' && nReports ? `<span class="count num">${nReports}</span>` : ''}</button>`).join('')}
    </div>
    <div class="ap-panel" id="apPanel"></div>
    <button class="btn primary big" type="button" data-go="${state ? 'shift' : 'home'}">${esc(state ? t('backToShift') : t('startShift'))}</button>`;
  renderPanel({ animate, dir });
}

function renderPanel({ animate = true, dir = 0 } = {}) {
  const box = $('#apPanel');
  box.innerHTML = ap.tab === 'reports' ? reportsPanel() : ap.tab === 'tips' ? tipsPanel() : dayPanel();
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
      ['q2-surfaces-1', surf],
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
      <div class="ap-dayhead"><h3>${esc(longDay(d))}</h3>${d === today ? `<span class="pill is-live">${esc(t('today'))}</span>` : ''}</div>
      <div data-map></div>
      <div class="legend">${['done', 'planned', 'unchecked', 'notdone'].map((k) => `<span><i class="sw ${k}"></i>${esc(t('legend')[k])}</span>`).join('')}</div>
    </div>
    <div class="ap-cards">${card(1)}${card(2)}</div>
    ${left.length ? `<div class="panel"><div class="ap-card-head"><h3>${t('stillToDo')}</h3><span class="num">${left.length}</span></div>
      ${left.some((l) => l.kind === 'notdone') ? `<ul class="ap-list">${left.filter((l) => l.kind === 'notdone').map((l) => `<li class="ap-row"><span class="ap-who">${esc(SHIFTS[l.shift][L].short)}</span><span class="ap-what">${esc(l.title)}</span><span class="st bad">✕ ${esc(SKIP_REASONS[l.reason]?.[L] || t('notDone'))}</span></li>`).join('')}</ul>` : ''}
      ${left.some((l) => l.kind !== 'notdone') ? `<p class="block-label left-label">○ ${esc(t('notChecked'))}</p><div class="left-chips">${left.filter((l) => l.kind !== 'notdone').map((l) => `<span>${esc(l.title)}</span>`).join('')}</div>` : ''}</div>` : ''}
    ${flags.length ? `<div class="panel"><h3>${t('flags')}</h3>${flags.map((fl) => `<div class="flag-item">${ICON.flag}<div><b>${esc(FLAG_CATEGORIES[fl.category]?.[L] || fl.category)}</b>${fl.location ? ` · ${esc(fl.location)}` : ''}<br>${esc(fl.text)}<br><small class="num">${esc(fl.by)}${fl.at ? ` · ${clock(fl.at)}` : ''}</small></div></div>`).join('')}</div>` : ''}`;
}

// Le dossier : un rapport par quart envoyé, classé par jour.
function reportsPanel() {
  const today = todayISO();
  const all = weekDates(ap.week).flatMap((d) => ap.data[d] || []);
  const ms = all.map(metrics);
  const avg = ms.length ? Math.round(ms.reduce((a, m) => a + m.pct, 0) / ms.length) : 0;
  const nFlags = ms.reduce((a, m) => a + m.flags, 0);
  const list = ap.data[ap.day] || [];
  const card = (s, i) => {
    const m = metrics(s);
    const tags = [
      m.flags ? `<span class="tag bad">⚑ ${m.flags}</span>` : '',
      m.notdone ? `<span class="tag bad">${m.notdone} × ${esc(t('notDone'))}</span>` : '',
      s.code ? '' : `<span class="tag">${esc(t('summaryOnly'))}</span>`,
    ].join('');
    return `<button type="button" class="rp-card ${tone(m)}" data-rp="${i}">
      <span class="rv-ring small" style="--p:${m.pct}"><span class="num">${m.pct}%</span></span>
      <span class="rp-main">
        <b>${esc(s.name)}</b>
        <span class="rp-meta"><span class="num">${esc(SHIFTS[s.shift][lang()].short)}${s.start ? ` · ${hhmm(s.start)} – ${hhmm(s.end)}` : ''}</span>${s.submittedAt ? ` · ${esc(t('sentAt', clock(s.submittedAt)))}` : ''}${s.supervisor ? ` · ${esc(t('toSup', s.supervisor))}` : ''}</span>
        ${tags ? `<span class="tags">${tags}</span>` : ''}
      </span>${CHEV_R}</button>`;
  };
  return `
    <div class="ap-stats">
      <div><b class="num" data-count>${all.length}</b><span>${esc(t('statReports'))}</span></div>
      <div><b class="num" data-count>${avg}%</b><span>${esc(t('statAvg'))}</span></div>
      <div class="${nFlags ? 'bad' : ''}"><b class="num" data-count>${nFlags}</b><span>${esc(t('statFlags'))}</span></div>
    </div>
    <div class="folder">
      <div class="folder-tab">${esc(longDay(ap.day))}</div>
      <div class="folder-body">${list.length
        ? list.map(card).join('')
        : `<div class="folder-empty alive">${illustration('dossier')}<p>${esc(ap.day > today ? t('noReportsYet') : t('noReportsDay'))}</p></div>`}</div>
    </div>
    <p class="section-note">${esc(ap.live ? t('folderLive') : t('folderLocal'))}</p>`;
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
      <div class="panel ap-tips"><h3>${t('techniques')}</h3>
        ${[...TECHNIQUES[L], { area: 'bureaux', text: WALL_TECHNIQUE[L] }].filter((x) => x.key !== 'murs').map((tip) => `<div class="tip-row">${illustration(tipIcon(tip.area, tip.key))}<p>${md(tip.text)}</p></div>`).join('')}
      </div>`;
  }
  const p = refPlan(ap.day, shift);
  const tasks = p.items.filter((x) => x.kind === 'task').map((it) => ({ it, tips: tipsOf(it) })).filter((x) => x.tips.length);
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

const TIP_ICONS = { gym: 'points-contact', cardio: 'desinfection', zone: 'inspection', surfaces: 'miroirs', bureaux: 'bureaux', muscu: 'aspirateur', buanderie: 'guenilles', dechets: 'poubelles' };
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
        <h3>${esc(it.title)}</h3>
        <div class="meta-row"><span class="pill num">${f(it.start)} – ${f(it.end)}</span><span class="pill num">${it.minutes} min</span>${it.zone ? `<span class="pill">Zone ${it.zone}</span>` : ''}</div>
      </div>
    </div>
    <div><p class="block-label">${t('steps')}</p><ol class="steps static">${it.steps.map((s) => `<li><span class="step"><span class="step-text">${md(s)}</span></span></li>`).join('')}</ol></div>
    ${it.tvTable ? `<figure class="visual map-visual"><figcaption class="block-label">${t('channels')}</figcaption>${tvDiagram(TV_CHANNELS)}</figure>` : ''}
    ${tipsCallout(it)}
    <div class="sheet-actions"><button class="btn primary" data-close>${t('close')}</button></div>
  `, (root) => {
    root.querySelector('[data-close]').onclick = closeSheet;
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

async function openFolderReport(i) {
  const s = (ap.data[ap.day] || [])[Number(i)];
  if (!s) return;
  if (s.code) {
    try { openReview(await decodeReport(s.code), { from: 'apercu' }); return; } catch { /* résumé plus bas */ }
  }
  openReview(summaryReport(s), { from: 'apercu', partial: true });
}

// Un résumé du tableau partagé, présenté comme un rapport (sans remarques ni photos).
function summaryReport(s) {
  const L = lang();
  const p = buildPlan({ shift: s.shift, date: s.date, start: s.start || SHIFTS[s.shift].start, end: s.end || SHIFTS[s.shift].end, lang: L });
  const st = new Map(s.items.map((i) => [i.id, i]));
  const line = (it, withTime = true) => {
    const x = st.get(it.id) || {};
    return { id: it.id, time: withTime ? `${f(it.start)}–${f(it.end)}` : '', title: it.title, minutes: it.minutes, status: x.status || 'unchecked', doneAt: clock(x.doneAt), reason: x.reason ? SKIP_REASONS[x.reason]?.[L] || '' : '', remark: '', photos: [] };
  };
  const items = p.items.filter((x) => x.kind === 'task').map((it) => line(it));
  return {
    lang: L, gymName: CONFIG.gymName, supervisor: s.supervisor || '', name: s.name, date: s.date, weekday: p.weekdayName, shiftName: p.shiftName,
    hours: `${f(p.start)} – ${f(p.end)}`, items, overflow: p.overflow.map((it) => line(it, false)), deficit: fmtDuration(p.deficit, L), outOfRange: [],
    flags: s.flags.map((fl) => ({ category: FLAG_CATEGORIES[fl.category]?.[L] || fl.category, location: fl.location, text: fl.text, at: clock(fl.at), photos: [] })),
    notes: '', completion: { done: items.filter((i) => i.status === 'done').length, total: items.length },
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
    const order = ['day', 'reports', 'tips'];
    const dir = order.indexOf(ds.tab) > order.indexOf(ap.tab) ? 1 : -1;
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
  } else if (ds.rp !== undefined) openFolderReport(ds.rp);
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

// ---------- Navigation ----------
document.addEventListener('click', (ev) => {
  const go = ev.target.closest('[data-go]');
  if (!go) return;
  if (go.dataset.go === 'apercu-keep') { openApercu({ keep: true }); return; }
  if (go.dataset.go === 'folder') {
    ap.day = go.dataset.date || todayISO();
    ap.week = mondayOf(ap.day);
    ap.tab = 'reports';
    ap.keepNext = true;
    location.hash = 'apercu';
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
  if (location.hash.startsWith('#r=')) return openReviewFromHash();
  if (location.hash === '#apercu') return openApercu();
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

// Animations en pause quand l'onglet est caché (batterie).
document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

paintStatic();
route();

// Hors ligne (si le service worker est disponible).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
