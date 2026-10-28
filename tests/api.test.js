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
  const { uid, ...rest } = ok.data.user;
  assert.match(uid, /^[a-f0-9]{12}$/); // identifiant court du compte (jamais le courriel dans l'historique)
  assert.deepEqual(rest, { name: 'Marie', email: 'marie@x.ca', workMode: false, role: 'employee', alerts: false, schedule: {}, scheduleBy: '', scheduleAt: '', avatar: '' });
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

test('Historique : l’admin efface n’importe quel quart; un autre employé ou un superviseur, non', async () => {
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
  const other = await sign('Noah', 'employee', 'equipe');
  assert.equal((await c3('board', { method: 'POST', token: other, body: del })).status, 403);
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
  const stored = async () => (await stores('board').get('2026-10-25', { type: 'json' }))[0];
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

test('Historique : l’admin et les superviseurs corrigent n’importe quel quart; la personne, seulement le sien pendant 12 h', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p', ADMIN_CODE: 'z' }) });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const emp = (await go('auth', { action: 'signup', name: 'Léa', email: 'l@x.ca', password: 'secret1', code: 'e' })).data.token;
  const boss = (await go('auth', { action: 'signup', name: 'Daniel', email: 'd@x.ca', password: 'secret1', role: 'boss', code: 'p' })).data.token;
  const admin = (await go('auth', { action: 'signup', name: 'Seed', email: 's@x.ca', password: 'secret1', role: 'admin', code: 'z' })).data.token;
  await stores('board').setJSON('2026-10-20', [{ date: '2026-10-20', shift: 1, name: 'Léa', done: 2, total: 3, items: [{ id: 'pointage', status: 'done' }, { id: 'a', status: 'done' }, { id: 'b', status: 'unchecked' }], flags: [], savedOn: '2026-10-20' }]);
  const fix = { action: 'edit', date: '2026-10-20', shift: 1, name: 'léa', items: [{ id: 'a', status: 'done' }, { id: 'b', status: 'done' }] };
  assert.equal((await go('board', fix, emp)).status, 409); // son quart, mais pas de date d'envoi récente : verrouillé
  assert.equal((await go('board', fix, boss)).status, 200); // propriétaire : un superviseur corrige n'importe quel quart, sans limite
  assert.equal((await stores('board').get('2026-10-20', { type: 'json' }))[0].editedBy, 'Daniel');
  const r = await go('board', fix, admin);
  assert.equal(r.status, 200);
  const s = (await stores('board').get('2026-10-20', { type: 'json' }))[0];
  assert.equal(s.done, 3); // le pointage (absent de l'éditeur) reste
  assert.equal(s.editedBy, 'Seed');
});

test('Un quart enregistré se modifie pendant 12 h, puis il est verrouillé', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }) });
  const go = async (body, token) => (await a(new Request('http://x/api/board', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }))).status;
  const tok = (await (await a(new Request('http://x/api/auth', { method: 'POST', body: JSON.stringify({ action: 'signup', name: 'Léa', email: 'l2@x.ca', password: 'secret1', code: 'e' }) }))).json()).token;
  const shift = { date: '2026-10-21', shift: 2, name: 'Léa', items: [], flags: [] };
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  await stores('board').setJSON('2026-10-21', [{ ...shift, savedAt: ago(10), savedOn: '2026-10-21' }]);
  assert.equal(await go(shift, tok), 200); // 10 h : encore modifiable (même un autre jour)
  assert.equal((await stores('board').get('2026-10-21', { type: 'json' }))[0].savedAt, (await stores('board').get('2026-10-21', { type: 'json' }))[0].savedAt); // le premier envoi reste la référence
  await stores('board').setJSON('2026-10-21', [{ ...shift, savedAt: ago(13), savedOn: '2026-10-21' }]);
  assert.equal(await go(shift, tok), 409); // 13 h : verrouillé
});

test('Pas de surveillance : un quart en cours est caché aux autres, et l’heure des cases n’est pas renvoyée', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }) });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const emp = (await go('auth', { action: 'signup', name: 'Noah', email: 'n@x.ca', password: 'secret1', code: 'e' })).data.token;
  const boss = (await go('auth', { action: 'signup', name: 'Daniel', email: 'd@x.ca', password: 'secret1', role: 'boss', code: 'p' })).data.token;
  await go('board', { date: '2026-10-22', shift: 2, name: 'Noah', open: true, items: [{ id: 'a', status: 'done', doneAt: '2026-10-22T21:42:00Z' }], flags: [] }, emp);
  assert.equal((await go('board?dates=2026-10-22', null, boss)).data.days['2026-10-22'].length, 0); // le superviseur ne voit pas le quart en cours
  const own = (await go('board?dates=2026-10-22', null, emp)).data.days['2026-10-22'];
  assert.equal(own.length, 1); // la personne retrouve sa sauvegarde
  assert.equal(own[0].items[0].doneAt, undefined); // pas d'heure de case
  await go('board', { date: '2026-10-22', shift: 2, name: 'Noah', items: [{ id: 'a', status: 'done', doneAt: '2026-10-22T21:42:00Z' }], flags: [] }, emp);
  const seen = (await go('board?recent=5', null, boss)).data.days['2026-10-22'];
  assert.equal(seen.length, 1);
  assert.equal(seen[0].items[0].doneAt, undefined);
  assert.equal((await stores('board').get('2026-10-22', { type: 'json' }))[0].items[0].doneAt, undefined); // et rien n'est gardé
});

