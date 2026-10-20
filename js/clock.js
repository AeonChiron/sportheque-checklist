// Heure simulée (outil de l'admin pour tester) : tout le site voit l'heure
// décalée, sur ce téléphone seulement. Chargé avant le reste de l'app.
// prefs.clockOffset = millisecondes à ajouter à l'heure réelle (absent = heure réelle).

const offset = (() => {
  try { return Number(JSON.parse(localStorage.getItem('gym-shift-prefs'))?.clockOffset) || 0; } catch { return 0; }
})();

if (offset) {
  const Real = Date;
  class SimDate extends Real {
    constructor(...args) { super(...(args.length ? args : [Real.now() + offset])); }
    static now() { return Real.now() + offset; }
  }
  globalThis.Date = SimDate;
}

export const simulated = Boolean(offset);
