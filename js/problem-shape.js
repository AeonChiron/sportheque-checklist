// Signalements : les catégories proposées à l'employé et la forme d'un
// signalement enregistré. Fonctions pures, partagées par le navigateur et le
// serveur. urgent : choix proposé par défaut (l'employé peut changer).

export const CATEGORIES = {
  difficile: { fr: 'Tâche difficile', en: 'Hard task', urgent: false }, // épuisante, ou quelque chose qui accroche
  machine: { fr: 'Machine brisée', en: 'Broken machine', urgent: true },
  degat: { fr: 'Dégât ou plancher glissant', en: 'Spill or slippery floor', urgent: true },
  blessure: { fr: 'Blessure', en: 'Injury', urgent: true },
  altercation: { fr: 'Altercation', en: 'Altercation', urgent: true },
  materiel: { fr: 'Matériel manquant', en: 'Missing supplies', urgent: false },
  toilettes: { fr: 'Toilettes ou vestiaire', en: 'Washroom or locker room', urgent: false },
  batiment: { fr: 'Bâtiment (lumière, porte, fuite)', en: 'Building (light, door, leak)', urgent: false },
  objet: { fr: 'Objet trouvé ou oublié', en: 'Lost or found item', urgent: false },
  app: { fr: 'Idée ou bug de l’app', en: 'App idea or bug', urgent: false },
  autre: { fr: 'Autre', en: 'Other', urgent: false },
};

// Anciennes catégories (quarts enregistrés avant la nouvelle liste) : affichage seulement.
export const LEGACY_CATEGORIES = {
  equipement: { fr: 'Équipement brisé', en: 'Broken equipment' },
  fournitures: { fr: 'Fournitures manquantes', en: 'Missing supplies' },
  securite: { fr: 'Danger / sécurité', en: 'Hazard / safety' },
};

export const ALL_CATEGORIES = { ...CATEGORIES, ...LEGACY_CATEGORIES };

export const MAX_PROBLEM_PHOTOS = 3;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Ce que l'employé envoie (le serveur ajoute l'identifiant, l'auteur et le statut).
export function sanitizeProblem(raw) {
  if (!raw || typeof raw !== 'object' || !CATEGORIES[raw.category]) return null;
  const text = str(raw.text, 600);
  if ((raw.category === 'autre' || raw.category === 'app') && !text) return null;
  return {
    category: raw.category,
    location: str(raw.location, 80),
    text,
    urgent: raw.urgent === true,
    at: str(raw.at, 30) || new Date().toISOString(),
    shiftDate: DATE.test(raw.shiftDate) ? raw.shiftDate : '',
    shift: [1, 2].includes(raw.shift) ? raw.shift : null,
  };
}

// Identifiant triable par date (le plus récent a la plus grande clé).
export const problemId = (now = Date.now()) => `${now.toString(36).padStart(9, '0')}${Math.random().toString(36).slice(2, 7)}`;
export const PROBLEM_ID = /^[a-z0-9]{10,20}$/;
