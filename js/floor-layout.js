// Disposition du 2e étage : une seule source pour le plan (SVG) et la vue 3D.
// Unités du plan : 360 × 280, x vers la droite, y vers le bas (vers le mur
// des vestiaires). Corrigée avec l'équipe et ses photos : les trois zones prennent presque
// tout l'étage (A = toute la moitié du bas), les pièces sont petites;
// vestiaire des hommes au mur de gauche, spinning dans le coin en bas à
// droite, porte entre C et B; tout le cardio est tourné vers le haut, grand
// tapis d'étirement gris en haut à droite de A, miroirs à gauche et à droite.

export const BUILDING = { x: 4, y: 4, w: 352, h: 272 };

export const ZONES = {
  C: { x: 26, y: 10, w: 150, h: 118, floor: 'wood' },
  B: { x: 188, y: 10, w: 164, h: 118, floor: 'wood' },
  A: { x: 26, y: 140, w: 314, h: 122, floor: 'wood' },
};

// Pièces (petites : les zones comptent plus) : rectangle + porte.
export const ROOMS = {
  5: { x: 4, y: 200, w: 18, h: 76, door: { side: 'right', from: 214, to: 228 }, vertical: true },
  2: { x: 60, y: 264, w: 90, h: 12, door: { side: 'top', from: 80, to: 130 }, open: true },
  3: { x: 160, y: 264, w: 150, h: 12, door: { side: 'top', from: 280, to: 296 } },
  4: { x: 342, y: 212, w: 14, h: 64, door: { side: 'left', from: 222, to: 236 }, vertical: true },
};

// Ouvertures dans le mur extérieur.
export const DOORS = {
  entrance: { side: 'left', from: 146, to: 190 },
  top: { side: 'top', from: 176, to: 188 },
};

// Cloison entre les poids (en haut) et le cardio (en bas), avec une ouverture
// au centre; les télés du cardio y sont accrochées.
export const PARTITIONS = [[26, 134, 160, 134], [200, 134, 352, 134]];

// Équipement : centre (x, y), taille (w, h) au sol, rotation en degrés.
// rot 0 : l'avant (console) vers le bas; rot 180 : vers le haut (le cardio).
export const GEAR = [
  // C : haut du corps — machines blanches à charge guidée et poulies sur le bois,
  // miroirs au mur de gauche, coin en caoutchouc avec bancs et haltères de couleur.
  { t: 'mirror', x: 28.5, y: 69, w: 3, h: 114 },
  ...[48, 74, 100, 126].flatMap((x) => [64, 86].map((y) => ({ t: 'machine', x, y, w: 16, h: 14 }))),
  { t: 'pulley', x: 158, y: 30, w: 26, h: 14 },
  { t: 'pulley', x: 158, y: 58, w: 26, h: 14 },
  { t: 'aisle', x: 92, y: 111, w: 104, h: 26 },
  ...[56, 80, 104, 128].map((x) => ({ t: 'bench', x, y: 107, w: 7, h: 16 })),
  { t: 'rack', x: 92, y: 121, w: 92, h: 5 },
  // B : bas du corps — grand plancher de bois avec machines et cages (coin
  // gauche, vers le centre), allée de caoutchouc avec bancs, longue rangée
  // d'haltères double contre le mur de droite, tout en miroirs.
  ...[206, 232, 258].map((x) => ({ t: 'machine', x, y: 66, w: 18, h: 16 })),
  { t: 'plates', x: 284, y: 66, w: 14, h: 14 },
  { t: 'squat', x: 206, y: 94, w: 18, h: 18 },
  { t: 'squat', x: 232, y: 94, w: 18, h: 18 },
  { t: 'machine', x: 258, y: 96, w: 12, h: 26 },
  { t: 'machine', x: 220, y: 117, w: 40, h: 10 },
  { t: 'barbells', x: 284, y: 104, w: 14, h: 26 },
  { t: 'aisle', x: 315, y: 69, w: 30, h: 114 },
  ...[30, 54, 78, 102].map((y) => ({ t: 'bench', x: 315, y, w: 22, h: 7 })),
  { t: 'rack', x: 338, y: 69, w: 8, h: 110 },
  { t: 'mirror', x: 349.5, y: 69, w: 3, h: 114 },
  // A, gauche : 3 rangées de cardio tournées vers le haut (vers la cloison et
  // ses télés), 2 rameurs, miroir au mur de gauche.
  { t: 'mirror', x: 28.5, y: 212, w: 3, h: 88 },
  ...[60, 84, 108, 132].map((x) => ({ t: 'tv', x, y: 137, w: 14, h: 2.5 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'treadmill', x, y: 182, w: 12, h: 28, rot: 180 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'treadmill', x, y: 214, w: 12, h: 28, rot: 180 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'stair', x, y: 248, w: 10, h: 13, rot: 180 })),
  { t: 'rower', x: 160, y: 216, w: 6, h: 40, rot: 180 },
  { t: 'rower', x: 174, y: 216, w: 6, h: 40, rot: 180 },
  // A, droite : grand tapis d'étirement gris contre les fenêtres (télés
  // au-dessus), ballons; vélos et elliptiques dessous, tournés vers le tapis;
  // grand miroir à droite.
  { t: 'carpet', x: 269, y: 171, w: 138, h: 54 },
  { t: 'window', x: 355, y: 172, w: 3, h: 72 },
  ...[156, 172, 188].map((y) => ({ t: 'tv', x: 351, y, w: 12, h: 2.5, rot: 90 })),
  { t: 'balls', x: 330, y: 151, w: 8, h: 8 },
  ...[212, 234, 256, 278, 300, 322].map((x, i) => ({ t: i % 2 ? 'elliptical' : 'bike', x, y: 214, w: i % 2 ? 9 : 8, h: i % 2 ? 24 : 18, rot: 180 })),
  ...[212, 234, 256, 278, 300, 322].map((x) => ({ t: 'bike', x, y: 244, w: 8, h: 18, rot: 180 })),
  { t: 'mirror', x: 338, y: 236, w: 3, h: 48 },
];

// Le trajet depuis l'entrée, par l'ouverture de la cloison, jusqu'à la porte du haut.
export const WALK = 'M8 168H24V131H182V6';
