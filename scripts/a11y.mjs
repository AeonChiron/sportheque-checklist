// Vérification d'accessibilité (axe-core, Deque) sur les écrans principaux, clair et sombre.
// Texte trop pâle, bouton sans nom, champ sans étiquette… + cibles tactiles trop petites.
// Usage : serveur local lancé (PORT=3200 node dev-server.js), puis `npm run a11y`.
// axe-core vient de tests/vendor/axe.min.js (outil de test seulement, pas envoyé aux téléphones).
import { readFileSync } from 'node:fs';
import { chromium, devices } from '/opt/node-tools/node_modules/playwright/index.mjs';

const B = process.env.BASE || 'http://localhost:3200';
const AXE = readFileSync(new URL('../tests/vendor/axe.min.js', import.meta.url), 'utf8');
const api = async (path, body, token) => (await fetch(`${B}/api/${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })).json();
const browser = await chromium.launch();
const problems = [];

async function as(role, code, theme) {
  const ctx = await browser.newContext({ ...devices['iPhone 13 mini'] });
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-10-21T19:00:00-04:00') });
  if (role) {
    const su = await api('auth', { action: 'signup', name: role === 'boss' ? 'Daniel' : 'Marie', email: `${role}${Date.now()}${Math.random()}@x.ca`, password: 'secret1', role, code });
    const user = (await api('auth', null, su.token)).user;
    await p.addInitScript(([tok, u, th]) => {
      if (localStorage.getItem('seeded')) return; localStorage.setItem('seeded', '1');
      localStorage.setItem('gym-auth', JSON.stringify({ token: tok, user: u, remember: true }));
      localStorage.setItem('gym-auth-mode', 'accounts');
      localStorage.setItem('gym-shift-prefs', JSON.stringify({ lang: 'fr', theme: th, swipeSeen: true, welcomed: { [u.email]: true }, installSeen: true, schedules: { [u.email]: { 2: 'soir-court' } } }));
    }, [su.token, user, theme]);
  } else {
    await p.addInitScript((th) => localStorage.setItem('gym-shift-prefs', JSON.stringify({ lang: 'fr', theme: th })), theme);
  }
  return p;
}
async function check(p, name) {
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(async () => {
    const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, resultTypes: ['violations'] });
    // axe 3.5 ne lit pas color-mix() : ces mesures « NaN » sont ignorées (pas de vrai résultat).
    return res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(' ') + (n.any?.[0]?.message ? ` — ${n.any[0].message}` : '')).filter((x) => !x.includes('NaN')).slice(0, 4) })).filter((v) => v.nodes.length);
  });
  // Cibles tactiles (WCAG 2.2 : 24 px minimum)
  const small = await p.evaluate(() => [...document.querySelectorAll('button, a[href], [role="button"], [role="switch"], input, select')]
    .filter((el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width && r.height && st.visibility !== 'hidden' && el.offsetParent && (r.width < 24 || r.height < 24) && !el.closest('[data-haptic-trigger]'); })
    .slice(0, 6).map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`));
  if (small.length) r.push({ id: 'target-size', impact: 'serious', help: 'Cible tactile < 24 px', nodes: small });
  for (const v of r) problems.push({ screen: name, ...v });
}

for (const theme of ['light', 'dark']) {
  const out = await as(null, null, theme);
  await out.goto(B); await out.waitForTimeout(2000); await check(out, `accueil (${theme})`);
  const e = await as('employee', 'equipe', theme);
  await e.goto(B); await e.waitForTimeout(2500); await check(e, `liste de tâches (${theme})`);
  await e.click('[data-settings]:visible'); await e.waitForTimeout(700); await check(e, `réglages (${theme})`);
  const d = await as('boss', 'patron', theme);
  await d.goto(B); await d.waitForTimeout(2500); await check(d, `superviseur (${theme})`);
}
await browser.close();
const serious = problems.filter((x) => ['serious', 'critical'].includes(x.impact));
for (const x of problems) console.log(`[${x.impact}] ${x.screen} · ${x.id} : ${x.help}\n   ${x.nodes.join('\n   ')}`);
console.log(`\n${problems.length} problème(s), dont ${serious.length} sérieux`);
process.exitCode = serious.length ? 1 : 0;
