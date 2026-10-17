// Forme d'un quart envoyé au tableau partagé (Aperçu). Fonction pure,
// partagée par le navigateur et la fonction serveur : on ne garde que les
// champs attendus, avec des longueurs bornées.

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const STATUSES = new Set(['done', 'notdone', 'unchecked']);

export function sanitizeShift(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.date) || ![1, 2].includes(raw.shift)) return null;
  const name = str(raw.name, 40).trim();
  if (!name) return null;
  return {
    date: raw.date,
    shift: raw.shift,
    name,
    start: str(raw.start, 5),
    end: str(raw.end, 5),
    submittedAt: str(raw.submittedAt, 30),
    items: (Array.isArray(raw.items) ? raw.items : []).slice(0, 40).map((i) => ({
      id: str(i?.id, 40),
      status: STATUSES.has(i?.status) ? i.status : 'unchecked',
      doneAt: str(i?.doneAt, 30),
      reason: str(i?.reason, 20),
    })).filter((i) => i.id),
    flags: (Array.isArray(raw.flags) ? raw.flags : []).slice(0, 20).map((f) => ({
      category: str(f?.category, 20),
      location: str(f?.location, 80),
      text: str(f?.text, 400),
      at: str(f?.at, 30),
    })).filter((f) => f.text),
  };
}

// Un quart par personne, par quart, par jour : le plus récent remplace l'ancien.
export function mergeShift(list, shift) {
  const key = (s) => `${s.shift}|${s.name.toLowerCase()}`;
  return [...list.filter((s) => key(s) !== key(shift)), shift].slice(-20);
}
