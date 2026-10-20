// Contenu du « Manuel de référence — Entretien du gym, 2e étage »
// (RÉFÉRENCE-IA-2026-10-17), en français québécois simple (tutoiement) et
// en anglais. Les titres suivent le manuel; les consignes sont reformulées
// pour se lire vite sur le plancher. Séquence, durées, responsabilités et
// fréquences : source de vérité du planificateur, ne pas les modifier sans
// mettre à jour le manuel.

export const MANUAL_VERSION = 'RÉFÉRENCE-IA-2026-10-17';

// Zones / secteurs utilisés pour la vue « Par zone ».
export const AREAS = {
  accueil:   { order: 1, fr: 'Accueil et ouverture', en: 'Front & opening' },
  buanderie: { order: 2, fr: 'Guenilles et buanderie', en: 'Rags & laundry' },
  gym:       { order: 3, fr: 'Tout le gym', en: 'Whole gym' },
  cardio:    { order: 4, fr: 'Cardio', en: 'Cardio' },
  muscu:     { order: 5, fr: 'Musculation', en: 'Weights area' },
  zone:      { order: 6, fr: 'Nettoyage en profondeur', en: 'Deep clean' },
  surfaces:  { order: 7, fr: 'Tuiles blanches et miroirs', en: 'White tiles & mirrors' },
  dechets:   { order: 8, fr: 'Poubelles et compost', en: 'Trash & compost' },
  spinning:  { order: 9, fr: 'Salle de spinning', en: 'Spin room' },
  bureaux:   { order: 10, fr: 'Bureaux et tâches hebdo', en: 'Offices & weekly tasks' },
  fermeture: { order: 11, fr: 'Fermeture', en: 'Closing' },
};

export const ZONES = {
  A: {
    fr: { name: 'Cardio et étirements', focus: 'cadres et bases du cardio, plateformes et repose-pieds, surfaces accessibles, zone d’étirement, recoins.' },
    en: { name: 'Cardio & stretching', focus: 'cardio frames and bases, platforms and footrests, reachable surfaces, stretching area, corners.' },
  },
  B: {
    fr: { name: 'Musculation, côté droit — bas du corps', focus: 'structures, supports, bancs, cages et machines du bas du corps; plateformes de pieds.' },
    en: { name: 'Weights, right side — lower body', focus: 'frames, racks, benches, cages and lower-body machines; foot platforms.' },
  },
  C: {
    fr: { name: 'Musculation, côté gauche — haut du corps', focus: 'structures, poulies extérieures, machines du haut du corps, bases, supports et recoins.' },
    en: { name: 'Weights, left side — upper body', focus: 'frames, outer pulleys, upper-body machines, bases, racks and corners.' },
  },
};

// Plan du 2e étage (croquis de l'équipe) : contenu de chaque zone et pièce.
export const FLOOR = {
  A: { fr: { name: 'Zone A · Cardio et étirements', what: ['Tapis roulants et escaliers (StairMaster)', '2 rameurs', 'Autres appareils de cardio, dont ceux près du studio de spinning', 'Zone d’étirement'] },
       en: { name: 'Zone A · Cardio & stretching', what: ['Treadmills and stair climbers (StairMaster)', '2 rowing machines', 'Other cardio machines, including those by the spin studio', 'Stretching area'] } },
  B: { fr: { name: 'Zone B · Bas du corps (côté droit)', what: ['Cages à squat et machines pour les jambes (coin gauche de la zone, vers le centre)', 'Bancs', 'Supports à haltères et disques'] },
       en: { name: 'Zone B · Lower body (right side)', what: ['Squat racks and leg machines (left corner of the zone, toward the center)', 'Benches', 'Dumbbell racks and plates'] } },
  C: { fr: { name: 'Zone C · Haut du corps (côté gauche)', what: ['Machines pour le haut du corps', 'Poulies', 'Bancs et supports'] },
       en: { name: 'Zone C · Upper body (left side)', what: ['Upper-body machines', 'Cable pulleys', 'Benches and racks'] } },
  1: { fr: { name: 'Entrée du gym', what: ['Entrée du 2e étage'] }, en: { name: 'Gym entrance', what: ['Entrance to the 2nd floor'] } },
  2: { fr: { name: 'Évier', what: ['Évier et comptoir, près de la fontaine d’eau'] }, en: { name: 'Sink', what: ['Sink and counter, by the water fountain'] } },
  3: { fr: { name: 'Vestiaire des femmes', what: ['Poubelles à vider à chaque tournée'] }, en: { name: 'Women’s locker room', what: ['Bins to empty on every round'] } },
  4: { fr: { name: 'Studio de spinning', what: ['Vélos nettoyés le matin', 'Guenilles et vaporisateurs à vérifier'] }, en: { name: 'Spin studio', what: ['Bikes cleaned in the morning', 'Rags and spray bottles to check'] } },
  5: { fr: { name: 'Vestiaire des hommes', what: ['Poubelles à vider à chaque tournée'] }, en: { name: 'Men’s locker room', what: ['Bins to empty on every round'] } },
};

