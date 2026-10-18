# Quart gym — checklist d'entretien Sporthèque

Site web (pensé d'abord pour iPhone, puis ordinateur et iPad) pour l'équipe
d'entretien de la Sporthèque, 2e étage. On l'ouvre dans Safari; rien à installer.

## Ce que ça fait

**Comptes (sur Netlify)** : chacun crée son compte une fois (prénom, courriel, mot de
passe) et le téléphone s'en souvient (« Rester connecté », un an). Rôle **Employé**
(il faut le **code d'équipe**) ou **Superviseur** (il faut le **code superviseur**).
Mot de passe oublié : un superviseur en donne un nouveau dans l'Espace superviseur.

**Pour l'employé**
1. Il touche son quart (**Jour** 7 h 30–15 h 30, **Soir** 16 h 30–23 h, **Soir court**
   18 h–23 h) ou entre d'autres heures; la date est aujourd'hui (modifiable). Son nom
   vient de son compte. Le téléphone retient ses dernières heures.
2. Le plan du quart se bâtit tout seul à partir du **manuel de référence**
   (`RÉFÉRENCE-IA-2026-10-17`) : tâches dans l'ordre, heures, zone A/B/C du jour,
   tâche hebdo, tuiles/miroirs, murs, compost. Des heures différentes de
   l'horaire standard? Le plan s'adapte sans rien expliquer à l'employé.
3. **Le couloir** (ligne du temps du quart), la carte **« En cours »** avec
   « C'est fait », une illustration animée par tâche. On coche d'un toucher **ou en
   glissant vers la droite**; « Annuler » répare un toucher de trop. Les boutons du
   haut disent ce qu'ils font : **Aperçu** et **Menu** (langue, texte plus grand,
   ordre de la liste, langue des courriels du superviseur, protocole, heures).
4. Le détail d'une tâche : illustration ou schéma (plan du gym, postes des
   télés), étapes précises **à cocher une par une** (la dernière coche la tâche),
   « Bon à savoir », « Pas pu faire » + raison, remarque, et « Signaler un problème ici ».
4b. **⚑ Signaler** : une catégorie d'un toucher (Machine brisée, Dégât ou plancher
   glissant, Blessure, Altercation, Matériel manquant, Toilettes ou vestiaire, Bâtiment,
   Objet trouvé, Autre), où, quelques mots et jusqu'à 3 photos (facultatif). Le
   signalement va dans l'**Espace superviseur**. **Urgent** → le superviseur reçoit
   aussi un courriel d'une ligne : « ⚑ Machine brisée — signalé par Marie » + le lien
   vers le signalement. Pas de photos ni de détails dans le courriel. C'est le **seul**
   courriel que le site envoie. Il va à Daniel d'office (`alerts: true` dans la config);
   les autres superviseurs s'abonnent avec « Recevoir les courriels urgents » dans leur
   Espace superviseur. Le bouton **Signaler un problème** existe aussi sur l'accueil,
   hors quart (connecté). Période de test : tout va à `reportTo`, avec « Pour (test) : … ».
5. **Le plan du gym** (d'après le croquis de l'équipe) : zones A/B/C en couleur et
   pièces 1 à 5. On touche une zone ou une pièce pour voir ce qu'il y a dedans et
   ce qui est prévu aujourd'hui.
