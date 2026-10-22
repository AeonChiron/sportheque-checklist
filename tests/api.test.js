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
  assert.deepEqual(ok.data.user, { name: 'Marie', email: 'marie@x.ca', role: 'employee', alerts: false, schedule: {}, avatar: '' });
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

test('Courriels urgents : Daniel d’office, les autres superviseurs s’abonnent', async () => {
  const a = createApi({ getStore: memoryStores(), env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }) });
  const go = (path, body, token) => a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })).then((r) => r.json());
  const dan = await go('auth', { action: 'signup', name: 'Daniel', email: 'd@x.ca', password: 'secret1', role: 'boss', code: 'p' });
  const mat = await go('auth', { action: 'signup', name: 'Mathieu', email: 'm@x.ca', password: 'secret1', role: 'boss', code: 'p' });
  assert.equal(dan.user.alerts, true);
  assert.equal(mat.user.alerts, false);
  assert.deepEqual((await go('alerts', null, mat.token)).to.map((x) => x.name), ['Daniel']);
  await go('auth', { action: 'alerts', on: true }, mat.token);
  assert.deepEqual((await go('alerts', null, dan.token)).to.map((x) => x.name).sort(), ['Daniel', 'Mathieu']);
});

test('Un quart se modifie le jour même seulement; photos effacées après 90 jours', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }) });
  const go = (path, body, token) => a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined }));
  const { token } = await (await go('auth', { action: 'signup', name: 'Léa', email: 'l@x.ca', password: 'secret1', code: 'e' })).json();
  const shift = { date: '2026-10-20', shift: 1, name: 'Léa', items: [], flags: [] };
  assert.equal((await go('board', { ...shift, submittedAt: new Date().toISOString() }, token)).status, 200);
  assert.equal((await go('board', { ...shift, submittedAt: new Date().toISOString() }, token)).status, 200); // même jour : OK
  await stores('board').setJSON('2026-10-20', [{ ...shift, submittedAt: new Date(Date.now() - 2 * 864e5).toISOString() }]); // enregistré un autre jour
  assert.equal((await go('board', shift, token)).status, 409); // un autre jour : verrouillé
  // Un quart encore « en cours » (sauvegarde en chemin) se continue le lendemain.
  await stores('board').setJSON('2026-10-20', [{ ...shift, open: true, submittedAt: new Date(Date.now() - 2 * 864e5).toISOString() }]);
  assert.equal((await go('board', { ...shift, open: true }, token)).status, 200);
  assert.equal((await stores('board').get('2026-10-20', { type: 'json' }))[0].open, true);
  assert.equal((await go('board', shift, token)).status, 200); // la « Fin du quart » passe et ferme le quart
  assert.equal((await stores('board').get('2026-10-20', { type: 'json' }))[0].open, false);

  const oldId = `${(Date.now() - 91 * 864e5).toString(36).padStart(9, '0')}abcde`;
  await stores('problems').setJSON(oldId, { id: oldId, category: 'machine', photos: 1 });
  await stores('problem-photos').set(`${oldId}-0`, Buffer.from([0xff, 0xd8]));
  assert.equal((await go('problems', { category: 'machine' }, token)).status, 200);
  assert.equal(await stores('problem-photos').get(`${oldId}-0`), null);
  assert.equal((await stores('problems').get(oldId, { type: 'json' })).photosExpired, 1);
});

test('Horaire : gardé avec le compte, propre, visible par le superviseur', async () => {
  const emp = (await call('auth', { method: 'POST', body: { action: 'signup', name: 'Lina', email: 'lina-h@t.ca', password: 'secret12', role: 'employee', code: 'Equipe' } })).data;
  const sched = { 1: { start: '07:30', end: '15:30' }, 9: { start: '07:00', end: '08:00' }, 3: { start: '25:00', end: '10:00' } };
  const r = (await call('auth', { method: 'POST', token: emp.token, body: { action: 'schedule', schedule: sched } })).data;
  assert.deepEqual(r.user.schedule, { 1: { start: '07:30', end: '15:30' } });
  assert.deepEqual((await call('auth', { token: emp.token })).data.user.schedule, { 1: { start: '07:30', end: '15:30' } });
  const boss = (await call('auth', { method: 'POST', body: { action: 'signup', name: 'Dan', email: 'dan-h@t.ca', password: 'secret12', role: 'boss', code: 'Patron' } })).data;
  const team = (await call('users', { token: boss.token })).data;
  assert.deepEqual(team.users.find((u) => u.email === 'lina-h@t.ca').schedule, { 1: { start: '07:30', end: '15:30' } });
});

