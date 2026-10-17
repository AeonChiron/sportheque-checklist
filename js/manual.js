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
  1: { fr: { name: '1 · Porte du gym', what: ['Entrée du 2e étage'] }, en: { name: '1 · Gym door', what: ['Entrance to the 2nd floor'] } },
  2: { fr: { name: '2 · Évier', what: ['Évier et comptoir, près de la fontaine d’eau'] }, en: { name: '2 · Sink', what: ['Sink and counter, by the water fountain'] } },
  3: { fr: { name: '3 · Vestiaire des femmes', what: ['Poubelles à vider à chaque tournée'] }, en: { name: '3 · Women’s locker room', what: ['Bins to empty on every round'] } },
  4: { fr: { name: '4 · Studio de spinning', what: ['Vélos nettoyés le matin', 'Guenilles et vaporisateurs à vérifier'] }, en: { name: '4 · Spin studio', what: ['Bikes cleaned in the morning', 'Rags and spray bottles to check'] } },
  5: { fr: { name: '5 · Vestiaire des hommes', what: ['Poubelles à vider à chaque tournée'] }, en: { name: '5 · Men’s locker room', what: ['Bins to empty on every round'] } },
};

export const TV_CHANNELS = [
  { key: 'Bas droite', fr: 'Télé en bas à droite', en: 'Bottom-right TV', ch: '619 · TV5' },
  { key: 'Bas gauche', fr: 'Télé en bas à gauche', en: 'Bottom-left TV', ch: '625' },
  { key: 'Haut gauche', fr: 'Télé en haut à gauche', en: 'Top-left TV', ch: '779' },
  { key: 'Haut droite', fr: 'Télé en haut à droite', en: 'Top-right TV', ch: '620' },
];

// Techniques du manuel (section 5) : les « bons trucs » de l'Aperçu.
export const TECHNIQUES = {
  fr: [
    { area: 'gym', text: 'Points de contact : travaille une rangée d’appareils à la fois et couvre poignées, sièges, dossiers, boutons et réglages.' },
    { area: 'gym', text: 'Laisse agir le désinfectant le temps indiqué sur l’étiquette du produit, pas moins.' },
    { area: 'cardio', text: 'Écrans et boîtiers : mets le produit sur la guenille, jamais directement sur l’électronique.' },
    { area: 'zone', text: 'Repose-pieds : surface de contact des souliers d’abord (plateformes, pédaliers), puis contours, supports et bases.' },
    { area: 'surfaces', text: 'Miroirs : couvre tout le panneau, puis regarde sous plusieurs angles avant de retoucher.' },
    { area: 'bureaux', text: 'Murs : petits cercles, doucement. Si la peinture pâlit, arrête et signale.' },
    { area: 'muscu', text: 'Tapis noirs : les allées d’abord, puis autour des bancs, racks et supports; finis par les coins.' },
    { area: 'surfaces', text: 'Tuiles blanches : saletés sèches d’abord (balayeuse ou balai), puis la moppe. Protège les zones glissantes.' },
    { area: 'buanderie', text: 'Guenilles « clients » et « ménage » : garde-les séparées et pars les brassées tôt pour que la machine travaille pendant toi.' },
    { area: 'dechets', text: 'Essuie l’extérieur des poubelles pendant la tournée des déchets, pas pendant le nettoyage en profondeur.' },
    { area: 'gym', text: 'Ne mélange jamais les produits chimiques et remets chaque outil à sa place.' },
  ],
  en: [
    { area: 'gym', text: 'Touch points: work one row of machines at a time and cover handles, seats, backrests, buttons and adjusters.' },
    { area: 'gym', text: 'Let the disinfectant sit for the time on the product label, not less.' },
    { area: 'cardio', text: 'Screens and boxes: spray the rag, never the electronics directly.' },
    { area: 'zone', text: 'Footrests: shoe-contact surfaces first (platforms, pedals), then edges, supports and bases.' },
    { area: 'surfaces', text: 'Mirrors: cover the whole panel, then check from several angles before touching up.' },
    { area: 'bureaux', text: 'Walls: small gentle circles. If the paint fades, stop and flag it.' },
    { area: 'muscu', text: 'Black mats: aisles first, then around benches, racks and supports; finish with the corners.' },
    { area: 'surfaces', text: 'White tiles: dry dirt first (vacuum or broom), then the mop. Protect slippery spots.' },
    { area: 'buanderie', text: 'Keep “member” and “cleaning” rags separate, and start loads early so the machine works while you do.' },
    { area: 'dechets', text: 'Wipe the outside of the bins during the trash round, not during the deep clean.' },
    { area: 'gym', text: 'Never mix chemicals, and put every tool back where it belongs.' },
  ],
};

