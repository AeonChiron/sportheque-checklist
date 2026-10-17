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
