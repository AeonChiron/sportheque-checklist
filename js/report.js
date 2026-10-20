// Rapport de fin de quart : construit côté navigateur, rendu en HTML/texte
// côté serveur (et pour l'aperçu). Aucune dépendance au DOM.
// La langue du rapport est celle choisie pour le superviseur; les remarques
// écrites par l'employé restent telles quelles, jamais traduites.

import { fmt, fmtDuration } from './planner.js';
import { CONFIG } from './config.js';

export const FLAG_CATEGORIES = {
  equipement: { fr: 'Équipement brisé', en: 'Broken equipment' },
  fournitures: { fr: 'Fournitures manquantes', en: 'Missing supplies' },
  securite: { fr: 'Danger / sécurité', en: 'Hazard / safety' },
  autre: { fr: 'Autre', en: 'Other' },
};

export const SKIP_REASONS = {
  temps: { fr: 'Manque de temps', en: 'Not enough time' },
  occupe: { fr: 'Appareil occupé', en: 'Machine in use' },
  materiel: { fr: 'Matériel manquant', en: 'Missing supplies' },
  inaccessible: { fr: 'Zone inaccessible', en: 'Area not accessible' },
  autre: { fr: 'Autre', en: 'Other' },
};

const R = {
  fr: {
    report: 'Rapport de quart',
    to: 'Pour',
    by: 'Par',
    custom: 'horaire ajusté',
    zone: 'Profondeur : zone',
    surfaces: { miroirs: 'Journée miroirs', tuiles: 'Journée tuiles blanches', inspection: 'Vérification tuiles/miroirs' },
    walls: 'Murs prévus',
    done: 'tâches faites',
    status: { done: 'Fait', notdone: 'Pas fait', unchecked: 'Non coché' },
    flags: 'Problèmes signalés',
    checklist: 'Tâches',
    checkedAt: 'coché à',
    notDone: 'Pas fait',
    remark: 'Remarque',
    photos: 'Photos jointes',
    overflow: 'Pas prévu dans ce quart',
    overflowNote: (d) => `Horaire plus court que l’horaire standard : ces blocs (${d}) n’entraient pas. À réassigner au besoin.`,
    fixed: 'Heures fixes hors de ce quart',
    warn: { 'meal-5h': 'Le repas ne permet pas de respecter 5 h consécutives maximum : à vérifier.', 'no-meal': 'Plus de 5 h de présence sans repas prévu : à vérifier.', arithmetic: 'Erreur de calcul de l’horaire.' },
    notes: 'Notes du quart',
    sent: 'Envoyé le',
    footer: 'Carnet de quart, entretien',
    subject: (r) => `${r.shiftName} ${r.date} — ${r.name} — ${r.completion.done}/${r.completion.total}`,
    subjectFlags: (n) => ` · ⚑ ${n} problème${n > 1 ? 's' : ''}`,
  },
  en: {
    report: 'Shift report',
    to: 'To',
    by: 'By',
    custom: 'adjusted hours',
    zone: 'Deep clean: zone',
    surfaces: { miroirs: 'Mirror day', tuiles: 'White tiles day', inspection: 'Tiles/mirrors check' },
    walls: 'Walls scheduled',
    done: 'tasks done',
    status: { done: 'Done', notdone: 'Not done', unchecked: 'Not checked' },
    flags: 'Flagged issues',
    checklist: 'Tasks',
    checkedAt: 'checked at',
    notDone: 'Not done',
    remark: 'Note',
    photos: 'Attached photos',
    overflow: 'Not scheduled this shift',
    overflowNote: (d) => `Shorter than the standard shift: these blocks (${d}) didn’t fit. Reassign if needed.`,
    fixed: 'Fixed times outside this shift',
    warn: { 'meal-5h': 'The meal break can’t keep work under 5 consecutive hours: please check.', 'no-meal': 'Over 5 hours on site with no meal break: please check.', arithmetic: 'Schedule calculation error.' },
    notes: 'Shift notes',
    sent: 'Sent',
    footer: 'Shift log, cleaning',
    subject: (r) => `${r.shiftName} ${r.date} — ${r.name} — ${r.completion.done}/${r.completion.total}`,
    subjectFlags: (n) => ` · ⚑ ${n} issue${n > 1 ? 's' : ''}`,
  },
};