test('sw.js est à jour (empreintes Workbox) : lancer `npm run sw` après un changement', async () => {
  const { build } = await import('../scripts/sw-manifest.mjs');
  const { readFileSync } = await import('node:fs');
  assert.equal(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), build());
});

test('Notifications : rappel 10 min avant le quart, alerte urgente aux superviseurs, ntfy sans nom', async () => {
  const stores = memoryStores();
  const sent = [];
  const posts = [];
  const push = {
    async keys() { return { publicKey: 'PUB', privateKey: 'PRIV' }; },
    async send(sub, payload) { if (sub.endpoint.includes('gone')) throw Object.assign(new Error('gone'), { statusCode: 410 }); sent.push({ to: sub.endpoint, ...payload }); },
  };
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }), push, fetchFn: async (url, opt) => { posts.push({ url, ...opt }); return new Response('ok'); } });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const emp = (await go('auth', { action: 'signup', name: 'Noah', email: 'n@x.ca', password: 'secret1', code: 'e' })).data.token;
  const boss = (await go('auth', { action: 'signup', name: 'Daniel', email: 'd@x.ca', password: 'secret1', role: 'boss', code: 'p' })).data.token;
  const sub = (e) => ({ endpoint: `https://push.example/${e}`, keys: { p256dh: 'k', auth: 'a' } });
  assert.equal((await go('push', null, emp)).data.key, 'PUB');
  assert.equal((await go('push', null, emp)).data.ntfy, null); // ntfy : superviseurs seulement
  await go('push', { action: 'subscribe', sub: sub('noah'), lang: 'en' }, emp);
  await go('push', { action: 'subscribe', sub: sub('daniel') }, boss);
  await go('push', { action: 'subscribe', sub: sub('gone') }, boss);
  // Horaire de Noah : jeudi (3) 18:00
  const u = await stores('users').get('n@x.ca', { type: 'json' });
  await stores('users').setJSON('n@x.ca', { ...u, schedule: { 3: { start: '18:00', end: '23:00' } } });
  assert.equal(await a.remindDue(new Date('2026-10-22T17:30:00-04:00')), 0); // trop tôt
  assert.equal(await a.remindDue(new Date('2026-10-22T17:50:00-04:00')), 1); // 10 min avant
  assert.equal(await a.remindDue(new Date('2026-10-22T17:55:00-04:00')), 0); // une seule fois
  assert.match(sent[0].title, /shift starts soon/);
  // Problème urgent : Daniel reçoit, l'abonnement expiré est retiré, ntfy seulement si activé
  const n = (await go('push', { action: 'ntfy', on: true }, boss)).data.ntfy;
  assert.match(n.topic, /^sportheque-[a-f0-9]{18}$/);
  await go('problems', { category: 'blessure', urgent: true, text: 'Noah s’est coupé', photos: [] }, emp);
  const toDaniel = sent.filter((s) => s.to.endsWith('daniel'));
  assert.equal(toDaniel.length, 1);
  assert.match(toDaniel[0].title, /Urgent/);
  assert.equal((await stores('push').get('d@x.ca', { type: 'json' })).subs.length, 1);
  assert.equal(posts.length, 1);
  assert.ok(!JSON.stringify(posts[0]).includes('Noah')); // ntfy.sh est public : ni nom ni texte
  await go('problems', { category: 'materiel', urgent: false, text: '', photos: [] }, emp);
  assert.equal(posts.length, 1); // pas urgent : rien
});

test('Chacun corrige les cases de son propre quart pendant 12 h (pas celui des autres)', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }) });
  const go = async (body, token) => (await a(new Request('http://x/api/board', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }))).status;
  const tok = async (name, email) => (await (await a(new Request('http://x/api/auth', { method: 'POST', body: JSON.stringify({ action: 'signup', name, email, password: 'secret1', code: 'e' }) }))).json()).token;
  const lea = await tok('Léa', 'lea@x.ca');
  const noah = await tok('Noah', 'noah@x.ca');
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const shift = { date: '2026-10-21', shift: 2, name: 'Léa', items: [{ id: 'a', status: 'unchecked' }], done: 0, total: 1, flags: [] };
  await stores('board').setJSON('2026-10-21', [{ ...shift, savedAt: ago(10) }]);
  const edit = { action: 'edit', date: '2026-10-21', shift: 2, name: 'Léa', items: [{ id: 'a', status: 'done' }] };
  assert.equal(await go(edit, noah), 403); // pas le quart de Noah
  assert.equal(await go(edit, lea), 200); // 10 h : Léa corrige
  const s = (await stores('board').get('2026-10-21', { type: 'json' }))[0];
  assert.equal(s.done, 1);
  assert.equal(s.editedBy, undefined); // sa propre correction n'est pas étiquetée
  await stores('board').setJSON('2026-10-21', [{ ...shift, savedAt: ago(13) }]);
  assert.equal(await go(edit, lea), 409); // 13 h : verrouillé
});

test('Chacun efface son propre quart pendant 12 h, pas celui des autres', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }) });
  const go = async (body, token) => (await a(new Request('http://x/api/board', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }))).status;
  const tok = async (name, email) => (await (await a(new Request('http://x/api/auth', { method: 'POST', body: JSON.stringify({ action: 'signup', name, email, password: 'secret1', code: 'e' }) }))).json()).token;
  const lea = await tok('Léa', 'lea@x.ca'), noah = await tok('Noah', 'noah@x.ca');
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const del = { action: 'delete', date: '2026-10-21', shift: 2, name: 'Léa' };
  await stores('board').setJSON('2026-10-21', [{ date: '2026-10-21', shift: 2, name: 'Léa', items: [], flags: [], savedAt: ago(13) }]);
  assert.equal(await go(del, lea), 409);
  assert.equal(await go(del, noah), 403);
  await stores('board').setJSON('2026-10-21', [{ date: '2026-10-21', shift: 2, name: 'Léa', items: [], flags: [], savedAt: ago(10) }]);
  assert.equal(await go(del, lea), 200);
  assert.equal((await stores('board').get('2026-10-21', { type: 'json' })).length, 0);
});

