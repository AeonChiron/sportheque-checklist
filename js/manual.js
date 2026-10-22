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

// Les bases (onglet « Trucs ») : techniques du manuel + consignes de l'équipe.
export const TECHNIQUES = {
  fr: [
    { area: 'gym', text: '**Range au fur et à mesure, pendant tout ton quart** : un poids qui traîne, tu le replaces tout de suite.' },
    { area: 'gym', text: '**Désinfecter :** vaporise toute une rangée, puis reviens à la première et tapote doucement.' },
    { area: 'cardio', text: '**Écrans : guenille à peine humide.** Très sale? Un peu de produit **sur la guenille**, jamais sur l’écran.' },
    { area: 'cardio', text: '**Poussière : guenille sèche** (ou à peine humide). Trop mouillée, elle étale la poussière.' },
    { area: 'gym', text: '**Traces de doigts et sueur : guenille à peine humide** avec du produit.' },
    { area: 'zone', text: 'La guenille du profondeur **touche jamais** aux poignées ni aux sièges : tu étalerais les microbes.' },
    { area: 'accueil', text: 'Vaporisateurs : change juste ceux **sous 30 %**, jamais tous en même temps. Remets-les **au-dessus des distributeurs de papier**.' },
    { area: 'buanderie', text: 'Sécheuse : **15 à 20 min**. Plus de 30 min, les guenilles sont trop sèches et donnent des chocs.' },
    { area: 'dechets', text: '**Une seule grosse poubelle** (à droite du cardio) : après chaque poubelle vidée, **pousse avec son fond** pour tasser.' },
    { area: 'surfaces', key: 'miroirs', text: 'Miroirs : **mousse à l’éponge, puis raclette**. Pas trop de produit : c’est ça qui laisse des marques.' },
    { area: 'surfaces', key: 'tuiles', text: '**Tuiles** : les saletés sèches d’abord (aspirateur ou balai), la moppe après. Affiche « plancher mouillé ».' },
    { area: 'muscu', text: '**Tapis noirs** : les allées d’abord, puis autour des bancs et des supports. Les coins à la fin.' },
    { area: 'gym', text: 'Mélange jamais les produits. Chaque outil retourne à sa place.' },
  ],
  en: [
    { area: 'gym', text: '**Put things away as you go, all shift long**: a weight lying around, put it back right away.' },
    { area: 'gym', text: '**Disinfecting:** spray a whole row, then go back to the first and pat gently.' },
    { area: 'cardio', text: '**Screens: barely damp rag.** Very dirty? A little product **on the rag**, never on the screen.' },
    { area: 'cardio', text: '**Dust: dry rag** (or barely damp). Too wet, it spreads the dust.' },
    { area: 'gym', text: '**Fingerprints and sweat: barely damp rag** with product.' },
    { area: 'zone', text: 'The deep-clean rag **never touches** handles or seats: you’d spread germs.' },
    { area: 'accueil', text: 'Spray bottles: swap only those **under 30%**, never all at once. Put them back **above the paper towel dispensers**.' },
    { area: 'buanderie', text: 'Dryer: **15 to 20 min**. Over 30 min, rags get too dry and give shocks.' },
    { area: 'dechets', text: '**One big trash can** (right of the cardio): after each can, **push down with its bottom** to pack it.' },
    { area: 'surfaces', key: 'miroirs', text: 'Mirrors: **foam with the sponge, then squeegee**. Not too much product: that’s what leaves marks.' },
    { area: 'surfaces', key: 'tuiles', text: '**Tiles**: dry dirt first (vacuum or broom), mop after. Put out the wet-floor sign.' },
    { area: 'muscu', text: '**Black mats**: aisles first, then around benches and racks. Corners last.' },
    { area: 'gym', text: 'Never mix products. Every tool goes back in its spot.' },
  ],
};