const TZ = 'America/Toronto'; // heure du Québec, même si le serveur est en UTC
const locale = (lang) => (lang === 'en' ? 'en-CA' : 'fr-CA');
const clockOf = (iso, lang) => (iso ? new Date(iso).toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '');
const photoList = (ids = [], names) => ids.map((id) => names.get(id)).filter(Boolean);

function line(it, e = {}, names, lang, withTime = true) {
  return {
    id: it.id,
    time: withTime ? `${fmt(it.start, lang)}–${fmt(it.end, lang)}` : '',
    title: it.title,
    minutes: it.minutes,
    status: e.done ? 'done' : e.skipped ? 'notdone' : 'unchecked',
    doneAt: clockOf(e.doneAt, lang),
    reason: e.skipped && e.reason ? SKIP_REASONS[e.reason]?.[lang] || e.reason : '',
    remark: e.remark || '',
    photos: photoList(e.photos, names),
  };
}

// plan : construit dans la langue du rapport.
// photoNames : identifiant de photo → nom du fichier joint (photo-1.jpg…).
export function buildReport(plan, state, photoNames = new Map()) {
  const lang = plan.lang;
  const items = plan.items.filter((it) => it.kind === 'task').map((it) => line(it, state.tasks[it.id], photoNames, lang));
  const overflow = plan.overflow.map((it) => line(it, state.tasks[it.id], photoNames, lang, false));
  return {
    lang,
    gymName: CONFIG.gymName,
    supervisor: state.supervisor || '',
    name: state.name,
    date: plan.date,
    shift: plan.shift,
    start: state.start || '',
    end: state.end || '',
    weekday: plan.weekdayName,
    shiftName: plan.shiftName,
    hours: `${fmt(plan.start, lang)} – ${fmt(plan.end, lang)}`,
    exact: plan.exact,
    zone: plan.day.zones[plan.shift],
    surfaces: plan.shift === 2 ? R[lang].surfaces[plan.day.surfaces] : '',
    walls: plan.shift === 2 && plan.day.walls,
    items,
    overflow,
    deficit: fmtDuration(plan.deficit, lang),
    outOfRange: plan.outOfRange.map((f) => f.label),
    warnings: plan.warnings,
    flags: state.flags.map((f) => ({
      category: FLAG_CATEGORIES[f.category]?.[lang] || f.category,
      location: f.location,
      text: f.text,
      at: clockOf(f.at, lang),
      photos: photoList(f.photos, photoNames),
    })),
    notes: state.notes || '',
    completion: { done: items.filter((i) => i.status === 'done').length, total: items.length },
    submittedAt: new Date().toISOString(),
  };
}

const L = (r) => R[r.lang === 'en' ? 'en' : 'fr'];
const MARK = { done: '✔', notdone: '✘', unchecked: '○' };
const COLOR = { done: '#1f7a4d', notdone: '#b42318', unchecked: '#8a6100' };

export function reportSubject(r) {
  const t = L(r);
  return `${r.gymName ? `${r.gymName} · ` : ''}${t.subject(r)}${r.flags.length ? t.subjectFlags(r.flags.length) : ''}`;
}

