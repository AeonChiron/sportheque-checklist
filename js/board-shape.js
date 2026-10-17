// Forme d'un quart enregistré dans l'historique partagé. Fonctions pures,
// partagées par le navigateur et le serveur : on ne garde que les champs
// attendus, avec des longueurs bornées. Les photos d'un problème restent
// avec son signalement (id), pas dans le quart.

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const count = (v) => (Number.isInteger(v) && v >= 0 && v <= 99 ? v : null);
const STATUSES = new Set(['done', 'notdone', 'unchecked']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeShift(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!DATE.test(raw.date) || ![1, 2].includes(raw.shift)) return null;
  const name = str(raw.name, 40).trim();
  if (!name) return null;
  return {
    date: raw.date,
    shift: raw.shift,
    name,
    supervisor: str(raw.supervisor, 40).trim(),
    start: str(raw.start, 5),
    end: str(raw.end, 5),
    submittedAt: str(raw.submittedAt, 30),
    notes: str(raw.notes, 1000),
    done: count(raw.done),
    total: count(raw.total),
    items: (Array.isArray(raw.items) ? raw.items : []).slice(0, 40).map((i) => ({
      id: str(i?.id, 40),
      status: STATUSES.has(i?.status) ? i.status : 'unchecked',
      doneAt: str(i?.doneAt, 30),
      reason: str(i?.reason, 20),
      remark: str(i?.remark, 300),
    })).filter((i) => i.id),
    flags: (Array.isArray(raw.flags) ? raw.flags : []).slice(0, 20).map((f) => ({
      id: /^[a-z0-9]{10,20}$/.test(f?.id || '') ? f.id : '',
      category: str(f?.category, 20),
      location: str(f?.location, 80),
      text: str(f?.text, 400),
      at: str(f?.at, 30),
      urgent: f?.urgent === true,
      emailed: f?.emailed === true,
      photos: Number.isInteger(f?.photos) && f.photos >= 0 && f.photos <= 8 ? f.photos : 0,
    })).filter((f) => f.text),
  };
}

const key = (s) => `${s.shift}|${s.name.toLowerCase()}`;

// Un quart par personne, par quart, par jour : le plus récent remplace l'ancien.
export function mergeShift(list, shift) {
  return [...list.filter((s) => key(s) !== key(shift)), shift].slice(-20);
}

// Le dossier d'un jour : ce que le tableau partagé connaît, plus ce que ce
// téléphone garde (ses envois, les rapports ouverts depuis un courriel).
// La copie locale l'emporte si elle est aussi récente : elle seule a le
// rapport complet.
export function combineDay(remote, local) {
  const map = new Map(remote.map((s) => [key(s), s]));
  for (const s of local) {
    const r = map.get(key(s));
    if (!r || (s.submittedAt || '') >= (r.submittedAt || '')) map.set(key(s), s);
  }
  return [...map.values()].sort((a, b) => a.shift - b.shift || (a.submittedAt || '').localeCompare(b.submittedAt || ''));
}

// ?dates=AAAA-MM-JJ,AAAA-MM-JJ… (une semaine, au plus 14 jours).
export function parseDates(param) {
  const list = String(param || '').split(',').filter((d) => DATE.test(d));
  return [...new Set(list)].slice(0, 14);
}

// Les derniers quarts enregistrés, du plus récent au plus ancien, tous jours
// confondus (l'historique ne montre que ce qui a été enregistré : pas de
// journées vides). byDate : { date: [quarts] } (tableau partagé, puis ce téléphone).
export function recentShifts(remoteByDate, localByDate, n = 40) {
  const dates = [...new Set([...Object.keys(remoteByDate || {}), ...Object.keys(localByDate || {})])].filter((d) => DATE.test(d));
  const all = dates.flatMap((d) => combineDay(remoteByDate?.[d] || [], localByDate?.[d] || []));
  return all
    .sort((a, b) => (b.submittedAt || b.date).localeCompare(a.submittedAt || a.date) || b.date.localeCompare(a.date))
    .slice(0, Math.max(1, Math.min(n, 200)));
}
