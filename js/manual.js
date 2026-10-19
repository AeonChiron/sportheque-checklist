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

// Techniques du manuel (section 5) : les « bons trucs » de l'Aperçu.
export const TECHNIQUES = {
  fr: [
    { area: 'gym', text: 'Points de contact : travaille une rangée d’appareils à la fois et couvre poignées, sièges, dossiers, boutons et réglages.' },
    { area: 'gym', text: 'Laisse agir le désinfectant le temps indiqué sur l’étiquette du produit, pas moins.' },
    { area: 'cardio', text: '**Poussière : guenille sèche d’abord**, du haut vers le bas. Mouillée, la poussière colle et reste.' },
    { area: 'cardio', text: '**Ensuite, le produit** : vaporise-le **sur la guenille**, puis essuie. Jamais directement sur les écrans ou l’électronique.' },
    { area: 'gym', text: '**Guenille propre** au début du nettoyage en profondeur, et **une nouvelle guenille propre** après la zone.' },
    { area: 'zone', text: 'Repose-pieds : surface de contact des souliers d’abord (plateformes, pédaliers), puis contours, supports et bases.' },
    { area: 'surfaces', key: 'miroirs', text: 'Miroirs : couvre tout le panneau, puis regarde sous plusieurs angles avant de retoucher.' },
    { area: 'bureaux', key: 'murs', text: 'Murs : petits cercles, doucement. Si la peinture pâlit, arrête et signale.' },
    { area: 'muscu', text: 'Tapis noirs : les allées d’abord, puis autour des bancs, racks et supports; finis par les coins.' },
    { area: 'cardio', text: 'Tapis gris : surfaces ouvertes et côtés des tapis roulants; les dessous accessibles sans déranger ceux qui s’entraînent.' },
    { area: 'surfaces', key: 'tuiles', text: 'Tuiles blanches : saletés sèches d’abord (balayeuse ou balai), puis la moppe. Protège les zones glissantes.' },
    { area: 'buanderie', text: 'Guenilles « clients » et « ménage » : garde-les séparées et pars les brassées tôt pour que la machine travaille pendant toi.' },
    { area: 'dechets', text: '**Un seul bac pour tout le gym** : chaque fois que tu vides une poubelle dedans, **pousse le contenu vers le bas pour le compacter**. Bien tassé, tout le gym entre dans un seul bac.' },
    { area: 'dechets', text: 'Essuie l’extérieur des poubelles pendant la tournée des déchets, pas pendant le nettoyage en profondeur.' },
    { area: 'gym', text: 'Ne mélange jamais les produits chimiques et remets chaque outil à sa place.' },
  ],
  en: [
    { area: 'gym', text: 'Touch points: work one row of machines at a time and cover handles, seats, backrests, buttons and adjusters.' },
    { area: 'gym', text: 'Let the disinfectant sit for the time on the product label, not less.' },
    { area: 'cardio', text: '**Dust: dry rag first**, top to bottom. Wet dust sticks and stays.' },
    { area: 'cardio', text: '**Then the product**: spray it **on the rag**, then wipe. Never straight onto screens or electronics.' },
    { area: 'gym', text: '**Clean rag** at the start of the deep clean, and **a fresh clean rag** after the zone.' },
    { area: 'zone', text: 'Footrests: shoe-contact surfaces first (platforms, pedals), then edges, supports and bases.' },
    { area: 'surfaces', key: 'miroirs', text: 'Mirrors: cover the whole panel, then check from several angles before touching up.' },
    { area: 'bureaux', key: 'murs', text: 'Walls: small gentle circles. If the paint fades, stop and flag it.' },
    { area: 'muscu', text: 'Black mats: aisles first, then around benches, racks and supports; finish with the corners.' },
    { area: 'cardio', text: 'Grey mats: open areas and treadmill sides; reachable undersides without disturbing anyone training.' },
    { area: 'surfaces', key: 'tuiles', text: 'White tiles: dry dirt first (vacuum or broom), then the mop. Protect slippery spots.' },
    { area: 'buanderie', text: 'Keep “member” and “cleaning” rags separate, and start loads early so the machine works while you do.' },
    { area: 'dechets', text: '**One bin for the whole gym**: every time you empty a trash can into it, **push the contents down to compact them**. Packed tight, the whole gym fits in one bin.' },
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
            'Ouvre les **3 interrupteurs de ventilation** et allume les **4 télés** aux bons postes (tableau plus bas).',
            'Pars la playlist **« Sporthèque Matin »**.',
            'Fais le tour des studios et du spinning : guenilles propres en place, vaporisateurs pleins, comptoir et évier corrects.',
          ],
          tips: ['TV5 marche pas? Vérifie d’abord le poste 619, puis le boîtier Vidéotron (redémarre-le au besoin).'],
        },
        en: {
          title: 'Opening',
          summary: 'Ventilation, 4 TVs, music, spray bottles.',
          steps: [
            'Turn on the **3 ventilation switches** and the **4 TVs** on the right channels (table below).',
            'Start the **“Sporthèque Matin”** playlist.',
            'Walk through the studios and spin room: clean rags in place, spray bottles full, counter and sink OK.',
          ],
          tips: ['TV5 not working? Check channel 619 first, then the Vidéotron box (restart it if needed).'],
        },
      },
      {
        id: 'q1-guenilles-1', kind: 'task', minutes: 20, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles : sécheuse et lavage',
          summary: 'Sécheuse de la veille, ramasser, laver, plier.',
          steps: [
            'Vide la sécheuse (les guenilles d’hier).',
            'Ramasse les guenilles sales : studios, spinning et étage du bas.',
            'Pars une brassée et plie les guenilles propres.',
          ],
          tips: ['Laisse tourner la laveuse et la sécheuse pendant tes autres tâches; reviens à la fin du cycle.'],
        },
        en: {
          title: 'Rags: dryer and washing',
          summary: 'Yesterday’s dryer load, collect, wash, fold.',
          steps: [
            'Empty the dryer (yesterday’s rags).',
            'Collect dirty rags: studios, spin room and lower floor.',
            'Start a load and fold the clean rags.',
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
            'Époussette **à sec** : écrans, devant du cardio, logos et panneaux.',
            'Repasse ensuite avec du **produit sur la guenille** : écrans, devant du cardio, logos et panneaux.',
            'Replace les poids, bancs et accessoires; ramasse les déchets dans les allées.',
          ],
          tips: ['**À sec d’abord, le produit ensuite** : poussière mouillée = poussière qui colle.', 'Le produit va **sur la guenille**, jamais vaporisé directement sur les écrans ou l’électronique.', 'Les poignées et les sièges des autres appareils, c’est à 10 h (Entretien général).'],
        },
        en: {
          title: 'General disinfection',
          summary: 'Cardio screens and fronts, logos, panels; tidy up.',
          steps: [
            'Dust **dry**: screens, cardio fronts, logos and panels.',
            'Then go over them again with **product on the rag**: screens, cardio fronts, logos and panels.',
            'Put weights, benches and accessories back; pick up trash in the aisles.',
          ],
          tips: ['**Dry first, product after**: wet dust = dust that sticks.', 'Product goes **on the rag**, never sprayed straight onto screens or electronics.', 'Handles and seats on the other machines are done at 10:00 (General upkeep).'],
        },
      },
      {
        id: 'q1-poubelles', kind: 'task', minutes: 20, area: 'dechets', photo: 'poubelles',
        fr: {
          title: 'Poubelles',
          summary: 'Gym, bureaux, vestiaires + recyclage.',
          steps: [
            'Prends **un seul bac** et vide-y les poubelles du gym, des bureaux et des deux vestiaires.',
            'Remets un sac neuf dans chaque poubelle.',
            'Vide le recyclage, puis lave-toi les mains.',
          ],
          tips: ['**Tasse à chaque poubelle** : pousse le contenu vers le bas. Bien tassé, tout le gym entre dans un seul bac.', 'Nettoie l’extérieur des poubelles au besoin, pendant cette tournée (pas pendant le nettoyage en profondeur).', 'Pas de compost le matin : c’est le quart du soir.'],
        },
        en: {
          title: 'Trash',
          summary: 'Gym, offices, locker rooms + recycling.',
          steps: [
            'Take **one bin** and empty the gym, office and both locker-room trash cans into it.',
            'Put a fresh bag in each can.',
            'Empty the recycling, then wash your hands.',
          ],
          tips: ['**Pack it down after each can**: push the contents down. Packed tight, the whole gym fits in one bin.', 'Wipe the outside of the cans if needed, during this round (not during the deep clean).', 'No compost in the morning: that’s the evening shift.'],
        },
      },
      {
        id: 'q1-aspirateur-muscu', kind: 'task', minutes: 65, area: 'muscu', photo: 'aspirateur-muscu',
        fr: {
          title: 'Aspirateur — musculation',
          summary: 'Tapis noirs : cages, bancs, allées, coins.',
          steps: [
            'Passe la balayeuse sur les tapis noirs des zones B et C, allées comprises.',
            'Finis autour des machines, des supports et dans les coins.',
          ],
          tips: ['Les allées d’abord, puis autour des bancs, racks et supports; finis par les coins.'],
        },
        en: {
          title: 'Vacuum — weights area',
          summary: 'Black mats: racks, benches, aisles, corners.',
          steps: [
            'Vacuum the black mats in zones B and C, aisles included.',
            'Finish around the machines, the racks and in the corners.',
          ],
          tips: ['Aisles first, then around benches, racks and supports; finish with the corners.'],
        },
      },
      {
        id: 'q1-entretien-general', kind: 'task', minutes: 30, area: 'gym', photo: 'points-contact',
        fr: {
          title: 'Entretien général',
          summary: 'Points de contact, bois et métal, fontaine.',
          steps: [
            'Désinfecte les points de contact : poignées, sièges, dossiers, boutons.',
            'Essuie le bois, le métal gris, les rebords de fenêtre et les plinthes.',
            'Nettoie autour de la fontaine d’eau.',
          ],
          tips: ['Une rangée d’appareils à la fois; repasse sur les traces de sueur.', 'Laisse agir le désinfectant le temps indiqué sur l’étiquette.'],
        },
        en: {
          title: 'General upkeep',
          summary: 'Touch points, wood and metal, fountain.',
          steps: [
            'Disinfect touch points: handles, seats, backrests, buttons.',
            'Wipe the wood, grey metal, window ledges and baseboards.',
            'Clean around the water fountain.',
          ],
          tips: ['One row of machines at a time; go back over sweat marks.', 'Let the disinfectant sit for the time on the label.'],
        },
      },
      { id: 'q1-pause', kind: 'pause', minutes: 15, fr: { title: 'Pause' }, en: { title: 'Break' } },
      {
        id: 'q1-guenilles-2', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles : ramasser et redistribuer',
          summary: 'Ramasser, laver, plier, redistribuer.',
          steps: [
            'Ramasse les guenilles sales dans les studios.',
            'Lave, sèche, plie et remets-les en place.',
          ],
          tips: [],
        },
        en: {
          title: 'Rags: collect and restock',
          summary: 'Collect, wash, fold, hand out.',
          steps: [
            'Collect dirty rags in the studios.',
            'Wash, dry, fold and put them back.',
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
            '**Haltères** sur le support par poids, **disques** rangés, **bancs** à leur place.',
            'Accessoires et tapis d’étirement à leur place.',
            'Ramasse ce qui traîne et dégage les allées.',
          ],
          tips: ['C’est un tour de rangement, pas une autre tournée de désinfection ou de poubelles.'],
        },
        en: {
          title: 'Gym walkthrough',
          summary: 'Tidy up, clear the aisles.',
          steps: [
            '**Dumbbells** on the rack by weight, **plates** put away, **benches** in their spot.',
            'Accessories and stretching mats back in place.',
            'Pick up what’s lying around and clear the aisles.',
          ],
          tips: ['This is a tidy-up round, not another disinfection or trash round.'],
        },
      },
      { id: 'q1-diner', kind: 'meal', minutes: 60, fr: { title: 'Dîner' }, en: { title: 'Lunch' } },
      {
        id: 'q1-guenilles-3', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles : plier et distribuer',
          summary: 'Ramasser, laver/sécher, plier, distribuer.',
          steps: [
            'Ramasse les guenilles sales dans les studios.',
            'Lave, sèche, plie et distribue.',
          ],
          tips: [],
        },
        en: {
          title: 'Rags: fold and hand out',
          summary: 'Collect, wash/dry, fold, hand out.',
          steps: [
            'Collect dirty rags in the studios.',
            'Wash, dry, fold and hand them out.',
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
            'Passe la balayeuse sur les tapis gris et autour du cardio.',
            'Passe en dessous des appareils quand ça se rend.',
          ],
          tips: ['Les dessous accessibles, sans déranger ceux qui s’entraînent.', 'Les bureaux, c’est le quart du soir qui les fait.'],
        },
        en: {
          title: 'Vacuum — cardio',
          summary: 'Grey mats, aisles, under the machines.',
          steps: [
            'Vacuum the grey mats and around the cardio.',
            'Go under the machines where you can reach.',
          ],
          tips: ['Reachable undersides, without disturbing anyone training.', 'Offices are done by the evening shift.'],
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
            'Nettoie **tous les vélos** : guidon, selle, cadre.',
            'Remets la salle en ordre et remplis les vaporisateurs.',
          ],
          tips: ['Le spinning se nettoie seulement le matin : le quart du soir ne le fait pas.'],
        },
        en: {
          title: 'Spin room',
          summary: 'Every bike and accessory, spray bottles.',
          steps: [
            'Clean **every bike**: handlebars, seat, frame.',
            'Put the room in order and refill the spray bottles.',
          ],
          tips: ['The spin room is only cleaned in the morning: the evening shift doesn’t do it.'],
        },
      },
      {
        id: 'q1-fin', kind: 'task', minutes: 25, area: 'fermeture', photo: 'fin-quart', closing: true,
        fr: {
          title: 'Avant de partir',
          summary: 'Vidanges (clé 124), rangement, fournitures.',
          steps: [
            'Sors les vidanges (**clé 124**).',
            'Remets des guenilles propres et vérifie les fournitures : vaporisateurs, sacs, papier.',
            'Dernier coup d’œil : poids rangés, allées dégagées.',
          ],
          tips: ['Un bris, une fourniture qui manque, une tâche pas finie? **⚑ Signaler**, en haut.', 'Pas de compost le matin.'],
        },
        en: {
          title: 'Before you leave',
          summary: 'Garbage out (key 124), tidy, supplies.',
          steps: [
            'Take the garbage out (**key 124**).',
            'Put out clean rags and check supplies: spray bottles, bags, paper.',
            'Last look: weights put away, aisles clear.',
          ],
          tips: ['Something broken, a missing supply, a task not done? **⚑ Flag**, at the top.', 'No compost in the morning.'],
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
            'Fais le tour du gym : comptoir, évier, buvette.',
            'Remplis les vaporisateurs (**« Daily Usage »**) et vérifie le stock de guenilles propres.',
          ],
          tips: ['Le soir, tu passes dans les autres studios seulement pour les guenilles.'],
        },
        en: {
          title: 'Inspection and set-up',
          summary: 'Walkthrough, spray bottles, rag stock.',
          steps: [
            'Walk the gym: counter, sink, drinks counter.',
            'Fill the spray bottles (**“Daily Usage”**) and check the stock of clean rags.',
          ],
          tips: ['In the evening, you only visit the other studios for rags.'],
        },
      },
      {
        id: 'q2-guenilles-1', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles : ramasser et laver',
          summary: 'Studios, spinning, réception : laver, sécher, plier.',
          steps: [
            'Ramasse les guenilles sales : studios (tous les étages), spinning, réception.',
            'Pars les brassées, puis la sécheuse.',
            'Plie et redistribue.',
          ],
          tips: [
            'Garde séparées les guenilles « clients » et « ménage ».',
            'La laveuse et la sécheuse peuvent tourner pendant tes autres tâches.',
          ],
        },
        en: {
          title: 'Rags: collect and wash',
          summary: 'Studios, spin room, front desk: wash, dry, fold.',
          steps: [
            'Collect dirty rags: studios (every floor), spin room, front desk.',
            'Start the loads, then the dryer.',
            'Fold and hand out.',
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
            'Désinfecte les points de contact : poignées, sièges, dossiers, bancs, réglages; enlève les traces de sueur.',
            'Écrans et commandes : **à sec d’abord**, puis du **produit sur la guenille**.',
            'Essuie au besoin : tablettes, thermostats, télés, boîtiers Vidéotron, distributrices, miroirs tachés.',
          ],
          tips: ['**À sec d’abord, le produit ensuite** : poussière mouillée = poussière qui colle.', 'Le produit va **sur la guenille**, jamais vaporisé directement sur les écrans ou l’électronique.', 'À faire même si le quart du matin l’a déjà fait.'],
        },
        en: {
          title: 'General disinfection',
          summary: 'Touch points, screens, controls, surfaces.',
          steps: [
            'Disinfect touch points: handles, seats, backrests, benches, adjusters; wipe off sweat marks.',
            'Screens and controls: **dry first**, then **product on the rag**.',
            'Wipe as needed: shelves, thermostats, TVs, Vidéotron boxes, dispensers, smudged mirrors.',
          ],
          tips: ['**Dry first, product after**: wet dust = dust that sticks.', 'Product goes **on the rag**, never sprayed straight onto screens or electronics.', 'Do it even if the morning shift already did.'],
        },
      },
      {
        id: 'q2-rangement', kind: 'task', minutes: 15, area: 'gym', photo: 'rangement',
        fr: {
          title: 'Rangement des équipements',
          summary: 'Haltères, poids, bancs; dégager les allées.',
          steps: [
            '**Haltères** sur le support par poids; **disques** enlevés des barres et rangés.',
            '**Bancs** et accessoires à leur place.',
            'Ramasse ce qui traîne et dégage les allées.',
          ],
          tips: ['Enlève les poids laissés sur les appareils que personne n’utilise.'],
        },
        en: {
          title: 'Put equipment away',
          summary: 'Dumbbells, weights, benches; clear aisles.',
          steps: [
            '**Dumbbells** on the rack by weight; **plates** off the bars and put away.',
            '**Benches** and accessories back in place.',
            'Pick up what’s lying around and clear the aisles.',
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
            'Prends **un seul bac** et vide-y : gym, bureaux, vestiaires et recyclage.',
            'Sac neuf dans chaque poubelle. Dehors : poubelles du banc et de la terrasse, gros bac noir dans la benne.',
            'Sors les vidanges (**clé 124**), puis lave-toi les mains.',
          ],
          compostSteps: ['**Compost à 19 h** : vide-le et sors-le avec les vidanges.'],
          compostWednesday: '**Mercredi** : bac de compost en bordure de rue, côté stationnement.',
          tips: ['**Tasse à chaque poubelle** : pousse le contenu vers le bas. Bien tassé, tout le gym entre dans un seul bac.', 'Nettoie l’extérieur des poubelles au besoin, pendant cette tournée (pas pendant le nettoyage en profondeur).'],
        },
        en: {
          title: 'Trash and recycling',
          titleCompost: 'Trash, recycling and compost',
          summary: 'Gym, offices, locker rooms, outside; key 124.',
          steps: [
            'Take **one bin** and empty into it: gym, offices, locker rooms and recycling.',
            'Fresh bag in each can. Outside: bins by the bench and the terrace, big black bin into the dumpster.',
            'Take the garbage out (**key 124**), then wash your hands.',
          ],
          compostSteps: ['**Compost at 7 p.m.**: empty it and take it out with the garbage.'],
          compostWednesday: '**Wednesday**: compost bin to the curb, parking-lot side.',
          tips: ['**Pack it down after each can**: push the contents down. Packed tight, the whole gym fits in one bin.', 'Wipe the outside of the cans if needed, during this round (not during the deep clean).'],
        },
      },
      {
        id: 'q2-profondeur', kind: 'task', minutes: 60, area: 'zone', deep: true,
        fr: { title: 'Nettoyage en profondeur', summary: '', steps: [], tips: [] },
        en: { title: 'Deep clean', summary: '', steps: [], tips: [] },
      },
      {
        // Un seul bloc de 20 min (avant : deux passages de 10 min, simplifié avec l'équipe).
        id: 'q2-surfaces', kind: 'task', minutes: 20, area: 'surfaces', surfaces: true,
        fr: { title: 'Tuiles blanches / miroirs', summary: '', steps: [], tips: [] },
        en: { title: 'White tiles / mirrors', summary: '', steps: [], tips: [] },
      },
      { id: 'q2-pause', kind: 'pause', minutes: 15, fr: { title: 'Pause' }, en: { title: 'Break' } },
      {
        id: 'q2-aspirateur', kind: 'task', minutes: 50, area: 'gym', photo: 'aspirateur-gym',
        fr: {
          title: 'Aspirateur — gym',
          summary: 'Tapis noirs et gris, allées, sous les machines.',
          steps: [
            'Passe la balayeuse : tapis noirs, tapis gris et allées.',
            'Entre et sous les machines, tapis roulants compris; finis les coins.',
            'Balaie les résidus noirs derrière les tapis roulants.',
          ],
          tips: ['Les bureaux, c’est pas ici : ils sont dans l’entretien hebdo.'],
        },
        en: {
          title: 'Vacuum — gym',
          summary: 'Black and grey mats, aisles, under machines.',
          steps: [
            'Vacuum: black mats, grey mats and aisles.',
            'Between and under the machines, treadmills included; finish the corners.',
            'Sweep the black residue behind the treadmills.',
          ],
          tips: ['Offices aren’t done here: they’re in the weekly upkeep.'],
        },
      },
      {
        id: 'q2-guenilles-2', kind: 'task', minutes: 30, area: 'buanderie', photo: 'guenilles',
        fr: {
          title: 'Guenilles : finir et préparer demain',
          summary: 'Ramasser, finir le lavage, plier; stock pour demain.',
          steps: [
            'Ramasse les dernières guenilles sales et finis le lavage.',
            'Plie et laisse un stock propre pour demain.',
          ],
          tips: ['Une brassée pas finie? Écris-le en remarque.'],
        },
        en: {
          title: 'Rags: finish and stock for tomorrow',
          summary: 'Collect, finish washing, fold; stock for tomorrow.',
          steps: [
            'Collect the last dirty rags and finish the washing.',
            'Fold and leave a clean stock for tomorrow.',
          ],
          tips: ['A load not finished? Write it in a remark.'],
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
            'Éteins les **4 télés** (laisse les **boîtiers Vidéotron allumés**), la musique et les **3 interrupteurs de ventilation**.',
            'Éteins seulement les appareils cardio désignés, puis fais le dernier tour : A, B, C, spinning, vestiaires.',
            '**Assure-toi qu’il reste plus aucun client**, puis pars.',
          ],
          tips: [],
        },
        en: {
          title: 'Closing the gym',
          summary: '4 TVs off, Vidéotron on, music, ventilation.',
          steps: [
            'Turn off the **4 TVs** (leave the **Vidéotron boxes on**), the music and the **3 ventilation switches**.',
            'Turn off only the designated cardio machines, then do the last round: A, B, C, spin room, locker rooms.',
            '**Make sure every member has left**, then go.',
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