export function renderReportText(r) {
  const t = L(r);
  const out = [];
  out.push(`${r.gymName ? `${r.gymName.toUpperCase()} — ` : ''}${t.report.toUpperCase()} — ${r.shiftName}`);
  if (r.supervisor) out.push(`${t.to} : ${r.supervisor}`);
  out.push(`${t.by} : ${r.name} · ${r.weekday} ${r.date} · ${r.hours}${r.exact ? '' : ` (${t.custom})`}`);
  out.push(`${t.zone} ${r.zone}${r.surfaces ? ` · ${r.surfaces}` : ''}${r.walls ? ` · ${t.walls}` : ''}`);
  out.push(`${r.completion.done}/${r.completion.total} ${t.done}`);
  for (const w of r.warnings || []) out.push(`! ${t.warn[w] || w}`);
  out.push('');
  if (r.flags.length) {
    out.push(`⚑ ${t.flags.toUpperCase()}`);
    for (const f of r.flags) {
      out.push(`- [${f.category}] ${f.location ? `${f.location} : ` : ''}${f.text} (${f.at})`);
      if (f.photos?.length) out.push(`    ${t.photos} : ${f.photos.join(', ')}`);
    }
    out.push('');
  }
  const detail = (i) => {
    if (i.reason) out.push(`    ${t.notDone} : ${i.reason}`);
    if (i.remark) out.push(`    ${t.remark} : ${i.remark}`);
    if (i.photos?.length) out.push(`    ${t.photos} : ${i.photos.join(', ')}`);
  };
  out.push(t.checklist.toUpperCase());
  for (const i of r.items) {
    out.push(`${MARK[i.status]} ${i.time}  ${i.title}`);
    detail(i);
  }
  if (r.overflow.length) {
    out.push('', `${t.overflow.toUpperCase()} — ${t.overflowNote(r.deficit)}`);
    for (const o of r.overflow) { out.push(`${MARK[o.status]} ${o.title} (${o.minutes} min)`); detail(o); }
  }
  if (r.outOfRange.length) out.push(`${t.fixed} : ${r.outOfRange.join(', ')}`);
  if (r.notes) out.push('', t.notes.toUpperCase(), r.notes);
  return out.join('\n');
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// photoSrc (aperçu de la démo seulement) : nom de fichier → URL affichable.
export function renderReportHtml(r, { photoSrc = {} } = {}) {
  const t = L(r);
  const pics = (names = []) => (names.length
    ? `<div style="margin-top:6px">${names.map((n) => (photoSrc[n]
      ? `<img src="${esc(photoSrc[n])}" alt="${esc(n)}" style="width:96px;height:72px;object-fit:cover;border-radius:6px;margin:0 6px 6px 0">`
      : `<span style="display:inline-block;font-size:12px;color:#475467;background:#f2f4f7;border-radius:6px;padding:2px 8px;margin:0 6px 4px 0">${esc(n)}</span>`)).join('')}</div>`
    : '');
  const row = (i) => {
    const extra = [
      i.reason && `<div style="color:#b42318;font-size:13px;margin-top:2px">${esc(t.notDone)} : ${esc(i.reason)}</div>`,
      i.remark && `<div style="color:#475467;font-size:13px;margin-top:2px">${esc(t.remark)} : « ${esc(i.remark)} »</div>`,
      pics(i.photos),
    ].filter(Boolean).join('');
    return `<tr>
      <td style="padding:9px 6px;border-bottom:1px solid #eaecf0;color:${COLOR[i.status]};font-size:16px;width:22px;vertical-align:top" title="${esc(t.status[i.status])}">${MARK[i.status]}</td>
      <td style="padding:9px 6px;border-bottom:1px solid #eaecf0;color:#667085;font-size:13px;white-space:nowrap;vertical-align:top;font-family:ui-monospace,Menlo,monospace">${esc(i.time || `${i.minutes} min`)}</td>
      <td style="padding:9px 6px;border-bottom:1px solid #eaecf0;font-size:14px;vertical-align:top">
        <span style="${i.status === 'done' ? 'color:#667085' : 'color:#101828;font-weight:600'}">${esc(i.title)}</span>
        ${extra}
      </td></tr>`;
  };
  const section = (title, body, color = '#101828') =>
    `<h3 style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${color};margin:26px 0 8px">${title}</h3>${body}`;

  const pct = r.completion.total ? Math.round((100 * r.completion.done) / r.completion.total) : 0;
  let html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;color:#101828">
  <div style="background:#2d3131;color:#fff;border-radius:14px;padding:20px 22px">
    <div style="font-size:11px;opacity:.75;letter-spacing:.1em;text-transform:uppercase">${r.gymName ? `${esc(r.gymName)} · ` : ''}${esc(t.report)} · ${esc(r.shiftName)}</div>
    ${r.supervisor ? `<div style="font-size:13px;opacity:.85;margin-top:8px">${esc(t.to)} ${esc(r.supervisor)}</div>` : ''}
    <div style="font-size:22px;font-weight:600;margin-top:2px">${esc(r.name)}</div>
    <div style="font-size:14px;opacity:.9;margin-top:2px">${esc(r.weekday)} ${esc(r.date)} · ${esc(r.hours)}${r.exact ? '' : ` · ${esc(t.custom)}`}</div>
    <div style="font-size:13px;margin-top:10px;opacity:.9">${esc(t.zone)} ${esc(r.zone)}${r.surfaces ? ` · ${esc(r.surfaces)}` : ''}${r.walls ? ` · ${esc(t.walls)}` : ''}</div>
    <div style="font-size:30px;font-weight:700;margin-top:10px;font-variant-numeric:tabular-nums">${r.completion.done}/${r.completion.total} <span style="font-size:14px;font-weight:400;opacity:.85">${esc(t.done)} (${pct} %)</span></div>
  </div>`;

  for (const w of r.warnings || []) {
    html += `<p style="font-size:13px;color:#8a6100;background:#fbf3dc;border-radius:8px;padding:8px 12px;margin:12px 0 0">${esc(t.warn[w] || w)}</p>`;
  }

  if (r.flags.length) {
    html += section(`⚑ ${esc(t.flags)}`, r.flags.map((f) =>
      `<div style="border:1px solid #fecdca;background:#fef3f2;padding:10px 12px;border-radius:8px;margin-bottom:8px;font-size:14px">
        <b>${esc(f.category)}</b>${f.location ? ` — ${esc(f.location)}` : ''} <span style="color:#98a2b3;font-size:12px">${esc(f.at)}</span>
        <div style="margin-top:4px">« ${esc(f.text)} »</div>${pics(f.photos)}</div>`).join(''), '#b42318');
  }

  html += section(esc(t.checklist), `<table style="width:100%;border-collapse:collapse">${r.items.map(row).join('')}</table>`);

  if (r.overflow.length) {
    html += section(esc(t.overflow),
      `<p style="font-size:13px;color:#667085;margin:0 0 6px">${esc(t.overflowNote(r.deficit))}</p>
      <table style="width:100%;border-collapse:collapse">${r.overflow.map(row).join('')}</table>`, '#8a6100');
  }
  if (r.outOfRange.length) {
    html += `<p style="font-size:13px;color:#8a6100">${esc(t.fixed)} : ${esc(r.outOfRange.join(', '))}.</p>`;
  }
  if (r.notes) {
    html += section(esc(t.notes), `<div style="white-space:pre-wrap;font-size:14px;background:#f9fafb;border-radius:8px;padding:12px">${esc(r.notes)}</div>`);
  }
  const when = new Date(r.submittedAt).toLocaleString(locale(r.lang), { dateStyle: 'long', timeZone: TZ });
  html += `<p style="font-size:12px;color:#98a2b3;margin-top:24px">${esc(t.sent)} ${esc(when)} · ${r.gymName ? `${esc(r.gymName)} · ` : ''}${esc(t.footer)}</p></div>`;
  return html;
}

// ---------- Lien du rapport ----------
// Le rapport voyage dans le lien lui-même (après le #) : pas de base de
// données, et le contenu n'est jamais envoyé au serveur qui héberge le site.

const toB64url = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (str) => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

export async function encodeReport(report) {
  const json = new TextEncoder().encode(JSON.stringify(report));
  return toB64url(await pipe(json, new CompressionStream('deflate-raw')));
}

export async function decodeReport(code) {
  const json = await pipe(fromB64url(code), new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(json));
}

// Résumé court pour le courriel (le détail est dans le lien).
export function reportGlance(r) {
  const t = L(r);
  const notDone = r.items.filter((i) => i.status === 'notdone').length;
  const unchecked = r.items.filter((i) => i.status === 'unchecked').length;
  const lines = [
    `${r.name} · ${r.shiftName} · ${r.weekday} ${r.date} · ${r.hours}`,
    `${r.completion.done}/${r.completion.total} ${t.done}`,
  ];
  if (notDone) lines.push(`${notDone} × ${t.status.notdone}`);
  if (unchecked) lines.push(`${unchecked} × ${t.status.unchecked}`);
  if (r.flags.length) lines.push(`⚑ ${r.flags.length} · ${r.flags.map((f) => f.category).join(', ')}`);
  return lines.join('\n');
}

// Libellés de la vue superviseur.
export const REVIEW = {
  fr: {
    title: 'Rapport de quart',
    allGood: 'Tout a été fait',
    toSee: (n) => `${n} point${n > 1 ? 's' : ''} à voir`,
    attention: 'À voir',
    full: 'Toutes les tâches',
    photos: (n) => `${n} photo${n > 1 ? 's' : ''} en pièce jointe du courriel.`,
    open: 'Voir le rapport',
    bad: 'Ce lien de rapport est incomplet ou abîmé. Ouvre-le directement depuis le courriel.',
    newShift: 'Commencer un quart',
  },
  en: {
    title: 'Shift report',
    allGood: 'Everything was done',
    toSee: (n) => `${n} item${n > 1 ? 's' : ''} to review`,
    attention: 'To review',
    full: 'All tasks',
    photos: (n) => `${n} photo${n > 1 ? 's' : ''} attached to the email.`,
    open: 'View the report',
    bad: 'This report link is incomplete or damaged. Open it straight from the email.',
    newShift: 'Start a shift',
  },
};
export const reportLabels = (r) => L(r);