test('Admin : ses quarts et signalements sont des fantômes (invisibles pour les autres), et ses avis sont gardés', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p', ADMIN_CODE: 'z' }), push: { async keys() { return { publicKey: 'P', privateKey: 'Q' }; }, async send() { throw new Error('should not notify'); } } });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const sign = async (name, role, code) => (await go('auth', { action: 'signup', name, email: `${name}@x.ca`, password: 'secret1', role, code })).data.token;
  const admin = await sign('Seed', 'admin', 'z'), boss = await sign('Daniel', 'boss', 'p'), emp = await sign('Noah', 'employee', 'e');
  await go('board', { date: '2026-10-22', shift: 2, name: 'Seed', items: [], flags: [] }, admin);
  await go('board', { date: '2026-10-22', shift: 1, name: 'Noah', items: [], flags: [] }, emp);
  const seen = async (tok) => (await go('board?dates=2026-10-22', null, tok)).data.days['2026-10-22'].map((s) => s.name).sort().join();
  assert.equal(await seen(admin), 'Noah,Seed');
  assert.equal(await seen(boss), 'Noah');
  assert.equal(await seen(emp), 'Noah');
  await go('problems', { category: 'blessure', urgent: true, text: 'test', photos: [] }, admin); // aucun envoi (le faux push lancerait une erreur)
  assert.equal((await go('problems', null, boss)).data.problems.length, 0);
  assert.equal((await go('problems', null, admin)).data.problems.length, 1);
  assert.equal((await go('feedback', { update: 'u1', mood: 'bad', good: 'a', bad: 'b' }, boss)).status, 403);
  await go('feedback', { update: 'u1', mood: 'good', good: 'Le bouton', bad: 'Le lapin' }, admin);
  assert.equal((await go('feedback', null, admin)).data.feedback[0].bad, 'Le lapin');
});

test('Superviseur : change l’horaire d’un employé, un seul jour, et ajoute des tâches; l’employé est averti', async () => {
  const stores = memoryStores();
  const sent = [];
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }), clock: () => new Date('2026-10-28T12:00:00-04:00'), push: { async keys() { return { publicKey: 'P', privateKey: 'Q' }; }, async send(sub, payload) { sent.push({ to: sub.endpoint, ...payload }); } } });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const sign = async (name, role, code) => (await go('auth', { action: 'signup', name, email: `${name.toLowerCase()}@x.ca`, password: 'secret1', role, code })).data.token;
  const boss = await sign('Daniel', 'boss', 'p'), noah = await sign('Noah', 'employee', 'e'), lea = await sign('Lea', 'employee', 'e');
  await go('push', { action: 'subscribe', sub: { endpoint: 'https://p/noah', keys: { p256dh: 'k', auth: 'a' } } }, noah);
  await go('auth', { action: 'schedule', schedule: { 3: { start: '16:30', end: '23:00' } } }, lea);
  // horaire de la semaine
  assert.equal((await go('users', { action: 'schedule', email: 'noah@x.ca', schedule: { 1: { start: '07:30', end: '15:30' } } }, noah)).status, 403);
  await go('users', { action: 'schedule', email: 'noah@x.ca', schedule: { 1: { start: '07:30', end: '15:30' } } }, boss);
  const me = (await go('auth', null, noah)).data.user;
  assert.equal(me.schedule['1'].start, '07:30');
  assert.equal(me.scheduleBy, 'Daniel');
  assert.match(sent.at(-1).title, /horaire/);
  // un seul jour
  await go('plan', { action: 'override', email: 'noah@x.ca', date: '2026-10-29', start: '18:00', end: '23:00' }, boss);
  await go('plan', { action: 'override', email: 'noah@x.ca', date: '2026-10-30', off: true }, boss);
  const mine = (await go('plan?from=2026-10-28&to=2026-10-31', null, noah)).data;
  assert.equal(mine.overrides['noah@x.ca']['2026-10-29'].start, '18:00');
  assert.equal(mine.overrides['noah@x.ca']['2026-10-30'].off, true);
  // tâches : une personne, puis tout le monde ce jour-là (jeudi = Léa à l'horaire)
  await go('plan', { action: 'task', date: '2026-10-29', title: 'Laver la vitrine', time: '19:30', minutes: 20, who: 'noah@x.ca' }, boss);
  await go('plan', { action: 'task', date: '2026-10-29', title: 'Inventaire', time: '', minutes: 15, who: '*' }, boss);
  assert.equal((await go('plan?from=2026-10-29&to=2026-10-29', null, noah)).data.tasks.length, 2);
  assert.equal((await go('plan?from=2026-10-29&to=2026-10-29', null, lea)).data.tasks.length, 1);
  assert.equal((await go('plan?from=2026-10-29&to=2026-10-29&team=1', null, boss)).data.tasks.length, 2);
  assert.ok(sent.some((x) => /Laver la vitrine/.test(x.title)));
  assert.equal((await go('plan', { action: 'task', date: '2026-10-29', title: 'x', who: '*' }, noah)).status, 403);
});

