// Les mises à jour du site, la plus récente en premier (montrées à l'admin sur son tableau de bord,
// avec un formulaire « ce qui marche / ce qui ne marche pas »). Claude ajoute une entrée à chaque
// grosse mise à jour; les avis de l'admin (serveur + courriel) guident la suivante.
export const UPDATES = [
  {
    id: '2026-10-28-sound',
    date: '2026-10-28',
    fr: {
      title: 'Des sons plus doux',
      items: [
        'Le son d’un bouton dépend de son importance : plus riche pour les actions principales, à peine pour un lien ou un onglet.',
        'Les touchers sont 30 % plus doux.',
        'Une petite cloche quand un superviseur t’ajoute une tâche (quand l’app est ouverte).',
        'Les messages restent assez longtemps pour les lire.',
      ],
    },
    en: {
      title: 'Softer sounds',
      items: [
        'A button’s sound depends on how important it is: richer for main actions, barely there for a link or a tab.',
        'Taps are 30% softer.',
        'A little bell when a supervisor adds a task for you (when the app is open).',
        'Messages stay long enough to read.',
      ],
    },
  },
  {
    id: '2026-10-28-visuals',
    date: '2026-10-28',
    fr: {
      title: 'Plus beau, plus clair',
      items: [
        'La page d’accueil : une lumière plus large, un clair de lune en mode sombre et une douce lueur sous le lapin.',
        'Le lapin est assez gros sur tous les appareils : téléphone, iPad et ordinateur.',
        'Avec le très grand texte, la page d’accueil tient maintenant dans l’écran.',
        'Dans une tâche : « Pourquoi » explique la raison, avec un lien vers toute la méthode.',
        'Un petit plan du gym montre où est la tâche. Touche-le pour le grand plan en 3D.',
        'Équipe fictive : le bouton rouge pour quitter devient un petit ✕ après 5 secondes.',
      ],
    },
    en: {
      title: 'Nicer and clearer',
      items: [
        'The front page: wider light, moonlight in dark mode and a soft glow under the bunny.',
        'The bunny is big enough on every device: phone, iPad and computer.',
        'With extra-large text, the front page now fits the screen.',
        'In a task: “Why” explains the reason, with a link to the whole method.',
        'A small gym map shows where the task is. Tap it for the big 3D map.',
        'Pretend team: the red exit button turns into a small ✕ after 5 seconds.',
      ],
    },
  },
  {
    id: '2026-10-28-reports',
    date: '2026-10-28',
    fr: {
      title: 'Des rapports beaux et utiles',
      items: [
        'Rapports des superviseurs : trois chiffres en haut, une courbe du ménage fait, et des filtres simples (AM, PM, avec signalement, pas fini).',
        'Le résumé du mois, fait tout seul le 1er : le % du gym, ce qui manque le plus souvent, les problèmes réglés et les idées qui ont marché.',
        'Une notification le 1er du mois à 9 h pour les superviseurs.',
        'Exporter un mois en fichier Excel, seulement si tu le veux.',
        'La semaine remonte 4 semaines, avec une petite icône les jours de tâches spéciales.',
        'Toucher une personne dans une journée passée ouvre son rapport (superviseurs seulement).',
        'Ce qui a été fait est rangé par zone : A, B, C, puis le reste du gym.',
      ],
    },
    en: {
      title: 'Lovely, useful reports',
      items: [
        'Supervisor reports: three numbers on top, a chart of the cleaning done, and simple filters (AM, PM, with a problem, not finished).',
        'The monthly summary, made by itself on the 1st: the gym %, what gets missed most, problems fixed and ideas that worked.',
        'A notification on the 1st at 9 am for supervisors.',
        'Export a month as an Excel file, only if you want to.',
        'The week goes back 4 weeks, with a small icon on days with special tasks.',
        'Tapping a person on a past day opens their report (supervisors only).',
        'What got done is grouped by zone: A, B, C, then the rest of the gym.',
      ],
    },
  },
  {
    id: '2026-10-28-sched',
    date: '2026-10-28',
    fr: {
      title: 'Congés, échanges et jours fériés',
      items: [
        'Mon horaire : « Prendre congé » en deux touchers. Les superviseurs le voient tout de suite.',
        'Échanger un quart : offre-le à un collègue ou à toute l’équipe. Dès que quelqu’un accepte, c’est fait.',
        'Jours fériés du Québec : un avis sur le tableau de bord et un petit drapeau dans la semaine.',
        'Un changement d’horaire fait par quelqu’un d’autre s’affiche tout de suite.',
        'Pas de rappel de quart un jour de congé.',
      ],
    },
    en: {
      title: 'Time off, swaps and holidays',
      items: [
        'My schedule: “Take time off” in two taps. Supervisors see it right away.',
        'Swap a shift: offer it to a coworker or the whole team. As soon as someone accepts, it’s done.',
        'Québec holidays: a notice on the dashboard and a small flag in the week.',
        'A schedule change made by someone else shows up right away.',
        'No shift reminder on a day off.',
      ],
    },
  },
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
