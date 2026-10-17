import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, dayInfo, detectShift, fmt } from '../js/planner.js';

const rows = (plan) => plan.items.map((it) => `${fmt(it.start)}–${fmt(it.end)} ${it.id}`);

test('Quart 1 7:30–15:30 reproduit exactement la fiche 1', () => {
  const p = buildPlan({ shift: 1, date: '2026-10-19', start: '07:30', end: '15:30' });
  assert.equal(p.exact, true);
  assert.deepEqual(rows(p), [
    '7 h 30–7 h 45 q1-ouverture', '7 h 45–8 h 05 q1-guenilles-1', '8 h 05–8 h 35 q1-desinfection',
    '8 h 35–8 h 55 q1-poubelles', '8 h 55–10 h q1-aspirateur-muscu', '10 h–10 h 30 q1-entretien-general',
    '10 h 30–10 h 45 q1-pause', '10 h 45–11 h 15 q1-guenilles-2', '11 h 15–12 h 15 q1-profondeur',
    '12 h 15–12 h 30 q1-tour', '12 h 30–13 h 30 q1-diner', '13 h 30–14 h q1-guenilles-3',
    '14 h–14 h 25 q1-aspirateur-cardio', '14 h 25–14 h 45 q1-hebdo', '14 h 45–15 h 05 q1-spinning',
    '15 h 05–15 h 30 q1-fin',
  ]);
  assert.deepEqual(p.overflow, []);
  assert.deepEqual(p.warnings, []);
  assert.equal(p.totals.paid, 420); // 7 h payées
});

test('Quart 2 16:30–23:00 : fiche 2, tuiles/miroirs en un seul bloc de 20 min', () => {
  const p = buildPlan({ shift: 2, date: '2026-10-19', start: '16:30', end: '23:00' });
  assert.deepEqual(rows(p), [
    '16 h 30–16 h 45 q2-inspection', '16 h 45–17 h 15 q2-guenilles-1', '17 h 15–17 h 45 q2-desinfection',
    '17 h 45–18 h q2-rangement', '18 h–19 h q2-souper', '19 h–19 h 20 q2-poubelles',
    '19 h 20–20 h 20 q2-profondeur', '20 h 20–20 h 40 q2-surfaces', '20 h 40–20 h 55 q2-pause',
    '20 h 55–21 h 45 q2-aspirateur', '21 h 45–22 h 15 q2-guenilles-2',
    '22 h 15–22 h 45 q2-hebdo', '22 h 45–23 h q2-fermeture',
  ]);
  assert.equal(p.totals.paid, 330); // 5 h 30 payées
  assert.equal(p.outOfRange.length, 0);
});

test('Rotation A-B-C continue (tableau section 3)', () => {
  const expected = ['AB', 'CA', 'BC', 'AB', 'CA', 'BC', 'AB', 'CA', 'BC', 'AB', 'CA', 'BC', 'AB', 'CA',
    'BC', 'AB', 'CA', 'BC', 'AB', 'CA', 'BC'];
  for (let d = 0; d < 21; d++) {
    const date = new Date(Date.UTC(2026, 9, 19 + d)).toISOString().slice(0, 10);
    const z = dayInfo(date).zones;
    assert.equal(z[1] + z[2], expected[d], date);
  }
  // le cycle ne recommence pas à A chaque lundi
  assert.equal(dayInfo('2026-10-26').zones[1], 'C');
  assert.equal(dayInfo('2026-11-09').zones[1], 'A');
});

test('Cycles murs et tuiles/miroirs (semaines I/II)', () => {
  const wk = (start) => Array.from({ length: 7 }, (_, i) =>
    dayInfo(new Date(Date.UTC(2026, 9, start + i)).toISOString().slice(0, 10)));
  const I = wk(19), II = wk(26);
  assert.deepEqual(I.map((d) => d.surfaces[0]), ['m', 't', 'm', 't', 'm', 't', 'i']);
  assert.deepEqual(II.map((d) => d.surfaces[0]), ['t', 'm', 't', 'm', 't', 'm', 'i']);
  assert.deepEqual(I.map((d) => d.walls), [true, false, true, false, true, false, true]);
  assert.deepEqual(II.map((d) => d.walls), [false, true, false, true, false, true, false]);
});

test('Quart 2 début 18 h : mêmes blocs et ordre, tâches hors plage listées', () => {
  const p = buildPlan({ shift: 2, date: '2026-10-21', start: '18:00', end: '23:00' });
  assert.equal(p.exact, false);
  assert.equal(p.items[0].id, 'q2-inspection');
  assert.equal(p.items.at(-1).id, 'q2-fermeture');
  assert.equal(p.items.at(-1).end, 23 * 60);
  // ordre de référence conservé
  const refOrder = p.items.filter((i) => typeof i.ref === 'number' && i.kind === 'task').map((i) => i.ref);
  assert.deepEqual(refOrder, [...refOrder].sort((a, b) => a - b));
  // aucun bloc raccourci
  assert.equal(p.items.find((i) => i.id === 'q2-profondeur').minutes, 60);
  assert.ok(p.deficit > 0);
  // compost à 19 h toujours rattaché à un bloc
  assert.equal(p.items.flatMap((i) => i.reminders).length, 1);
});

