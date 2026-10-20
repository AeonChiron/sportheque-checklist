// Signalements : envoyés au serveur du site (avec leurs photos), lus par les
// superviseurs. En démo, ils restent sur ce téléphone.

import { session, request, ns } from './auth.js';
import { blobToBase64 } from './photos.js';
import { problemId } from './problem-shape.js';

const DEMO = 'gym-demo-problems';
const readDemo = () => { try { return JSON.parse(localStorage.getItem(ns(DEMO))) || {}; } catch { return {}; } };
const writeDemo = (all) => { try { localStorage.setItem(ns(DEMO), JSON.stringify(all)); } catch { /* plein : les photos sont lourdes */ } };
const dataURL = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

// Envoie un signalement; répond son identifiant (pour le lien du courriel).
export async function createProblem(p, blobs = []) {
  if (session.mode === 'demo') {
    const id = problemId();
    const all = readDemo();
    all[id] = { ...p, id, by: session.user?.name || '', status: 'open', resolvedBy: '', resolvedAt: '', photos: blobs.length, photoData: await Promise.all(blobs.map(dataURL)) };
    writeDemo(all);
    return id;
  }
  const photos = await Promise.all(blobs.map(blobToBase64));
  return (await request('problems', { method: 'POST', body: { ...p, photos }, timeout: 45_000 })).id;
}

export async function listProblems() {
  if (session.mode === 'demo') return Object.values(readDemo()).sort((a, b) => b.id.localeCompare(a.id));
  return (await request('problems')).problems;
}

export async function getProblem(id) {
  if (session.mode === 'demo') {
    const p = readDemo()[id];
    if (!p) throw Object.assign(new Error('missing'), { status: 404 });
    return p;
  }
  return (await request(`problems?id=${encodeURIComponent(id)}`)).problem;
}

export async function setProblemStatus(id, status) {
  if (session.mode === 'demo') {
    const all = readDemo();
    const resolved = status === 'resolved';
    all[id] = { ...all[id], status: resolved ? 'resolved' : 'open', resolvedBy: resolved ? session.user?.name || '' : '', resolvedAt: resolved ? new Date().toISOString() : '' };
    writeDemo(all);
    return all[id];
  }
  return (await request('problems', { method: 'POST', body: { action: 'status', id, status } })).problem;
}

// Adresse affichable d'une photo (le serveur demande le jeton : on passe par un blob).
export async function photoSrc(p, i) {
  if (session.mode === 'demo') return p.photoData?.[i] || '';
  const r = await request(`problems?photo=${encodeURIComponent(`${p.id}-${i}`)}`, { raw: true, timeout: 20_000 });
  return URL.createObjectURL(await r.blob());
}
