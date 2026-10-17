import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan } from '../js/planner.js';
import { buildReport, renderReportHtml, renderReportText } from '../js/report.js';
import handler from '../api/send-report.js';

const plan = buildPlan({ shift: 2, date: '2026-10-21', start: '16:30', end: '23:00' });
const state = {
  name: 'Test',
  tasks: { 'q2-poubelles': { skipped: true, reason: 'materiel', remark: 'Plus de sacs', photos: ['a'] } },
  flags: [{ category: 'equipement', location: 'Tapis 3', text: 'Courroie <b>', at: '2026-10-21T23:00:00Z', photos: ['b'] }],
  notes: '',
  supervisor: 'Mathieu',
};
const names = new Map([['b', 'photo-1.jpg'], ['a', 'photo-2.jpg']]);

test('Le rapport relie chaque photo à sa tâche ou à son signalement', () => {
  const r = buildReport(plan, state, names);
  assert.deepEqual(r.flags[0].photos, ['photo-1.jpg']);
  assert.deepEqual(r.items.find((i) => i.title.startsWith('Poubelles')).photos, ['photo-2.jpg']);
  assert.match(renderReportText(r), /Photos jointes : photo-2\.jpg/);
  const html = renderReportHtml(r);
  assert.match(html, /📎 photo-1\.jpg/);
  assert.match(html, /Courroie &lt;b&gt;/); // texte échappé
});

function call(body) {
  process.env.RESEND_API_KEY = 'k'; process.env.SUPERVISOR_EMAIL = 'x@example.com'; process.env.REPORT_FROM = 'y@example.com';
  const res = { code: 0, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } };
  return handler({ method: 'POST', body }, res).then(() => res);
}

test('Le serveur joint les photos et refuse les noms de fichiers inattendus', async () => {
  const r = buildReport(plan, state, names);
  let sent;
  globalThis.fetch = async (_url, opts) => { sent = JSON.parse(opts.body); return { ok: true }; };
  const ok = await call({ ...r, attachments: [{ filename: 'photo-1.jpg', content: 'QUJD' }] });
  assert.equal(ok.code, 200);
  assert.deepEqual(sent.attachments, [{ filename: 'photo-1.jpg', content: 'QUJD' }]);
  assert.deepEqual(sent.to, ['x@example.com']);
  const bad = await call({ ...r, attachments: [{ filename: '../evil.exe', content: 'QUJD' }] });
  assert.equal(bad.code, 400);
});

test('Rapport en anglais : libellés traduits, remarques de l’employé intactes', () => {
  const en = buildPlan({ shift: 2, date: '2026-10-21', start: '16:30', end: '23:00', lang: 'en' });
  const r = buildReport(en, state, names);
  assert.equal(r.supervisor, 'Mathieu');
  const poub = r.items.find((i) => i.title.startsWith('Trash'));
  assert.equal(poub.reason, 'Missing supplies');
  assert.equal(poub.remark, 'Plus de sacs'); // jamais traduit
  const txt = renderReportText(r);
  assert.match(txt, /To : Mathieu/);
  assert.match(txt, /Note : Plus de sacs/);
  assert.match(renderReportHtml(r), /Shift report/);
});
