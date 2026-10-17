// Moteur de planification des quarts (section 6 du manuel).
// Fonctions pures : aucune dépendance au navigateur, testable avec Node.
// lang : 'fr' | 'en' — seule la langue des textes change, jamais le plan.

import { SHIFTS, ZONES, WEEKDAYS, WEEKLY_Q1, WEEKLY_Q2, WALL_TECHNIQUE } from './manual.js';
import { CONFIG } from './config.js';

const DAY = 1440;
const mod = (n, m) => ((n % m) + m) % m;

export function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// fr : 450 → « 7 h 30 », 1140 → « 19 h ».  en : 450 → « 7:30 », 1140 → « 19:00 ».
export function fmt(min, lang = 'fr') {
  const t = mod(min, DAY);
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (lang === 'en') return `${h}:${String(m).padStart(2, '0')}`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

export function fmtDuration(min, lang = 'fr') {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (lang === 'en') return m ? `${h} h ${m} min` : `${h} h`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

function daysBetween(fromISO, toISO) {
  const a = Date.UTC(...fromISO.split('-').map((v, i) => (i === 1 ? v - 1 : +v)));
  const b = Date.UTC(...toISO.split('-').map((v, i) => (i === 1 ? v - 1 : +v)));
  return Math.round((b - a) / 86400000);
}

// Rotations du jour : zone A/B/C de chaque quart, semaine I/II,
// journée tuiles/miroirs et cycle des murs.
export function dayInfo(dateISO, anchorMonday = CONFIG.cycleAnchorMonday) {
  const d = daysBetween(anchorMonday, dateISO);
  const weekday = mod(d, 7); // 0 = lundi (le repère est un lundi)
  const week3 = mod(Math.floor(d / 7), 3) + 1; // Semaine 1, 2 ou 3 (A-B-C)
  const weekI = mod(Math.floor(d / 7), 2) === 0; // Semaine I ou II

  // Rotation continue : Q1 puis Q2, deux séances par jour.
  const seq = 'ABC';
  const zones = { 1: seq[mod(2 * d, 3)], 2: seq[mod(2 * d + 1, 3)], third: seq[mod(2 * d + 2, 3)] };

  let surfaces = 'inspection';
  if (weekday < 6) surfaces = (weekday % 2 === 0) === weekI ? 'miroirs' : 'tuiles';

  const walls = weekI ? weekday % 2 === 0 : weekday % 2 === 1;

  return { weekday, week3, week2: weekI ? 'I' : 'II', zones, surfaces, walls };
}

// Quart le plus proche de la plage saisie (chevauchement, puis début).
export function detectShift(start, end) {
  const s = toMin(start);
  let e = toMin(end);
  if (e <= s) e += DAY;
  let best = 1;
  let bestScore = -Infinity;
  for (const sh of Object.values(SHIFTS)) {
    const rs = toMin(sh.start);
    const re = toMin(sh.end);
    const overlap = Math.max(0, Math.min(e, re) - Math.max(s, rs));
    const score = overlap * 10000 - Math.abs(s - rs);
    if (score > bestScore) { bestScore = score; best = sh.id; }
  }
  return best;
}

// Textes composés par le planificateur.
const P = {
  fr: {
    deepTitle: (z) => `Nettoyage en profondeur — Zone ${z}`,
    deepSteps: (z) => [
      'Commence avec une **guenille propre**.',
      `Zone ${z} : ${ZONES[z].fr.focus}`,
      'Nettoie à fond : structures, cadres, côtés, bases, supports, dessous accessibles et recoins.',
      'N’oublie pas **tous les repose-pieds et plateformes**.',
      'Une machine est occupée? Reviens-y quand elle se libère.',
    ],
    deepEnd: 'Termine avec une **nouvelle guenille propre**.',
    deepMirrors: (z) => `Aujourd’hui c’est jour de miroirs : fais aussi les **miroirs de la zone ${z}**.`,
    deepMirrorsSummary: (name) => `${name} + miroirs.`,
    sunday: 'Dimanche : tu peux choisir la zone selon les besoins. La rotation, elle, ne change pas.',
    tilesTitle: (p) => (p === 1 ? 'Tuiles blanches — passage 1' : 'Tuiles blanches — passage 2 (moppe)'),
    tilesSummary: (p) => (p === 1 ? 'Balayer ou passer la balayeuse.' : 'Balayeuse ou balai, puis moppe.'),
    tilesSteps: (p) => (p === 1
      ? ['Balaie ou passe la balayeuse pour enlever les saletés et préparer la moppe.']
      : ['Ramasse les saletés (balayeuse ou balai).', 'Passe la **moppe sur les tuiles blanches**, coins et bordures compris.', 'Plancher mouillé? Mets l’affiche et laisse sécher.']),
    mirrorsTitle: (z, p) => `Miroirs zone ${z} — passage ${p}`,
    mirrorsSummary: (z, p) => (p === 1 ? `Commencer les miroirs de la zone ${z}.` : `Finir les miroirs de la zone ${z}.`),
    mirrorsSteps: (z, p) => [
      p === 1
        ? `Commence les miroirs de la **zone ${z}** (celle qui n’a pas eu de nettoyage en profondeur aujourd’hui).`
        : `Termine les miroirs de la **zone ${z}**.`,
      'Couvre tout le miroir, méthodiquement, puis regarde sous plusieurs angles pour voir les traces.',
      'Ne laisse pas de produit couler sur les rebords.',
    ],
    inspectTitle: (p) => `Tuiles et miroirs — vérification ${p}`,
    inspectSummary: 'Retouches de ce qui paraît.',
    inspectSteps: ['Fais le tour des tuiles blanches et des miroirs; retouche ce qui paraît.'],
    weeklyTitle1: (day) => `Tâche hebdo du ${day}`,
    weeklyTitle2: (day) => `Entretien hebdo du ${day}`,
    putAway: 'Range le matériel après.',
    putAwayCheck: 'Range le matériel et vérifie que tout est propre.',
    walls: '**Murs aujourd’hui** : enlève doucement les marques visibles, les plus apparentes d’abord.',
    wallsSummary: ' + murs',
    compostSummary: 'Compost à 19 h. ',
    compostWedSummary: 'Compost à 19 h + bac au chemin. ',
    slackTitle: 'Temps libre',
    slackSummary: 'Retouches ou une tâche « si tu as du temps ».',
  },
  en: {
    deepTitle: (z) => `Deep clean — Zone ${z}`,
    deepSteps: (z) => [
      'Start with a **clean rag**.',
      `Zone ${z}: ${ZONES[z].en.focus}`,
      'Clean thoroughly: frames, sides, bases, racks, reachable undersides and corners.',
      'Don’t forget **every footrest and platform**.',
      'Machine in use? Come back when it’s free.',
    ],
    deepEnd: 'Finish with a **fresh clean rag**.',
    deepMirrors: (z) => `Today is a mirror day: also do the **mirrors in zone ${z}**.`,
    deepMirrorsSummary: (name) => `${name} + mirrors.`,
    sunday: 'Sunday: you can pick the zone based on what’s needed. The rotation itself doesn’t change.',
    tilesTitle: (p) => (p === 1 ? 'White tiles — pass 1' : 'White tiles — pass 2 (mop)'),
    tilesSummary: (p) => (p === 1 ? 'Sweep or vacuum.' : 'Vacuum or broom, then mop.'),
    tilesSteps: (p) => (p === 1
      ? ['Sweep or vacuum to pick up dirt and get the floor ready for the mop.']
      : ['Pick up the dirt (vacuum or broom).', '**Mop the white tiles**, corners and edges included.', 'Wet floor? Put the sign out and let it dry.']),
    mirrorsTitle: (z, p) => `Mirrors zone ${z} — pass ${p}`,
    mirrorsSummary: (z, p) => (p === 1 ? `Start the mirrors in zone ${z}.` : `Finish the mirrors in zone ${z}.`),
    mirrorsSteps: (z, p) => [
      p === 1
        ? `Start the mirrors in **zone ${z}** (the zone that didn’t get a deep clean today).`
        : `Finish the mirrors in **zone ${z}**.`,
      'Cover the whole mirror methodically, then check from several angles for streaks.',
      'Don’t let product drip onto the ledges.',
    ],
    inspectTitle: (p) => `Tiles & mirrors — check ${p}`,
    inspectSummary: 'Touch up what shows.',
    inspectSteps: ['Walk past the white tiles and mirrors; touch up anything that shows.'],
    weeklyTitle1: (day) => `Weekly task (${day})`,
    weeklyTitle2: (day) => `Weekly upkeep (${day})`,
    putAway: 'Put your supplies away afterwards.',
    putAwayCheck: 'Put your supplies away and check everything is clean.',
    walls: '**Walls today**: gently remove visible marks, most noticeable first.',
    wallsSummary: ' + walls',
    compostSummary: 'Compost at 7 p.m. ',
    compostWedSummary: 'Compost at 7 p.m. + bin to the curb. ',
    slackTitle: 'Free time',
    slackSummary: 'Touch-ups or an “if you have time” task.',
  },
};

// Textes d'un bloc dans la langue voulue, complétés avec le contenu du jour.
function resolveBlock(block, shiftId, day, lang, compostCovered) {
  const L = P[lang];
  const src = block[lang];
  const b = {
    id: block.id, kind: block.kind, minutes: block.minutes, area: block.area, photo: block.photo,
    ref: block.ref, closing: block.closing, tvTable: block.tvTable, deep: block.deep,
    title: src.title, summary: src.summary || '', steps: [...(src.steps || [])], tips: [...(src.tips || [])],
  };

  if (block.deep) {
    const z = day.zones[shiftId];
    b.zone = z;
    b.title = L.deepTitle(z);
    b.summary = `${ZONES[z][lang].name}.`;
    b.photo = `zone-${z.toLowerCase()}`;
    b.steps = L.deepSteps(z);
    if (day.surfaces === 'miroirs') {
      b.steps.push(L.deepMirrors(z));
      b.summary = L.deepMirrorsSummary(ZONES[z][lang].name);
    }
    b.steps.push(L.deepEnd);
    if (day.weekday === 6) b.tips.push(L.sunday);
  }

  if (block.surfaces) {
    const p = block.surfaces;
    const z = day.zones.third;
    if (day.surfaces === 'tuiles') {
      b.photo = 'tuiles';
      b.title = L.tilesTitle(p);
      b.summary = L.tilesSummary(p);
      b.steps = L.tilesSteps(p);
    } else if (day.surfaces === 'miroirs') {
      b.photo = 'miroirs';
      b.zone = z;
      b.title = L.mirrorsTitle(z, p);
      b.summary = L.mirrorsSummary(z, p);
      b.steps = L.mirrorsSteps(z, p);
    } else {
      b.photo = 'miroirs';
      b.title = L.inspectTitle(p);
      b.summary = L.inspectSummary;
      b.steps = [...L.inspectSteps];
    }
  }

  const dayName = WEEKDAYS[lang][day.weekday];
  if (block.weekly === 1) {
    const w = WEEKLY_Q1[day.weekday][lang];
    b.title = L.weeklyTitle1(dayName);
    b.summary = `${w.short}.`;
    b.steps = [w.full, L.putAway];
  }

  if (block.weekly === 2) {
    const w = WEEKLY_Q2[day.weekday][lang];
    b.title = L.weeklyTitle2(dayName);
    b.summary = `${w.short}${day.walls ? L.wallsSummary : ''}.`;
    if (WEEKLY_Q2[day.weekday].fr.full.includes('balayeuse')) b.photo = day.weekday % 3 === 1 ? 'bureaux-patrons' : 'bureaux-entraineurs';
    b.steps = [w.full];
    if (day.walls) {
      b.steps.push(L.walls);
      b.tips.push(WALL_TECHNIQUE[lang]);
    }
    b.steps.push(L.putAwayCheck);
  }

  // Compost : seulement si le quart couvre 19 h. Sinon, l'employé ne le voit
  // pas du tout; le rapport le signale au superviseur.
  if (block.compost && compostCovered) {
    b.title = src.titleCompost;
    b.steps.splice(1, 0, ...src.compostSteps);
    b.summary = L.compostSummary + src.summary;
    if (day.weekday === 2) {
      b.steps.splice(2, 0, src.compostWednesday);
      b.summary = L.compostWedSummary + src.summary;
    }
  }

  return b;
}

// Meilleure frontière pour le repas : la plus proche de la position de
// référence où aucun bloc de travail ne dépasse maxConsecutive minutes.
function placeMeal(seq, preferred, maxConsecutive) {
  const total = seq.reduce((s, it) => s + it.minutes, 0);
  const valid = [];
  let before = 0;
  for (let k = 1; k < seq.length; k++) {
    before += seq[k - 1].minutes;
    if (before <= maxConsecutive && total - before <= maxConsecutive) valid.push(k);
  }
  if (!valid.length) return { index: preferred, ok: false };
  valid.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred) || a - b);
  return { index: valid[0], ok: true };
}

