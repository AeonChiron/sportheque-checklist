import { CONFIG } from './config.js';
import { UI } from './i18n.js';
import { SHIFTS, AREAS, TV_CHANNELS, MANUAL_VERSION, PRIORITY_ORDER } from './manual.js';
import { buildPlan, detectShift, fmt, fmtDuration } from './planner.js';
import { buildReport, renderReportHtml, renderReportText, reportSubject, FLAG_CATEGORIES, SKIP_REASONS } from './report.js';
import { MAX_PHOTOS, putPhoto, getPhoto, deletePhoto, clearPhotos, shrink, blobToBase64 } from './photos.js';

const KEY = 'gym-shift-v2';
const PREFS = 'gym-shift-prefs';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

// ---------- Persistance (un rechargement de Safari ne perd rien) ----------
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch { /* mode privé */ }
}

// prefs : langue de l'interface, dernier nom, superviseurs connus → langue.
const prefs = { lang: CONFIG.defaultLang, name: '', supervisor: '', supervisors: {}, ...read(PREFS, {}) };
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

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  window.scrollTo(0, 0);
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2000);
}

// Textes fixes de la page, dans la langue choisie.
function paintStatic() {
  document.documentElement.lang = lang() === 'en' ? 'en-CA' : 'fr-CA';
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of document.querySelectorAll('[data-ph]')) el.placeholder = t(el.dataset.ph);
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang()));
  $('#brandLine').textContent = CONFIG.gymName ? `${CONFIG.gymName} · ${t('floor')}` : t('floor');
  $('#manualVersion').textContent = t('manual', MANUAL_VERSION);
}

function setLang(l) {
  prefs.lang = l;
  savePrefs();
  paintStatic();
  if (!$('#setup').hidden) updatePreview();
  if (state && plan) {
    plan = buildPlan({ ...state, lang: lang() });
    if (!$('#checklist').hidden) renderChecklist();
    if (!$('#finish').hidden) openFinish();
  }
}
for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));

// ---------- 1. Début de quart ----------
let manualShift = null;
let editing = false;

function setupScreen() {
  const defShift = new Date().getHours() < 16 ? 1 : 2;
  $('#fName').value = prefs.name;
  $('#fDate').value = todayISO();
  $('#fStart').value = SHIFTS[defShift].start;
  $('#fEnd').value = SHIFTS[defShift].end;
  $('#fSupervisor').value = prefs.supervisor;
  $('#supervisorList').innerHTML = Object.keys(prefs.supervisors).map((n) => `<option value="${esc(n)}">`).join('');
  setReportLang(prefs.supervisors[prefs.supervisor] || lang());
  manualShift = null;
  editing = false;
  paintStatic();
  updatePreview();
  show('setup');
}

let reportLang = 'fr';
function setReportLang(l) {
  reportLang = l === 'en' ? 'en' : 'fr';
  for (const b of document.querySelectorAll('[data-rlang]')) b.setAttribute('aria-checked', String(b.dataset.rlang === reportLang));
}
for (const b of document.querySelectorAll('[data-rlang]')) b.addEventListener('click', () => setReportLang(b.dataset.rlang));
$('#fSupervisor').addEventListener('input', (ev) => {
  const known = prefs.supervisors[ev.target.value.trim()];
  if (known) setReportLang(known);
});

function currentShift() {
  const s = $('#fStart').value;
  const e = $('#fEnd').value;
  return manualShift || (s && e ? detectShift(s, e) : 1);
}

// Aperçu : ce qui attend l'employé, sans parler de règles ni d'horaire « standard ».
function updatePreview() {
  const s = $('#fStart').value;
  const e = $('#fEnd').value;
  const date = $('#fDate').value;
  if (!s || !e || !date) { $('#preview').innerHTML = ''; return; }
  const shift = currentShift();
  const p = buildPlan({ shift, date, start: s, end: e, lang: lang() });
  const d = p.day;
  const facts = [
    `<span class="fact"><b>${esc(p.weekdayName)}</b></span>`,
    `<span class="fact mono">${esc(fmtDuration(p.totals.presence, lang()))}</span>`,
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
  if (ev.target.id !== 'fSupervisor') updatePreview();
});

