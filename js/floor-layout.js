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
  // C : haut du corps. Gazon (traîneau) en bande sur le côté gauche; en haut,
  // caoutchouc avec haltères, bancs de développé couché et poulies; au centre,
  // machines (pectoraux, épaules, abdos, dentelé, tirage, rameur assis, biceps,
  // triceps); en bas près du gazon, traction assistée et crunch à la corde.
  { t: 'mirror', x: 27.5, y: 69, w: 3, h: 114 },
  { t: 'mirror', x: 101, y: 11.5, w: 146, h: 3 },
  { t: 'turf', x: 38, y: 71, w: 14, h: 106 },
  { t: 'sled', x: 38, y: 34, w: 10, h: 12 },
  { t: 'aisle', x: 111, y: 32, w: 126, h: 32 },
  { t: 'rack', x: 82, y: 21, w: 60, h: 6 },
  { t: 'press', x: 66, y: 36, w: 22, h: 26, rot: 90 },
  { t: 'press', x: 98, y: 36, w: 22, h: 26, rot: 90 },
  { t: 'pulley', x: 150, y: 26, w: 26, h: 12 },
  { t: 'pulley', x: 150, y: 42, w: 26, h: 12 },
  ...[62, 86, 110, 134].map((x) => ({ t: 'machine', x, y: 63, w: 16, h: 14 })),
  ...[62, 86, 110, 134].map((x) => ({ t: 'machine', x, y: 87, w: 16, h: 14 })),
  { t: 'pulley', x: 160, y: 76, w: 12, h: 30 },
  { t: 'pullup', x: 62, y: 113, w: 16, h: 14 },
  { t: 'machine', x: 86, y: 113, w: 14, h: 12 },
  { t: 'machine', x: 108, y: 113, w: 14, h: 12 },
  { t: 'plates', x: 134, y: 113, w: 14, h: 14 },
  // B : bas du corps. Caoutchouc noir en L (en haut et à droite) : haltères
  // contre le mur du haut, bancs de développé couché, cages et Smith à droite;
  // au centre (bois) : bancs et machines à jambes variées; miroirs en haut et à droite.
  { t: 'mirror', x: 270, y: 11.5, w: 160, h: 3 },
  { t: 'mirror', x: 350.5, y: 69, w: 3, h: 114 },
  { t: 'aisle', x: 270, y: 31, w: 160, h: 30 },
  { t: 'aisle', x: 332, y: 86, w: 32, h: 80 },
  { t: 'rack', x: 292, y: 21, w: 96, h: 6 },
  { t: 'press', x: 208, y: 34, w: 22, h: 26, rot: 90 },
  { t: 'press', x: 238, y: 34, w: 22, h: 26, rot: 90 },
  { t: 'squat', x: 332, y: 57, w: 18, h: 18 },
  { t: 'smith', x: 332, y: 81, w: 18, h: 22 },
  { t: 'squat', x: 332, y: 105, w: 18, h: 18 },
  ...[204, 226, 248, 270, 292].map((x) => ({ t: 'machine', x, y: 61, w: 16, h: 14 })),
  ...[222, 252, 282].map((x) => ({ t: 'bench', x, y: 86, w: 22, h: 7 })),
  { t: 'barbells', x: 304, y: 88, w: 12, h: 24 },
  { t: 'legpress', x: 206, y: 110, w: 16, h: 28 },
  { t: 'machine', x: 230, y: 112, w: 16, h: 22 },
  { t: 'machine', x: 254, y: 114, w: 18, h: 14 },
  { t: 'machine', x: 278, y: 114, w: 14, h: 14 },
  { t: 'plates', x: 300, y: 114, w: 14, h: 14 },
  // A, gauche : 3 rangées de cardio tournées vers le haut (vers la cloison et
  // ses 5 télés), 2 rameurs, miroir au mur de gauche.
  { t: 'mirror', x: 28.5, y: 212, w: 3, h: 88 },
  ...[44, 70, 96, 122, 148].map((x) => ({ t: 'tv', x, y: 137, w: 14, h: 2.5 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'treadmill', x, y: 182, w: 12, h: 28, rot: 180 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'treadmill', x, y: 214, w: 12, h: 28, rot: 180 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'stair', x, y: 248, w: 10, h: 13, rot: 180 })),
  { t: 'rower', x: 160, y: 216, w: 6, h: 40, rot: 180 },
  { t: 'rower', x: 174, y: 216, w: 6, h: 40, rot: 180 },
  // A, droite : grand tapis d'étirement gris (5 télés au-dessus, sur la
  // cloison), fenêtres, ballons; vélos et elliptiques dessous, tournés vers le
  // tapis; grand miroir à droite.
  { t: 'carpet', x: 269, y: 171, w: 138, h: 54 },
  { t: 'window', x: 355, y: 172, w: 3, h: 72 },
  ...[218, 246, 274, 302, 330].map((x) => ({ t: 'tv', x, y: 137, w: 14, h: 2.5 })),
  { t: 'balls', x: 330, y: 151, w: 8, h: 8 },
  ...[212, 234, 256, 278, 300, 322].map((x, i) => ({ t: i % 2 ? 'elliptical' : 'bike', x, y: 214, w: i % 2 ? 9 : 8, h: i % 2 ? 24 : 18, rot: 180 })),
  ...[212, 234, 256, 278, 300, 322].map((x) => ({ t: 'bike', x, y: 244, w: 8, h: 18, rot: 180 })),
  { t: 'mirror', x: 338, y: 236, w: 3, h: 48 },
];

// Le trajet depuis l'entrée, par l'ouverture de la cloison, jusqu'à la porte du haut.
export const WALK = 'M8 168H24V131H182V6';
