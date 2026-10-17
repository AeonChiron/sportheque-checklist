# Quart gym — checklist d'entretien Sporthèque

Site web (pensé d'abord pour iPhone, puis ordinateur et iPad) pour l'équipe
d'entretien de la Sporthèque, 2e étage. On l'ouvre dans Safari; rien à installer.

## Ce que ça fait

**Pour l'employé**
1. Il entre son nom, touche son quart (**Jour** 7 h 30–15 h 30, **Soir** 16 h 30–23 h,
   **Soir court** 18 h–23 h) ou entre d'autres heures, la date, choisit le
   **superviseur en service** (Daniel ou Mathieu) et la langue du rapport pour lui.
   Le téléphone retient ses dernières heures.
2. Le plan du quart se bâtit tout seul à partir du **manuel de référence**
   (`RÉFÉRENCE-IA-2026-10-17`) : tâches dans l'ordre, heures, zone A/B/C du jour,
   tâche hebdo, tuiles/miroirs, murs, compost. Des heures différentes de
   l'horaire standard? Le plan s'adapte sans rien expliquer à l'employé.
3. **Le couloir** (ligne du temps du quart), la carte **« En cours »** avec
   « C'est fait », une illustration animée par tâche. On coche d'un toucher **ou en
   glissant vers la droite**; « Annuler » répare un toucher de trop. Les boutons du
   haut disent ce qu'ils font : **Aperçu** et **Menu** (langue, texte plus grand,
   ordre de la liste, langue du rapport, protocole, heures).
4. Le détail d'une tâche : illustration ou schéma (plan du gym, postes des
   télés), étapes précises **à cocher une par une** (la dernière coche la tâche),
   « Bon à savoir », « Pas pu faire » + raison, remarque, photos.
   **⚑ Signaler** pour un bris, des fournitures, un danger.
5. **Le plan du gym** (d'après le croquis de l'équipe) : zones A/B/C en couleur et
   pièces 1 à 5. On touche une zone ou une pièce pour voir ce qu'il y a dedans et
   ce qui est prévu aujourd'hui.
6. **Terminer** → courriel au superviseur (résumé + bouton « Voir le rapport »,
   photos en pièces jointes), dans sa langue. Les remarques restent telles qu'écrites.

**Pour toute l'équipe : l'Aperçu du gym** (bouton sur l'accueil et dans la checklist) — onglets Le jour · Protocole (la journée complète, matin et soir, et les règles du roulement) · Rapports · Trucs; plan du gym en 3D ou à plat
- Zones du jour (plan interactif A/B/C + pièces), ce qui est au programme, les quarts envoyés,
  ce qui reste à faire, les problèmes ouverts et de bons trucs du manuel.
- **Sur GitHub Pages** : mode « plan du jour » (+ les quarts envoyés depuis ce téléphone).
- **Sur Netlify** : **en direct**, partagé entre tous les téléphones (gratuit,
  voir plus bas). Rien à changer dans le code.

Français québécois ou anglais au choix sur chaque téléphone. Mode sombre automatique.
« Réduire les animations » (iPhone : Réglages → Accessibilité) est respecté à 100 %.
Tout reste enregistré sur le téléphone pendant le quart, même si Safari se recharge.

## Logique de planification (`js/planner.js`)

L'« algorithme obligatoire » de la section 6 du manuel :
- **Horaires de référence** (7 h 30–15 h 30, 16 h 30–23 h) : reproduits à la minute.
- **Autres horaires** : même ordre, mêmes durées, aucun bloc raccourci; ce qui
  n'entre pas va dans « Si tu as du temps » (et dans le rapport du superviseur).
- Repas : CNESST exige au moins 30 min après 5 h consécutives; le gym donne 1 h
  (non payée). Pause de 15 min accordée (payée) dès 4 h de présence.
- Rotation A → B → C continue (semaine 1 = lundi 19 octobre 2026), murs un jour
  sur deux, tuiles/miroirs en alternance, compost seulement le soir à 19 h.

`npm test` vérifie tout ça (19 tests).

## Réglages (`js/config.js`)

| Réglage | Valeur |
|---|---|
| `gymName` | `Sporthèque` |
| `logo` | vide → mot-symbole texte. Déposer le logo officiel dans `icons/` et mettre son chemin ici. |
| `shiftPresets` | quarts proposés au début (Jour, Soir, Soir court); en ajouter ou en retirer ici |
| `supervisors` | Daniel, Mathieu (ajouter `email` pour qu'un superviseur reçoive ses rapports directement) |
| `reportTo` | adresse de test pendant la période d'essai |
| `cycleAnchorMonday` | `2026-10-19` |

## Mettre en ligne (gratuit)

**Option actuelle : GitHub Pages** — Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
Le courriel passe par FormSubmit (gratuit, sans compte : le destinataire clique
« Activate » une seule fois).

**Pour l'Aperçu en direct : Netlify** (gratuit, le dépôt peut rester privé)
1. netlify.com → *Sign up with GitHub* → *Add new site* → *Import from GitHub* → ce dépôt.
2. Aucun réglage : `netlify.toml` dit tout. *Deploy*.
3. Le site répond sur `https://<nom>.netlify.app`; la fonction `netlify/functions/board.mjs`
   et son stockage (Netlify Blobs) s'activent tout seuls.

## Développement local

```sh
npm run dev           # http://localhost:3000 — courriel simulé, tableau partagé simulé
DEMO=1 npm run dev    # mode démo : l'envoi ouvre directement la vue du superviseur
npm test
```

## Fichiers

- `js/manual.js` — contenu du manuel (FR/EN), techniques pour les « bons trucs »
- `js/planner.js` — moteur de planification
- `js/illustrations.js` — illustrations SVG des tâches, carte des zones, mur des télés
- `js/report.js` — rapport (courriel, lien `#r=…`, vue superviseur)
- `js/board.js`, `js/board-shape.js`, `netlify/functions/board.mjs` — tableau de l'Aperçu
- `js/app.js`, `index.html`, `styles.css`, `js/i18n.js` — interface
- `js/photos.js` — photos prises pendant le quart
- `fonts/` — Barlow Condensed (licence OFL), hébergée sur le site
- `api/send-report.js` — option d'envoi Vercel + Resend (non utilisée)