test('Quart 2 fin avant 19 h : compost hors plage, jamais attribué', () => {
  const p = buildPlan({ shift: 2, date: '2026-10-21', start: '16:30', end: '18:45' });
  assert.equal(p.outOfRange[0].id, 'compost');
  assert.equal(p.items.flatMap((i) => i.reminders).length, 0);
});

test('Plages personnalisées : somme = présence, 5 h max sans repas', () => {
  for (const [shift, s, e] of [[1, '06:00', '14:00'], [1, '08:00', '16:30'], [2, '15:00', '23:00'], [2, '17:00', '23:00'], [1, '09:00', '12:00'], [2, '20:00', '01:00']]) {
    const p = buildPlan({ shift, date: '2026-10-22', start: s, end: e });
    const sum = p.items.reduce((acc, i) => acc + i.minutes, 0);
    assert.equal(sum, p.totals.presence, `${s}-${e}`);
    let run = 0;
    for (const it of p.items) {
      run = it.kind === 'meal' ? 0 : run + it.minutes;
      assert.ok(run <= 300, `${s}-${e} dépasse 5 h`);
    }
    assert.deepEqual(p.warnings, [], `${s}-${e}`);
  }
});

test('Détection du quart', () => {
  assert.equal(detectShift('07:30', '15:30'), 1);
  assert.equal(detectShift('16:30', '23:00'), 2);
  assert.equal(detectShift('13:00', '21:00'), 2);
  assert.equal(detectShift('06:00', '11:00'), 1);
});

test('Contenu du jour : zone, hebdo, mercredi compost', () => {
  const p = buildPlan({ shift: 2, date: '2026-10-21', start: '16:30', end: '23:00' });
  assert.equal(p.items.find((i) => i.deep).title, 'Nettoyage en profondeur — Zone C');
  assert.ok(p.items.find((i) => i.id === 'q2-poubelles').steps.some((x) => /bordure de rue/.test(x)));
  assert.match(p.items.find((i) => i.id === 'q2-hebdo').steps[0], /entraîneurs/);
});

test('Semaine 1 officielle : lundi 19 octobre 2026 = Q1 zone A, Q2 zone B, semaine I', () => {
  const d = dayInfo('2026-10-19');
  assert.equal(d.weekday, 0);
  assert.equal(d.week3, 1);
  assert.equal(d.week2, 'I');
  assert.equal(d.zones[1] + d.zones[2], 'AB');
});

test('Version anglaise : même plan, textes traduits', () => {
  const fr = buildPlan({ shift: 2, date: '2026-10-21', start: '16:30', end: '23:00' });
  const en = buildPlan({ shift: 2, date: '2026-10-21', start: '16:30', end: '23:00', lang: 'en' });
  assert.deepEqual(en.items.map((i) => [i.id, i.start, i.end]), fr.items.map((i) => [i.id, i.start, i.end]));
  assert.equal(en.items.find((i) => i.id === 'q2-profondeur').title, 'Deep clean — Zone C');
  assert.equal(en.shiftName, 'Evening shift');
  assert.equal(en.weekdayName, 'Wednesday');
  for (const it of en.items.filter((i) => i.kind === 'task')) assert.ok(it.steps.length > 0, it.id);
});

test('Compost invisible pour l’employé si 19 h n’est pas couvert', () => {
  const p = buildPlan({ shift: 2, date: '2026-10-21', start: '19:30', end: '23:00' });
  const poub = [...p.items, ...p.overflow].find((i) => i.id === 'q2-poubelles');
  assert.equal(poub.title, 'Poubelles et recyclage');
  assert.ok(!poub.steps.some((x) => /compost/i.test(x)));
  assert.equal(p.outOfRange[0].id, 'compost'); // le rapport, lui, le signale
});

test('Toutes les tâches ont des étapes dans les deux langues', () => {
  for (const shift of [1, 2]) {
    for (let d = 19; d < 33; d++) {
      const date = new Date(Date.UTC(2026, 9, d)).toISOString().slice(0, 10);
      for (const lang of ['fr', 'en']) {
        const p = buildPlan({ shift, date, start: shift === 1 ? '07:30' : '16:30', end: shift === 1 ? '15:30' : '23:00', lang });
        for (const it of p.items) {
          assert.ok(it.title, `${it.id} ${lang}`);
          if (it.kind === 'task') assert.ok(it.steps.length && it.steps.every(Boolean), `${it.id} ${lang} ${date}`);
        }
      }
    }
  }
});

test('Aucun titre en « passage » ou « tournée » : une tâche = un nom clair', () => {
  for (const shift of [1, 2]) {
    for (let d = 19; d < 26; d++) {
      const date = new Date(Date.UTC(2026, 9, d)).toISOString().slice(0, 10);
      for (const lang of ['fr', 'en']) {
        const p = buildPlan({ shift, date, start: shift === 1 ? '07:30' : '16:30', end: shift === 1 ? '15:30' : '23:00', lang });
        for (const it of p.items) assert.doesNotMatch(it.title || '', /passage|tournée|\bpass\b|round/i, `${date} ${it.id}`);
        assert.equal(new Set(p.items.map((i) => i.title)).size, p.items.length, `${date} titres en double`);
      }
    }
  }
});