export const TV_CHANNELS = [
  { key: 'Bas droite', fr: 'Télé en bas à droite', en: 'Bottom-right TV', ch: '619 · TV5' },
  { key: 'Bas gauche', fr: 'Télé en bas à gauche', en: 'Bottom-left TV', ch: '625' },
  { key: 'Haut gauche', fr: 'Télé en haut à gauche', en: 'Top-left TV', ch: '779' },
  { key: 'Haut droite', fr: 'Télé en haut à droite', en: 'Top-right TV', ch: '620' },
];

// Techniques du manuel + consignes de l'équipe : les « bons trucs » de l'Aperçu.
export const TECHNIQUES = {
  fr: [
    { area: 'cardio', text: '**Poussière : guenille sèche** (ou à peine humide). Trop mouillée, elle étale la poussière au lieu de l’enlever.' },
    { area: 'gym', text: '**Traces de doigts et sueur : guenille à peine humide** avec du produit.' },
    { area: 'cardio', text: 'Le produit va **sur la guenille**, jamais direct sur un écran.' },
    { area: 'gym', text: 'Même si ça a l’air propre, essuie : poignées, sièges, boutons, tiges de réglage, écrans, logos, panneaux, supports à bouteilles.' },
    { area: 'gym', text: 'Laisse agir le produit le temps écrit sur l’étiquette.' },
    { area: 'zone', text: '**Guenille propre** au début du nettoyage en profondeur, **une autre propre** après.' },
    { area: 'zone', text: 'Repose-pieds : là où vont les souliers d’abord, puis les contours et les bases.' },
    { area: 'surfaces', key: 'miroirs', text: 'Miroirs : tout le panneau, puis regarde de côté pour voir les traces.' },
    { area: 'bureaux', key: 'murs', text: 'Murs : petits cercles, doucement. La peinture pâlit? Arrête et signale.' },
    { area: 'muscu', text: '**Tapis noirs** : les allées d’abord, puis autour des bancs et des supports. Les coins à la fin.' },
    { area: 'cardio', text: '**Tapis gris** : en dessous des machines où ça se rend, sans déranger ceux qui s’entraînent.' },
    { area: 'surfaces', key: 'tuiles', text: '**Tuiles** : les saletés sèches d’abord (aspirateur ou balai), la moppe après. Affiche « plancher mouillé ».' },
    { area: 'buanderie', text: 'Guenilles « clients » et « ménage » : chacune son usage. Pars les brassées tôt.' },
    { area: 'dechets', text: '**Une seule grosse poubelle** (à droite du cardio) : après chaque poubelle vidée, **pousse avec son fond** pour tasser.' },
    { area: 'dechets', text: 'L’extérieur des poubelles se fait pendant le tour des vidanges.' },
    { area: 'gym', text: 'Mélange jamais les produits. Chaque outil retourne à sa place.' },
  ],
  en: [
    { area: 'cardio', text: '**Dust: dry rag** (or barely damp). Too wet, it spreads the dust instead of picking it up.' },
    { area: 'gym', text: '**Fingerprints and sweat: barely damp rag** with product.' },
    { area: 'cardio', text: 'Product goes **on the rag**, never straight on a screen.' },
    { area: 'gym', text: 'Even if it looks clean, wipe it: handles, seats, buttons, pins, screens, logos, panels, bottle holders.' },
    { area: 'gym', text: 'Let the product sit for the time on the label.' },
    { area: 'zone', text: '**Clean rag** to start the deep clean, **another clean one** after.' },
    { area: 'zone', text: 'Footrests: where shoes go first, then edges and bases.' },
    { area: 'surfaces', key: 'miroirs', text: 'Mirrors: the whole panel, then look from the side to spot streaks.' },
    { area: 'bureaux', key: 'murs', text: 'Walls: small gentle circles. Paint fading? Stop and flag it.' },
    { area: 'muscu', text: '**Black mats**: aisles first, then around benches and racks. Corners last.' },
    { area: 'cardio', text: '**Grey mats**: under the machines where you can reach, without bothering anyone training.' },
    { area: 'surfaces', key: 'tuiles', text: '**Tiles**: dry dirt first (vacuum or broom), mop after. Put out the wet-floor sign.' },
    { area: 'buanderie', text: '“Member” and “cleaning” rags: each has its own use. Start loads early.' },
    { area: 'dechets', text: '**One big trash can** (right of the cardio): after each can you empty, **push down with its bottom** to pack it.' },
    { area: 'dechets', text: 'Wipe the outside of the cans during the trash round.' },
    { area: 'gym', text: 'Never mix products. Every tool goes back in its spot.' },
  ],
};