test('Tout le monde voit l’horaire de l’équipe : noms, rôles, heures, changements — pas les courriels, pas l’admin', async () => {
  const a = createApi({ getStore: memoryStores(), env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p', ADMIN_CODE: 'a' }) });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const sign = async (name, role, code) => (await go('auth', { action: 'signup', name, email: `${name.toLowerCase()}@x.ca`, password: 'secret1', role, code })).data.token;
  const boss = await sign('Martine', 'boss', 'p'), noah = await sign('Noah', 'employee', 'e');
  await sign('Owner', 'admin', 'a');
  await go('auth', { action: 'schedule', schedule: { 3: { start: '08:00', end: '16:00' } } }, boss);
  await go('auth', { action: 'schedule', schedule: { 3: { start: '07:30', end: '15:30' } } }, noah);
  await go('plan', { action: 'override', email: 'noah@x.ca', date: '2026-10-29', start: '18:00', end: '23:00' }, boss);
  assert.equal((await go('roster')).status, 401);
  const r = await go('roster?from=2026-10-26&to=2026-11-01', null, noah);
  assert.equal(r.status, 200);
  const names = r.data.people.map((p) => p.name);
  assert.deepEqual(names, ['Martine', 'Noah']); // l'admin est un fantôme
  assert.ok(!JSON.stringify(r.data).includes('@x.ca')); // pas de courriels
  const m = r.data.people.find((p) => p.name === 'Martine'), n = r.data.people.find((p) => p.name === 'Noah');
  assert.equal(m.role, 'boss');
  assert.equal(m.schedule['3'].start, '08:00');
  assert.equal(n.me, true);
  assert.equal(n.overrides['2026-10-29'].start, '18:00');
  assert.equal(m.me, undefined);
});

test('Sécurité (25 oct.) : on n’envoie que SON quart; deux personnes du même nom ne s’écrasent pas; aucun courriel ne sort', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }) });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const sign = async (name, email) => (await go('auth', { action: 'signup', name, email, password: 'secret1', code: 'e' })).data;
  const noah1 = await sign('Noah', 'noah1@x.ca'), noah2 = await sign('Noah', 'noah2@x.ca'), lea = await sign('Léa', 'lea@x.ca');
  const shift = (name, n) => ({ date: '2026-10-24', shift: 2, name, items: [{ id: 'a', status: n }], flags: [] });
  assert.equal((await go('board', shift('Noah', 'done'), lea.token)).status, 403); // Léa ne peut pas envoyer « Noah »
  assert.equal((await go('board', shift('Noah', 'done'), noah1.token)).status, 200);
  assert.equal((await go('board', shift('Noah', 'notdone'), noah2.token)).status, 200);
  const day = (await go('board?dates=2026-10-24', null, noah1.token)).data.days['2026-10-24'];
  assert.equal(day.length, 2); // deux Noah, deux quarts
  assert.ok(!JSON.stringify(day).includes('@x.ca')); // jamais de courriel
  const mine = day.filter((x) => x.mine);
  assert.equal(mine.length, 1);
  assert.equal(mine[0].items[0].status, 'done');
  assert.equal(mine[0].uid, noah1.user.uid);
  // Noah 2 efface SON quart (par uid) sans toucher celui de Noah 1
  assert.equal((await go('board', { action: 'delete', date: '2026-10-24', shift: 2, name: 'Noah', uid: noah2.user.uid }, noah2.token)).status, 200);
  assert.equal((await go('board', { action: 'delete', date: '2026-10-24', shift: 2, name: 'Noah', uid: noah1.user.uid }, noah2.token)).status, 403);
  assert.equal((await go('board?dates=2026-10-24', null, lea.token)).data.days['2026-10-24'].length, 1);
});

test('Connexion : 50 mauvais mots de passe → 24 h de pause pour ce compte', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }) });
  const go = async (body) => { const r = await a(new Request('http://x/api/auth', { method: 'POST', body: JSON.stringify(body) })); return { status: r.status, data: await r.json() }; };
  await go({ action: 'signup', name: 'Zoé', email: 'z@x.ca', password: 'secret1', code: 'e' });
  let last;
  for (let i = 0; i < 49; i++) last = await go({ action: 'login', email: 'z@x.ca', password: 'nope' });
  assert.equal(last.status, 401);
  assert.equal(last.data.left, 1);
  assert.equal((await go({ action: 'login', email: 'z@x.ca', password: 'nope' })).status, 429); // le 50e
  assert.equal((await go({ action: 'login', email: 'z@x.ca', password: 'secret1' })).status, 429); // même le bon : 24 h
  const k = (await stores('settings').list()).blobs.map((x) => x.key).find((x) => x.startsWith('login:'));
  const lock = await stores('settings').get(k, { type: 'json' });
  assert.ok(lock.until - Date.now() > 23 * 3600e3);
  await stores('settings').setJSON(k, { ...lock, until: Date.now() - 1 }); // 24 h plus tard
  assert.equal((await go({ action: 'login', email: 'z@x.ca', password: 'secret1' })).status, 200);
  // Bloqué exprès par quelqu'un d'autre? Un superviseur change le mot de passe : la pause saute.
  for (let i = 0; i < 50; i++) await go({ action: 'login', email: 'z@x.ca', password: 'nope' });
  const boss = (await go({ action: 'signup', name: 'Daniel', email: 'd@x.ca', password: 'secret1', role: 'boss', code: 'p' })).data.token;
  await a(new Request('http://x/api/users', { method: 'POST', headers: { Authorization: `Bearer ${boss}` }, body: JSON.stringify({ action: 'reset', email: 'z@x.ca', password: 'neuf123' }) }));
  assert.equal((await go({ action: 'login', email: 'z@x.ca', password: 'neuf123' })).status, 200);
});

