// Réglages de l'équipe.

export const CONFIG = {
  // Nom du centre, affiché dans le site et dans le rapport.
  gymName: 'Sporthèque',

  // Logo officiel (fond transparent; version claire pour le mode sombre).
  // null = mot-symbole texte (utilisé par la démo publique).
  logo: {
    full: 'icons/logo-sportheque.png',
    fullDark: 'icons/logo-sportheque-dark.png',
    mark: 'icons/mark-sportheque.png',
    markDark: 'icons/mark-sportheque-dark.png',
  },
  since: 1981,

  // Superviseurs proposés au début du quart. alerts : reçoit d'office les
  // courriels des problèmes urgents (les autres superviseurs peuvent s'abonner
  // dans leur Espace superviseur). Pendant la période de test, tout va à reportTo.
  supervisors: [
    { name: 'Daniel', email: '', alerts: true },
    { name: 'Mathieu', email: '' },
  ],

  // Horaires proposés au début du quart : un toucher remplit Début et Fin.
  // L'employé peut toujours entrer d'autres heures.
  shiftPresets: [
    { id: 'jour', start: '07:30', end: '15:30' },
    { id: 'soir', start: '16:30', end: '23:00' },
    { id: 'soir-court', start: '18:00', end: '23:00' },
  ],

  // Langue par défaut de l'interface ('fr' ou 'en'); chaque téléphone
  // garde ensuite son choix. Le superviseur en service et la langue de son
  // rapport sont choisis au début de chaque quart.
  defaultLang: 'fr',

  // Lundi qui correspond à « Semaine 1 » de la rotation A-B-C ET à
  // « Semaine I » des cycles murs / tuiles-miroirs (début officiel).
  cycleAnchorMonday: '2026-10-19',

  // Photos de référence du gym dans les consignes (dossier photos/).
  // Désactivé tant que les photos ne sont pas prises.
  guidePhotos: false,

  // Horaires différents des deux horaires standards. L'employé ne voit
  // aucune de ces règles : le plan s'adapte tout seul.
  custom: {
    // Pause de 15 min : la loi ne l'exige pas, mais le gym l'accorde; une
    // pause accordée est payée (CNESST). Donnée dès 4 h de présence.
    pauseIfPresenceAtLeast: 240,
    pauseMinutes: 15,
    // Repas : CNESST exige au moins 30 min après 5 h consécutives de travail
    // (non payé si l'employé est libre de son poste). Le gym donne 60 min,
    // comme dans ses deux horaires de référence (quart de 8 h : 1 h de dîner
    // non payée + 15 min de pause payée).
    mealMinutes: 60,
    maxConsecutiveWork: 300,
  },

  // Courriels : seulement pour un problème URGENT, et très courts : « un
  // problème a été signalé par X », avec un lien vers le signalement (réservé
  // aux superviseurs connectés). Service gratuit FormSubmit, sans compte ni
  // clé : le destinataire active l'adresse une seule fois en cliquant le lien
  // du premier courriel. Période de test : tout va à l'adresse de test.
  reportTo: 'thealchemicalseed@gmail.com',

  // Le serveur du site (fonction Netlify) : comptes, historique, signalements.
  // Sur GitHub Pages, il n'existe pas : le site fonctionne sans comptes et
  // chaque téléphone ne voit que ses propres quarts. Pour garder GitHub Pages,
  // on peut mettre ici l'adresse du site Netlify : https://<site>.netlify.app/api
  // Codes d'inscription : variables TEAM_CODE et BOSS_CODE dans Netlify.
  // Sur la copie GitHub Pages, on parle au serveur Netlify (mêmes comptes,
  // même historique) : la copie GitHub se met à jour gratuitement.
  api: globalThis.location?.hostname?.endsWith('github.io') ? 'https://sportheque-checklist.netlify.app/api' : '/api',

  // Démo : aucun courriel n'est envoyé.
  demo: false,
};
