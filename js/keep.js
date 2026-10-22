// Sauvegarde solide sur le téléphone (idb-keyval, Jake Archibald).
// L'app écrit dans localStorage (simple et rapide). Safari peut vider ce petit espace :
// chaque écriture est donc recopiée dans IndexedDB, plus solide, et au démarrage tout ce
// qui manque dans localStorage est remis. Un effacement voulu (déconnexion, « Effacer »)
// est recopié aussi : rien d'effacé ne revient.
import { createStore, entries, set, del, clear } from '../vendor/idb-keyval/index.js';

let store = null;
try { store = createStore('sportheque-keep', 'kv'); } catch { /* pas d'IndexedDB (mode privé) */ }

const quiet = (p) => p?.catch?.(() => {});
function hook() {
  if (!store || typeof Storage === 'undefined') return;
  const P = Storage.prototype, setItem = P.setItem, removeItem = P.removeItem, clearAll = P.clear;
  P.setItem = function (k, v) { setItem.call(this, k, v); if (this === localStorage) quiet(set(String(k), String(v), store)); };
  P.removeItem = function (k) { removeItem.call(this, k); if (this === localStorage) quiet(del(String(k), store)); };
  P.clear = function () { clearAll.call(this); if (this === localStorage) quiet(clear(store)); };
}

export async function restore() {
  if (!store) return 0;
  let n = 0;
  try {
    const all = await Promise.race([entries(store), new Promise((r) => setTimeout(() => r([]), 1500))]);
    for (const [k, v] of all) if (localStorage.getItem(k) == null) { localStorage.setItem(k, v); n += 1; }
    // Première fois : on recopie ce qui existe déjà.
    if (!all.length) for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); quiet(set(k, localStorage.getItem(k), store)); }
  } catch { /* on continue sans */ }
  return n;
}

// Demande au navigateur de ne pas effacer les données de l'app quand l'espace manque.
try { navigator.storage?.persist?.().catch?.(() => {}); } catch { /* ignore */ }

export const ready = restore().then((n) => { hook(); return n; });
