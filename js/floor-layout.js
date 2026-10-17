// Disposition du 2e étage : une seule source pour le plan (SVG) et la vue 3D.
// Unités du plan : 360 × 280, x vers la droite, y vers le bas (vers le mur
// des vestiaires). Corrigée avec l'équipe : les trois zones prennent presque
// tout l'étage (A = toute la moitié du bas), les pièces sont petites;
// vestiaire des hommes au mur de gauche, spinning dans le coin en bas à
// droite, porte entre C et B; tout le cardio est tourné vers le haut, grand
// tapis d'étirement gris en haut à droite de A, miroirs à gauche et à droite.

export const BUILDING = { x: 4, y: 4, w: 352, h: 272 };

export const ZONES = {
  C: { x: 26, y: 10, w: 150, h: 118, floor: 'rubber' },
  B: { x: 188, y: 10, w: 164, h: 118, floor: 'rubber' },
  A: { x: 26, y: 140, w: 308, h: 122, floor: 'wood' },
};

// Pièces (petites : les zones comptent plus) : rectangle + porte.
export const ROOMS = {
  5: { x: 4, y: 200, w: 18, h: 76, door: { side: 'right', from: 214, to: 228 }, vertical: true },
  2: { x: 60, y: 264, w: 90, h: 12, door: { side: 'top', from: 80, to: 130 }, open: true },
  3: { x: 160, y: 264, w: 150, h: 12, door: { side: 'top', from: 280, to: 296 } },
  4: { x: 336, y: 190, w: 20, h: 86, door: { side: 'left', from: 200, to: 214 }, vertical: true },
};

// Ouvertures dans le mur extérieur.
export const DOORS = {
  entrance: { side: 'left', from: 146, to: 190 },
  top: { side: 'top', from: 176, to: 188 },
};

// Équipement : centre (x, y), taille (w, h) au sol, rotation en degrés.
// rot 0 : l'avant (console) vers le bas; rot 180 : vers le haut (le cardio).
export const GEAR = [
  // C : haut du corps
  { t: 'pulley', x: 160, y: 40, w: 20, h: 40 },
  { t: 'platform', x: 92, y: 82, w: 120, h: 24 },
  ...[44, 68, 92, 116, 140].map((x) => ({ t: 'machine', x, y: 82, w: 14, h: 12 })),
  { t: 'press', x: 62, y: 112, w: 22, h: 26 },
  { t: 'press', x: 118, y: 112, w: 22, h: 26 },
  { t: 'rack', x: 168, y: 96, w: 6, h: 56 },
  // B : bas du corps (cages et machines à jambes dans le coin gauche, vers le centre)
  { t: 'rack', x: 325, y: 15, w: 50, h: 6 },
  { t: 'rack', x: 345, y: 72, w: 6, h: 96 },
  { t: 'platform', x: 234, y: 98, w: 80, h: 48 },
  { t: 'squat', x: 210, y: 88, w: 18, h: 18 },
  { t: 'squat', x: 238, y: 88, w: 18, h: 18 },
  { t: 'machine', x: 264, y: 94, w: 12, h: 30 },
  { t: 'machine', x: 224, y: 113, w: 44, h: 12 },
  ...[48, 68, 88].map((y) => ({ t: 'bench', x: 305, y, w: 34, h: 6 })),
  { t: 'plates', x: 310, y: 112, w: 14, h: 14 },
  // A, gauche : 3 rangées de cardio tournées vers le haut, 2 rameurs, miroir au mur
  { t: 'mirror', x: 28.5, y: 212, w: 3, h: 88 },
  ...[70, 94, 118, 142].map((x) => ({ t: 'tv', x, y: 142, w: 14, h: 2.5 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'treadmill', x, y: 186, w: 12, h: 28, rot: 180 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'elliptical', x, y: 220, w: 9, h: 24, rot: 180 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'stair', x, y: 248, w: 10, h: 13, rot: 180 })),
  { t: 'rower', x: 158, y: 216, w: 6, h: 40, rot: 180 },
  { t: 'rower', x: 172, y: 216, w: 6, h: 40, rot: 180 },
  // A, droite : grand tapis d'étirement en haut, 3 rangées de cardio dessous, grand miroir
  { t: 'carpet', x: 260, y: 172, w: 130, h: 50 },
  ...[208, 230, 252, 274, 296, 318].flatMap((x) => [207, 229, 251].map((y, i) => ({ t: i === 1 ? 'stair' : 'bike', x, y, w: i === 1 ? 10 : 8, h: i === 1 ? 13 : 18, rot: 180 }))),
  { t: 'mirror', x: 331, y: 202, w: 3, h: 104 },
];

// Le trajet depuis l'entrée, par les allées, jusqu'à la porte du haut.
export const WALK = 'M8 168H24V134H182V6';
