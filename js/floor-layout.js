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
};

// Cloison entre les poids (en haut) et le cardio (en bas). Le passage entre
// les deux est un peu à droite du centre, du côté de B. Au-dessus du tapis
// d'étirement, la cloison devient le mur de fenêtres en baie (voir GEAR).
export const PARTITIONS = [[26, 134, 200, 134], [226, 134, 237, 134], [330, 134, 352, 134]];

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
  // B : bas du corps (d'après la photo). Mur du haut en miroirs avec la
  // longue rangée double d'haltères; juste dessous, l'allée de caoutchouc noir
  // (bancs, développé couché); le caoutchouc continue sur le côté droit (cages
  // et Smith); en bas, la plateforme de bois avec les machines à jambes et le
  // support de barres fixes dans son coin.
  { t: 'mirror', x: 270, y: 11.5, w: 160, h: 3 },
  { t: 'mirror', x: 350.5, y: 69, w: 3, h: 114 },
  { t: 'aisle', x: 270, y: 34, w: 160, h: 36 },
  { t: 'aisle', x: 333, y: 89, w: 30, h: 74 },
  { t: 'rack', x: 270, y: 22, w: 150, h: 10 },
  { t: 'press', x: 210, y: 41, w: 22, h: 26, rot: 90 },
  { t: 'press', x: 240, y: 41, w: 22, h: 26, rot: 90 },
  ...[270, 290, 310].map((x) => ({ t: 'bench', x, y: 41, w: 7, h: 16 })),
  { t: 'squat', x: 333, y: 62, w: 18, h: 18 },
  { t: 'smith', x: 333, y: 86, w: 18, h: 22 },
  { t: 'squat', x: 333, y: 110, w: 18, h: 18 },
  { t: 'platform', x: 252, y: 90, w: 120, h: 72 },
  ...[204, 226, 248, 270].map((x) => ({ t: 'machine', x, y: 66, w: 16, h: 14 })),
  { t: 'barbells', x: 299, y: 70, w: 12, h: 24 },
  ...[214, 240, 266].map((x) => ({ t: 'bench', x, y: 90, w: 20, h: 7 })),
  { t: 'machine', x: 292, y: 94, w: 12, h: 12 },
  { t: 'legpress', x: 206, y: 112, w: 16, h: 26 },
  { t: 'machine', x: 230, y: 114, w: 16, h: 20 },
  { t: 'machine', x: 254, y: 116, w: 18, h: 14 },
  { t: 'machine', x: 278, y: 116, w: 14, h: 14 },
  { t: 'plates', x: 300, y: 116, w: 14, h: 14 },
  // A, gauche : 3 rangées de cardio tournées vers le haut (vers la cloison et
  // ses 5 télés), 2 rameurs, miroir au mur de gauche.
  { t: 'mirror', x: 28.5, y: 212, w: 3, h: 88 },
  ...[44, 70, 96, 122, 148].map((x) => ({ t: 'tv', x, y: 137, w: 14, h: 2.5 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'treadmill', x, y: 182, w: 12, h: 28, rot: 180 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'treadmill', x, y: 214, w: 12, h: 28, rot: 180 })),
  ...[44, 62, 80, 98, 116, 134].map((x) => ({ t: 'stair', x, y: 248, w: 10, h: 13, rot: 180 })),
  { t: 'rower', x: 160, y: 216, w: 6, h: 40, rot: 180 },
  { t: 'rower', x: 174, y: 216, w: 6, h: 40, rot: 180 },
  // A, droite (d'après la photo) : mur de fenêtres en baie au-dessus du grand
  // tapis gris, avec la barre, les 5 télés et l'horloge au-dessus; ballons et
  // rouleaux le long des fenêtres, support de médecine-balls à droite; devant
  // le tapis, la rangée de vélos et le rameur Concept2, puis les autres rangées.
  { t: 'window', x: 233, y: 140, w: 14, h: 3, rot: -60 },
  { t: 'window', x: 284, y: 135, w: 92, h: 3 },
  { t: 'window', x: 335, y: 140, w: 14, h: 3, rot: 60 },
  { t: 'barre', x: 284, y: 139, w: 92, h: 1.5 },
  ...[248, 266, 290, 308, 326].map((x) => ({ t: 'tv', x, y: 136.5, w: 13, h: 2.5 })),
  { t: 'clock', x: 279, y: 136.5, w: 4, h: 2 },
  { t: 'carpet', x: 281, y: 170, w: 112, h: 52 },
  { t: 'balls', x: 246, y: 150, w: 8, h: 8 },
  { t: 'rollers', x: 268, y: 147, w: 8, h: 4 },
  { t: 'balls', x: 312, y: 150, w: 8, h: 8 },
  { t: 'ballrack', x: 333, y: 172, w: 6, h: 20 },
  ...[236, 256, 276, 296, 316].map((x, i) => ({ t: i === 2 ? 'elliptical' : 'bike', x, y: 212, w: i === 2 ? 9 : 8, h: i === 2 ? 24 : 18, rot: 180 })),
  { t: 'rower', x: 331, y: 216, w: 6, h: 36, rot: 180 },
  ...[214, 236, 256, 276, 296, 316].map((x) => ({ t: 'bike', x, y: 244, w: 8, h: 18, rot: 180 })),
  { t: 'mirror', x: 338, y: 232, w: 3, h: 56 },
];

// Le trajet depuis l'entrée, par l'allée, jusqu'au passage vers le cardio.
export const WALK = 'M8 168H24V131H213V150';
