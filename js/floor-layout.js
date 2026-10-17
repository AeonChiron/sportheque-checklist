// Disposition du 2e étage : une seule source pour le plan (SVG) et la vue 3D.
// Unités du plan : 360 × 280, x vers la droite, y vers le bas (vers le mur
// des vestiaires). Corrigée avec l'équipe : vestiaire des hommes sur le mur
// de gauche, spinning dans le coin en bas à droite, porte entre C et B,
// miroirs devant le cardio (gauche) et grand miroir à droite de A, grand
// tapis d'étirement gris en haut à droite de A.

export const BUILDING = { x: 4, y: 4, w: 352, h: 272 };

export const ZONES = {
  C: { x: 30, y: 12, w: 140, h: 110, floor: 'rubber' },
  B: { x: 190, y: 12, w: 158, h: 110, floor: 'rubber' },
  A: { x: 48, y: 130, w: 242, h: 92, floor: 'wood' },
};

// Pièces : rectangle + porte (côté et position le long de ce côté).
export const ROOMS = {
  5: { x: 4, y: 196, w: 40, h: 80, door: { side: 'right', from: 206, to: 222 }, vertical: true },
  2: { x: 44, y: 230, w: 110, h: 46, door: { side: 'top', from: 70, to: 130 }, open: true },
  3: { x: 154, y: 230, w: 144, h: 46, door: { side: 'top', from: 262, to: 278 } },
  4: { x: 298, y: 150, w: 58, h: 126, door: { side: 'left', from: 162, to: 178 }, vertical: true },
};

// Ouvertures dans le mur extérieur.
export const DOORS = {
  entrance: { side: 'left', from: 140, to: 180 },
  top: { side: 'top', from: 173, to: 187 },
};

// Équipement : centre (x, y), taille (w, h) au sol, rotation en degrés.
// rot 0 : l'avant (console) vers le bas; rot 90 : l'avant vers la gauche.
export const GEAR = [
  // C : haut du corps
  { t: 'pulley', x: 155, y: 38, w: 20, h: 40 },
  { t: 'platform', x: 91, y: 77, w: 110, h: 22 },
  ...[46, 67, 88, 109, 130].map((x) => ({ t: 'machine', x, y: 77, w: 14, h: 12 })),
  { t: 'press', x: 62, y: 108, w: 22, h: 26 },
  { t: 'press', x: 110, y: 108, w: 22, h: 26 },
  { t: 'rack', x: 161, y: 92, w: 6, h: 48 },
  // B : bas du corps (cages et machines à jambes dans le coin gauche, vers le centre)
  { t: 'rack', x: 321, y: 19, w: 46, h: 6 },
  { t: 'rack', x: 341, y: 72, w: 6, h: 88 },
  { t: 'platform', x: 233, y: 93, w: 74, h: 46 },
  { t: 'squat', x: 210, y: 84, w: 18, h: 18 },
  { t: 'squat', x: 236, y: 84, w: 18, h: 18 },
  { t: 'machine', x: 261, y: 90, w: 12, h: 30 },
  { t: 'machine', x: 221, y: 108, w: 44, h: 12 },
  ...[43, 61, 79].map((y) => ({ t: 'bench', x: 300, y, w: 34, h: 6 })),
  { t: 'plates', x: 304, y: 104, w: 14, h: 14 },
  // A, gauche : cardio face aux miroirs (et aux télés)
  { t: 'mirror', x: 51, y: 176, w: 3, h: 84 },
  ...[166, 182, 198, 214].map((y) => ({ t: 'tv', x: 50, y, w: 2, h: 10 })),
  ...[166, 182, 198, 214].map((y) => ({ t: 'treadmill', x: 74, y, w: 12, h: 28, rot: 90 })),
  ...[166, 182, 198, 214].map((y) => ({ t: 'stair', x: 104, y, w: 10, h: 13, rot: 90 })),
  { t: 'rower', x: 148, y: 166, w: 6, h: 40, rot: 90 },
  { t: 'rower', x: 148, y: 180, w: 6, h: 40, rot: 90 },
  { t: 'elliptical', x: 136, y: 206, w: 9, h: 24, rot: 90 },
  { t: 'elliptical', x: 162, y: 206, w: 9, h: 24, rot: 90 },
  // A, droite : grand tapis d'étirement, cardio dessous, grand miroir au mur de droite
  { t: 'carpet', x: 233, y: 157, w: 92, h: 42 },
  ...[198, 216, 234, 252, 270].map((x) => ({ t: 'bike', x, y: 204, w: 8, h: 18 })),
  { t: 'mirror', x: 286, y: 176, w: 3, h: 84 },
  // Studio de spinning
  ...[[312, 190], [338, 190], [312, 216], [338, 216], [312, 242], [338, 242]].map(([x, y]) => ({ t: 'bike', x, y, w: 8, h: 18, rot: 90 })),
];

// Le trajet depuis l'entrée, par les allées, jusqu'à la porte du haut.
export const WALK = 'M8 160H40V126H180V8';