$('#setupForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const name = $('#fName').value.trim();
  if (!name) { $('#fName').focus(); return; }
  if (!$('#fStart').value || !$('#fEnd').value || !$('#fDate').value) return;
  const supervisor = $('#fSupervisor').value.trim();
  prefs.name = name;
  prefs.supervisor = supervisor;
  if (supervisor) prefs.supervisors[supervisor] = reportLang;
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

function nowMinutes() {
  if (state.date !== todayISO()) return null;
  const d = new Date();
  let m = d.getHours() * 60 + d.getMinutes();
  if (m < plan.start && plan.end > 1440) m += 1440;
  return m;
}

function taskRow(it, { extra = false } = {}) {
  const e = state.tasks[it.id] || {};
  const now = nowMinutes();
  const isNow = !extra && now !== null && it.start <= now && now < it.end;
  const cls = ['task', e.done && 'done', e.skipped && !e.done && 'skipped', isNow && 'current'].filter(Boolean).join(' ');
  const tags = [];
  if (isNow) tags.push(`<span class="tag now">${t('now')}</span>`);
  for (const r of it.reminders || []) tags.push(`<span class="tag time">${f(r.at)} · ${esc(r.label)}</span>`);
  if (e.skipped && !e.done) tags.push(`<span class="tag bad">${t('notDone')}${e.reason ? ` · ${esc(SKIP_REASONS[e.reason]?.[lang()] || e.reason)}` : ''}</span>`);
  if (e.remark) tags.push(`<span class="tag note">${t('remark')}</span>`);
  if (e.photos?.length) tags.push(`<span class="tag note">${t('photos')} · ${e.photos.length}</span>`);
  const time = extra ? `<span class="t-time mono">+<small>${it.minutes} min</small></span>` : `<span class="t-time mono">${f(it.start)}<small>${it.minutes} min</small></span>`;
  return `<li class="${cls}" data-id="${esc(it.id)}">
    <button class="task-main" data-act="open">
      ${time}
      <span class="t-body">
        <span class="t-title">${esc(it.title)}</span>
        ${it.summary ? `<span class="t-sum">${esc(it.summary)}</span>` : ''}
        ${tags.length ? `<span class="tags">${tags.join('')}</span>` : ''}
      </span>
    </button>
    <button class="check" data-act="toggle" aria-label="${esc(it.title)}"><i>${e.skipped && !e.done ? '✕' : '✓'}</i></button>
  </li>`;
}

function breakRow(it) {
  if (it.kind === 'slack') {
    return `<li class="break slack"><span class="ico">${f(it.start)}</span><span><b>${esc(it.title)}</b><br><small>${esc(it.summary)}</small></span><span class="t mono">${it.minutes} min</span></li>`;
  }
  const sub = it.kind === 'meal' ? t('unpaidMeal') : t('paidBreak');
  const rem = (it.reminders || []).map((r) => `<br><small>${f(r.at)} · ${esc(r.label)}</small>`).join('');
  return `<li class="break"><span class="ico">${f(it.start)}</span><span><b>${esc(it.title)}</b> <small>· ${sub}</small>${rem}</span><span class="t mono">${it.minutes} min</span></li>`;
}

function renderTimeline() {
  const now = nowMinutes();
  const segs = plan.items.map((it) => {
    const e = state.tasks[it.id] || {};
    const cls = it.kind !== 'task' ? 'rest' : e.done ? 'done' : e.skipped ? 'skipped' : '';
    const cur = now !== null && it.start <= now && now < it.end ? ' current' : '';
    return `<span class="seg ${cls}${cur}" style="--w:${it.minutes}"></span>`;
  });
  const needle = now !== null && now >= plan.start && now <= plan.end
    ? `<span class="needle" style="--x:${(100 * (now - plan.start)) / (plan.end - plan.start)}%"></span>` : '';
  $('#timeline').innerHTML = segs.join('') + needle;
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
  const next = nextIt ? `<div class="next">${t('next')} · <span class="mono">${f(nextIt.start)}</span> <b>${esc(nextIt.title)}</b></div>` : '';
  const remain = `<span class="remain mono">${t('left', cur.end - now)}</span>`;
  if (cur.kind !== 'task') {
    box.innerHTML = `<div class="now-card"><div class="now-head"><span class="live">${t('now')}</span>${remain}</div>
      <h3>${esc(cur.kind === 'slack' ? cur.title : t('breakNow'))}</h3>${next}</div>`;
    return;
  }
  const e = state.tasks[cur.id] || {};
  box.innerHTML = `<div class="now-card"><div class="now-head"><span class="live">${t('now')}</span>${remain}</div>
    <h3>${esc(cur.title)}</h3>${cur.summary ? `<p class="sum">${esc(cur.summary)}</p>` : ''}
    <div class="acts" data-id="${esc(cur.id)}">
      <button class="btn ${e.done ? 'ghost' : 'primary'} small" data-act="toggle">${e.done ? '✓ ' : ''}${t('markDone')}</button>
      <button class="btn ghost small" data-act="open">${t('details')}</button>
    </div>${next}</div>`;
}

function renderChecklist() {
  const tasks = planTasks();
  const done = tasks.filter((x) => state.tasks[x.id]?.done).length;
  const d = plan.day;
  const [, mm, dd] = state.date.split('-');

  $('#cEyebrow').textContent = [CONFIG.gymName, SHIFTS[plan.shift][lang()].short, `${plan.weekdayName.slice(0, 3)}. ${dd}/${mm}`].filter(Boolean).join(' · ');
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
  for (const r of plan.items.flatMap((it) => it.reminders || [])) chips.push(`<span class="chip"><b class="mono">${f(r.at)}</b> ${esc(r.label)}</span>`);
  $('#dayStrip').innerHTML = chips.join('');

  for (const b of document.querySelectorAll('.view-toggle [data-view]')) b.setAttribute('aria-selected', String(b.dataset.view === state.view));

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
    ? `<div class="section-head"><h3>${t('flags')}</h3><span>${state.flags.length}</span></div>
       ${state.flags.map((fl, i) => `<div class="flag-item"><span aria-hidden="true">⚑</span><div><b>${esc(FLAG_CATEGORIES[fl.category]?.[lang()] || fl.category)}</b>${fl.location ? ` · ${esc(fl.location)}` : ''}<br>${esc(fl.text)}<br><small class="mono">${new Date(fl.at).toLocaleTimeString(lang() === 'en' ? 'en-CA' : 'fr-CA', { hour: '2-digit', minute: '2-digit' })}${fl.photos?.length ? ` · ${t('photos')} ${fl.photos.length}` : ''}</small></div><button data-del-flag="${i}">${t('remove')}</button></div>`).join('')}`
    : '';
}

function toggleDone(id) {
  const e = entry(id);
  e.done = !e.done;
  if (e.done) { e.skipped = false; e.doneAt = new Date().toISOString(); toast(t('checked')); } else delete e.doneAt;
  save();
  renderChecklist();
}

for (const sel of ['#taskList', '#overflowBlock', '#nowCard']) {
  $(sel).addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('[data-id]').dataset.id;
    if (btn.dataset.act === 'toggle') toggleDone(id);
    else openTask(id);
  });
}