// Position d'insertion d'une interruption : avant la tâche qui la suit dans
// le tableau de référence (ou la suivante retenue), sinon avant la fermeture.
function anchorIndex(seq, anchorRef) {
  const i = seq.findIndex((it) => it.ref >= anchorRef);
  if (i > 0) return i;
  const closing = seq.findIndex((it) => it.closing);
  return closing > 0 ? closing : seq.length;
}

export function buildPlan({ shift, date, start, end, lang = 'fr', config = CONFIG }) {
  const ref = SHIFTS[shift];
  const day = dayInfo(date, config.cycleAnchorMonday);
  const S = toMin(start);
  let E = toMin(end);
  if (E <= S) E += DAY;
  const presence = E - S;

  const exact = start === ref.start && end === ref.end;
  const warnings = [];

  const refBlocks = ref.blocks.map((b, i) => ({ ...b, ref: i }));
  const tasks = refBlocks.filter((b) => b.kind === 'task');
  const refPause = refBlocks.find((b) => b.kind === 'pause');
  const refMeal = refBlocks.find((b) => b.kind === 'meal');

  // Étapes 2-3 : interruptions. Horaire exact = valeurs du manuel.
  const c = config.custom;
  const pauseMin = exact ? refPause.minutes : presence >= c.pauseIfPresenceAtLeast ? c.pauseMinutes : 0;
  const mealMin = exact ? refMeal.minutes : presence > c.maxConsecutiveWork ? c.mealMinutes : 0;
  const budget = presence - pauseMin - mealMin;

  // Étape 7 : on ne raccourcit jamais un bloc. Fermeture et ouverture
  // d'abord (sécurité), puis les autres dans l'ordre tant qu'ils entrent.
  const opening = tasks[0];
  const closing = tasks[tasks.length - 1];
  const chosen = new Set();
  let left = budget;
  for (const t of [closing, opening, ...tasks.slice(1, -1)]) {
    if (t.minutes <= left) { chosen.add(t.id); left -= t.minutes; }
  }

  const seq = tasks.filter((t) => chosen.has(t.id));
  const overflow = tasks.filter((t) => !chosen.has(t.id));

  if (left > 0 && seq.length) {
    const ci = seq.findIndex((t) => t.id === closing.id);
    seq.splice(ci >= 0 ? ci : seq.length, 0, {
      id: 'marge', kind: 'slack', minutes: left, ref: closing.ref - 0.5, area: 'gym',
      title: P[lang].slackTitle, summary: P[lang].slackSummary,
    });
  }

  if (pauseMin) {
    const i = anchorIndex(seq, refPause.ref + 1);
    seq.splice(i, 0, { ...refPause, minutes: pauseMin, title: refPause[lang].title });
  }

  if (mealMin) {
    const preferred = anchorIndex(seq, refMeal.ref + 1);
    const { index, ok } = exact
      ? { index: preferred, ok: true }
      : placeMeal(seq, preferred, c.maxConsecutiveWork);
    if (!ok) warnings.push('meal-5h');
    seq.splice(index, 0, { ...refMeal, minutes: mealMin, title: refMeal[lang].title });
  } else if (presence > c.maxConsecutiveWork) {
    warnings.push('no-meal');
  }

  // Étape 5 : heures fixes couvertes par le quart, jamais attribuées
  // fictivement en dehors.
  const fixed = ref.fixedTimes.map((f) => {
    let at = toMin(f.at);
    if (at < S && E > DAY) at += DAY;
    return { ...f, at, covered: at >= S && at < E };
  });
  const compostCovered = fixed.some((f) => f.id === 'compost' && f.covered);

  // Étape 8 : horodatage continu, aucune minute non comptée.
  let t = S;
  const items = seq.map((b) => {
    const it = b.kind === 'task' ? resolveBlock(b, shift, day, lang, compostCovered) : { ...b };
    it.start = t;
    it.end = t + b.minutes;
    it.reminders = [];
    t = it.end;
    return it;
  });
  if (t !== E) warnings.push('arithmetic');

  const outOfRange = [];
  for (const f of fixed) {
    const host = items.find((it) => it.start <= f.at && f.at < it.end);
    if (f.covered && host) host.reminders.push({ at: f.at, label: f[lang] });
    else outOfRange.push({ id: f.id, label: `${f[lang]} (${fmt(f.at, lang)})` });
  }

  const resolvedOverflow = overflow.map((b) => resolveBlock(b, shift, day, lang, compostCovered));
  const worked = items.filter((it) => it.kind === 'task' || it.kind === 'slack').reduce((s, it) => s + it.minutes, 0);

  return {
    shift,
    shiftName: ref[lang].name,
    lang,
    date,
    start: S,
    end: E,
    exact,
    day,
    weekdayName: WEEKDAYS[lang][day.weekday],
    items,
    overflow: resolvedOverflow,
    deficit: resolvedOverflow.reduce((s, b) => s + b.minutes, 0),
    outOfRange,
    warnings,
    totals: { presence, worked, pause: pauseMin, meal: mealMin, paid: worked + pauseMin, unpaid: mealMin },
  };
}
