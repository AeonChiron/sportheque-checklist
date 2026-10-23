// Les mises à jour du site, la plus récente en premier (montrées à l'admin sur son tableau de bord,
// avec un formulaire « ce qui marche / ce qui ne marche pas »). Claude ajoute une entrée à chaque
// grosse mise à jour; les avis de l'admin (serveur + courriel) guident la suivante.
export const UPDATES = [
  {
    id: '2026-10-22-admin',
    date: '2026-10-22',
    fr: {
      title: 'Ton tableau de bord admin',
      items: [
        'Tableau de bord admin : seulement les simulations (employé ou superviseur, actuel ou nouveau).',
        'Tes quarts et signalements d’admin sont des fantômes : toi seul les vois.',
        'Les mêmes chiffres dans toutes les vues (le serveur a toujours raison).',
        'Le bouton « Vue » est toujours là quand tu es admin.',
        'Horaire : un toucher par jour (Congé, Jour, Soir, Soir court, Autre).',
        'Dates écrites « 21 oct. » au lieu de « 21/10 ».',
      ],
    },
    en: {
      title: 'Your admin dashboard',
      items: [
        'Admin dashboard: only the simulations (employee or supervisor, current or new).',
        'Your admin shifts and reports are ghosts: only you see them.',
        'The same numbers in every view (the server is always right).',
        'The “View” button is always there when you are admin.',
        'Schedule: one tap per day (Off, Day, Evening, Short evening, Other).',
        'Dates written “Oct 21” instead of “21/10”.',
      ],
    },
  },
  {
    id: '2026-10-22-home',
    date: '2026-10-22',
    fr: {
      title: 'Nouvel accueil et tableaux de bord',
      items: [
        'Page d’entrée : un seul grand bouton qui brille (bleu électrique, or pour les superviseurs).',
        'Tableaux de bord employé et superviseur, « Ton quart en un coup d’œil », La méthode.',
        'Le lapin va partout et rebondit sur les boutons; plus grand sur ordinateur.',
      ],
    },
    en: {
      title: 'New home and dashboards',
      items: [
        'Front page: one big glowing button (electric blue, gold for supervisors).',
        'Employee and supervisor dashboards, “Your shift at a glance”, The method.',
        'The bunny goes anywhere and bounces off buttons; bigger on computers.',
      ],
    },
  },
];