// Jours : 0 = lundi … 6 = dimanche.
export const WEEKDAYS = {
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

// Tâches hebdomadaires : { short: résumé, full: consigne }.
export const WEEKLY_Q1 = [
  { fr: { short: 'Supports à haltères', full: 'Supports à haltères : dessus, dessous et côtés.' },
    en: { short: 'Dumbbell racks', full: 'Dumbbell racks: top, underneath and sides.' } },
  { fr: { short: 'Étagères + thermostats', full: 'Étagères de la salle d’entraînement et du spinning, puis les thermostats.' },
    en: { short: 'Shelves + thermostats', full: 'Shelves in the training room and spin room, then the thermostats.' } },
  { fr: { short: 'Meuble du système de son', full: 'L’intérieur du meuble du système de son.' },
    en: { short: 'Sound system cabinet', full: 'Inside the sound system cabinet.' } },
  { fr: { short: 'Distributeurs de papier + thermostats', full: 'Distributeurs de papier, puis les thermostats.' },
    en: { short: 'Paper dispensers + thermostats', full: 'Paper dispensers, then the thermostats.' } },
  { fr: { short: 'Étagères', full: 'Étagères de la salle d’entraînement et du spinning.' },
    en: { short: 'Shelves', full: 'Shelves in the training room and spin room.' } },
  { fr: { short: 'Télés et boîtiers Vidéotron', full: 'Époussette les télés et les boîtiers Vidéotron.' },
    en: { short: 'TVs and Vidéotron boxes', full: 'Dust the TVs and the Vidéotron boxes.' } },
  { fr: { short: 'Distributeurs de papier', full: 'Distributeurs de papier.' },
    en: { short: 'Paper dispensers', full: 'Paper dispensers.' } },
];

export const WEEKLY_Q2 = [
  { fr: { short: 'Grilles de ventilation', full: 'Grilles de ventilation qui se rendent, et leur contour.' },
    en: { short: 'Ventilation grilles', full: 'Reachable ventilation grilles and their edges.' } },
  { fr: { short: 'Bureaux des patrons', full: 'Passe l’aspirateur dans les **bureaux des patrons**.' },
    en: { short: 'Owners’ offices', full: 'Vacuum the **owners’ offices**.' } },
  { fr: { short: 'Bureaux des entraîneurs', full: 'Passe l’aspirateur dans les **bureaux des entraîneurs**.' },
    en: { short: 'Trainers’ offices', full: 'Vacuum the **trainers’ offices**.' } },
  { fr: { short: 'Portes et cadres', full: 'Portes, cadres de porte et traces qui paraissent.' },
    en: { short: 'Doors and frames', full: 'Doors, door frames and visible marks.' } },
  { fr: { short: 'Bureaux des patrons', full: 'Passe l’aspirateur dans les **bureaux des patrons**.' },
    en: { short: 'Owners’ offices', full: 'Vacuum the **owners’ offices**.' } },
  { fr: { short: 'Bureaux des entraîneurs', full: 'Passe l’aspirateur dans les **bureaux des entraîneurs**.' },
    en: { short: 'Trainers’ offices', full: 'Vacuum the **trainers’ offices**.' } },
  { fr: { short: 'Coins oubliés', full: 'Les coins oubliés et les marques qui paraissent beaucoup.' },
    en: { short: 'Missed spots', full: 'Missed spots and very visible marks.' } },
];

export const WALL_TECHNIQUE = {
  fr: 'Murs : guenille propre, produit correct pour la peinture, petits cercles. La marque part pas? Arrête et signale-la.',
  en: 'Walls: clean rag, paint-safe product, small circles. Mark won’t come off? Stop and flag it.',
};

export const PRIORITY_ORDER = {
  fr: [
    'Le danger d’abord : plancher glissant, objet dangereux, allée bloquée.',
    'Ensuite, la saleté qui paraît le plus.',
    'Ensuite, ce que les clients touchent souvent.',
    'Puis ton plan. Pas le temps de tout finir? Dis-le, coupe pas en cachette.',
  ],
  en: [
    'Danger first: slippery floor, dangerous object, blocked aisle.',
    'Then the dirt that shows the most.',
    'Then what members touch often.',
    'Then your plan. Can’t finish it all? Say so, don’t cut corners quietly.',
  ],
};

// Petits morceaux réutilisés.
const DUST = {
  fr: ['Guenille trop mouillée = poussière qui s’étale. **Sèche d’abord.**', 'Le produit va sur la guenille, jamais direct sur un écran.'],
  en: ['Rag too wet = dust that smears. **Dry first.**', 'Product goes on the rag, never straight on a screen.'],
};
const PACK = {
  fr: 'Après chaque poubelle, **pousse avec son fond** pour tasser dans la grosse. Tout le gym rentre en un seul tour.',
  en: 'After each can, **push down with its bottom** to pack the big one. The whole gym fits in one round.',
};

// Chaque quart : séquence de référence (ordre et durées immuables).
// kind: 'task' | 'pause' (payée) | 'meal' (non payé si libre de son poste).
// Les parties qui dépendent du jour (zone, hebdo, compost…) sont ajoutées
// par planner.js.
export const SHIFTS = {
  1: {
    id: 1,
    start: '07:30',
    end: '15:30',
    fr: { name: 'Quart de matin', short: 'Matin' },
    en: { name: 'Morning shift', short: 'Morning' },
    blocks: [
      {
        id: 'q1-ouverture', kind: 'task', minutes: 15, area: 'accueil', photo: 'ouverture', tvTable: true,
        fr: {
          title: 'Ouverture',
          summary: 'Ventilation, télés, musique, vaporisateurs.',
          steps: [
            'Allume les **3 interrupteurs de ventilation** et les **4 télés**. Mets les postes sur chaque boîtier Vidéotron (tableau plus bas).',
            'Vérifie que le son marche et pars la playlist **« Sporthèque Matin »**.',
            'Tour des studios et du spinning : assez de guenilles propres, vaporisateurs pleins. Comptoir et lavabo près de la fontaine : propres.',
          ],
          tips: ['TV5 marche pas? Vérifie que la télé est sur le **619**. Toujours rien? Regarde si le boîtier Vidéotron est allumé et rallume-le.'],
        },
        en: {
          title: 'Opening',
          summary: 'Ventilation, TVs, music, spray bottles.',
          steps: [
            'Turn on the **3 ventilation switches** and the **4 TVs**. Set the channels on each Vidéotron box (table below).',
            'Check the sound works and start the **“Sporthèque Matin”** playlist.',
            'Walk the studios and spin room: enough clean rags, spray bottles full. Counter and sink by the fountain: clean.',
          ],
          tips: ['TV5 not working? Check the TV is on **619**. Still nothing? See if the Vidéotron box is on and turn it back on.'],
        },
      },
      {
        id: 'q1-guenilles-1', kind: 'task', minutes: 20, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles : sécheuse et lavage',
          summary: 'Sécheuse, ramasser, laver, plier.',
          steps: [
            'Regarde d’abord dans la sécheuse : il reste peut-être des guenilles d’hier.',
            'Ramasse les guenilles sales : tous les studios, le spinning et l’étage du bas. Pars une brassée.',
            'Plie les guenilles propres pour les studios.',
          ],
          tips: ['Peu de guenilles à plier? Passe tout de suite à la tâche suivante.', 'La laveuse et la sécheuse tournent pendant que tu fais autre chose.'],
        },
        en: {
          title: 'Rags: dryer and washing',
          summary: 'Dryer, collect, wash, fold.',
          steps: [
            'Check the dryer first: there may be rags left from yesterday.',
            'Collect dirty rags: every studio, the spin room and the lower floor. Start a load.',
            'Fold the clean rags for the studios.',
          ],
          tips: ['Not many rags to fold? Go straight to the next task.', 'The washer and dryer run while you do something else.'],
        },
      },
      {
        id: 'q1-desinfection', kind: 'task', minutes: 30, area: 'gym', photo: 'desinfection',
        fr: {
          title: 'Désinfection générale',
          summary: 'Cardio, logos, panneaux; remettre en ordre.',
          steps: [
            '**À sec** : enlève la poussière sur les écrans, le devant du cardio, les logos et les panneaux d’instructions.',
            'Repasse avec une guenille **à peine humide** et du produit : traces de doigts et de sueur.',
            'Remets les poids, les accessoires et les bancs à leur place. Ramasse les petits déchets dans les allées.',
          ],
          tips: [...DUST.fr, 'Les poignées et les sièges des autres machines, c’est à 10 h.'],
        },
        en: {
          title: 'General disinfection',
          summary: 'Cardio, logos, panels; tidy up.',
          steps: [
            '**Dry**: dust the screens, cardio fronts, logos and instruction panels.',
            'Go over them with a **barely damp** rag and product: fingerprints and sweat.',
            'Put weights, accessories and benches back. Pick up small trash in the aisles.',
          ],
          tips: [...DUST.en, 'Handles and seats on the other machines are at 10:00.'],
        },
      },
      {
        id: 'q1-poubelles', kind: 'task', minutes: 20, area: 'dechets', photo: 'poubelles',
        fr: {
          title: 'Poubelles',
          summary: 'Gym, bureaux, vestiaires, recyclage.',
          steps: [
            'Prends la **grosse poubelle à droite du cardio**, près du tapis gris.',
            'Vides-y les poubelles du gym, des bureaux et des vestiaires. Un sac neuf partout.',
            'Vide le recyclage, puis lave-toi les mains.',
          ],
          tips: [PACK.fr, 'Essuie l’extérieur des poubelles au besoin, pendant ce tour.', 'Le compost, c’est le soir.'],
        },
        en: {
          title: 'Trash',
          summary: 'Gym, offices, locker rooms, recycling.',
          steps: [
            'Take the **big trash can right of the cardio**, by the grey mat.',
            'Empty the gym, office and locker-room cans into it. A fresh bag in each.',
            'Empty the recycling, then wash your hands.',
          ],
          tips: [PACK.en, 'Wipe the outside of the cans if needed, during this round.', 'Compost is the evening shift.'],
        },
      },
      {
        id: 'q1-aspirateur-muscu', kind: 'task', minutes: 65, area: 'muscu', photo: 'aspirateur-muscu',
        fr: {
          title: 'Aspirateur : musculation',
          summary: 'Tapis noirs, allées, coins.',
          steps: [
            'Passe l’aspirateur sur les **tapis noirs** : autour des cages à squat, puis près des **machines de bench** à côté du miroir.',
            'Entre les machines et dans les allées, autour des pieds et des supports, puis les coins.',
            'Dernier tour : repasse là où il reste de la saleté.',
          ],
          tips: ['Les grandes surfaces d’abord, les coins difficiles après.'],
        },
        en: {
          title: 'Vacuum: weights area',
          summary: 'Black mats, aisles, corners.',
          steps: [
            'Vacuum the **black mats**: around the squat racks, then by the **bench machines** next to the mirror.',
            'Between the machines and in the aisles, around feet and racks, then the corners.',
            'Last pass: go back over any dirt left.',
          ],
          tips: ['Big areas first, hard corners after.'],
        },
      },
      {
        id: 'q1-entretien-general', kind: 'task', minutes: 30, area: 'gym', photo: 'points-contact',
        fr: {
          title: 'Entretien général',
          summary: 'Points de contact, bois et métal, fontaine.',
          steps: [
            'Points de contact : poignées, sièges, dossiers, boutons et tiges de réglage.',
            'Essuie le bois, le métal, les rebords de fenêtres et les plinthes grises.',
            'Supports à bouteilles et fontaine d’eau : enlève les traces.',
          ],
          tips: ['Une rangée de machines à la fois.', 'Laisse agir le produit le temps écrit sur l’étiquette.', 'Même si ça a l’air propre, essuie : des mains passent là toute la journée.'],
        },
        en: {
          title: 'General upkeep',
          summary: 'Touch points, wood and metal, fountain.',
          steps: [
            'Touch points: handles, seats, backrests, buttons and adjustment pins.',
            'Wipe the wood, metal, window ledges and grey baseboards.',
            'Bottle holders and water fountain: wipe off the marks.',
          ],
          tips: ['One row of machines at a time.', 'Let the product sit for the time on the label.', 'Even if it looks clean, wipe it: hands touch it all day.'],
        },
      },
      { id: 'q1-pause', kind: 'pause', minutes: 15, fr: { title: 'Pause' }, en: { title: 'Break' } },
      {
        id: 'q1-guenilles-2', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles : tour des studios',
          summary: 'Ramasser, laver, plier, remettre.',
          steps: [
            'Tour des studios, du spinning et de l’étage du bas : ramasse les guenilles sales.',
            'Pars une brassée. Plie et remets des guenilles propres dans les studios.',
          ],
          tips: [],
        },
        en: {
          title: 'Rags: collect and restock',
          summary: 'Collect, wash, fold, restock.',
          steps: [
            'Round of the studios, spin room and lower floor: collect dirty rags.',
            'Start a load. Fold and put clean rags back in the studios.',
          ],
          tips: [],
        },
      },
      {
        id: 'q1-profondeur', kind: 'task', minutes: 60, area: 'zone', deep: true,
        fr: { title: 'Nettoyage en profondeur', summary: '', steps: [], tips: [] },
        en: { title: 'Deep clean', summary: '', steps: [], tips: [] },
      },
      {
        id: 'q1-tour', kind: 'task', minutes: 15, area: 'gym', photo: 'tour-general',
        fr: {
          title: 'Tour du gym',
          summary: 'Remettre en ordre, dégager les allées.',
          steps: [
            'Fais le tour : poids, bancs et accessoires à leur place, surtout dans la zone d’étirement.',
            'Ramasse ce qui traîne et dégage les allées.',
          ],
          tips: ['C’est un tour de rangement, pas de désinfection ni de poubelles.'],
        },
        en: {
          title: 'Gym tidy-up',
          summary: 'Tidy up, clear the aisles.',
          steps: [
            'Walk around: weights, benches and accessories in their spot, especially in the stretching area.',
            'Pick up what’s lying around and clear the aisles.',
          ],
          tips: ['This is a tidy-up round, not disinfection or trash.'],
        },
      },
      { id: 'q1-diner', kind: 'meal', minutes: 60, fr: { title: 'Dîner' }, en: { title: 'Lunch' } },
      {
        id: 'q1-guenilles-3', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles : plier et ranger',
          summary: 'Ramasser, laver, sécher, plier.',
          steps: [
            'Tour des studios, du spinning et de l’étage du bas : ramasse les guenilles sales.',
            'Lave, sèche, plie et range-les à leur place.',
          ],
          tips: [],
        },
        en: {
          title: 'Rags: fold and put away',
          summary: 'Collect, wash, dry, fold.',
          steps: [
            'Round of the studios, spin room and lower floor: collect dirty rags.',
            'Wash, dry, fold and put them away.',
          ],
          tips: [],
        },
      },
      {
        id: 'q1-aspirateur-cardio', kind: 'task', minutes: 25, area: 'cardio', photo: 'aspirateur-cardio',
        fr: {
          title: 'Aspirateur : cardio',
          summary: 'Tapis gris, couloir, sous les machines.',
          steps: [
            'Passe l’aspirateur sur les **tapis gris** et dans le couloir.',
            'Autour du cardio et en dessous où ça se rend, sans déplacer de machine lourde.',
          ],
          tips: ['Les bureaux, c’est le soir.'],
        },
        en: {
          title: 'Vacuum: cardio',
          summary: 'Grey mats, hallway, under machines.',
          steps: [
            'Vacuum the **grey mats** and the hallway.',
            'Around the cardio and underneath where you can reach, without moving heavy machines.',
          ],
          tips: ['Offices are the evening shift.'],
        },
      },
      {
        id: 'q1-hebdo', kind: 'task', minutes: 20, area: 'bureaux', photo: 'hebdo', weekly: 1,
        fr: { title: 'Tâche de la semaine', summary: '', steps: [], tips: ['Du temps en trop? Selon la saison : arrose les fleurs, ou enlève la neige et la glace. Lave les vadrouilles au besoin.'] },
        en: { title: 'Weekly task', summary: '', steps: [], tips: ['Time left? Depending on the season: water the flowers, or clear snow and ice. Wash the mops if needed.'] },
      },
      {
        id: 'q1-spinning', kind: 'task', minutes: 20, area: 'spinning', photo: 'spinning',
        fr: {
          title: 'Salle de spinning',
          summary: 'Tous les vélos, rangement, vaporisateurs.',
          steps: [
            'Nettoie **tous les vélos**.',
            'Range la salle et remplis les vaporisateurs.',
          ],
          tips: ['Le spinning, c’est juste le matin.'],
        },
        en: {
          title: 'Spin room',
          summary: 'Every bike, tidy, spray bottles.',
          steps: [
            'Clean **every bike**.',
            'Tidy the room and fill the spray bottles.',
          ],
          tips: ['The spin room is mornings only.'],
        },
      },
      {
        id: 'q1-fin', kind: 'task', minutes: 25, area: 'fermeture', photo: 'fin-quart', closing: true,
        fr: {
          title: 'Avant de partir',
          summary: 'Vidanges (clé 124), guenilles, dernier tour.',
          steps: [
            'Sors les vidanges (**clé 124**).',
            'Mets des guenilles propres dans les salles. Range une dernière fois poids, bancs et accessoires.',
            'Dernier tour. Quelque chose de pas fini ou de brisé? **⚑ Signale-le.**',
          ],
          tips: ['Pas de compost le matin.'],
        },
        en: {
          title: 'Before you leave',
          summary: 'Garbage out (key 124), rags, last round.',
          steps: [
            'Take the garbage out (**key 124**).',
            'Put clean rags in the rooms. One last tidy of weights, benches and accessories.',
            'Last round. Something not done or broken? **⚑ Flag it.**',
          ],
          tips: ['No compost in the morning.'],
        },
      },
    ],
    // Repères horaires fixes : jamais attribués fictivement (étape 5).
    fixedTimes: [
      { at: '12:00', id: 'playlist-midi', fr: 'Playlist « Sporthèque Midi »', en: '“Sporthèque Midi” playlist' },
      { at: '15:00', id: 'playlist-soir', fr: 'Playlist « Sporthèque soir »', en: '“Sporthèque soir” playlist' },
    ],
  },

  2: {
    id: 2,
    start: '16:30',
    end: '23:00',
    fr: { name: 'Quart de soir', short: 'Soir' },
    en: { name: 'Evening shift', short: 'Evening' },
    blocks: [
      {
        id: 'q2-inspection', kind: 'task', minutes: 15, area: 'accueil', photo: 'inspection',
        fr: {
          title: 'Tour et préparation',
          summary: 'Tour du gym, vaporisateurs, guenilles.',
          steps: [
            'Fais le tour du gym : comptoir, lavabo, buvette.',
            'Remplis les vaporisateurs (spinning compris) avec du **« Daily Usage »** et vérifie le stock de guenilles propres.',
          ],
          tips: ['Les autres studios, le soir, c’est juste pour les guenilles.'],
        },
        en: {
          title: 'Walkthrough and set-up',
          summary: 'Gym round, spray bottles, rags.',
          steps: [
            'Walk the gym: counter, sink, drinks counter.',
            'Fill the spray bottles (spin room too) with **“Daily Usage”** and check the clean rag stock.',
          ],
          tips: ['In the evening, other studios are for rags only.'],
        },
      },
      {
        id: 'q2-guenilles-1', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles : ramasser et laver',
          summary: 'Studios, spinning, réception.',
          steps: [
            'Ramasse les guenilles sales : tous les studios (tous les étages), le spinning et la réception.',
            'Pars les brassées, puis la sécheuse.',
            'Plie et remets des guenilles propres.',
          ],
          tips: ['Guenilles « clients » et « ménage » : chacune son usage.', 'La laveuse et la sécheuse tournent pendant tes autres tâches.'],
        },
        en: {
          title: 'Rags: collect and wash',
          summary: 'Studios, spin room, front desk.',
          steps: [
            'Collect dirty rags: every studio (every floor), the spin room and the front desk.',
            'Start the loads, then the dryer.',
            'Fold and put clean rags back.',
          ],
          tips: ['“Member” and “cleaning” rags: each has its own use.', 'The washer and dryer run during your other tasks.'],
        },
      },
      {
        id: 'q2-desinfection', kind: 'task', minutes: 30, area: 'gym', photo: 'desinfection',
        fr: {
          title: 'Désinfection générale',
          summary: 'Points de contact, écrans, surfaces.',
          steps: [
            'Points de contact : poignées, sièges, dossiers, **machines de bench**, réglages. Enlève les traces de sueur.',
            'Écrans et boutons : **à sec** d’abord, puis guenille à peine humide avec du produit.',
            'Au besoin : tablettes, thermostats, télés, boîtiers Vidéotron, distributeurs de papier, miroirs.',
          ],
          tips: [...DUST.fr, 'À faire même si le matin l’a fait.'],
        },
        en: {
          title: 'General disinfection',
          summary: 'Touch points, screens, surfaces.',
          steps: [
            'Touch points: handles, seats, backrests, **bench machines**, adjusters. Wipe off sweat.',
            'Screens and buttons: **dry** first, then a barely damp rag with product.',
            'As needed: shelves, thermostats, TVs, Vidéotron boxes, paper dispensers, mirrors.',
          ],
          tips: [...DUST.en, 'Do it even if the morning shift did.'],
        },
      },
      {
        id: 'q2-rangement', kind: 'task', minutes: 15, area: 'gym', photo: 'rangement',
        fr: {
          title: 'Rangement',
          summary: 'Haltères, poids, bancs; allées dégagées.',
          steps: [
            'Haltères sur le support. Disques enlevés des barres et rangés.',
            'Bancs et accessoires à leur place. Ramasse ce qui traîne.',
          ],
          tips: ['Enlève les poids oubliés sur les machines que personne utilise.'],
        },
        en: {
          title: 'Put equipment away',
          summary: 'Dumbbells, weights, benches; clear aisles.',
          steps: [
            'Dumbbells on the rack. Plates off the bars and put away.',
            'Benches and accessories in their spot. Pick up what’s lying around.',
          ],
          tips: ['Take off weights left on machines nobody is using.'],
        },
      },
      { id: 'q2-souper', kind: 'meal', minutes: 60, fr: { title: 'Souper' }, en: { title: 'Dinner' } },
      {
        id: 'q2-poubelles', kind: 'task', minutes: 20, area: 'dechets', photo: 'poubelles', compost: true,
        fr: {
          title: 'Poubelles et recyclage',
          titleCompost: 'Poubelles, recyclage et compost',
          summary: 'Gym, bureaux, vestiaires, dehors; clé 124.',
          steps: [
            'Prends la **grosse poubelle à droite du cardio** et vides-y : gym, bureaux, vestiaires, recyclage.',
            'Dehors : poubelles du banc en bois et de la terrasse de la piscine. Gros bac noir dans la benne.',
            'Sors les vidanges (**clé 124**) et lave-toi les mains.',
          ],
          compostSteps: ['**Compost à 19 h** : vide-le et sors-le avec les vidanges.'],
          compostWednesday: '**Mercredi** : le bac de compost va au chemin, côté stationnement.',
          tips: [PACK.fr, 'Essuie l’extérieur des poubelles au besoin, pendant ce tour.'],
        },
        en: {
          title: 'Trash and recycling',
          titleCompost: 'Trash, recycling and compost',
          summary: 'Gym, offices, locker rooms, outside; key 124.',
          steps: [
            'Take the **big trash can right of the cardio** and empty into it: gym, offices, locker rooms, recycling.',
            'Outside: cans by the wooden bench and the pool terrace. Big black bin into the dumpster.',
            'Take the garbage out (**key 124**) and wash your hands.',
          ],
          compostSteps: ['**Compost at 7 p.m.**: empty it and take it out with the garbage.'],
          compostWednesday: '**Wednesday**: compost bin to the curb, parking-lot side.',
          tips: [PACK.en, 'Wipe the outside of the cans if needed, during this round.'],
        },
      },
      {
        id: 'q2-profondeur', kind: 'task', minutes: 60, area: 'zone', deep: true,
        fr: { title: 'Nettoyage en profondeur', summary: '', steps: [], tips: [] },
        en: { title: 'Deep clean', summary: '', steps: [], tips: [] },
      },
      {
        // Tuiles / miroirs : 10 min avant la pause, 10 min après l'aspirateur
        // (la pause garde son heure fixe du manuel).
        id: 'q2-surfaces', kind: 'task', minutes: 10, area: 'surfaces', surfaces: 1,
        fr: { title: 'Tuiles / miroirs', summary: '', steps: [], tips: [] },
        en: { title: 'Tiles / mirrors', summary: '', steps: [], tips: [] },
      },
      { id: 'q2-pause', kind: 'pause', minutes: 15, fr: { title: 'Pause' }, en: { title: 'Break' } },
      {
        id: 'q2-aspirateur', kind: 'task', minutes: 50, area: 'gym', photo: 'aspirateur-gym',
        fr: {
          title: 'Aspirateur : tout le gym',
          summary: 'Tapis noirs et gris, allées, sous les machines.',
          steps: [
            'Passe l’aspirateur : **tapis noirs**, **tapis gris**, allées.',
            'Entre et sous les machines, tapis roulants compris. Finis les coins.',
            'Balaie les résidus noirs derrière les tapis roulants.',
          ],
          tips: ['Les bureaux, c’est pas ici : c’est dans la tâche de la semaine.'],
        },
        en: {
          title: 'Vacuum: whole gym',
          summary: 'Black and grey mats, aisles, under machines.',
          steps: [
            'Vacuum: **black mats**, **grey mats**, aisles.',
            'Between and under the machines, treadmills included. Finish the corners.',
            'Sweep the black residue behind the treadmills.',
          ],
          tips: ['Offices aren’t done here: they’re in the weekly task.'],
        },
      },
      {
        id: 'q2-surfaces-2', kind: 'task', minutes: 10, area: 'surfaces', surfaces: 2,
        fr: { title: 'Tuiles / miroirs', summary: '', steps: [], tips: [] },
        en: { title: 'Tiles / mirrors', summary: '', steps: [], tips: [] },
      },
      {
        id: 'q2-guenilles-2', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles : finir et préparer demain',
          summary: 'Dernier tour, finir le lavage, stock pour demain.',
          steps: [
            'Dernier tour : ramasse les guenilles sales partout (studios, spinning, réception).',
            'Finis le lavage, plie et laisse un stock propre pour demain.',
          ],
          tips: ['Une brassée pas finie? Écris-le en remarque.'],
        },
        en: {
          title: 'Rags: finish and stock for tomorrow',
          summary: 'Last round, finish washing, stock for tomorrow.',
          steps: [
            'Last round: collect dirty rags everywhere (studios, spin room, front desk).',
            'Finish washing, fold and leave a clean stock for tomorrow.',
          ],
          tips: ['A load not finished? Write it in a remark.'],
        },
      },
      {
        id: 'q2-hebdo', kind: 'task', minutes: 30, area: 'bureaux', photo: 'hebdo', weekly: 2,
        fr: { title: 'Tâche de la semaine', summary: '', steps: [], tips: ['30 minutes d’un coup.'] },
        en: { title: 'Weekly task', summary: '', steps: [], tips: ['30 minutes in one go.'] },
      },
      {
        id: 'q2-fermeture', kind: 'task', minutes: 15, area: 'fermeture', photo: 'fermeture', closing: true,
        fr: {
          title: 'Fermeture',
          summary: 'Télés, musique, ventilation, dernier tour.',
          steps: [
            'Éteins les **4 télés** (laisse les **boîtiers Vidéotron allumés**), la musique et les **3 interrupteurs de ventilation**.',
            'Éteins juste les cardios désignés. Range poids, bancs et accessoires.',
            'Dernier tour, spinning et vestiaires compris. Plus aucun client? Tu peux partir.',
          ],
          tips: [],
        },
        en: {
          title: 'Closing',
          summary: 'TVs, music, ventilation, last round.',
          steps: [
            'Turn off the **4 TVs** (leave the **Vidéotron boxes on**), the music and the **3 ventilation switches**.',
            'Turn off only the designated cardio machines. Put weights, benches and accessories away.',
            'Last round, spin room and locker rooms included. No members left? You can go.',
          ],
          tips: [],
        },
      },
    ],
    fixedTimes: [
      { at: '19:00', id: 'compost', fr: 'Compost', en: 'Compost' },
    ],
  },
};