// Jours : 0 = lundi … 6 = dimanche.
export const WEEKDAYS = {
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

// Tâches hebdomadaires : { short: résumé, full: consigne }.
export const WEEKLY_Q1 = [
  { fr: { short: 'Supports à haltères', full: 'Nettoie les supports à haltères : dessus, dessous et côtés.' },
    en: { short: 'Dumbbell racks', full: 'Clean the dumbbell racks: top, underneath and sides.' } },
  { fr: { short: 'Étagères + thermostats', full: 'Nettoie les étagères des salles d’entraînement et du spinning; essuie les thermostats.' },
    en: { short: 'Shelves + thermostats', full: 'Clean the shelves in the training rooms and spin room; wipe the thermostats.' } },
  { fr: { short: 'Meuble du système de son', full: 'Nettoie l’intérieur du meuble du système de son.' },
    en: { short: 'Sound system cabinet', full: 'Clean the inside of the sound system cabinet.' } },
  { fr: { short: 'Distributeurs de papier + thermostats', full: 'Nettoie les distributeurs de papier; essuie les thermostats.' },
    en: { short: 'Paper dispensers + thermostats', full: 'Clean the paper dispensers; wipe the thermostats.' } },
  { fr: { short: 'Étagères des salles et du spinning', full: 'Nettoie les étagères des salles d’entraînement et du spinning.' },
    en: { short: 'Training room & spin shelves', full: 'Clean the shelves in the training rooms and spin room.' } },
  { fr: { short: 'Télés et décodeurs Vidéotron', full: 'Époussette les télés et les décodeurs Vidéotron.' },
    en: { short: 'TVs and Vidéotron boxes', full: 'Dust the TVs and the Vidéotron boxes.' } },
  { fr: { short: 'Distributeurs de papier', full: 'Nettoie les distributeurs de papier.' },
    en: { short: 'Paper dispensers', full: 'Clean the paper dispensers.' } },
];

export const WEEKLY_Q2 = [
  { fr: { short: 'Grilles de ventilation', full: 'Nettoie les grilles de ventilation accessibles et leur contour.' },
    en: { short: 'Ventilation grilles', full: 'Clean the reachable ventilation grilles and their edges.' } },
  { fr: { short: 'Bureaux des patrons (1/2)', full: 'Passe la balayeuse dans les **bureaux des patrons à l’étage** (1re fois de la semaine).' },
    en: { short: 'Owners’ offices (1/2)', full: 'Vacuum the **owners’ offices on the floor** (1st time this week).' } },
  { fr: { short: 'Bureaux des entraîneurs (1/2)', full: 'Passe la balayeuse dans les **bureaux des entraîneurs** (1re fois de la semaine).' },
    en: { short: 'Trainers’ offices (1/2)', full: 'Vacuum the **trainers’ offices** (1st time this week).' } },
  { fr: { short: 'Portes et cadres', full: 'Nettoie les portes, les cadres et les traces visibles.' },
    en: { short: 'Doors and frames', full: 'Clean doors, door frames and visible marks.' } },
  { fr: { short: 'Bureaux des patrons (2/2)', full: 'Passe la balayeuse dans les **bureaux des patrons à l’étage** (2e fois de la semaine).' },
    en: { short: 'Owners’ offices (2/2)', full: 'Vacuum the **owners’ offices on the floor** (2nd time this week).' } },
  { fr: { short: 'Bureaux des entraîneurs (2/2)', full: 'Passe la balayeuse dans les **bureaux des entraîneurs** (2e fois de la semaine).' },
    en: { short: 'Trainers’ offices (2/2)', full: 'Vacuum the **trainers’ offices** (2nd time this week).' } },
  { fr: { short: 'Endroits oubliés', full: 'Nettoie les endroits oubliés et les marques très visibles.' },
    en: { short: 'Missed spots', full: 'Clean missed spots and very visible marks.' } },
];

export const WALL_TECHNIQUE = {
  fr: 'Murs : guenille propre et produit qui ne brise pas la peinture. Petits cercles, doucement. Ne frotte pas jusqu’à abîmer le fini : si une marque ne part pas, arrête et signale-la.',
  en: 'Walls: clean rag and a paint-safe product. Small gentle circles. Don’t scrub hard enough to damage the finish: if a mark won’t come off, stop and flag it.',
};

export const PRIORITY_ORDER = {
  fr: [
    'Danger immédiat : plancher glissant, objet dangereux, allée bloquée.',
    'Saleté très visible et zones très sales.',
    'Surfaces que les clients touchent souvent.',
    'Ton plan de quart. Si tu manques de temps, ne coupe pas en silence : note ce qui n’est pas fini.',
  ],
  en: [
    'Immediate danger: slippery floor, dangerous object, blocked aisle.',
    'Very visible dirt and very dirty areas.',
    'Surfaces members touch often.',
    'Your shift plan. If you run short on time, don’t cut corners silently: note what wasn’t finished.',
  ],
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
          summary: 'Ventilation, 4 télés, musique, vaporisateurs.',
          steps: [
            'Ouvre les **3 interrupteurs de ventilation**.',
            'Allume les **4 télés** et mets-les aux bons postes (tableau plus bas).',
            'Pars la playlist **« Sporthèque Matin »**.',
            'Fais le tour des studios, spinning compris : guenilles propres en place et vaporisateurs de désinfectant remplis.',
            'Vérifie le comptoir et l’évier près de la fontaine d’eau; nettoie au besoin.',
          ],
          tips: ['TV5 ne marche pas? Vérifie d’abord le poste 619, puis le boîtier Vidéotron (redémarre-le au besoin).'],
        },
        en: {
          title: 'Opening',
          summary: 'Ventilation, 4 TVs, music, spray bottles.',
          steps: [
            'Turn on the **3 ventilation switches**.',
            'Turn on the **4 TVs** and set the right channels (table below).',
            'Start the **“Sporthèque Matin”** playlist.',
            'Walk through the studios, spin room included: clean rags in place and disinfectant spray bottles filled.',
            'Check the counter and the sink near the water fountain; clean if needed.',
          ],
          tips: ['TV5 not working? Check channel 619 first, then the Vidéotron box (restart it if needed).'],
        },
      },
      {
        id: 'q1-guenilles-1', kind: 'task', minutes: 20, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles — 1re tournée',
          summary: 'Sécheuse de la veille, ramasser, laver, plier.',
          steps: [
            'Vide la sécheuse (les guenilles d’hier).',
            'Ramasse les guenilles sales : tous les studios, le spinning et l’étage du bas.',
            'Pars une brassée au besoin. Plie les guenilles propres et prépare-les pour les studios.',
          ],
          tips: ['Laisse tourner la laveuse et la sécheuse pendant tes autres tâches; reviens à la fin du cycle.'],
        },
        en: {
          title: 'Rags — 1st round',
          summary: 'Yesterday’s dryer load, collect, wash, fold.',
          steps: [
            'Empty the dryer (yesterday’s rags).',
            'Collect dirty rags: all studios, the spin room and the lower floor.',
            'Start a load if needed. Fold the clean rags and set them up for the studios.',
          ],
          tips: ['Let the washer and dryer run while you do other tasks; come back when the cycle ends.'],
        },
      },
      {
        id: 'q1-desinfection', kind: 'task', minutes: 30, area: 'gym', photo: 'desinfection',
        fr: {
          title: 'Désinfection générale',
          summary: 'Écrans et devant du cardio, logos, panneaux; remettre en ordre.',
          steps: [
            'Nettoie les écrans et le devant des appareils de cardio.',
            'Essuie les logos et les panneaux d’instructions des machines.',
            'Méthode : vaporise sur la guenille (pas directement sur l’écran), puis essuie du haut vers le bas.',
            'Replace les haltères et les disques qui traînent, et ramasse les déchets dans les allées.',
          ],
          tips: ['Les poignées et les sièges des autres machines, c’est à 10 h (Entretien général).'],
        },
        en: {
          title: 'General disinfection',
          summary: 'Cardio screens and fronts, logos, panels; tidy up.',
          steps: [
            'Clean the screens and the fronts of the cardio machines.',
            'Wipe the machine logos and instruction panels.',
            'Method: spray the rag (not the screen), then wipe from top to bottom.',
            'Put loose dumbbells and plates back, and pick up trash in the aisles.',
          ],
          tips: ['Handles and seats on the other machines are done at 10:00 (General upkeep).'],
        },
      },
      {
        id: 'q1-poubelles', kind: 'task', minutes: 20, area: 'dechets', photo: 'poubelles',
        fr: {
          title: 'Poubelles',
          summary: 'Gym, bureaux, vestiaires + recyclage.',
          steps: [
            'Vide les poubelles du gym, des bureaux et des deux vestiaires (hommes et femmes).',
            'Remets un sac neuf dans chaque poubelle; s’il y a du liquide au fond, essuie-le d’abord.',
            'Essuie l’extérieur des poubelles au besoin, pendant ta tournée.',
            'Vide le recyclage au besoin.',
            'Lave-toi les mains après.',
          ],
          tips: ['Pas de compost le matin : c’est le quart du soir qui s’en occupe.'],
        },
        en: {
          title: 'Trash',
          summary: 'Gym, offices, locker rooms + recycling.',
          steps: [
            'Empty the trash in the gym, the offices and both locker rooms (men’s and women’s).',
            'Put a fresh bag in each bin; if there’s liquid at the bottom, wipe it out first.',
            'Wipe the outside of the bins if needed, during this round.',
            'Empty the recycling if needed.',
            'Wash your hands afterwards.',
          ],
          tips: ['No compost in the morning: the evening shift handles it.'],
        },
      },
      {
        id: 'q1-aspirateur-muscu', kind: 'task', minutes: 65, area: 'muscu', photo: 'aspirateur-muscu',
        fr: {
          title: 'Aspirateur — musculation',
          summary: 'Tapis noirs : cages, bancs, allées, coins.',
          steps: [
            'Passe la balayeuse sur les tapis noirs des zones B et C : cages à squat, bancs près du miroir, machines.',
            'Fais des passes qui se chevauchent un peu, pour ne rien oublier entre deux lignes.',
            'Fais les allées, entre les machines et autour des pieds et des supports.',
            'Finis par les coins et les saletés qui restent.',
          ],
          tips: [],
        },
        en: {
          title: 'Vacuum — weights area',
          summary: 'Black mats: racks, benches, aisles, corners.',
          steps: [
            'Vacuum the black mats in zones B and C: squat racks, benches by the mirror, machines.',
            'Make passes that overlap a little, so nothing is missed between two lines.',
            'Do the aisles, between the machines and around legs and racks.',
            'Finish with the corners and any dirt left.',
          ],
          tips: [],
        },
      },
      {
        id: 'q1-entretien-general', kind: 'task', minutes: 30, area: 'gym', photo: 'points-contact',
        fr: {
          title: 'Entretien général',
          summary: 'Points de contact, bois et métal, fontaine.',
          steps: [
            'Désinfecte les points de contact : poignées, sièges, dossiers, boutons et tiges de réglage.',
            'Essuie le bois et le métal gris, les rebords de fenêtre, les plinthes grises et les supports à bouteilles.',
            'Nettoie autour de la fontaine d’eau.',
          ],
          tips: [],
        },
        en: {
          title: 'General upkeep',
          summary: 'Touch points, wood and metal, fountain.',
          steps: [
            'Disinfect touch points: handles, seats, backrests, buttons and adjustment pins.',
            'Wipe the wood and grey metal, window ledges, grey baseboards and bottle holders.',
            'Clean around the water fountain.',
          ],
          tips: [],
        },
      },
      { id: 'q1-pause', kind: 'pause', minutes: 15, fr: { title: 'Pause' }, en: { title: 'Break' } },
      {
        id: 'q1-guenilles-2', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles — 2e tournée',
          summary: 'Ramasser, laver, plier, redistribuer.',
          steps: [
            'Ramasse les guenilles sales dans tous les studios.',
            'Lave et sèche au besoin.',
            'Plie et remets les guenilles propres dans les studios.',
          ],
          tips: [],
        },
        en: {
          title: 'Rags — 2nd round',
          summary: 'Collect, wash, fold, hand out.',
          steps: [
            'Collect dirty rags in all the studios.',
            'Wash and dry as needed.',
            'Fold and put clean rags back in the studios.',
          ],
          tips: [],
        },
      },
      {
        id: 'q1-profondeur', kind: 'task', minutes: 60, area: 'zone', deep: true,
        fr: { title: 'Nettoyage en profondeur', summary: '', steps: [], tips: ['Les poubelles ne se font pas ici, seulement pendant la tournée des poubelles.'] },
        en: { title: 'Deep clean', summary: '', steps: [], tips: ['Trash cans aren’t done here, only during the trash round.'] },
      },
      {
        id: 'q1-tour', kind: 'task', minutes: 15, area: 'gym', photo: 'tour-general',
        fr: {
          title: 'Tour général du gym',
          summary: 'Remettre en ordre, dégager les allées.',
          steps: [
            'Fais le tour complet du gym : poids déplacés, objets par terre, saletés, coins en désordre.',
            '**Haltères** : remets-les sur le support, en ordre de poids, chaque paire côte à côte.',
            '**Disques** : enlève ceux laissés sur les barres et les machines; range-les sur leurs supports, par poids.',
            '**Bancs** : remets-les à leur place, le dossier remis à plat.',
            '**Accessoires** (tapis, élastiques, poignées, cordes) : à leur crochet ou dans leur bac.',
            'Zone d’étirement (A) : tapis roulés ou empilés, ballons et rouleaux à leur place.',
            'Dégage les allées.',
          ],
          tips: ['C’est un tour de remise en ordre, pas une autre tournée de désinfection ou de poubelles.'],
        },
        en: {
          title: 'Gym walkthrough',
          summary: 'Tidy up, clear the aisles.',
          steps: [
            'Walk the whole gym: moved weights, things on the floor, dirt, messy corners.',
            '**Dumbbells**: back on the rack, in weight order, each pair side by side.',
            '**Plates**: take off any left on bars and machines; put them on their holders, by weight.',
            '**Benches**: back in their spot, backrest flat.',
            '**Accessories** (mats, bands, handles, ropes): on their hook or in their bin.',
            'Stretching area (A): mats rolled or stacked, balls and rollers back in place.',
            'Clear the aisles.',
          ],
          tips: ['This is a tidy-up round, not another disinfection or trash round.'],
        },
      },
      { id: 'q1-diner', kind: 'meal', minutes: 60, fr: { title: 'Dîner' }, en: { title: 'Lunch' } },
      {
        id: 'q1-guenilles-3', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles — 3e tournée',
          summary: 'Ramasser, laver/sécher, plier, distribuer.',
          steps: [
            'Ramasse les guenilles sales dans les studios.',
            'Continue le lavage et le séchage au besoin.',
            'Plie et distribue les guenilles propres.',
          ],
          tips: [],
        },
        en: {
          title: 'Rags — 3rd round',
          summary: 'Collect, wash/dry, fold, hand out.',
          steps: [
            'Collect dirty rags in the studios.',
            'Keep washing and drying as needed.',
            'Fold and hand out clean rags.',
          ],
          tips: [],
        },
      },
      {
        id: 'q1-aspirateur-cardio', kind: 'task', minutes: 25, area: 'cardio', photo: 'aspirateur-cardio',
        fr: {
          title: 'Aspirateur — cardio',
          summary: 'Tapis gris, allées, sous les appareils.',
          steps: [
            'Passe la balayeuse sur les tapis gris, dans les allées et autour des appareils de cardio.',
            'Passe en dessous des appareils quand c’est accessible.',
            'Ramasse les saletés qui restent.',
          ],
          tips: ['Les bureaux, c’est le quart du soir qui les fait.'],
        },
        en: {
          title: 'Vacuum — cardio',
          summary: 'Grey mats, aisles, under the machines.',
          steps: [
            'Vacuum the grey mats, the aisles and around the cardio machines.',
            'Go under the machines where you can reach.',
            'Pick up any dirt left.',
          ],
          tips: ['Offices are done by the evening shift.'],
        },
      },
      {
        id: 'q1-hebdo', kind: 'task', minutes: 20, area: 'bureaux', photo: 'hebdo', weekly: 1,
        fr: { title: 'Tâches hebdomadaires', summary: '', steps: [], tips: [] },
        en: { title: 'Weekly task', summary: '', steps: [], tips: [] },
      },
      {
        id: 'q1-spinning', kind: 'task', minutes: 20, area: 'spinning', photo: 'spinning',
        fr: {
          title: 'Salle de spinning',
          summary: 'Tous les vélos et accessoires, vaporisateurs.',
          steps: [
            'Nettoie **tous les vélos** : guidon, selle, cadre et accessoires.',
            'Remets la salle en ordre.',
            'Remplis les vaporisateurs de désinfectant au besoin.',
          ],
          tips: ['Le spinning se nettoie seulement le matin : le quart du soir ne le fait pas.'],
        },
        en: {
          title: 'Spin room',
          summary: 'Every bike and accessory, spray bottles.',
          steps: [
            'Clean **every bike**: handlebars, seat, frame and accessories.',
            'Put the room back in order.',
            'Refill the disinfectant spray bottles if needed.',
          ],
          tips: ['The spin room is only cleaned in the morning: the evening shift doesn’t do it.'],
        },
      },
      {
        id: 'q1-fin', kind: 'task', minutes: 25, area: 'fermeture', photo: 'fin-quart', closing: true,
        fr: {
          title: 'Fin de quart',
          summary: 'Vidanges (clé 124), rangement, fournitures.',
          steps: [
            'Sors les vidanges à l’endroit prévu (**clé 124**).',
            'Distribue les guenilles propres.',
            'Dernier tour de rangement (haltères, disques, bancs) et vérifie que les allées sont dégagées.',
            'Vérifie les fournitures : vaporisateurs remplis, guenilles propres, sacs à poubelle, papier dans les distributeurs.',
            'Un bris, une fourniture qui manque ou une tâche pas finie? Signale-le avec ⚑ Signaler.',
          ],
          tips: ['Pas de compost le matin.'],
        },
        en: {
          title: 'End of shift',
          summary: 'Garbage out (key 124), tidy, supplies.',
          steps: [
            'Take the garbage out to the usual spot (**key 124**).',
            'Hand out clean rags.',
            'Last tidy-up round (dumbbells, plates, benches) and check the aisles are clear.',
            'Check supplies: spray bottles filled, clean rags, garbage bags, paper in the dispensers.',
            'Something broken, a missing supply or an unfinished task? Flag it with ⚑ Flag.',
          ],
          tips: ['No compost in the morning.'],
        },
      },
    ],
    // Repères horaires fixes : jamais attribués fictivement (étape 5).
    fixedTimes: [
      { at: '12:00', id: 'playlist-midi', fr: 'Mets la playlist « Sporthèque Midi »', en: 'Switch to the “Sporthèque Midi” playlist' },
      { at: '15:00', id: 'playlist-soir', fr: 'Mets la playlist « Sporthèque soir »', en: 'Switch to the “Sporthèque soir” playlist' },
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
          title: 'Inspection et préparation',
          summary: 'Tour des lieux, vaporisateurs, stock de guenilles.',
          steps: [
            'Fais le tour du gym au 2e étage : état des lieux, buvette, comptoir et lavabo.',
            'Vérifie les vaporisateurs, spinning compris; remplis-les avec du **« Daily Usage »** au besoin.',
            'Vérifie le stock de guenilles propres (spinning, autres studios, réception) et prépare ton matériel.',
          ],
          tips: ['Le soir, tu passes dans les autres studios seulement pour les guenilles.'],
        },
        en: {
          title: 'Inspection and set-up',
          summary: 'Walkthrough, spray bottles, rag stock.',
          steps: [
            'Walk the 2nd-floor gym: overall state, drinks counter, front counter and sink.',
            'Check the spray bottles, spin room included; refill them with **“Daily Usage”** if needed.',
            'Check the stock of clean rags (spin room, other studios, front desk) and get your supplies ready.',
          ],
          tips: ['In the evening, you only visit the other studios for rags.'],
        },
      },
      {
        id: 'q2-guenilles-1', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles — 1re tournée',
          summary: 'Studios, spinning, réception : laver, sécher, plier.',
          steps: [
            'Ramasse les guenilles sales : studios (autres étages aussi), spinning et réception.',
            'Pars les brassées nécessaires; transfère à la sécheuse quand c’est fini.',
            'Plie et redistribue les guenilles propres.',
          ],
          tips: [
            'Garde séparées les guenilles « clients » et « ménage ».',
            'La laveuse et la sécheuse peuvent tourner pendant tes autres tâches.',
          ],
        },
        en: {
          title: 'Rags — 1st round',
          summary: 'Studios, spin room, front desk: wash, dry, fold.',
          steps: [
            'Collect dirty rags: studios (other floors too), spin room and front desk.',
            'Start the loads you need; move them to the dryer when done.',
            'Fold and hand out clean rags.',
          ],
          tips: [
            'Keep “member” rags and “cleaning” rags separate.',
            'The washer and dryer can run while you do other tasks.',
          ],
        },
      },
      {
        id: 'q2-desinfection', kind: 'task', minutes: 30, area: 'gym', photo: 'desinfection',
        fr: {
          title: 'Désinfection générale',
          summary: 'Points de contact, écrans, commandes, surfaces.',
          steps: [
            'Désinfecte poignées, sièges, dossiers, réglages, bancs et autres points de contact; enlève les traces de sueur.',
            'Nettoie comme il faut les écrans et les commandes.',
            'Essuie au besoin : tablettes, thermostats, télés, boîtiers Vidéotron, distributrices de papier, bacs et miroirs tachés.',
          ],
          tips: ['À faire même si le quart du matin l’a déjà fait.'],
        },
        en: {
          title: 'General disinfection',
          summary: 'Touch points, screens, controls, surfaces.',
          steps: [
            'Disinfect handles, seats, backrests, adjusters, benches and other touch points; remove sweat marks.',
            'Clean the screens and controls properly.',
            'Wipe as needed: shelves, thermostats, TVs, Vidéotron boxes, paper dispensers, bins and smudged mirrors.',
          ],
          tips: ['Do it even if the morning shift already did.'],
        },
      },
      {
        id: 'q2-rangement', kind: 'task', minutes: 15, area: 'gym', photo: 'rangement',
        fr: {
          title: 'Rangement des équipements',
          summary: 'Haltères, poids, bancs; dégager les allées.',
          steps: [
            '**Haltères** : remets-les sur le support, en ordre de poids, chaque paire côte à côte.',
            '**Disques** : enlève ceux laissés sur les barres et les machines; range-les sur leurs supports, par poids.',
            '**Bancs** : remets-les à leur place, le dossier remis à plat.',
            '**Accessoires** (tapis, élastiques, poignées, cordes) : à leur crochet ou dans leur bac.',
            'Fais le tour des machines de B et C : aucune goupille ni disque laissé dessus.',
            'Ramasse ce qui traîne par terre (bouteilles, serviettes, lingettes) et dégage les allées.',
          ],
          tips: [],
        },
        en: {
          title: 'Put equipment away',
          summary: 'Dumbbells, weights, benches; clear aisles.',
          steps: [
            '**Dumbbells**: back on the rack, in weight order, each pair side by side.',
            '**Plates**: take off any left on bars and machines; put them on their holders, by weight.',
            '**Benches**: back in their spot, backrest flat.',
            '**Accessories** (mats, bands, handles, ropes): on their hook or in their bin.',
            'Look at every machine in B and C: no weight pin left in, no plate left on.',
            'Pick up what’s lying on the floor (bottles, towels, wipes) and clear the aisles.',
          ],
          tips: [],
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
            'Vide les poubelles et le recyclage : gym, bureaux et les deux vestiaires (hommes et femmes).',
            'Remets un sac neuf dans chaque poubelle; s’il y a du liquide au fond, essuie-le d’abord.',
            'Dehors : vérifie les poubelles près du banc en bois et de la terrasse de la piscine; vide le gros bac noir dans la benne.',
            'Essuie l’extérieur des poubelles au besoin, pendant ta tournée.',
            'Sors les vidanges à l’endroit prévu (**clé 124**), puis lave-toi les mains.',
          ],
          compostSteps: ['**Compost à 19 h** : vide le compost (gym, bureaux, vestiaires) et sors-le avec les vidanges.'],
          compostWednesday: '**Mercredi** : vide le compost dans le bac extérieur et mets ce bac en bordure de rue, côté stationnement.',
          tips: [],
        },
        en: {
          title: 'Trash and recycling',
          titleCompost: 'Trash, recycling and compost',
          summary: 'Gym, offices, locker rooms, outside; key 124.',
          steps: [
            'Empty the trash and recycling: gym, offices and both locker rooms (men’s and women’s).',
            'Put a fresh bag in each bin; if there’s liquid at the bottom, wipe it out first.',
            'Outside: check the bins by the wooden bench and the pool terrace; empty the big black bin into the dumpster.',
            'Wipe the outside of the bins if needed, during this round.',
            'Take the garbage out to the usual spot (**key 124**), then wash your hands.',
          ],
          compostSteps: ['**Compost at 7 p.m.**: empty the compost (gym, offices, locker rooms) and take it out with the garbage.'],
          compostWednesday: '**Wednesday**: empty the compost into the outdoor bin and put that bin at the curb, parking-lot side.',
          tips: [],
        },
      },
      {
        id: 'q2-profondeur', kind: 'task', minutes: 60, area: 'zone', deep: true,
        fr: { title: 'Nettoyage en profondeur', summary: '', steps: [], tips: ['60 minutes d’affilée. Note ce qui n’a pas pu être fini.'] },
        en: { title: 'Deep clean', summary: '', steps: [], tips: ['60 minutes straight. Note anything you couldn’t finish.'] },
      },
      {
        id: 'q2-surfaces-1', kind: 'task', minutes: 10, area: 'surfaces', surfaces: 1,
        fr: { title: 'Tuiles blanches / miroirs — passage 1', summary: '', steps: [], tips: ['Le 2e passage se fait après la balayeuse.'] },
        en: { title: 'White tiles / mirrors — pass 1', summary: '', steps: [], tips: ['The 2nd pass comes after vacuuming.'] },
      },
      { id: 'q2-pause', kind: 'pause', minutes: 15, fr: { title: 'Pause' }, en: { title: 'Break' } },
      {
        id: 'q2-aspirateur', kind: 'task', minutes: 50, area: 'gym', photo: 'aspirateur-gym',
        fr: {
          title: 'Aspirateur — gym',
          summary: 'Tapis noirs et gris, allées, sous les machines.',
          steps: [
            'Passe la balayeuse : tapis noirs (musculation), tapis gris (cardio et coin d’entraînement), allées.',
            'Passe entre, autour et sous les machines accessibles, tapis roulants compris; finis les coins.',
            'Balaie les résidus noirs derrière les tapis roulants et dans les zones passantes.',
            'Range la balayeuse.',
          ],
          tips: ['Les bureaux ne se font pas ici : ils sont dans l’entretien hebdo.'],
        },
        en: {
          title: 'Vacuum — gym',
          summary: 'Black and grey mats, aisles, under machines.',
          steps: [
            'Vacuum: black mats (weights), grey mats (cardio and training corner), aisles.',
            'Go between, around and under reachable machines, treadmills included; finish the corners.',
            'Sweep the black residue behind the treadmills and in busy areas.',
            'Put the vacuum away.',
          ],
          tips: ['Offices aren’t done here: they’re in the weekly upkeep.'],
        },
      },
      {
        id: 'q2-surfaces-2', kind: 'task', minutes: 10, area: 'surfaces', surfaces: 2,
        fr: { title: 'Tuiles blanches / miroirs — passage 2', summary: '', steps: [], tips: [] },
        en: { title: 'White tiles / mirrors — pass 2', summary: '', steps: [], tips: [] },
      },
      {
        id: 'q2-guenilles-2', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles — 2e tournée',
          summary: 'Dernière tournée; stock pour demain.',
          steps: [
            'Dernière tournée : ramasse les guenilles sales (studios de tous les étages, spinning, réception).',
            'Finis le lavage et le séchage; plie et redistribue.',
            'Prépare le stock de guenilles propres pour demain.',
          ],
          tips: ['Essaie de laisser des guenilles sèches et pliées pour demain; note toute brassée pas finie.'],
        },
        en: {
          title: 'Rags — 2nd round',
          summary: 'Last round; stock for tomorrow.',
          steps: [
            'Last round: collect dirty rags (studios on every floor, spin room, front desk).',
            'Finish washing and drying; fold and hand out.',
            'Set up the stock of clean rags for tomorrow.',
          ],
          tips: ['Try to leave dry, folded rags for tomorrow; note any unfinished load.'],
        },
      },
      {
        id: 'q2-hebdo', kind: 'task', minutes: 30, area: 'bureaux', photo: 'hebdo', weekly: 2,
        fr: { title: 'Entretien hebdomadaire', summary: '', steps: [], tips: ['Un seul bloc de 30 minutes, d’un coup.'] },
        en: { title: 'Weekly upkeep', summary: '', steps: [], tips: ['One single 30-minute block.'] },
      },
      {
        id: 'q2-fermeture', kind: 'task', minutes: 15, area: 'fermeture', photo: 'fermeture', closing: true,
        fr: {
          title: 'Fermeture du gym',
          summary: '4 télés off, Vidéotron on, musique, ventilation.',
          steps: [
            'Éteins les **4 télés**, mais **laisse les boîtiers Vidéotron allumés**.',
            'Ferme la musique et les **3 interrupteurs de ventilation**.',
            'Éteins ou débranche seulement les appareils cardio désignés.',
            'Dernier rangement (haltères, disques, bancs, accessoires), puis fais le tour : zones A, B et C, studio de spinning et les deux vestiaires.',
            '**Assure-toi qu’il ne reste plus aucun client avant de partir.**',
          ],
          tips: [],
        },
        en: {
          title: 'Closing the gym',
          summary: '4 TVs off, Vidéotron on, music, ventilation.',
          steps: [
            'Turn off the **4 TVs**, but **leave the Vidéotron boxes on**.',
            'Turn off the music and the **3 ventilation switches**.',
            'Turn off or unplug only the designated cardio machines.',
            'Last tidy-up (dumbbells, plates, benches, accessories), then walk through zones A, B and C, the spin studio and both locker rooms.',
            '**Make sure every member has left before you go.**',
          ],
          tips: [],
        },
      },
    ],
    fixedTimes: [
      { at: '19:00', id: 'compost', fr: 'Collecte du compost', en: 'Compost pickup' },
    ],
  },
};
