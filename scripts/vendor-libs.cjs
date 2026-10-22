// Reconstruit vendor/ (idb-keyval, ios-haptics, auto-animate, workbox) depuis les sources GitHub.
// Le site n'a pas d'étape de build : ces bibliothèques sont gardées toutes faites dans vendor/.
//   git clone --depth 1 https://github.com/jakearchibald/idb-keyval   (v6.3.0)
//   git clone --depth 1 https://github.com/tijnjh/ios-haptics          (v3.2.0)
//   git clone --depth 1 https://github.com/formkit/auto-animate        (v0.10.0)
//   git clone --depth 1 https://github.com/GoogleChrome/workbox        (v7.4.1)
//   node scripts/vendor-libs.cjs <dossier des clones>   (TypeScript requis)
process.chdir(process.argv[2]);
const ts = require(process.env.TS || 'typescript');
const fs = require('fs'), path = require('path');
const OUT = require('path').join(__dirname, '..', 'vendor');
const tr = (src) => ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.ES2020, removeComments: false } }).outputText;
function one(file, out, fix = (s) => s) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, fix(tr(fs.readFileSync(file, 'utf8')))); }
// idb-keyval
one('idb-keyval/src/index.ts', `${OUT}/idb-keyval/index.js`);
fs.copyFileSync('idb-keyval/LICENCE', `${OUT}/idb-keyval/LICENCE`);
// ios-haptics
one('ios-haptics/src/utils.ts', `${OUT}/ios-haptics/utils.js`);
one('ios-haptics/src/index.ts', `${OUT}/ios-haptics/index.js`, (s) => s.replace("from './utils'", "from './utils.js'"));
fs.copyFileSync('ios-haptics/LICENSE', `${OUT}/ios-haptics/LICENSE`);
// auto-animate
one('auto-animate/src/index.ts', `${OUT}/auto-animate/index.js`);
fs.copyFileSync('auto-animate/LICENSE', `${OUT}/auto-animate/LICENSE`);
// workbox (core, routing, strategies, precaching) en modules ES
const W = `${OUT}/workbox`;
for (const pkg of ['workbox-core', 'workbox-routing', 'workbox-strategies', 'workbox-precaching']) {
  const base = `workbox/packages/${pkg}/src`;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk(base).filter((f) => f.endsWith('.ts'))) {
    const rel = path.relative(base, f).replace(/\.ts$/, '.js');
    const outFile = path.join(W, pkg, rel);
    one(f, outFile, (s) => s
      .replace(/process\.env\.NODE_ENV/g, '"production"')
      .replace(/from '(workbox-[a-z-]+)\/([^']+)'/g, (m, p, r) => `from '${path.relative(path.dirname(outFile), path.join(W, p, r)).replace(/^(?!\.)/, './')}'`)
      .replace(/from '(\.[^']+?)'/g, (m, r) => r.endsWith('.js') ? m : `from '${r}.js'`));
  }
}
fs.copyFileSync('workbox/LICENSE', `${W}/LICENSE`);

// Les imports de types (effacés à la compilation) ne doivent pas rester dans le JS.
const exportsOf = (f) => { const s = fs.readFileSync(f, 'utf8'); const out = new Set();
  for (const m of s.matchAll(/export (?:default )?(?:async )?(?:function\*?|class|const|let|var) ([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  if (/export default/.test(s)) out.add('default');
  for (const m of s.matchAll(/export \{([^}]*)\}/g)) for (const p of m[1].split(',')) { const t = p.trim(); if (t) out.add(t.split(/\s+as\s+/).pop().trim()); }
  return out; };
const walkAll = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walkAll(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walkAll(W).filter((f) => f.endsWith('.js'))) {
  let s = fs.readFileSync(f, 'utf8'); const dropped = [];
  s = s.replace(/import \{([^}]*)\} from '(\.[^']+)';/g, (all, names, src) => { const have = exportsOf(path.join(path.dirname(f), src)); const keep = names.split(',').map((x) => x.trim()).filter(Boolean).filter((x) => { const ok = have.has(x.split(/\s+as\s+/)[0].trim()); if (!ok) dropped.push(x.split(/\s+as\s+/).pop().trim()); return ok; }); return keep.length ? `import { ${keep.join(', ')} } from '${src}';` : ''; });
  if (dropped.length) { s = s.replace(/export \{([^}]*)\};/g, (all, names) => `export { ${names.split(',').map((x) => x.trim()).filter((x) => x && !dropped.includes(x)).join(', ')} };`); fs.writeFileSync(f, s); }
}
console.log('vendor/ reconstruit');
