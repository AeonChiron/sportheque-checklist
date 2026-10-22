// Écrans de démarrage iPhone/iPad (« splash ») et lignes <link> pour index.html.
// Même méthode et même liste d'appareils Apple que pwa-asset-generator (elegantapp,
// src/config/apple-fallback-data.json) : une page rendue par Chromium à la taille exacte
// de chaque écran, en clair et en sombre. Relancer après un changement de logo :
//   node scripts/splash.mjs <chemin vers apple-fallback-data.json>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const devices = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const seen = new Set();
const shots = [];
for (const d of devices) {
  const ipad = /iPad/.test(d.device);
  for (const o of ipad ? ['portrait', 'landscape'] : ['portrait']) {
    const { width, height } = d[o];
    const key = `${width}x${height}@${d.scaleFactor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    shots.push({ w: width, h: height, s: d.scaleFactor, o });
  }
}
const THEMES = {
  light: { bg: '#f4f6fb', logo: 'logo-sportheque.png', ink: '#5b6b70' },
  dark: { bg: '#0a1416', logo: 'logo-sportheque-dark.png', ink: '#8fa3a8' },
};
mkdirSync(ROOT + 'icons/splash', { recursive: true });
const browser = await chromium.launch();
const links = [];
for (const [theme, T] of Object.entries(THEMES)) {
  const logo = 'data:image/png;base64,' + readFileSync(ROOT + 'icons/' + T.logo).toString('base64');
  for (const x of shots) {
    const cw = Math.round(x.w / x.s), ch = Math.round(x.h / x.s);
    const page = await browser.newPage({ viewport: { width: cw, height: ch }, deviceScaleFactor: x.s });
    await page.setContent(`<html><body style="margin:0;height:100vh;display:grid;place-items:center;background:${T.bg}">
      <img src="${logo}" style="width:${Math.min(cw * 0.56, 420)}px;height:auto"></body></html>`);
    await page.waitForTimeout(50);
    const file = `icons/splash/${theme}-${x.w}x${x.h}.jpg`;
    await page.screenshot({ path: ROOT + file, type: 'jpeg', quality: 82 });
    await page.close();
    links.push(`  <link rel="apple-touch-startup-image" href="${file}" media="(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${x.s}) and (orientation: ${x.o}) and (prefers-color-scheme: ${theme})">`);
  }
}
await browser.close();
// Remplace le bloc entre les repères dans index.html
const html = readFileSync(ROOT + 'index.html', 'utf8');
const block = `  <!-- splash:start (scripts/splash.mjs) -->\n${links.join('\n')}\n  <!-- splash:end -->`;
const out = html.includes('<!-- splash:start') ? html.replace(/  <!-- splash:start[\s\S]*?<!-- splash:end -->/, block) : html.replace('  <link rel="apple-touch-icon"', `${block}\n  <link rel="apple-touch-icon"`);
writeFileSync(ROOT + 'index.html', out);
console.log(`${links.length} écrans de démarrage`);
