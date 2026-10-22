// Génère sw.js à partir de sw.src.js : la liste des fichiers gardés hors ligne, chacun avec
// son empreinte (md5). Un fichier modifié = une nouvelle empreinte = il est retéléchargé.
// Lancer `npm run sw` après chaque changement (le test vérifie que sw.js est à jour).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ls = (dir, re) => readdirSync(ROOT + dir).filter((f) => re.test(f)).map((f) => `${dir}/${f}`);
export const FILES = [
  'index.html', 'styles.css', 'manifest.webmanifest',
  ...ls('js', /\.js$/),
  'vendor/three.module.min.js', 'vendor/qrcode.js',
  'vendor/idb-keyval/index.js', 'vendor/ios-haptics/index.js', 'vendor/ios-haptics/utils.js', 'vendor/auto-animate/index.js',
  ...ls('fonts', /\.woff2$/),
  'icons/icon.svg', 'icons/icon-180.png', 'icons/rabbit.svg', 'icons/rabbit-hello.svg', 'icons/rabbit-cheer.svg', 'icons/rabbit-rest.svg',
  'icons/logo-sportheque.png', 'icons/logo-sportheque-dark.png', 'icons/mark-sportheque.png', 'icons/mark-sportheque-dark.png',
  ...ls('icons/avatars', /\.webp$/),
].sort();

export function manifest() {
  return FILES.map((url) => ({ url, revision: createHash('md5').update(readFileSync(ROOT + url)).digest('hex').slice(0, 12) }));
}
export function build() {
  const src = readFileSync(ROOT + 'sw.src.js', 'utf8');
  return src.replace('self.__WB_MANIFEST', JSON.stringify(manifest(), null, 0).replace(/\},\{/g, '},\n  {'));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(ROOT + 'sw.js', build());
  console.log(`sw.js : ${FILES.length} fichiers`);
}