// Retirer un signalement : deux touchers (le site ne peut pas compter sur confirm()).
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

// « En cours » et la ligne du temps avancent toutes les 30 secondes.
setInterval(() => { if (!$('#checklist').hidden && plan) { renderTimeline(); renderNow(); } }, 30_000);

// ---------- Feuille du bas ----------
function openSheet(html, onMount) {
  $('#sheetBody').innerHTML = html;
  $('#sheetBody').scrollTop = 0;
  $('#backdrop').hidden = false;
  $('#sheet').hidden = false;
  requestAnimationFrame(() => { $('#backdrop').classList.add('open'); $('#sheet').classList.add('open'); });
  onMount?.($('#sheetBody'));
}
function closeSheet() {
  $('#backdrop').classList.remove('open');
  $('#sheet').classList.remove('open');
  setTimeout(() => { $('#backdrop').hidden = true; $('#sheet').hidden = true; }, 280);
}
$('#backdrop').addEventListener('click', closeSheet);

// Glisser vers le bas pour fermer.
(() => {
  let y0 = null;
  const sheet = $('#sheet');
  sheet.addEventListener('touchstart', (e) => { if ($('#sheetBody').scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener('touchend', (e) => {
    if (y0 === null) return;
    const dy = e.changedTouches[0].clientY - y0;
    sheet.style.transform = '';
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
        toast(t('photoBad'));
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

// ---------- Détail d'une tâche ----------
function openTask(id) {
  const it = findTask(id);
  const e = entry(id);
  const extra = plan.overflow.includes(it);
  const pills = [
    extra ? '' : `<span class="pill mono">${f(it.start)} – ${f(it.end)}</span>`,
    `<span class="pill mono">${it.minutes} min</span>`,
    it.zone ? `<span class="pill">Zone ${it.zone}</span>` : '',
  ].join('');
  const photo = CONFIG.guidePhotos && it.photo ? `<div class="photo"><img src="photos/${esc(it.photo)}.jpg" alt="" onerror="this.parentNode.remove()"></div>` : '';
  const tv = it.tvTable
    ? `<div><p class="block-label">${t('channels')}</p><table class="tv">${TV_CHANNELS.map((c) => `<tr><td>${esc(c[lang()])}</td><td>${esc(c.ch)}</td></tr>`).join('')}</table></div>`
    : '';
  const clock = (it.reminders || []).length
    ? `<div class="callout clock"><div class="c-head"><span class="c-ico">⏱</span>${t('atTime')}</div>${it.reminders.map((r) => `<p><b class="mono">${f(r.at)}</b> · ${esc(r.label)}</p>`).join('')}</div>`
    : '';
  const tips = (it.tips || []).length
    ? `<div class="callout tip"><div class="c-head"><span class="c-ico">i</span>${t('goodToKnow')}</div>${it.tips.map((x) => `<p>${md(x)}</p>`).join('')}</div>`
    : '';

  openSheet(`
    <div class="sheet-head">
      <p class="eyebrow">${esc(AREAS[it.area]?.[lang()] || '')}</p>
      <h3>${esc(it.title)}</h3>
      <div class="meta-row">${pills}</div>
    </div>
    ${photo}
    <div><p class="block-label">${t('steps')}</p><ol class="steps">${it.steps.map((s) => `<li>${md(s)}</li>`).join('')}</ol></div>
    ${tv}
    ${clock}
    ${tips}
    <div class="status-row">
      <button class="btn ${e.done ? 'on-done' : 'ghost'}" data-status="done">✓ ${t('done')}</button>
      <button class="btn ${e.skipped && !e.done ? 'on-skip' : 'ghost'}" data-status="skip">✕ ${t('notDone')}</button>
    </div>
    ${e.skipped && !e.done ? `<div><p class="block-label">${t('why')}</p><div class="reasons">${Object.entries(SKIP_REASONS).map(([k, v]) => `<button type="button" data-reason="${k}" aria-pressed="${e.reason === k}">${esc(v[lang()])}</button>`).join('')}</div></div>` : ''}
    <label class="field"><span>${t('remark')}</span>
      <textarea id="remark" rows="2" placeholder="${esc(t(e.skipped ? 'remarkSkipPh' : 'remarkPh'))}">${esc(e.remark || '')}</textarea>
    </label>
    ${photoFieldHtml()}
    <div class="sheet-actions"><button class="btn primary" data-close>${t('close')}</button></div>
  `, (root) => {
    root.querySelector('[data-close]').onclick = closeSheet;
    root.querySelector('#remark').addEventListener('input', (ev) => { e.remark = ev.target.value; save(); renderChecklist(); });
    e.photos ||= [];
    mountPhotos(root, e.photos, () => { save(); renderChecklist(); });
    root.querySelector('[data-status="done"]').onclick = () => {
      e.done = !e.done;
      if (e.done) { e.skipped = false; e.doneAt = new Date().toISOString(); toast(t('checked')); } else delete e.doneAt;
      save(); renderChecklist(); closeSheet();
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
      <p class="eyebrow" style="color:var(--bad)">⚑ ${t('flag')}</p>
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
    <div class="callout tip"><div class="c-head"><span class="c-ico">i</span>${t('priorities')}</div>${PRIORITY_ORDER[lang()].map((p, i) => `<p><b class="mono">${i + 1}.</b> ${esc(p)}</p>`).join('')}</div>
    <div class="menu-list">
      <button class="btn ghost" id="mEdit">${t('editHours')}</button>
      <button class="btn ghost danger" id="mReset">${t('abandon')}</button>
      <button class="btn primary" data-close>${t('close')}</button>
    </div>
  `, (root) => {
    root.querySelector('[data-close]').onclick = closeSheet;
    for (const b of root.querySelectorAll('[data-mlang]')) {
      b.onclick = () => {
        setLang(b.dataset.mlang);
        for (const o of root.querySelectorAll('[data-mlang]')) o.setAttribute('aria-checked', String(o === b));
        closeSheet();
      };
    }
    root.querySelector('#mEdit').onclick = () => {
      closeSheet();
      setupScreen();
      $('#fName').value = state.name;
      $('#fDate').value = state.date;
      $('#fStart').value = state.start;
      $('#fEnd').value = state.end;
      $('#fSupervisor').value = state.supervisor || '';
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
      <div class="stat ok"><b>${done}</b><span>${t('statDone')}</span></div>
      <div class="stat bad"><b>${skipped}</b><span>${t('statNot')}</span></div>
      <div class="stat warn"><b>${state.flags.length}</b><span>${t('statFlags')}</span></div>
    </div>
    ${nPhotos ? `<p class="photo-count">${t('photosAttached', nPhotos)}</p>` : ''}
    ${open.length ? `<div class="panel">
      <div class="section-head" style="margin-top:0"><h3>${t('pending')}</h3><span class="mono">${open.length}</span></div>
      ${open.map((x) => `<div class="pending" data-id="${esc(x.id)}"><div class="t">${esc(x.title)}<small>${f(x.start)} – ${f(x.end)}</small></div>
        <button class="btn small ghost" data-act="done">✓ ${t('done')}</button><button class="btn small flag" data-act="skip">${t('notDone')}</button></div>`).join('')}
    </div>` : `<div class="notice ok"><b>${t('allChecked')}</b></div>`}`;
  $('#fNotes').value = state.notes || '';
  $('#sendError').innerHTML = '';
  $('#sendBtn').textContent = t('sendTo', state.supervisor);
  $('#sendBtn').disabled = false;
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

  const finishSent = (html) => {
    const { supervisor, name } = state;
    state = null;
    save();
    clearPhotos();
    $('#sentText').textContent = html ? t('demoText', supervisor) : t('sentText', supervisor, name);
    $('#emailPreview').hidden = !html;
    if (html) $('#emailPreview').innerHTML = html;
    paintStatic();
    show('sent');
  };

  if (CONFIG.demo) {
    finishSent(renderReportHtml(report, { photoSrc: Object.fromEntries(blobs.map(([n, b]) => [n, URL.createObjectURL(b)])) }));
    return;
  }
  try {
    const r = await fetch(CONFIG.reportEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...report,
        attachments: await Promise.all(blobs.map(async ([filename, b]) => ({ filename, content: await blobToBase64(b) }))),
      }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
    finishSent(null);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = t('retry');
    showFallback(report, err.message, blobs.length > 0);
  }
}

function showFallback(report, msg, hasPhotos) {
  const subject = reportSubject(report);
  const body = renderReportText(report);
  const mailto = `mailto:${encodeURIComponent(CONFIG.fallbackEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $('#sendError').innerHTML = `
    <div class="notice bad"><b>${t('sendFail')}</b>${esc(msg)}. ${t('sendFailMore')}${hasPhotos ? t('photosByHand') : ''}</div>
    <div class="menu-list">
      <a class="btn ghost" href="${esc(mailto)}" style="text-decoration:none;text-align:center">${t('viaMail')}</a>
      <button class="btn ghost" id="copyReport">${t('copy')}</button>
    </div>`;
  $('#copyReport').onclick = async () => {
    try { await navigator.clipboard.writeText(`${subject}\n\n${body}`); toast(t('copied')); } catch { toast(t('copyFail')); }
  };
}

$('#newShiftBtn').addEventListener('click', () => { $('#emailPreview').hidden = true; setupScreen(); });

// ---------- Démarrage ----------
paintStatic();
if (state?.name && state?.date) openChecklist();
else setupScreen();

// Hors ligne (si le service worker est disponible).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