test('Annuler son propre signalement (12 h); l’employé voit seulement les siens', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p' }) });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const sign = async (name, role, code) => (await go('auth', { action: 'signup', name, email: `${name}@x.ca`, password: 'secret1', role, code })).data.token;
  const noah = await sign('Noah', 'employee', 'e'), lea = await sign('Lea', 'employee', 'e'), boss = await sign('Daniel', 'boss', 'p');
  const { id } = (await go('problems', { category: 'materiel', text: 'Savon', photos: [] }, noah)).data;
  assert.equal((await go('problems?mine=1', null, lea)).data.problems.length, 0);
  assert.equal((await go('problems?mine=1', null, noah)).data.problems.length, 1);
  assert.equal((await go('problems', null, noah)).status, 403); // la liste complète : superviseurs seulement
  assert.equal((await go('problems', { action: 'undo', id }, lea)).status, 403);
  assert.equal((await go('problems', { action: 'undo', id }, noah)).status, 200);
  assert.equal((await go('problems', null, boss)).data.problems.length, 0);
});

test('Admin en « Mode employé » : vrais quarts, vu comme un employé; éteint : fantôme et absent', async () => {
  const stores = memoryStores();
  const a = createApi({ getStore: stores, env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p', ADMIN_CODE: 'z' }) });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const sign = async (name, role, code) => (await go('auth', { action: 'signup', name, email: `${name}@x.ca`, password: 'secret1', role, code })).data.token;
  const est = await sign('Esteban', 'admin', 'z'), boss = await sign('Daniel', 'boss', 'p'), emp = await sign('Noah', 'employee', 'e');
  const sh = { date: '2026-10-24', shift: 2, name: 'Esteban', items: [], flags: [] };
  await go('board', sh, est);
  assert.equal((await go('board?dates=2026-10-24', null, boss)).data.days['2026-10-24'].length, 0); // fantôme
  assert.ok(!(await go('users', null, boss)).data.users.some((u) => u.name === 'Esteban')); // absent de l'équipe
  assert.equal((await go('auth', { action: 'workmode', on: true }, emp)).status, 403);
  assert.equal((await go('auth', { action: 'workmode', on: true }, est)).data.user.workMode, true);
  await go('board', sh, est);
  assert.equal((await go('board?dates=2026-10-24', null, boss)).data.days['2026-10-24'].length, 1); // vrai quart
  const seen = (await go('users', null, boss)).data.users.find((u) => u.name === 'Esteban');
  assert.equal(seen.role, 'employee'); // jamais vu comme admin
  assert.ok((await go('roster?from=2026-10-24&to=2026-10-24', null, emp)).data.people.some((p) => p.name === 'Esteban' && p.role === 'employee'));
});

// ---------- Ronde 4 (outils des superviseurs) ----------
const kit = (opts = {}) => {
  const sent = [];
  let now = new Date('2026-10-28T12:00:00-04:00');
  const a = createApi({ getStore: memoryStores(), env: () => ({ TEAM_CODE: 'e', BOSS_CODE: 'p', ADMIN_CODE: 'a' }), clock: () => now, push: { async keys() { return { publicKey: 'P', privateKey: 'Q' }; }, async send(sub, payload) { sent.push({ to: sub.endpoint, ...payload }); } }, ...opts });
  const go = async (path, body, token) => { const r = await a(new Request(`http://x/api/${path}`, { method: body ? 'POST' : 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, data: await r.json() }; };
  const sign = async (name, role = 'employee', code = role === 'boss' ? 'p' : role === 'admin' ? 'a' : 'e') => (await go('auth', { action: 'signup', name, email: `${name.toLowerCase()}@x.ca`, password: 'secret1', role, code })).data.token;
  return { a, go, sign, sent, setNow: (d) => { now = d; } };
};

test('Fiche d’un employé : notes privées et « Signaler » — superviseurs seulement, jamais l’employé', async () => {
  const { go, sign } = kit();
  const boss = await sign('Martine', 'boss'), noah = await sign('Noah'), lea = await sign('Lea');
  assert.equal((await go('people?email=noah@x.ca', null, noah)).status, 403);
  assert.equal((await go('people', { action: 'add', email: 'noah@x.ca', kind: 'note', text: 'x' }, lea)).status, 403);
  assert.equal((await go('people', { action: 'add', email: 'noah@x.ca', kind: 'note', text: '' }, boss)).status, 400);
  await go('people', { action: 'add', email: 'noah@x.ca', kind: 'note', text: 'Préfère les soirs.' }, boss);
  const rep = await go('people', { action: 'add', email: 'noah@x.ca', kind: 'report', cat: 'retard' }, boss);
  assert.equal(rep.data.note.cat, 'retard');
  const notes = (await go('people?email=noah@x.ca', null, boss)).data.notes;
  assert.deepEqual(notes.map((n) => n.kind), ['report', 'note']); // plus récent d'abord
  assert.equal(notes[1].by, 'Martine');
  const all = (await go('people?reports=1', null, boss)).data.reports;
  assert.equal(all.length, 1); assert.equal(all[0].name, 'Noah');
  await go('people', { action: 'del', email: 'noah@x.ca', id: notes[1].id }, boss);
  assert.equal((await go('people?email=noah@x.ca', null, boss)).data.notes.length, 1);
  // l'employé n'a aucune route pour les voir
  assert.ok(!JSON.stringify((await go('auth', null, noah)).data).includes('retard'));
});

test('Coin des superviseurs et idées des employés : chacun voit ce qu’il doit voir', async () => {
  const { go, sign } = kit();
  const boss = await sign('Martine', 'boss'), boss2 = await sign('Patrick', 'boss'), noah = await sign('Noah'), lea = await sign('Lea');
  assert.equal((await go('ideas', { action: 'post', text: 'Le tapis 3 grince.' }, noah)).status, 403);
  await go('ideas', { action: 'post', text: 'Le tapis 3 grince.', about: { kind: 'task', label: 'Cardio' } }, boss);
  const idea = (await go('ideas', { action: 'suggest', text: 'Un 2e seau dans le vestiaire.' }, noah)).data.idea;
  await go('ideas', { action: 'suggest', text: 'Autre idée' }, lea);
  const seen = (await go('ideas', null, boss2)).data.ideas;
  assert.equal(seen.length, 3); // les superviseurs se lisent entre eux, et voient toutes les idées
  assert.ok(!JSON.stringify(seen).includes('@x.ca'));
  const mine = (await go('ideas', null, noah)).data.ideas;
  assert.deepEqual(mine.map((x) => x.text), ['Un 2e seau dans le vestiaire.']); // l'employé : seulement les siennes
  assert.equal((await go('ideas', { action: 'status', id: idea.id, status: 'try' }, noah)).status, 403);
  await go('ideas', { action: 'status', id: idea.id, status: 'worked' }, boss2);
  const back = (await go('ideas', null, noah)).data.ideas[0];
  assert.equal(back.status, 'worked'); assert.equal(back.statusBy, 'Patrick');
  assert.equal((await go('ideas', { action: 'del', id: idea.id }, lea)).status, 403);
  assert.equal((await go('ideas', { action: 'del', id: idea.id }, noah)).status, 200);
});

test('Tâches spéciales qui reviennent chaque semaine (sans fin ou jusqu’à une date), et congés sur plusieurs jours', async () => {
  const { go, sign } = kit();
  const boss = await sign('Martine', 'boss'), noah = await sign('Noah');
  // mercredi 28 oct., chaque semaine jusqu'au 18 nov.
  const t1 = (await go('plan', { action: 'task', date: '2026-10-28', title: 'Laver les fenêtres', minutes: 20, who: 'noah@x.ca', repeat: 'weekly', until: '2026-11-18' }, boss)).data.task;
  await go('plan', { action: 'task', date: '2026-10-29', title: 'Inventaire', minutes: 15, who: '*', repeat: 'weekly' }, boss);
  assert.equal((await go('plan', { action: 'task', date: '2026-10-29', title: 'x', who: '*', repeat: 'weekly', until: '2026-10-01' }, boss)).status, 400);
  const span = (await go('plan?from=2026-10-26&to=2026-12-06', null, noah)).data.tasks;
  assert.deepEqual(span.filter((x) => x.title === 'Laver les fenêtres').map((x) => x.date), ['2026-10-28', '2026-11-04', '2026-11-11', '2026-11-18']);
  assert.equal(span.filter((x) => x.title === 'Inventaire').length, 6);
  // enlever un seul jour, l'annuler, puis toute la série
  await go('plan', { action: 'deltask', date: '2026-11-04', id: t1.id }, boss);
  let w = (await go('plan?from=2026-11-01&to=2026-11-30', null, noah)).data.tasks.filter((x) => x.id === t1.id).map((x) => x.date);
  assert.deepEqual(w, ['2026-11-11', '2026-11-18']);
  await go('plan', { action: 'unskip', date: '2026-11-04', id: t1.id }, boss);
  w = (await go('plan?from=2026-11-01&to=2026-11-30', null, noah)).data.tasks.filter((x) => x.id === t1.id);
  assert.equal(w.length, 3);
  await go('plan', { action: 'deltask', date: '2026-11-04', id: t1.id, all: true }, boss);
  assert.equal((await go('plan?from=2026-10-26&to=2026-12-06', null, noah)).data.tasks.filter((x) => x.id === t1.id).length, 0);
  // congé du lundi au mercredi, ajouté par le superviseur; visible dans l'horaire de l'équipe
  await go('plan', { action: 'override', email: 'noah@x.ca', date: '2026-11-02', to: '2026-11-04', conge: true }, boss);
  const r = (await go('roster?from=2026-11-01&to=2026-11-08', null, noah)).data.people.find((p) => p.name === 'Noah');
  assert.deepEqual(Object.keys(r.overrides), ['2026-11-02', '2026-11-03', '2026-11-04']);
  assert.equal(r.overrides['2026-11-03'].conge, true);
  assert.equal(r.email, undefined); // l'employé ne voit pas les courriels
  assert.equal((await go('roster?from=2026-11-01&to=2026-11-08', null, boss)).data.people.find((p) => p.name === 'Noah').email, 'noah@x.ca');
});

test('Départ d’un employé : accès coupé tout de suite, quarts gardés, et on peut redonner l’accès', async () => {
  const { go, sign } = kit();
  const boss = await sign('Martine', 'boss'), noah = await sign('Noah');
  await go('board', { date: '2026-10-21', shift: 2, name: 'Noah', items: [], flags: [] }, noah);
  await go('users', { action: 'remove', email: 'noah@x.ca' }, boss);
  assert.equal((await go('auth', null, noah)).status, 401); // sa session ne marche plus
  assert.equal((await go('auth', { action: 'login', email: 'noah@x.ca', password: 'secret1' })).status, 401);
  assert.equal((await go('board?recent=5', null, boss)).data.days['2026-10-21'].length, 1); // son quart reste
  const former = (await go('users?former=1', null, boss)).data.former;
  assert.equal(former[0].name, 'Noah'); assert.equal(former[0].removedBy, 'Martine');
  assert.ok(!(await go('users', null, boss)).data.users.some((u) => u.name === 'Noah'));
  await go('users', { action: 'restore', email: 'noah@x.ca' }, boss);
  assert.equal((await go('auth', { action: 'login', email: 'noah@x.ca', password: 'secret1' })).status, 200); // même mot de passe
  assert.equal((await go('users?former=1', null, boss)).data.former.length, 0);
});

test('Notifications : un choix par type, heures calmes 23 h – 6 h sauf l’urgent, résumé de la semaine pour les superviseurs', async () => {
  const { a, go, sign, sent, setNow } = kit();
  const boss = await sign('Martine', 'boss'), noah = await sign('Noah');
  const sub = (who) => ({ action: 'subscribe', sub: { endpoint: `https://p/${who}`, keys: { p256dh: 'k', auth: 'a' } } });
  await go('push', sub('noah'), noah); await go('push', sub('martine'), boss);
  const st = (await go('push', null, noah)).data;
  assert.deepEqual([st.remind, st.sched, st.task, st.quiet], [true, true, true, true]); // par défaut : tout allumé, nuit calme
  await go('push', { action: 'prefs', task: false }, noah);
  await go('plan', { action: 'task', date: '2026-10-29', title: 'Vitres', who: 'noah@x.ca' }, boss);
  assert.ok(!sent.some((x) => /Vitres/.test(x.title))); // il a éteint les tâches
  await go('push', { action: 'prefs', task: true }, noah);
  setNow(new Date('2026-10-28T23:30:00-04:00'));
  await go('plan', { action: 'task', date: '2026-10-29', title: 'La nuit', who: 'noah@x.ca' }, boss);
  assert.ok(!sent.some((x) => /La nuit/.test(x.title))); // heures calmes
  await go('push', { action: 'prefs', quiet: false }, noah);
  await go('plan', { action: 'task', date: '2026-10-29', title: 'Sans calme', who: 'noah@x.ca' }, boss);
  assert.ok(sent.some((x) => /Sans calme/.test(x.title)));
  await go('problems', { method: 'POST', category: 'machine', location: 'Tapis 3', urgent: true }, noah);
  assert.ok(sent.some((x) => x.to === 'https://p/martine' && x.urgent)); // l'urgent passe toujours
  // résumé : dimanche 1er nov., 21 h 05; une fois seulement
  await go('board', { date: '2026-10-31', shift: 2, name: 'Noah', items: [{ id: 'a', status: 'done' }, { id: 'b', status: 'notdone' }], flags: [] }, noah);
  const n0 = sent.length;
  await a.remindDue(new Date('2026-11-01T21:05:00-05:00'));
  const w = sent.slice(n0).filter((x) => x.to === 'https://p/martine');
  assert.equal(w.length, 1); assert.match(w[0].body, /50 %/); assert.match(w[0].body, /1 urgent/);
  assert.ok(!sent.slice(n0).some((x) => x.to === 'https://p/noah' && /semaine/.test(x.title))); // pas pour les employés
  await a.remindDue(new Date('2026-11-01T21:10:00-05:00'));
  assert.equal(sent.filter((x) => /semaine/.test(x.title)).length, 1);
});

// ---------- Ronde 5 (horaires) ----------
test('Congé : l’employé le met lui-même, les superviseurs sont avertis; il ne peut pas enlever celui d’un superviseur', async () => {
  const { go, sign, sent } = kit();
  const boss = await sign('Martine', 'boss'), noah = await sign('Noah');
  const sub = (who) => ({ action: 'subscribe', sub: { endpoint: `https://p/${who}`, keys: { p256dh: 'k', auth: 'a' } } });
  await go('push', sub('martine'), boss);
  assert.equal((await go('plan', { action: 'conge', date: '2026-10-20' }, noah)).status, 400); // pas dans le passé
  const r = await go('plan', { action: 'conge', date: '2026-11-02', to: '2026-11-03' }, noah);
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.data.overrides), ['2026-11-02', '2026-11-03']);
  assert.ok(sent.some((x) => x.to === 'https://p/martine' && /Noah prend congé/.test(x.title)));
  const seen = (await go('plan?team=1&from=2026-11-01&to=2026-11-08', null, boss)).data.overrides['noah@x.ca'];
  assert.equal(seen['2026-11-02'].conge, true); assert.equal(seen['2026-11-02'].by, 'Noah');
  // un congé mis par le superviseur reste
  await go('plan', { action: 'override', email: 'noah@x.ca', date: '2026-11-05', conge: true }, boss);
  await go('plan', { action: 'conge', date: '2026-11-02', to: '2026-11-05', clear: true }, noah);
  const left = (await go('plan?from=2026-11-01&to=2026-11-08', null, noah)).data.overrides['noah@x.ca'];
  assert.deepEqual(Object.keys(left), ['2026-11-05']);
  assert.equal((await go('plan', { action: 'override', email: 'noah@x.ca', date: '2026-11-06', off: true }, noah)).status, 403); // le reste : superviseurs
});

test('Échange de quart (C4) : un collègue accepte, l’échange se fait, les superviseurs sont avertis, on peut annuler', async () => {
  const { a, go, sign, sent } = kit();
  const boss = await sign('Martine', 'boss'), noah = await sign('Noah'), lea = await sign('Lea'), zoe = await sign('Zoe');
  const sub = (who, tk) => go('push', { action: 'subscribe', sub: { endpoint: `https://p/${who}`, keys: { p256dh: 'k', auth: 'a' } } }, tk);
  await sub('martine', boss); await sub('noah', noah); await sub('lea', lea); await sub('zoe', zoe);
  await go('auth', { action: 'schedule', schedule: { 3: { start: '16:30', end: '23:00' } } }, noah); // jeudi
  await go('auth', { action: 'schedule', schedule: { 3: { start: '07:30', end: '15:30' } } }, zoe); // Zoé travaille jeudi
  assert.equal((await go('swaps', { action: 'ask', date: '2026-10-30' }, noah)).status, 400); // vendredi : pas de quart
  const ids = Object.fromEntries((await go('roster?from=2026-10-29&to=2026-10-29', null, noah)).data.people.map((p) => [p.name, p.id]));
  const ask = await go('swaps', { action: 'ask', date: '2026-10-29', to: ids.Lea }, noah);
  assert.equal(ask.status, 200); assert.equal(ask.data.swap.start, '16:30'); assert.equal(ask.data.swap.toName, 'Lea');
  assert.equal((await go('swaps', { action: 'ask', date: '2026-10-29' }, noah)).status, 409); // une demande à la fois
  assert.ok(sent.some((x) => x.to === 'https://p/lea' && /Noah cherche/.test(x.title)));
  assert.ok(!sent.some((x) => x.to === 'https://p/zoe' && /cherche/.test(x.title))); // demandé à Léa seulement
  assert.equal((await go('swaps', null, zoe)).data.swaps.length, 0);
  const forLea = (await go('swaps', null, lea)).data.swaps[0];
  assert.equal(forLea.forMe, true); assert.ok(!JSON.stringify(forLea).includes('@x.ca'));
  assert.equal((await go('swaps', { action: 'accept', id: forLea.id }, zoe)).status, 409); // pas pour Zoé
  const ok = await go('swaps', { action: 'accept', id: forLea.id }, lea);
  assert.equal(ok.data.swap.status, 'done');
  const ppl = (await go('roster?from=2026-10-29&to=2026-10-29', null, boss)).data.people;
  assert.equal(ppl.find((p) => p.name === 'Noah').overrides['2026-10-29'].off, true);
  assert.equal(ppl.find((p) => p.name === 'Lea').overrides['2026-10-29'].start, '16:30');
  assert.ok(sent.some((x) => x.to === 'https://p/noah' && /pris/.test(x.title)));
  assert.ok(sent.some((x) => x.to === 'https://p/martine' && /Lea prend le quart de Noah/.test(x.body))); // superviseur averti, sans approbation
  // le rappel de jeudi suit l'échange : Léa à 16 h 30, pas Noah
  const n0 = sent.length;
  await a.remindDue(new Date('2026-10-29T16:22:00-04:00'));
  assert.deepEqual(sent.slice(n0).map((x) => x.to), ['https://p/lea']);
  // Léa annule (15 min) : tout revient
  await go('swaps', { action: 'undo', id: forLea.id }, lea);
  const back = (await go('roster?from=2026-10-29&to=2026-10-29', null, boss)).data.people;
  assert.equal(back.find((p) => p.name === 'Noah').overrides['2026-10-29'], undefined);
  assert.equal(back.find((p) => p.name === 'Lea').overrides['2026-10-29'], undefined);
  // à toute l'équipe : Zoé travaille déjà ce jour-là → « busy »; Léa dit non (seulement pour elle)
  await go('swaps', { action: 'cancel', id: forLea.id }, noah);
  const all = (await go('swaps', { action: 'ask', date: '2026-10-29', to: '*' }, noah)).data.swap;
  assert.equal((await go('swaps', { action: 'accept', id: all.id }, zoe)).status, 409);
  await go('swaps', { action: 'decline', id: all.id }, lea);
  assert.equal((await go('swaps', null, lea)).data.swaps.filter((s) => s.forMe).length, 0);
  assert.equal((await go('swaps', null, noah)).data.swaps.find((s) => s.id === all.id).status, 'open');
  assert.equal((await go('swaps', null, boss)).data.swaps.length, 2); // les superviseurs voient tout
});

test('Rappel du quart : pas de rappel un jour de congé; horaire vide → un petit rappel le lundi', async () => {
  const { a, go, sign, sent } = kit();
  const boss = await sign('Martine', 'boss'), noah = await sign('Noah'), lea = await sign('Lea');
  for (const [w, tk] of [['noah', noah], ['lea', lea], ['martine', boss]]) await go('push', { action: 'subscribe', sub: { endpoint: `https://p/${w}`, keys: { p256dh: 'k', auth: 'a' } } }, tk);
  await go('auth', { action: 'schedule', schedule: { 3: { start: '16:30', end: '23:00' } } }, noah);
  await go('plan', { action: 'conge', date: '2026-10-29' }, noah);
  const n0 = sent.length;
  await a.remindDue(new Date('2026-10-29T16:22:00-04:00'));
  assert.equal(sent.slice(n0).length, 0);
  await a.remindDue(new Date('2026-11-02T10:05:00-05:00')); // lundi 10 h
  const nudges = sent.filter((x) => /vide/.test(x.title)).map((x) => x.to);
  assert.deepEqual(nudges, ['https://p/lea']); // pas Noah (horaire), pas le superviseur
  await a.remindDue(new Date('2026-11-02T10:10:00-05:00'));
  assert.equal(sent.filter((x) => /vide/.test(x.title)).length, 1);
});
