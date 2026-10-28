// L'équipe fictive (bêta) : un gym inventé et plein, servi par un faux serveur dans le navigateur.
import test from 'node:test';
import assert from 'node:assert/strict';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() }; };
globalThis.sessionStorage = mem();
sessionStorage.setItem('gym-fictive', JSON.stringify({ who: 'martine@equipe-fictive.ca' }));
const F = await import('../js/fictive.js');

test('10 employés, 6 superviseurs, les 8 mascottes servent deux fois, plus un nouveau sans photo', () => {
  assert.equal(F.FICTIVE_PEOPLE.filter((p) => p.role === 'employee' && !p.fresh).length, 10);
  assert.equal(F.FICTIVE_PEOPLE.filter((p) => p.role === 'boss').length, 6);
  const fresh = F.FICTIVE_PEOPLE.filter((p) => p.fresh);
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].role, 'employee');
  assert.equal(fresh[0].avatar, ''); // le nouveau choisit sa photo pendant son premier départ
  const uses = {};
  for (const p of F.FICTIVE_PEOPLE.filter((x) => !x.fresh)) uses[p.avatar] = (uses[p.avatar] || 0) + 1;
  assert.equal(Object.keys(uses).length, 8);
  assert.ok(Object.values(uses).every((n) => n === 2));
});

test('environ 3 mois de quarts, des signalements, et le faux serveur répond comme le vrai', async () => {
  assert.ok(F.fictiveOn());
  assert.equal(F.fictiveUser().name, 'Martine');
  assert.ok(F.fictiveBoardSize() > 300);
  const { users } = await F.fakeRequest('users');
  assert.equal(users.length, 17);
  const { problems } = await F.fakeRequest('problems');
  assert.ok(problems.length > 3);
  const today = new Date().toISOString().slice(0, 10);
  const { task } = await F.fakeRequest('plan', { method: 'POST', body: { action: 'task', date: today, title: 'Essai', who: '*', time: '19:30' } });
  const r = await F.fakeRequest(`plan?team=1&from=${today}&to=${today}`);
  assert.ok(r.tasks.some((x) => x.id === task.id && x.by === 'Martine'));
  await assert.rejects(F.fakeRequest('push'), (e) => e.status === 404); // rien ne part
});

test('les exercices de la formation se cochent seulement avec ce qui a été fait depuis l’arrivée', async () => {
  sessionStorage.setItem('gym-fictive', JSON.stringify({ who: 'martine@equipe-fictive.ca', since: new Date().toISOString() }));
  await new Promise((r) => setTimeout(r, 5));
  const before = F.fictiveProgress();
  assert.deepEqual(before, { send: false, flag: false, problem: false, task: false, sched: false }); // le passé inventé ne compte pas
  const today = new Date().toISOString().slice(0, 10);
  await F.fakeRequest('plan', { method: 'POST', body: { action: 'task', date: today, title: 'Exercice', who: '*', time: '' } });
  await F.fakeRequest('plan', { method: 'POST', body: { action: 'override', email: 'noah@equipe-fictive.ca', date: today, start: '08:00', end: '12:00' } });
  const { problems } = await F.fakeRequest('problems');
  const open = problems.find((p) => p.status !== 'resolved');
  await F.fakeRequest('problems', { method: 'POST', body: { action: 'status', id: open.id, status: 'resolved' } });
  const after = F.fictiveProgress();
  assert.equal(after.task, true);
  assert.equal(after.sched, true);
  assert.equal(after.problem, true);
  assert.equal(after.send, false);
});