// Tous les trucs d'une tâche, pour l'onglet « Trucs » (pendant le quart, la
// tâche n'en montre que l'essentiel, 3 au plus).
const TV_LINE = {
  fr: 'Postes : en bas à droite **619 (TV5)**, en bas à gauche **625**, en haut à gauche **779**, en haut à droite **620**. Tu les mets sur chaque boîtier Vidéotron.',
  en: 'Channels: bottom right **619 (TV5)**, bottom left **625**, top left **779**, top right **620**. Set them on each Vidéotron box.',
};
export const GUIDE = {
  fr: {
    start: [
      '**Commence par les télés** : c’est la première chose que les clients voient.',
      TV_LINE.fr,
      'TV5 marche pas? Vérifie que la télé est sur le **619**. Toujours rien? Regarde si le boîtier Vidéotron est allumé, et rallume-le.',
      'Vaporisateurs (« Daily Usage ») : change juste ceux qui ont **moins de 30 %**. Si tu les prends tous en même temps, personne peut nettoyer sa machine pendant ce temps-là.',
      'Quand tu les remets, place-les **au-dessus des distributeurs de papier** (essuie-mains).',
      '**Distributeurs de papier pleins** dès le début du quart.',
    ],
    rags: [
      'Une guenille te donne un **choc** en la sortant? Elle est **trop sèche**.',
      'Sors-les à environ **90 % sèches**. Sécheuse chaude : **15 à 20 minutes**, c’est parfait.',
      '**Plus de 30 minutes** : trop chaud, trop sec, et ça donne des chocs.',
      'Plie-les **bien, toutes pareilles** : c’est plus beau et plus facile à prendre.',
      'Guenilles « clients » et « ménage » : chacune son usage.',
      'La laveuse et la sécheuse tournent pendant que tu fais autre chose.',
    ],
    disinfect: [
      '**Écrans : une guenille à peine humide** (pas trop mouillée) pour les traces de doigts. Si c’est très sale, mets un peu de produit **sur la guenille**, jamais directement sur l’écran.',
      'Avec la **même guenille**, va derrière les machines de cardio et frotte jusqu’à ce qu’il reste plus de poussière.',
      '**Désinfecter :** vaporise une machine, puis passe aux autres de la même section (une dizaine).',
      'Quand t’as fait le tour, **reviens à la première** et tapote **doucement**. Enlève juste un peu de liquide, pas tout.',
      'Traces de doigts et sueur : guenille à peine humide avec du produit.',
      'Même si ça a l’air propre, essuie : poignées, sièges, dossiers, boutons, tiges de réglage, supports à bouteilles.',
      'Guenille trop mouillée = poussière qui s’étale. Pour la poussière, toujours sec.',
    ],
    contact: [
      '**Désinfecter :** vaporise une machine, puis passe aux autres de la même rangée.',
      'Quand t’as fait le tour, **reviens à la première** et tapote **doucement**. Enlève juste un peu de liquide.',
      'Même si ça a l’air propre, essuie : poignées, sièges, dossiers, boutons, tiges de réglage, supports à bouteilles.',
      'Traces de doigts et sueur : guenille à peine humide avec du produit.',
      'Laisse agir le produit le temps écrit sur l’étiquette.',
    ],
    tidy: [
      '**Range au fur et à mesure, pendant tout ton quart**, pas juste à cette tâche-là.',
      'Des poids oubliés sur une machine? Enlève-les et range-les.',
      'Une machine pas à sa place? Replace-la. Les **machines de bench** : bien droites, **parallèles et symétriques**.',
      'Coin d’échauffement (**tapis gris**) : tout bien placé, rien qui traîne.',
      'Quelque chose par terre (carton, serviette de papier…)? **À la poubelle.**',
    ],
    trash: [
      'Prends la **grosse poubelle à droite du cardio**, près du tapis gris.',
      'Après chaque poubelle vidée, **pousse avec son fond** pour tasser dans la grosse. Tout le gym rentre en un seul tour.',
      'Essuie l’extérieur des poubelles au besoin, pendant ce tour, pas pendant le profondeur.',
      'Le compost, c’est le soir, à 19 h. Mercredi, le bac va au chemin.',
      'Lave-toi les mains après.',
    ],
    vacuum: [
      'Les grandes surfaces d’abord, les coins difficiles après.',
      '**Tapis noirs** : les allées d’abord, puis autour des bancs et des supports. Les coins à la fin.',
      '**Tapis gris** : en dessous des machines où ça se rend, sans déranger ceux qui s’entraînent.',
      'Déplace pas de machine lourde.',
      'Le soir : balaie les résidus noirs derrière les tapis roulants.',
    ],
    deep: [
      '**Poussière d’abord, à sec**, avant de commencer.',
      '**Change de guenille** avant de commencer, et prends-en une propre après.',
      'Sois **méthodique** : une machine à la fois, de haut en bas.',
      'Vise les endroits **vraiment sales** : c’est pour eux que t’es là.',
      'Cette guenille-là **touche jamais** aux surfaces que les clients touchent avec leurs mains : tu étalerais les microbes. Le profondeur, c’est pour les endroits que personne touche mais qui salissent.',
      'Ta guenille est bien sale à la fin? Bon signe : t’as eu les coins oubliés.',
      'Machine occupée? Reviens-y plus tard.',
    ],
    mirrors: [
      '**Le mélange** : un peu de nettoyant à vitre et un peu de savon à vaisselle, dans l’eau.',
      '**Éponge** : mets la mousse sur le miroir et frotte bien.',
      '**Raclette** ensuite : enlève toute la mousse, doucement.',
      '**Pas trop de produit** : c’est ça qui laisse des marques.',
      'Regarde de côté pour voir les traces qui restent.',
    ],
    tiles: [
      'Les saletés sèches d’abord (aspirateur ou balai), la moppe après.',
      'Coins et bordures compris.',
      'Affiche « plancher mouillé » et laisse sécher.',
    ],
    spin: [
      'Tous les vélos : guidon, selle, cadre.',
      '**Désinfecter :** vaporise plusieurs vélos, puis reviens au premier.',
      'Le spinning, c’est juste le matin.',
    ],
    weekly: [
      '30 minutes d’un coup, le soir.',
      'Murs : guenille propre, produit correct pour la peinture, petits cercles. La marque part pas? Arrête et signale-la.',
      'Du temps en trop le matin? Selon la saison : arrose les fleurs, ou enlève la neige et la glace. Lave les vadrouilles au besoin.',
    ],
    closing: [
      'Laisse les **boîtiers Vidéotron allumés**; seulement les télés s’éteignent.',
      'Un dernier rangement : poids, bancs, accessoires.',
      'Quelque chose de pas fini ou de brisé? **⚑ Signale-le.**',
    ],
  },
  en: {
    start: [
      '**Start with the TVs**: they’re the first thing members see.',
      TV_LINE.en,
      'TV5 not working? Check the TV is on **619**. Still nothing? See if the Vidéotron box is on, and turn it back on.',
      'Spray bottles (“Daily Usage”): swap only those with **less than 30%**. If you take them all at once, nobody can clean their machine in the meantime.',
      'When you put them back, place them **above the paper towel dispensers**.',
      '**Paper dispensers full** at the start of the shift.',
    ],
    rags: [
      'A rag gives you a **shock** when you take it out? It’s **too dry**.',
      'Take them out about **90% dry**. Hot dryer: **15 to 20 minutes** is perfect.',
      '**Over 30 minutes**: too hot, too dry, and you get shocks.',
      'Fold them **neatly, all the same**: looks better and easier to grab.',
      '“Member” and “cleaning” rags: each has its own use.',
      'The washer and dryer run while you do something else.',
    ],
    disinfect: [
      '**Screens: a barely damp rag** (not too wet) for fingerprints. If they’re very dirty, put a little product **on the rag**, never straight on the screen.',
      'With the **same rag**, go behind the cardio machines and rub until there’s no dust left.',
      '**Disinfecting:** spray one machine, then move on to the others in the same section (about ten).',
      'Once you’ve done the round, **go back to the first** and pat **gently**. Take off just a little liquid, not all of it.',
      'Fingerprints and sweat: barely damp rag with product.',
      'Even if it looks clean, wipe it: handles, seats, backrests, buttons, pins, bottle holders.',
      'Rag too wet = dust that smears. For dust, always dry.',
    ],
    contact: [
      '**Disinfecting:** spray one machine, then move on to the others in the same row.',
      'Once you’ve done the round, **go back to the first** and pat **gently**. Take off just a little liquid.',
      'Even if it looks clean, wipe it: handles, seats, backrests, buttons, pins, bottle holders.',
      'Fingerprints and sweat: barely damp rag with product.',
      'Let the product sit for the time on the label.',
    ],
    tidy: [
      '**Put things away as you go, all shift long**, not just during this task.',
      'Weights left on a machine? Take them off and put them away.',
      'A machine out of place? Put it back. The **bench machines**: straight, **parallel and symmetrical**.',
      'Warm-up area (**grey mat**): everything in place, nothing lying around.',
      'Something on the floor (cardboard, paper towel…)? **In the trash.**',
    ],
    trash: [
      'Take the **big trash can right of the cardio**, by the grey mat.',
      'After each can, **push down with its bottom** to pack the big one. The whole gym fits in one round.',
      'Wipe the outside of the cans if needed, during this round, not during the deep clean.',
      'Compost is the evening shift, at 7 p.m. Wednesday, the bin goes to the curb.',
      'Wash your hands after.',
    ],
    vacuum: [
      'Big areas first, hard corners after.',
      '**Black mats**: aisles first, then around benches and racks. Corners last.',
      '**Grey mats**: under the machines where you can reach, without bothering anyone training.',
      'Don’t move heavy machines.',
      'Evening: sweep the black residue behind the treadmills.',
    ],
    deep: [
      '**Dust first, dry**, before you start.',
      '**Change rags** before you start, and take a clean one after.',
      'Be **methodical**: one machine at a time, top to bottom.',
      'Go for the **really dirty** spots: that’s what you’re there for.',
      'That rag **never touches** surfaces members touch with their hands: you’d spread germs. Deep cleaning is for spots nobody touches but that get dirty.',
      'Rag really dirty at the end? Good sign: you got the missed spots.',
      'Machine in use? Come back later.',
    ],
    mirrors: [
      '**The mix**: a little glass cleaner and a little dish soap, in water.',
      '**Sponge**: put the foam on the mirror and scrub well.',
      '**Squeegee** after: remove all the foam, gently.',
      '**Not too much product**: that’s what leaves marks.',
      'Look from the side to spot any streaks left.',
    ],
    tiles: [
      'Dry dirt first (vacuum or broom), mop after.',
      'Corners and edges included.',
      'Put out the wet-floor sign and let it dry.',
    ],
    spin: [
      'Every bike: handlebars, seat, frame.',
      '**Disinfecting:** spray several bikes, then go back to the first.',
      'The spin room is mornings only.',
    ],
    weekly: [
      '30 minutes in one go, in the evening.',
      'Walls: clean rag, paint-safe product, small circles. Mark won’t come off? Stop and flag it.',
      'Time left in the morning? Depending on the season: water the flowers, or clear snow and ice. Wash the mops if needed.',
    ],
    closing: [
      'Leave the **Vidéotron boxes on**; only the TVs go off.',
      'One last tidy: weights, benches, accessories.',
      'Something not done or broken? **⚑ Flag it.**',
    ],
  },
};
const GUIDE_KEY = {
  ouverture: 'start', inspection: 'start', guenilles: 'rags', desinfection: 'disinfect', 'points-contact': 'contact',
  rangement: 'tidy', 'tour-general': 'tidy', poubelles: 'trash', 'aspirateur-muscu': 'vacuum', 'aspirateur-cardio': 'vacuum', 'aspirateur-gym': 'vacuum',
  miroirs: 'mirrors', tuiles: 'tiles', spinning: 'spin', hebdo: 'weekly', 'bureaux-patrons': 'weekly', 'bureaux-entraineurs': 'weekly', fermeture: 'closing', 'fin-quart': 'closing',
};
export const guideKey = (it) => (it.deep ? 'deep' : GUIDE_KEY[it.photo] || '');

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
  fr: ['**Écrans : guenille à peine humide.** Très sale? Un peu de produit **sur la guenille**, jamais sur l’écran.'],
  en: ['**Screens: barely damp rag.** Very dirty? A little product **on the rag**, never on the screen.'],
};
const SECONDS30 = {
  fr: '**Désinfecter :** vaporise toute la rangée, puis reviens à la première et tapote doucement.',
  en: '**Disinfecting:** spray the whole row, then go back to the first and pat gently.',
};
const BOTTLES = {
  fr: 'Vaporisateurs : change juste ceux **sous 30 %**, et remets-les **au-dessus des distributeurs de papier**.',
  en: 'Spray bottles: swap only those **under 30%**, and put them back **above the paper towel dispensers**.',
};
const DRYER = {
  fr: 'Sécheuse : **15 à 20 min**. Plus de 30 min, c’est trop sec (ça donne des chocs).',
  en: 'Dryer: **15 to 20 min**. Over 30 min is too dry (you get shocks).',
};
const TIDY = {
  fr: '**Range au fur et à mesure, pendant tout ton quart**, pas juste à cette tâche-là.',
  en: '**Put things away as you go, all shift long**, not just during this task.',
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
            'Tour des studios et du spinning : assez de guenilles propres, vaporisateurs et **distributeurs de papier** pleins. Comptoir et lavabo près de la fontaine : propres.',
          ],
          tips: ['TV5 marche pas? Vérifie que la télé est sur le **619**. Toujours rien? Regarde si le boîtier Vidéotron est allumé et rallume-le.', BOTTLES.fr],
        },
        en: {
          title: 'Opening',
          summary: 'Ventilation, TVs, music, spray bottles.',
          steps: [
            'Turn on the **3 ventilation switches** and the **4 TVs**. Set the channels on each Vidéotron box (table below).',
            'Check the sound works and start the **“Sporthèque Matin”** playlist.',
            'Walk the studios and spin room: enough clean rags, spray bottles and **paper dispensers** full. Counter and sink by the fountain: clean.',
          ],
          tips: ['TV5 not working? Check the TV is on **619**. Still nothing? See if the Vidéotron box is on and turn it back on.', BOTTLES.en],
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
          tips: [DRYER.fr, 'Peu de guenilles à plier? Passe tout de suite à la tâche suivante.'],
        },
        en: {
          title: 'Rags: dryer and washing',
          summary: 'Dryer, collect, wash, fold.',
          steps: [
            'Check the dryer first: there may be rags left from yesterday.',
            'Collect dirty rags: every studio, the spin room and the lower floor. Start a load.',
            'Fold the clean rags for the studios.',
          ],
          tips: [DRYER.en, 'Not many rags to fold? Go straight to the next task.'],
        },
      },
      {
        id: 'q1-desinfection', kind: 'task', minutes: 30, area: 'gym', photo: 'desinfection',
        fr: {
          title: 'Désinfection générale',
          summary: 'Cardio, logos, panneaux; remettre en ordre.',
          steps: [
            'Écrans du cardio : guenille **à peine humide** pour les traces de doigts. Très sale? Un peu de produit **sur la guenille**, jamais sur l’écran.',
            'Même guenille : le devant et l’**arrière du cardio**, les logos et les panneaux, jusqu’à ce qu’il reste plus de poussière.',
            'Désinfecte les **machines les plus utilisées** (pas toutes) : vaporise-en une dizaine de la même section, puis **reviens à la première** et tapote doucement.',
            'Remets les poids, les accessoires et les bancs à leur place. Ramasse les petits déchets dans les allées.',
          ],
          tips: [...DUST.fr, 'Les autres machines, c’est à 10 h.'],
        },
        en: {
          title: 'General disinfection',
          summary: 'Cardio, logos, panels; tidy up.',
          steps: [
            'Cardio screens: **barely damp rag** for fingerprints. Very dirty? A little product **on the rag**, never on the screen.',
            'Same rag: the front and **back of the cardio**, logos and panels, until there’s no dust left.',
            'Disinfect the **most-used machines** (not all of them): spray about ten in the same section, then **go back to the first** and pat gently.',
            'Put weights, accessories and benches back. Pick up small trash in the aisles.',
          ],
          tips: [...DUST.en, 'The other machines are at 10:00.'],
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
          tips: [SECONDS30.fr, 'Même si ça a l’air propre, essuie : des mains passent là toute la journée.'],
        },
        en: {
          title: 'General upkeep',
          summary: 'Touch points, wood and metal, fountain.',
          steps: [
            'Touch points: handles, seats, backrests, buttons and adjustment pins.',
            'Wipe the wood, metal, window ledges and grey baseboards.',
            'Bottle holders and water fountain: wipe off the marks.',
          ],
          tips: [SECONDS30.en, 'Even if it looks clean, wipe it: hands touch it all day.'],
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
          tips: [TIDY.fr, 'C’est un tour de rangement, pas de désinfection ni de poubelles.'],
        },
        en: {
          title: 'Gym tidy-up',
          summary: 'Tidy up, clear the aisles.',
          steps: [
            'Walk around: weights, benches and accessories in their spot, especially in the stretching area.',
            'Pick up what’s lying around and clear the aisles.',
          ],
          tips: [TIDY.en, 'This is a tidy-up round, not disinfection or trash.'],
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
            'Vaporisateurs (spinning compris) : remplis ceux qui sont bas avec du **« Daily Usage »**. **Distributeurs de papier** pleins, stock de guenilles propres.',
          ],
          tips: [BOTTLES.fr, 'Les autres studios, le soir, c’est juste pour les guenilles.'],
        },
        en: {
          title: 'Walkthrough and set-up',
          summary: 'Gym round, spray bottles, rags.',
          steps: [
            'Walk the gym: counter, sink, drinks counter.',
            'Spray bottles (spin room too): refill the low ones with **“Daily Usage”**. **Paper dispensers** full, clean rag stock.',
          ],
          tips: [BOTTLES.en, 'In the evening, other studios are for rags only.'],
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
          tips: [DRYER.fr, 'Guenilles « clients » et « ménage » : chacune son usage.'],
        },
        en: {
          title: 'Rags: collect and wash',
          summary: 'Studios, spin room, front desk.',
          steps: [
            'Collect dirty rags: every studio (every floor), the spin room and the front desk.',
            'Start the loads, then the dryer.',
            'Fold and put clean rags back.',
          ],
          tips: [DRYER.en, '“Member” and “cleaning” rags: each has its own use.'],
        },
      },
      {
        id: 'q2-desinfection', kind: 'task', minutes: 30, area: 'gym', photo: 'desinfection',
        fr: {
          title: 'Désinfection générale',
          summary: 'Points de contact, écrans, surfaces.',
          steps: [
            'Points de contact : poignées, sièges, dossiers, **machines de bench**, réglages. Commence par les **machines les plus utilisées**.',
            'Vaporise une dizaine de machines de la même section, puis **reviens à la première** et tapote doucement. Enlève les traces de sueur.',
            'Écrans : guenille **à peine humide** pour les traces de doigts. Très sale? Un peu de produit **sur la guenille**, jamais sur l’écran.',
            'Au besoin : tablettes, thermostats, télés, boîtiers Vidéotron, distributeurs de papier, miroirs.',
          ],
          tips: [...DUST.fr, 'À faire même si le matin l’a fait.'],
        },
        en: {
          title: 'General disinfection',
          summary: 'Touch points, screens, surfaces.',
          steps: [
            'Touch points: handles, seats, backrests, **bench machines**, adjusters. Start with the **most-used machines**.',
            'Spray about ten machines in the same section, then **go back to the first** and pat gently. Wipe off sweat.',
            'Screens: **barely damp rag** for fingerprints. Very dirty? A little product **on the rag**, never on the screen.',
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
          tips: [TIDY.fr, 'Machines de bench : bien droites, **parallèles**.'],
        },
        en: {
          title: 'Put equipment away',
          summary: 'Dumbbells, weights, benches; clear aisles.',
          steps: [
            'Dumbbells on the rack. Plates off the bars and put away.',
            'Benches and accessories in their spot. Pick up what’s lying around.',
          ],
          tips: [TIDY.en, 'Bench machines: straight and **parallel**.'],
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
