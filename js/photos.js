// Photos prises pendant le quart : réduites sur le téléphone, puis gardées
// dans IndexedDB jusqu'à l'envoi (un rechargement de Safari ne les perd pas).

const DB = 'gym-shift-photos';
const STORE = 'photos';
const MAX_SIDE = 1280;
const QUALITY = 0.72;

export const MAX_PHOTOS = 8; // limite d'un courriel (~4 Mo)

let dbPromise = null;
const memory = new Map(); // repli si IndexedDB est indisponible

function db() {
  dbPromise ||= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  if (!d) return fn(null);
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export async function putPhoto(id, blob) {
  memory.set(id, blob);
  try { await tx('readwrite', (s) => s?.put(blob, id)); } catch { /* garde la copie en mémoire */ }
}

export async function getPhoto(id) {
  if (memory.has(id)) return memory.get(id);
  try {
    const blob = await tx('readonly', (s) => s?.get(id));
    if (blob) memory.set(id, blob);
    return blob || null;
  } catch {
    return null;
  }
}

export async function deletePhoto(id) {
  memory.delete(id);
  try { await tx('readwrite', (s) => s?.delete(id)); } catch { /* ignore */ }
}

export async function clearPhotos() {
  memory.clear();
  try { await tx('readwrite', (s) => s?.clear()); } catch { /* ignore */ }
}

// Réduit la photo (les photos d'iPhone font souvent 3 à 5 Mo).
export async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Image illisible'));
      i.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
