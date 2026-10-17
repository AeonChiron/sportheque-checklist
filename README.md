# Quart gym — checklist d'entretien Sporthèque

Site web (pensé pour iPhone) pour l'équipe d'entretien de la Sporthèque, 2e étage.
On l'ouvre dans Safari; aucune app à installer.

1. L'employé entre **son nom, ses heures et le superviseur en service**
   (Daniel, Mathieu, Marie…) et la langue du rapport pour ce superviseur.
2. Le site bâtit le plan du quart à partir du **manuel de référence**
   (`RÉFÉRENCE-IA-2026-10-17`) : tâches dans l'ordre, heures, zone A/B/C du jour,
   tâche hebdo, tuiles/miroirs, murs, compost. Si les heures sont différentes de
   l'horaire standard, le plan s'adapte tout seul, sans rien expliquer à l'employé.
3. Carte « En cours », ligne du temps du quart, cases à cocher; un toucher ouvre
   les étapes détaillées et le « Bon à savoir ».
4. « Pas pu faire » + raison, remarques, photos, et **⚑ Signaler** (bris,
   fournitures, danger…).
5. **Terminer** → le rapport part par courriel, adressé au superviseur choisi, dans
   sa langue. Les remarques de l'employé restent telles qu'écrites.

Français québécois ou anglais au choix sur chaque téléphone. Tout reste enregistré
sur le téléphone pendant le quart.

## Logique de planification (`js/planner.js`)

Elle applique l'« algorithme obligatoire » de la section 6 du manuel :

- **Horaire de référence** (Quart 1 7 h 30–15 h 30, Quart 2 16 h 30–23 h) :
  reproduit à la minute près, pauses et repas compris.
- **Horaire personnalisé** : même ordre et mêmes durées; les heures sont recalculées.
  - Aucun bloc n'est raccourci. Ce qui ne tient pas va dans **Hors plage**, avec le
    déficit en minutes, et apparaît dans le rapport.
  - L'ouverture et la fermeture sont gardées en priorité (sécurité).
  - Repas : la CNESST exige au moins 30 min après 5 h consécutives de travail
    (non payé si on est libre de son poste). Le gym donne 1 h, comme dans ses
    horaires de référence; le repas est placé pour qu'aucune période de travail
    ne dépasse 5 h.
  - Pause de 15 min : pas exigée par la loi, mais accordée par le gym et donc
    payée. Donnée dès 4 h de présence (réglable).
  - Heures fixes (compost 19 h, playlists 12 h / 15 h) : rappel au bon moment
    si le quart les couvre, sinon « hors de tes heures » — jamais attribuées
    fictivement.
- **Rotations** : A → B → C continue (Quart 1 puis Quart 2, sans recommencer le lundi),
  cycles de 2 semaines pour murs et tuiles/miroirs.

`npm test` vérifie la reproduction exacte des deux fiches, le tableau de rotation
de 21 jours et les cas du manuel (début 18 h, fin avant 19 h…).

## À confirmer avant la mise en service (`js/config.js`)

| Réglage | Valeur actuelle |
|---|---|
| `gymName` | `Sporthèque` |
| `cycleAnchorMonday` — lundi de la « Semaine 1 » (A-B-C) et « Semaine I » (murs, tuiles) | `2026-10-19` (début officiel) |
| `guidePhotos` — photos de référence dans les consignes | `false` (à activer quand `photos/` sera rempli) |
| `custom.pauseIfPresenceAtLeast` — seuil pour la pause de 15 min | 240 min |
| `custom.mealMinutes` — durée du repas en horaire personnalisé | 60 min |

## Le rapport et l'espace superviseur

- À la fin du quart, le superviseur reçoit un courriel court avec un bouton
  **« Voir le rapport »**. Le lien ouvre le même site, en **vue superviseur** :
  verdict d'un coup d'œil, problèmes signalés, tâches pas faites, checklist complète.
- Le rapport voyage **dans le lien lui-même** (après le `#`) : aucune base de
  données, et le contenu n'est jamais envoyé au serveur qui héberge le site.
- Chaque rapport ouvert s'ajoute à l'**Aperçu des quarts** (bouton « Espace
  superviseur » sur l'accueil), gardé sur le téléphone du superviseur.
- Les photos arrivent en pièces jointes du courriel.

## Mettre en ligne (gratuit)

**Site : GitHub Pages**
1. Dépôt **Settings → General → Danger Zone → Change visibility → Public**
   (GitHub Pages est gratuit pour les dépôts publics; il n'y a aucun secret dans le code).
2. **Settings → Pages** → *Source* : **Deploy from a branch** → **main** → **/(root)** → **Save**.
3. Après 1 à 2 minutes : `https://aeonchiron.github.io/sportheque-checklist/`.

**Courriel : FormSubmit** (gratuit, sans compte ni clé)
- L'adresse est dans `js/config.js` (`reportTo`). Au premier envoi, FormSubmit
  écrit au destinataire pour **activer** l'adresse : il clique une fois, c'est réglé.
- Ensuite, FormSubmit fournit un alias secret : le mettre dans `reportTo` à la
  place de l'adresse pour qu'elle ne soit plus visible dans le code public.

**Option plus « pro » (plus tard)** : `sendVia: 'api'` avec Vercel + Resend
(`api/send-report.js`, variables `RESEND_API_KEY`, `SUPERVISOR_EMAIL`, `REPORT_FROM`).

## Développement local

```sh
npm run dev   # http://localhost:3000 — sans clé, le courriel est écrit dans last-report.html
npm test
```

## Fichiers

- `js/manual.js` — contenu du manuel en français et en anglais (tâches, étapes, « bon à savoir »)
- `js/i18n.js` — textes de l'interface (FR/EN)
- `js/planner.js` — moteur de planification
- `js/report.js` — rapport (texte + HTML du courriel)
- `js/app.js`, `index.html`, `styles.css` — interface
- `api/send-report.js` — envoi du courriel (fonction serveur)
- `js/photos.js` — photos prises pendant le quart (réduction, stockage local)
- `photos/` — futures photos de référence du gym (voir `photos/README.md`)
