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

  // Superviseurs proposés au début du quart. Ajouter un courriel pour qu'il
  // reçoive ses rapports directement; sans courriel, le rapport va à reportTo.
  supervisors: [
    { name: 'Daniel', email: '' },
    { name: 'Mathieu', email: '' },
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

  // Envoi du rapport. 'formsubmit' : service gratuit, sans compte ni clé
  // (https://formsubmit.co). Le destinataire active l'adresse une seule fois
  // en cliquant le lien du premier courriel. Ensuite, on peut remplacer
  // l'adresse par l'alias secret que FormSubmit fournit.
  // 'api' : fonction serveur api/send-report.js (Vercel + Resend).
  sendVia: 'formsubmit',
  // Période de test : les rapports vont à l'adresse de test, pas au superviseur.
  reportTo: 'thealchemicalseed@gmail.com',
  reportEndpoint: '/api/send-report',

  // Tableau partagé de l'Aperçu (fonction Netlify). Sur GitHub Pages, il
  // n'existe pas : l'Aperçu passe tout seul en mode « plan du jour ».
  boardEndpoint: '/api/board',

  // Bouton de secours « Envoyer avec l'app Mail » (adresse facultative).
  fallbackEmail: '',

  // Démo : n'envoie rien, affiche l'aperçu du courriel à la fin.
  demo: false,
};