test('Admin : son propre code; seul l’admin change les codes d’équipe', async () => {
  const a2 = createApi({ getStore: memoryStores(), env: () => ({ TEAM_CODE: 'Equipe', BOSS_CODE: 'Patron', ADMIN_CODE: 'Racine' }) });
  const c2 = async (path, { method = 'GET', body, token } = {}) => {
    const res = await a2(new Request(`http://x/api/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }));
    return { status: res.status, data: await res.json() };
  };
  assert.equal((await c2('auth', { method: 'POST', body: { action: 'signup', name: 'X', email: 'x@t.ca', password: 'secret12', role: 'admin', code: 'Patron' } })).status, 403);
  const admin = (await c2('auth', { method: 'POST', body: { action: 'signup', name: 'Kat', email: 'k@t.ca', password: 'secret12', role: 'admin', code: 'racine' } })).data;
  assert.equal(admin.user.role, 'admin');
  assert.equal((await c2('users', { token: admin.token })).status, 200); // l'admin voit l'équipe comme un superviseur
  const emp = (await c2('auth', { method: 'POST', body: { action: 'signup', name: 'E', email: 'e@t.ca', password: 'secret12', role: 'employee', code: 'Equipe' } })).data;
  assert.equal((await c2('auth', { method: 'POST', token: emp.token, body: { action: 'codes', team: 'neuf1', boss: 'neuf2' } })).status, 403);
  assert.equal((await c2('auth', { method: 'POST', token: admin.token, body: { action: 'codes', team: 'neuf1', boss: 'neuf2' } })).status, 200);
  assert.equal((await c2('auth', { method: 'POST', body: { action: 'signup', name: 'F', email: 'f@t.ca', password: 'secret12', role: 'employee', code: 'Equipe' } })).status, 403);
  assert.equal((await c2('auth', { method: 'POST', body: { action: 'signup', name: 'F', email: 'f@t.ca', password: 'secret12', role: 'employee', code: 'neuf1' } })).status, 200);
  // Un champ vide garde le code; l'admin change aussi le sien; trois codes différents.
  assert.equal((await c2('auth', { method: 'POST', token: admin.token, body: { action: 'codes', admin: 'neuf1' } })).status, 400);
  assert.equal((await c2('auth', { method: 'POST', token: admin.token, body: { action: 'codes', admin: '1758' } })).status, 200);
  assert.deepEqual((await c2('auth', { method: 'POST', token: admin.token, body: { action: 'codes', read: true } })).data.codes, { team: 'neuf1', boss: 'neuf2', admin: '1758' });
  assert.equal((await c2('auth', { method: 'POST', token: emp.token, body: { action: 'codes', read: true } })).status, 403);
  // Un compte existant devient admin avec le code; un mauvais code est refusé, 10 fois au plus par jour.
  assert.equal((await c2('auth', { method: 'POST', token: emp.token, body: { action: 'role', code: 'racine' } })).status, 403);
  const up = await c2('auth', { method: 'POST', token: emp.token, body: { action: 'role', code: '1758' } });
  assert.equal(up.data.user.role, 'admin');
  for (let i = 0; i < 10; i++) await c2('auth', { method: 'POST', token: emp.token, body: { action: 'role', code: `x${i}` } });
  assert.equal((await c2('auth', { method: 'POST', token: emp.token, body: { action: 'role', code: '1758' } })).status, 429);
  // Inscription : 10 mauvais codes par jour par connexion, puis même le bon est refusé.
  for (let i = 0; i < 10; i++) await c2('auth', { method: 'POST', body: { action: 'signup', name: 'G', email: 'g@t.ca', password: 'secret12', role: 'boss', code: `n${i}` } });
  assert.equal((await c2('auth', { method: 'POST', body: { action: 'signup', name: 'G', email: 'g@t.ca', password: 'secret12', role: 'boss', code: 'Patron' } })).status, 429);
  // Photo de profil : une mascotte ou une petite image; rien d'autre.
  assert.equal((await c2('auth', { method: 'POST', token: emp.token, body: { action: 'avatar', avatar: 'm:ours' } })).data.user.avatar, 'm:ours');
  assert.equal((await c2('auth', { method: 'POST', token: emp.token, body: { action: 'avatar', avatar: 'javascript:alert(1)' } })).status, 400);
  assert.equal((await c2('auth', { method: 'POST', token: emp.token, body: { action: 'avatar', avatar: '' } })).data.user.avatar, '');
});

test('Historique : seul l’admin efface un quart', async () => {
  const a3 = createApi({ getStore: memoryStores(), env: () => ({ TEAM_CODE: 'Equipe', BOSS_CODE: 'Patron', ADMIN_CODE: 'Racine' }) });
  const c3 = async (path, { method = 'GET', body, token } = {}) => {
    const res = await a3(new Request(`http://x/api/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }));
    return { status: res.status, data: await res.json() };
  };
  const sign = async (name, role, code) => (await c3('auth', { method: 'POST', body: { action: 'signup', name, email: `${name}@t.ca`, password: 'secret12', role, code } })).data.token;
  const emp = await sign('Marie', 'employee', 'equipe');
  const boss = await sign('Daniel', 'boss', 'patron');
  const admin = await sign('Kat', 'admin', 'racine');
  await c3('board', { method: 'POST', token: emp, body: { date: '2026-10-21', shift: 1, name: 'Marie', items: [], flags: [] } });
  const del = { action: 'delete', date: '2026-10-21', shift: 1, name: 'marie' };
  assert.equal((await c3('board', { method: 'POST', token: emp, body: del })).status, 403);
  assert.equal((await c3('board', { method: 'POST', token: boss, body: del })).status, 403);
  assert.equal((await c3('board', { method: 'POST', token: admin, body: del })).status, 200);
  assert.equal((await c3('board?dates=2026-10-21', { token: admin })).data.days['2026-10-21'].length, 0);
  assert.equal((await c3('board', { method: 'POST', token: admin, body: del })).status, 404);
});

test('Activités personnalisées : à valider; seul un superviseur valide; un changement redevient à valider', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }) });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const emp = (await go('auth', { action: 'signup', name: 'Chadi', email: 'c@x.ca', password: 'secret1', code: 'e' })).data.token;
  const boss = (await go('auth', { action: 'signup', name: 'Daniel', email: 'd@x.ca', password: 'secret1', role: 'boss', code: 'p' })).data.token;
  const custom = [{ id: 'cabc123', title: 'Studio Fit', start: '09:00', end: '10:30' }];
  const shift = { date: '2026-10-25', shift: 1, name: 'Chadi', items: [], flags: [], custom, customStatus: 'approved' };
  const stored = async () => (await go('board?dates=2026-10-25', null, boss)).data.days['2026-10-25'][0];
  assert.equal((await go('board', shift, emp)).status, 200);
  assert.equal((await stored()).customStatus, 'pending'); // le téléphone ne se valide pas lui-même
  const ok = { action: 'custom', date: '2026-10-25', shift: 1, name: 'chadi', status: 'approved' };
  assert.equal((await go('board', ok, emp)).status, 403);
  assert.equal((await go('board', ok, boss)).status, 200);
  assert.equal((await stored()).customStatus, 'approved');
  assert.equal((await stored()).customBy, 'Daniel');
  assert.equal((await go('board', { ...shift, open: true }, emp)).status, 200); // sauvegarde : mêmes activités
  assert.equal((await stored()).customStatus, 'approved');
  assert.equal((await go('board', { ...shift, custom: [{ ...custom[0], end: '11:00' }] }, emp)).status, 200);
  assert.equal((await stored()).customStatus, 'pending');
});

