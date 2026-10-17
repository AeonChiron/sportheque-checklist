import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, memoryStores } from '../netlify/lib/api.mjs';

const api = createApi({ getStore: memoryStores(), env: () => ({ TEAM_CODE: 'Equipe', BOSS_CODE: 'Patron' }) });
const call = async (path, { method = 'GET', body, token } = {}) => {
  const res = await api(new Request(`http://x/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }));
  const type = res.headers.get('content-type') || '';
  return { status: res.status, data: type.includes('json') ? await res.json() : await res.arrayBuffer() };
};
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString('base64');

test('Inscription : il faut le bon code pour chaque rôle', async () => {
  assert.equal((await call('auth', { method: 'POST', body: { action: 'signup', name: 'Marie', email: 'marie@x.ca', password: 'secret1', role: 'employee', code: 'mauvais' } })).status, 403);
  assert.equal((await call('auth', { method: 'POST', body: { action: 'signup', name: 'Marie', email: 'marie@x.ca', password: 'secret1', role: 'boss', code: 'equipe' } })).status, 403);
  const ok = await call('auth', { method: 'POST', body: { action: 'signup', name: 'Marie', email: 'Marie@X.ca', password: 'secret1', role: 'employee', code: ' equipe ' } });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.data.user, { name: 'Marie', email: 'marie@x.ca', role: 'employee' });
  assert.equal((await call('auth', { method: 'POST', body: { action: 'signup', name: 'M', email: 'marie@x.ca', password: 'secret1', code: 'equipe' } })).status, 409);
  const me = await call('auth', { token: ok.data.token });
  assert.equal(me.data.user.name, 'Marie');
});

test('Connexion, déconnexion, mauvais mot de passe', async () => {
  assert.equal((await call('auth', { method: 'POST', body: { action: 'login', email: 'marie@x.ca', password: 'nope' } })).status, 401);
  const { data } = await call('auth', { method: 'POST', body: { action: 'login', email: 'MARIE@x.ca', password: 'secret1' } });
  assert.ok(data.token);
  await call('auth', { method: 'POST', body: { action: 'logout' }, token: data.token });
  assert.equal((await call('auth', { token: data.token })).status, 401);
});

test('Historique et signalements : connecté seulement; détails pour les superviseurs', async () => {
  const emp = (await call('auth', { method: 'POST', body: { action: 'login', email: 'marie@x.ca', password: 'secret1' } })).data.token;
  const boss = (await call('auth', { method: 'POST', body: { action: 'signup', name: 'Daniel', email: 'd@x.ca', password: 'secret2', role: 'boss', code: 'patron' } })).data.token;
  assert.equal((await call('board?recent=5')).status, 401);
  const shift = { date: '2026-10-21', shift: 2, name: 'Marie', items: [], flags: [] };
  assert.equal((await call('board', { method: 'POST', body: shift, token: emp })).status, 200);
  assert.equal((await call('board?recent=5', { token: emp })).data.days['2026-10-21'].length, 1);

  assert.equal((await call('problems', { method: 'POST', body: { category: 'autre' }, token: emp })).status, 400); // « Autre » demande une description
  const made = await call('problems', { method: 'POST', body: { category: 'machine', location: 'Tapis 3', urgent: true, photos: [JPEG, 'pasunephoto'] }, token: emp });
  assert.equal(made.status, 200);
  const { id } = made.data;
  assert.equal((await call('problems', { token: emp })).status, 403);
  assert.equal((await call(`problems?id=${id}`, { token: emp })).status, 403);
  const p = (await call(`problems?id=${id}`, { token: boss })).data.problem;
  assert.equal(p.by, 'Marie');
  assert.equal(p.photos, 1);
  assert.equal(p.status, 'open');
  const photo = await call(`problems?photo=${id}-0`, { token: boss });
  assert.equal(photo.status, 200);
  assert.equal(new Uint8Array(photo.data)[0], 0xff);
  const done = await call('problems', { method: 'POST', body: { action: 'status', id, status: 'resolved' }, token: boss });
  assert.equal(done.data.problem.resolvedBy, 'Daniel');
  assert.equal((await call('problems', { token: boss })).data.problems.length, 1);
});

test('Équipe : le superviseur voit les comptes et remet un mot de passe', async () => {
  const boss = (await call('auth', { method: 'POST', body: { action: 'login', email: 'd@x.ca', password: 'secret2' } })).data.token;
  const emp = (await call('auth', { method: 'POST', body: { action: 'login', email: 'marie@x.ca', password: 'secret1' } })).data.token;
  assert.equal((await call('users', { token: emp })).status, 403);
  assert.equal((await call('users', { token: boss })).data.users.length, 2);
  assert.equal((await call('users', { method: 'POST', body: { action: 'reset', email: 'marie@x.ca', password: 'nouveau1' }, token: boss })).status, 200);
  assert.equal((await call('auth', { method: 'POST', body: { action: 'login', email: 'marie@x.ca', password: 'nouveau1' } })).status, 200);
  assert.equal((await call('users', { method: 'POST', body: { action: 'remove', email: 'marie@x.ca' }, token: boss })).status, 200);
  assert.equal((await call('auth', { token: emp })).status, 401); // compte retiré : plus de session
});

test('Sans codes configurés, pas d’inscription', async () => {
  const bare = createApi({ getStore: memoryStores(), env: () => ({}) });
  const res = await bare(new Request('http://x/api/auth', { method: 'POST', body: JSON.stringify({ action: 'signup', name: 'A', email: 'a@x.ca', password: 'secret1', code: '' }) }));
  assert.equal(res.status, 503);
});
