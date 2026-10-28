// Les jours fériés du Québec (Loi sur les normes du travail), calculés ici : pas besoin d'internet.
// Propriétaire (Q49) : « pour chaque jour férié officiel du Québec, un avis spécial ».
// Pâques : l'employeur choisit le vendredi saint OU le lundi de Pâques; on montre les deux, avec la note.

// Le dimanche de Pâques (calendrier grégorien, méthode anonyme).
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (d, n) => new Date(d.getTime() + n * 864e5);
// Le n-ième lundi d'un mois (n = 1, 2…).
const nthMonday = (y, m, n) => { const first = new Date(Date.UTC(y, m - 1, 1)); const off = (8 - first.getUTCDay()) % 7; return new Date(Date.UTC(y, m - 1, 1 + off + 7 * (n - 1))); };
// Le lundi avant le 25 mai (Journée nationale des patriotes).
const patriotes = (y) => { const d = new Date(Date.UTC(y, 4, 24)); while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() - 1); return d; };

const NAMES = {
  an: { fr: 'Jour de l’An', en: 'New Year’s Day' },
  vendredi: { fr: 'Vendredi saint', en: 'Good Friday' },
  lundi: { fr: 'Lundi de Pâques', en: 'Easter Monday' },
  patriotes: { fr: 'Journée nationale des patriotes', en: 'National Patriots’ Day' },
  nationale: { fr: 'Fête nationale du Québec', en: 'Québec’s National Holiday' },
  canada: { fr: 'Fête du Canada', en: 'Canada Day' },
  travail: { fr: 'Fête du Travail', en: 'Labour Day' },
  grace: { fr: 'Action de grâce', en: 'Thanksgiving' },
  noel: { fr: 'Noël', en: 'Christmas Day' },
};

const cache = {};
function yearList(y) {
  if (cache[y]) return cache[y];
  const e = easter(y);
  cache[y] = {
    [`${y}-01-01`]: 'an',
    [iso(plus(e, -2))]: 'vendredi',
    [iso(plus(e, 1))]: 'lundi',
    [iso(patriotes(y))]: 'patriotes',
    [`${y}-06-24`]: 'nationale',
    [`${y}-07-01`]: 'canada',
    [iso(nthMonday(y, 9, 1))]: 'travail',
    [iso(nthMonday(y, 10, 2))]: 'grace',
    [`${y}-12-25`]: 'noel',
  };
  return cache[y];
}

// { id, name, easter } pour une date « AAAA-MM-JJ », ou null.
export function holidayOf(date, lang = 'fr') {
  const id = yearList(Number(String(date).slice(0, 4)))[date];
  if (!id) return null;
  return { id, name: NAMES[id][lang === 'en' ? 'en' : 'fr'], easter: id === 'vendredi' || id === 'lundi' };
}
// Le prochain jour férié entre deux dates (incluses), ou null.
export function holidayBetween(from, to, lang = 'fr') {
  for (let d = new Date(`${from}T12:00:00Z`); iso(d) <= to; d = plus(d, 1)) {
    const h = holidayOf(iso(d), lang);
    if (h) return { date: iso(d), ...h };
  }
  return null;
}