6. **Fin du quart → Enregistrer mon quart** : le quart va dans l'**Historique**
   (statuts, remarques, notes, problèmes). Pas de courriel. Ce qui n'est pas fait
   n'est pas reporté au prochain quart. Oubli? Le quart se **modifie le jour même**
   (« Modifier mon quart d'aujourd'hui » sur l'accueil), puis il est verrouillé.
   Les photos des signalements sont gardées 90 jours.

**Pour le superviseur : l'Espace superviseur** (`#patron`, réservé au rôle Superviseur)
- **Signalements** : « À régler » d'abord (ou Tous), avec catégorie, où, qui, quand, photos.
  Le lien du courriel ouvre directement le bon signalement (connexion d'abord si besoin).
  « Marquer comme réglé » / « Rouvrir ».
- **Équipe** : les comptes, nouveau mot de passe, retirer quelqu'un.
- Raccourci vers l'Historique des quarts.

**Pour toute l'équipe : l'Historique** (bouton sur l'accueil)
- **Récents** (par défaut) : les derniers quarts enregistrés, le plus récent en haut,
  groupés par jour (Aujourd'hui, Hier…). Chaque carte : nom, quart, heures,
  « 14/14 tâches faites » ou ce qui manque, problèmes, remarques. Vert = tout fait.
- **Par semaine** : la semaine choisie, seulement les jours qui ont des quarts.
- Coup d'œil en haut : quarts des 7 derniers jours, combien sont « tout fait », problèmes.
- Toucher une carte ouvre le quart en détail.

**Pour toute l'équipe : l'Aperçu du gym** (bouton sur l'accueil et dans la checklist) — onglets Le jour · Protocole (la journée complète, matin et soir, et les règles du roulement) · Trucs; plan du gym en 3D ou à plat
- Zones du jour (plan interactif A/B/C + pièces), ce qui est au programme, qui a fait
  chaque quart, ce qui reste à faire, les problèmes et de bons trucs du manuel.

**Partagé ou pas?**
- **Sur GitHub Pages** : pas de comptes ni d'Espace superviseur; chaque téléphone ne voit
  que ses propres quarts. Le courriel urgent pointe vers le site.
- **Sur Netlify** : comptes, Espace superviseur, Historique et Aperçu **partagés entre
  tous les téléphones** (gratuit, voir plus bas). Rien à changer dans le code.
- Sans réseau, le quart est gardé sur le téléphone et part tout seul au retour du réseau.

Français québécois ou anglais au choix sur chaque téléphone. Clair par défaut (indigo électrique,
marine et touches de cyan et de vert lime; polices Fraunces et Saira comme les affiches du club); sombre
d'un toucher (soleil / lune en haut de l'accueil), ou « Auto » dans le Menu.
« Réduire les animations » (iPhone : Réglages → Accessibilité) est respecté à 100 %.
Après 12 secondes sans toucher l'écran, les animations décoratives s'arrêtent
(batterie); elles reprennent au premier toucher. Sur un vieux téléphone ou un réseau
lent, le plan du gym s'ouvre à plat (la 3D reste à un toucher). Vérifié avec axe-core :
0 problème d'accessibilité sur 13 écrans, en clair et en sombre.
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

`npm test` vérifie tout ça, plus les comptes et les signalements (27 tests).

## Réglages (`js/config.js`)

| Réglage | Valeur |
|---|---|
| `gymName` | `Sporthèque` |
| `logo` | vide → mot-symbole texte. Déposer le logo officiel dans `icons/` et mettre son chemin ici. |
| `shiftPresets` | quarts proposés au début (Jour, Soir, Soir court); en ajouter ou en retirer ici |
| `supervisors` | Daniel, Mathieu (ajouter `email` pour qu'un superviseur reçoive les problèmes urgents directement) |
| `reportTo` | adresse de test pendant la période d'essai (tous les courriels urgents y vont) |
| `api` | le serveur du site : `/api` sur Netlify, ou `https://<site>.netlify.app/api` pour l'utiliser depuis GitHub Pages |
| `cycleAnchorMonday` | `2026-10-19` |

## Mettre en ligne (gratuit)

**Option actuelle : GitHub Pages** — Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
Les courriels urgents passent par FormSubmit (gratuit, sans compte : le destinataire
clique « Activate » une seule fois).

**Pour les comptes et l'Espace superviseur : Netlify** (gratuit, le dépôt peut rester privé)
1. netlify.com → *Sign up with GitHub* → *Add new site* → *Import from GitHub* → ce dépôt.
2. Aucun réglage de build : `netlify.toml` dit tout. *Deploy*.
3. *Site configuration → Environment variables* : ajouter `TEAM_CODE` (code d'équipe) et
   `BOSS_CODE` (code superviseur), puis *Deploys → Trigger deploy*. Les codes ne sont
   jamais dans le code du site.
4. Le site répond sur `https://<nom>.netlify.app`; la fonction `netlify/functions/api.mjs`
   et son stockage (Netlify Blobs) s'activent tout seuls.
5. Pour garder l'adresse GitHub Pages : mettre `api: 'https://<nom>.netlify.app/api'`
   dans `js/config.js`.

## Développement local

```sh
npm run dev           # http://localhost:3000 — API simulée en mémoire (codes : equipe / patron)
npm test
```

## Fichiers

- `js/manual.js` — contenu du manuel (FR/EN), techniques pour les « bons trucs »
- `js/planner.js` — moteur de planification
- `js/illustrations.js` — illustrations SVG des tâches, carte des zones, mur des télés
- `js/report.js` — libellés du détail d'un quart; ouvre encore les anciens liens `#r=…`
- `netlify/lib/api.mjs`, `netlify/functions/api.mjs` — le serveur : comptes, historique, signalements
- `js/auth.js` — connexion (« rester connecté »); `js/problems.js`, `js/problem-shape.js` — signalements
- `js/board.js`, `js/board-shape.js` — historique partagé (et Aperçu)
- `js/app.js`, `index.html`, `styles.css`, `js/i18n.js` — interface
- `js/photos.js` — photos d'un signalement (réduites sur le téléphone avant l'envoi)
- `fonts/` — Barlow Condensed (licence OFL), hébergée sur le site
- `api/send-report.js` — option d'envoi Vercel + Resend (non utilisée)
