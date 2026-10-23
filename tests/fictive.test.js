// L'équipe fictive (bêta) : un gym inventé et plein, servi par un faux serveur dans le navigateur.
import test from 'node:test';
import assert from 'node:assert/strict';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() }; };
globalThis.sessionStorage = mem();
sessionStorage.setItem('gym-fictive', JSON.stringify({ who: 'martine@equipe-fictive.ca' }));
const F = await import('../js/fictive.js');

test('10 employés, 6 superviseurs, les 8 mascottes servent deux fois', () => {
  assert.equal(F.FICTIVE_PEOPLE.filter((p) => p.role === 'employee').length, 10);
  assert.equal(F.FICTIVE_PEOPLE.filter((p) => p.role === 'boss').length, 6);
  const uses = {};
  for (const p of F.FICTIVE_PEOPLE) uses[p.avatar] = (uses[p.avatar] || 0) + 1;
  assert.equal(Object.keys(uses).length, 8);
  assert.ok(Object.values(uses).every((n) => n === 2));
});

test('environ 3 mois de quarts, des signalements, et le faux serveur répond comme le vrai', async () => {
  assert.ok(F.fictiveOn());
  assert.equal(F.fictiveUser().name, 'Martine');
  assert.ok(F.fictiveBoardSize() > 300);
  const { users } = await F.fakeRequest('users');
  assert.equal(users.length, 16);
  const { problems } = await F.fakeRequest('problems');
  assert.ok(problems.length > 3);
  const today = new Date().toISOString().slice(0, 10);
  const { task } = await F.fakeRequest('plan', { method: 'POST', body: { action: 'task', date: today, title: 'Essai', who: '*', time: '19:30' } });
  const r = await F.fakeRequest(`plan?team=1&from=${today}&to=${today}`);
  assert.ok(r.tasks.some((x) => x.id === task.id && x.by === 'Martine'));
  await assert.rejects(F.fakeRequest('push'), (e) => e.status === 404); // rien ne part
});
