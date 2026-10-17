import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeShift, mergeShift } from '../js/board-shape.js';

const good = {
  date: '2026-10-21', shift: 2, name: 'Katiana', start: '16:30', end: '23:00', submittedAt: '2026-10-21T23:00:00Z',
  items: [{ id: 'q2-profondeur', status: 'done', doneAt: '2026-10-21T20:20:00Z' }, { id: 'q2-hebdo', status: 'notdone', reason: 'temps' }],
  flags: [{ category: 'equipement', location: 'Tapis 3', text: 'Courroie', at: '2026-10-21T21:00:00Z' }],
  remark: 'jamais partagé',
};

test('Le tableau ne garde que les champs prévus', () => {
  const s = sanitizeShift(good);
  assert.equal(s.items.length, 2);
  assert.equal(s.remark, undefined); // les remarques ne vont pas dans l'Aperçu
  assert.equal(sanitizeShift({ ...good, date: '21/10' }), null);
  assert.equal(sanitizeShift({ ...good, shift: 3 }), null);
  assert.equal(sanitizeShift({ ...good, name: '  ' }), null);
  assert.equal(sanitizeShift({ ...good, items: [{ id: 'x', status: 'hacked' }] }).items[0].status, 'unchecked');
  assert.equal(sanitizeShift({ ...good, items: Array(99).fill({ id: 'a', status: 'done' }) }).items.length, 40);
});

test('Un nouvel envoi de la même personne remplace l’ancien', () => {
  const a = sanitizeShift(good);
  const b = sanitizeShift({ ...good, name: 'katiana', items: [] });
  const c = sanitizeShift({ ...good, name: 'Oli' });
  const list = mergeShift(mergeShift(mergeShift([], a), c), b);
  assert.equal(list.length, 2);
  assert.equal(list.find((s) => s.name.toLowerCase() === 'katiana').items.length, 0);
});

test('Le dossier d’un jour garde le rapport complet de ce téléphone', async () => {
  const { combineDay, parseDates } = await import('../js/board-shape.js');
  const remote = [sanitizeShift(good), sanitizeShift({ ...good, name: 'Oli', shift: 1 })];
  const mine = { ...sanitizeShift(good), code: 'abc' };
  const day = combineDay(remote, [mine]);
  assert.equal(day.length, 2);
  assert.equal(day[0].name, 'Oli'); // matin d'abord
  assert.equal(day.find((s) => s.name === 'Katiana').code, 'abc');
  // Un envoi plus récent ailleurs l'emporte sur une vieille copie locale.
  const newer = sanitizeShift({ ...good, submittedAt: '2026-10-21T23:30:00Z' });
  assert.equal(combineDay([newer], [mine])[0].code, undefined);
  assert.deepEqual(parseDates('2026-10-19,bad,2026-10-20,2026-10-19'), ['2026-10-19', '2026-10-20']);
  assert.equal(sanitizeShift({ ...good, done: 12, total: 400 }).total, null);
});

test('L’historique garde remarques et notes, et liste les derniers quarts sans jours vides', async () => {
  const { recentShifts } = await import('../js/board-shape.js');
  const s = sanitizeShift({ ...good, notes: 'Tapis 3 bruyant', items: [{ id: 'q2-hebdo', status: 'notdone', reason: 'temps', remark: 'Pas eu le temps des murs' }], flags: [{ category: 'equipement', text: 'Courroie', urgent: true, emailed: true, photos: 2 }] });
  assert.equal(s.notes, 'Tapis 3 bruyant');
  assert.equal(s.items[0].remark, 'Pas eu le temps des murs');
  assert.deepEqual([s.flags[0].urgent, s.flags[0].emailed, s.flags[0].photos], [true, true, 2]);
  const a = sanitizeShift({ ...good, date: '2026-10-19', submittedAt: '2026-10-19T23:00:00Z' });
  const b = sanitizeShift({ ...good, date: '2026-10-21', submittedAt: '2026-10-21T15:30:00Z', shift: 1, name: 'Oli' });
  const c = sanitizeShift({ ...good, date: '2026-10-21', submittedAt: '2026-10-21T23:00:00Z' });
  const list = recentShifts({ '2026-10-19': [a], '2026-10-21': [b] }, { '2026-10-21': [c] }, 10);
  assert.deepEqual(list.map((x) => `${x.date} ${x.name}`), ['2026-10-21 Katiana', '2026-10-21 Oli', '2026-10-19 Katiana']);
  assert.equal(recentShifts({ '2026-10-19': [a] }, {}, 0).length, 1);
});

test('Un problème sans description reste dans le quart (la catégorie suffit)', () => {
  const s = sanitizeShift({ ...good, flags: [{ id: '0abcdefgh12345', category: 'machine', location: '', text: '', urgent: true }] });
  assert.equal(s.flags.length, 1);
  assert.equal(s.flags[0].id, '0abcdefgh12345');
});
