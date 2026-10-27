// Les mises à jour du site, la plus récente en premier (montrées à l'admin sur son tableau de bord,
// avec un formulaire « ce qui marche / ce qui ne marche pas »). Claude ajoute une entrée à chaque
// grosse mise à jour; les avis de l'admin (serveur + courriel) guident la suivante.
export const UPDATES = [
  {
    id: '2026-10-27-motion',
    date: '2026-10-27',
    fr: {
      title: 'Des mouvements plus vivants',
      items: [
        'Le lapin de l’accueil colle au doigt, s’attrape plus facilement et ne glisse plus tout seul.',
        'Cocher une tâche : le rond rebondit et des bulles de savon montent.',
        'Pointer : la carte entre dans l’horloge et ressort poinçonnée (petit carnet animé).',
        'Envoyer le rapport : un avion de papier s’envole.',
        'Les étapes d’une tâche forment un casse-tête : une seule image, un morceau par étape (fini l’haltère).',
        'Fin du quart : une petite photo imprimée de ta journée arrive; tire-la du doigt, elle penche et revient se poser.',
        'Reflets d’eau sur la grande carte de l’accueil; l’anneau de progression se remplit en douceur.',
        'La pastille de la barre du bas glisse d’un onglet à l’autre; les rapports se réorganisent en glissant.',
        'Les fenêtres se ferment d’un petit coup vers le bas.',
      ],
    },
    en: {
      title: 'Livelier motion',
      items: [
        'The front-page bunny sticks to your finger, is easier to grab and no longer slides away.',
        'Checking a task: the circle bounces and soap bubbles float up.',
        'Clocking in: the card goes into the time clock and comes out punched (a little flipbook).',
        'Sending the report: a paper plane flies off.',
        'A task’s steps build a jigsaw puzzle: one picture, one piece per step (no more dumbbell).',
        'End of shift: a little printed photo of your day pops in; drag it and it tilts, then settles back.',
        'Water reflections on the big home card; the progress ring fills smoothly.',
        'The bottom bar highlight glides between tabs; reports rearrange by sliding.',
        'Sheets close with a quick flick down.',
      ],
    },
  },
  {
    id: '2026-10-25-boss',
    date: '2026-10-25',
    fr: {
      title: 'Outils des superviseurs',
      items: [
        'Toucher un employé ouvre sa fiche : horaire, prochain quart, 4 dernières semaines, notes privées entre superviseurs, congé, nouveau mot de passe.',
        '« Le coin » : les superviseurs se parlent entre eux et reçoivent les idées des employés (On essaie, Pas pour l’instant, Ça marche).',
        'Signaler une tâche directement depuis sa fiche.',
        'Tâches spéciales : une fois, chaque semaine, ou chaque semaine jusqu’à une date.',
        'Départ d’un employé : l’accès est retiré, ses quarts restent dans les rapports. On peut le ramener.',
        'Préférences : notifications par type, heures calmes la nuit, taille du texte, mode calme, volume.',
        'Résumé chaque dimanche à 21 h pour les superviseurs.',
      ],
    },
    en: {
      title: 'Supervisor tools',
      items: [
        'Tap an employee to open their page: schedule, next shift, last 4 weeks, private supervisor notes, time off, new password.',
        '“The corner”: supervisors talk to each other and get employee ideas (Let’s try, Not for now, It works).',
        'Report a task right from its page.',
        'Special tasks: once, every week, or every week until a date.',
        'An employee leaves: access removed, their shifts stay in reports. They can be brought back.',
        'Preferences: notifications by type, quiet hours at night, text size, calm mode, volume.',
        'Summary every Sunday at 9 pm for supervisors.',
      ],
    },
  },
  {
    id: '2026-10-23-week',
    date: '2026-10-23',
    fr: {
      title: 'Ta semaine en un coup d’œil',
      items: [
        'Sur le tableau de bord : les 7 jours de la semaine, avec flèches pour la semaine d’avant ou d’après.',
        'Jours passés : combien du ménage a été fait (pour tout le gym). Jours à venir : combien au travail. Ton quart en bleu.',
        'Toucher un jour : qui a travaillé, ce qui a été fait, ce qui manque, les signalements et les mots laissés.',
        'L’équipe fictive arrive sur le tableau de bord (plus directement dans un quart).',
      ],
    },
    en: {
      title: 'Your week at a glance',
      items: [
        'On the dashboard: the 7 days of the week, with arrows for the week before or after.',
        'Past days: how much of the cleaning got done (whole gym). Coming days: how many are working. Your shift in blue.',
        'Tap a day: who worked, what got done, what is missing, reports and notes left.',
        'The pretend team opens on the dashboard (no longer straight into a shift).',
      ],
    },
  },
  {
    id: '2026-10-23-polish',
    date: '2026-10-23',
    fr: {
      title: 'Lumière, lapin, verre plein',
      items: [
        'Page bleue : le bleu d’origine revient (plus pâle), de vrais faisceaux de lumière doux qui se balancent.',
        '« Sporthèque » et le lapin parfaitement centrés.',
        'Le lapin suit le doigt sans coller aux boutons; lâché dessus, il glisse doucement à côté.',
        'Cocher vite fait une seule mélodie, jamais trop aiguë.',
        'La dernière tâche remplit le verre à ras bord : gouttes qui débordent, reflet, étincelles et son à part.',
        'La semaine : « Jours qui restent » en haut, « Jours terminés » pliés en bas (plus de jours pâles).',
      ],
    },
    en: {
      title: 'Light, bunny, full glass',
      items: [
        'Blue page: the original blue is back (no more pale), real soft light beams that sway.',
        '“Sporthèque” and the bunny perfectly centered.',
        'The bunny follows your finger without sticking to buttons; dropped on one, it slides gently aside.',
        'Checking fast makes one melody, never too high.',
        'The last task fills the glass to the brim: overflowing drops, a shine, sparkles and its own sound.',
        'The week: “Days left” on top, “Days done” folded below (no more pale days).',
      ],
    },
  },
  {
    id: '2026-10-23-roster',
    date: '2026-10-23',
    fr: {
      title: 'Tout le monde voit l’horaire',
      items: [
        'Les employés voient l’horaire de toute l’équipe (superviseurs et employés, AM et PM).',
        '« Avec toi » sur ton prochain quart : qui travaille en même temps que toi.',
        'Seulement les noms, photos et heures : pas de courriels, pas de résultats de quart.',
      ],
    },
    en: {
      title: 'Everyone sees the schedule',
      items: [
        'Employees see the whole team’s schedule (supervisors and employees, AM and PM).',
        '“With you” on your next shift: who works at the same time as you.',
        'Only names, photos and hours: no emails, no shift results.',
      ],
    },
  },
  {
    id: '2026-10-22-ampm',
    date: '2026-10-22',
    fr: {
      title: 'Superviseurs et employés, AM et PM',
      items: [
        '« Aujourd’hui dans le gym » : deux tuiles, Superviseurs puis Employés (combien, qui, AM / PM).',
        'Une page pour chacun, coupée en AM (commence avant midi) et PM.',
        '« L’équipe cette semaine » : chaque jour, superviseurs puis employés, en AM et PM; les tâches de la semaine seulement pour les employés.',
        'Les superviseurs mettent leurs propres heures (tuile « Mon horaire »).',
      ],
    },
    en: {
      title: 'Supervisors and employees, AM and PM',
      items: [
        '“Today in the gym”: two tiles, Supervisors then Employees (how many, who, AM / PM).',
        'A page for each, split into AM (starts before noon) and PM.',
        '“The team this week”: each day, supervisors then employees, in AM and PM; weekly tasks only for employees.',
        'Supervisors set their own hours (“My schedule” tile).',
      ],
    },
  },
  {
    id: '2026-10-22-fictive',
    date: '2026-10-22',
    fr: {
      title: 'Bêta : une équipe fictive',
      items: [
        'Sur la page bleue : « Essayer avec une équipe fictive » (pour tout le monde, même sans compte).',
        'On choisit d’être un des 10 employés ou un des 6 superviseurs inventés.',
        'Un gym déjà plein : 3 mois de quarts, des rapports, des signalements, des tâches.',
        'Tout marche et on peut tout essayer; rien n’est envoyé et tout s’efface en quittant.',
        'Le gros bouton rouge en haut à gauche arrête la simulation.',
        'Les superviseurs peuvent changer l’horaire d’un employé et donner des tâches à une heure précise.',
      ],
    },
    en: {
      title: 'Beta: a pretend team',
      items: [
        'On the blue page: “Try with a pretend team” (for everyone, even without an account).',
        'Pick one of 10 made-up employees or 6 made-up supervisors.',
        'A gym already full: 3 months of shifts, reports, problems, tasks.',
        'Everything works and you can try anything; nothing is sent and it all gets erased when you leave.',
        'The big red button in the top-left corner stops the simulation.',
        'Supervisors can change an employee’s schedule and give tasks at a set time.',
      ],
    },
  },
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