test('Historique : seul l’admin corrige les tâches d’un quart, même un autre jour', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p', ADMIN_CODE: 'z' }) });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const emp = (await go('auth', { action: 'signup', name: 'Léa', email: 'l@x.ca', password: 'secret1', code: 'e' })).data.token;
  const boss = (await go('auth', { action: 'signup', name: 'Daniel', email: 'd@x.ca', password: 'secret1', role: 'boss', code: 'p' })).data.token;
  const admin = (await go('auth', { action: 'signup', name: 'Seed', email: 's@x.ca', password: 'secret1', role: 'admin', code: 'z' })).data.token;
  await stores('board').setJSON('2026-10-20', [{ date: '2026-10-20', shift: 1, name: 'Léa', done: 2, total: 3, items: [{ id: 'pointage', status: 'done' }, { id: 'a', status: 'done' }, { id: 'b', status: 'unchecked' }], flags: [], savedOn: '2026-10-20' }]);
  const fix = { action: 'edit', date: '2026-10-20', shift: 1, name: 'léa', items: [{ id: 'a', status: 'done' }, { id: 'b', status: 'done' }] };
  assert.equal((await go('board', fix, emp)).status, 403);
  assert.equal((await go('board', fix, boss)).status, 403);
  const r = await go('board', fix, admin);
  assert.equal(r.status, 200);
  const s = (await stores('board').get('2026-10-20', { type: 'json' }))[0];
  assert.equal(s.done, 3); // le pointage (absent de l'éditeur) reste
  assert.equal(s.editedBy, 'Seed');
});
