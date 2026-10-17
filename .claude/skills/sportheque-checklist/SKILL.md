---
name: sportheque-checklist
description: Work on the Sporthèque gym cleaners' shift checklist website (this repository). Use for any change to its tasks, wording, translations, schedule logic, shift history, urgent-problem email, design, demo artifact or deployment.
---

# Sporthèque shift checklist

Mobile-first website (iPhone, Safari) for the cleaning staff of the Sporthèque gym
(Gatineau, 2nd floor). A cleaner enters name, start/end time and the supervisor on
duty; the site builds the shift plan from the training manual; they check tasks off,
note what couldn't be done, flag issues; at the end the shift is saved to the shared
**History** (no email). Accounts (Employé / Superviseur) on Netlify; supervisors get a
**Supervisor area** with every problem report. Only an URGENT problem sends a one-line
email to the supervisor, with a link to the report.
Plain static site + one serverless function. No build step.

## Map

| File | Role |
|---|---|
| `js/manual.js` | Manual content, bilingual `{ fr, en }` per block: title, summary, steps, tips. Sequence + durations are the source of truth. |
| `js/planner.js` | Pure planning engine, `buildPlan({ shift, date, start, end, lang })`. Bilingual composed text lives in its `P` table. |
| `js/report.js` | Labels for the shift detail view (`REVIEW`, `reportLabels`), `decodeReport` for old `#r=` email links. `buildReport`/renderers are only used by the unused `api/send-report.js`. |
| `netlify/lib/api.mjs` (+ `netlify/functions/api.mjs`, path `/api/*`) | The whole server: `createApi({ getStore, env })` → auth (signup needs env `TEAM_CODE` / `BOSS_CODE`, scrypt hashes, bearer session tokens hashed in Blobs, 1 year), users (boss: list/reset/remove), board, problems (+ photos ≤3, JPEG only). `memoryStores()` powers `dev-server.js` and `tests/api.test.js`. |
| `js/auth.js` | `session.mode`: `accounts` (server exists → sign-in required), `none` (GitHub Pages: no server, old behavior), `demo` (local fake accounts). `initAuth(onChange)` starts from the cached user then verifies. `request()` adds the token. |
| `js/problems.js`, `js/problem-shape.js` | Problem reports: `CATEGORIES` (9, each with an `urgent` default) + legacy ones for old shifts; create/list/get/status/photo. |
| `js/board.js`, `js/board-shape.js` | Shift history: `publishShift` → `'shared' | 'queued' | 'local'` (404 = host has no board = local, network error = queued and re-sent by `flushQueue` on load/online), `loadRecent(n)`, `loadWeek(dates)`. `sanitizeShift` keeps statuses, remarks, notes, flags (urgent/emailed/photo count). |
| `js/i18n.js` | All UI strings, `UI.fr` / `UI.en`. Every key must exist in both. |
| `js/app.js` | UI: setup → checklist → finish → saved; History (`#historique`), Aperçu (`#apercu`), shift detail (`openReview`). State in localStorage, problem photos in IndexedDB (`photos.js`). |
| `js/config.js` | Gym name, rotation anchor (Mon 2026-10-19 = week 1), break rules, demo flag. |
| `api/send-report.js` | Old Vercel → Resend option for full reports. Not used. |
| `tests/*.test.js` | `npm test` (node:test, no deps). |

## Rules from the manual (never break)

- Reference shifts: Q1 07:30–15:30, Q2 16:30–23:00 → reproduce the manual's tables to the minute (tests enforce it), with one owner-approved change: the evening tiles/mirrors are ONE 20-min block (`q2-surfaces`, 20:20–20:40), not two 10-min passes.
- Other hours: same blocks, same order, same durations; never shorten a block. Closing then opening kept first; what doesn't fit goes to `overflow`.
- CNESST: meal ≥ 30 min after 5 consecutive hours (gym gives 60, unpaid); 15-min break not legally required but granted and paid (from 4 h presence).
- A–B–C deep-clean rotation is continuous (Q1 then Q2, 2 sessions/day), never reset on Mondays. Walls every other day; tiles/mirrors alternate; Sunday = inspection.
- Compost only Q2 at 19:00 (Wednesday: bin to curb). Offices vacuumed only Q2 (Tue/Fri owners, Wed/Sat trainers). Spin room cleaned only Q1. No tennis tasks ever.

## Product decisions from the owner

- **Seamless for workers**: never show rule talk (custom hours, CNESST, deficits) to the cleaner. Leftover blocks appear as "Si tu as du temps". Fixed times outside the shift disappear from the worker view; the supervisor report keeps them.
- **Supervisors**: a fixed picker (Daniel, Mathieu) from `CONFIG.supervisors`; each may get an `email` later. During testing every urgent email goes to `CONFIG.reportTo` (test address, never Daniel's real one). Email language remembered per supervisor (Menu: "Courriels pour {sup}").
- **Languages**: UI FR/EN per phone; urgent email in the supervisor's language; history detail in the viewer's language; employee-typed text never translated.
- **Voice**: Quebec French, *tu*, short imperatives, local terms (balayeuse, vidanges, guenilles, moppe, brassée, poste de télé).
- **No end-of-shift email (owner: "too complicated, too long")**. "Fin du quart" → "Enregistrer mon quart" → the shift goes into the History. Missed tasks are NOT carried over to the next worker ("accept the loss").
- **Accounts (owner)**: sign up once with name, email, password; "Rester connecté" (token in localStorage, else sessionStorage). Team code for employees, boss code for supervisors (env vars, never in the repo). No password-reset email (FormSubmit can't reach unactivated addresses): a supervisor sets a new one in Équipe. Employees see everyone's shifts (owner's choice).
- **Problems ("Signaler")**: one tap on a category grid (Machine brisée, Dégât ou plancher glissant, Blessure, Altercation, Matériel manquant, Toilettes ou vestiaire, Bâtiment, Objet trouvé ou oublié, Autre — Autre needs words), then optional Où, a few words, ≤3 photos, Urgent/Pas urgent (default per category). Every report goes to the Supervisor area (with photos, on the site). **Urgent** also sends a FormSubmit email with NO photos and NO details: subject `⚑ {cat} — signalé par {name}`, one line (cat · where — name, time) + "Voir le signalement" link `#probleme=<id>` (owner: "very short, just a link"). Failed sends show "Réessayer". Task sheet has "Signaler un problème ici". Demo never emails.
- **Who gets urgent emails (owner)**: Daniel by default (`CONFIG.supervisors[].alerts`, applied when a boss account with that name signs up); any other supervisor opts in with the "Recevoir les courriels urgents" switch (`/api/auth {action:'alerts'}`, list via `/api/alerts`). Emails go to the account email of each recipient; while `CONFIG.reportTo` is set (test period), ONE email goes to the test address with a "Pour (test)" row naming the real recipients. "Signaler un problème" also sits on the home screen (signed in only), reports sent off-shift retry from `gym-loose-flags`. Missed tasks: History is enough (no extra flag or email).
- **Round 2 answers (owner)**: no "Superviseur en service" picker anymore (emails go to opted-in supervisors; email language from `CONFIG.supervisors[].lang` of the first recipient). Workers do NOT see the status of their reports. A saved shift can be edited the same day only: `gym-last-shift` on the phone → "Modifier mon quart de … d'aujourd'hui" on home + "Oups, modifier mon quart" on the saved screen; the server stores `savedOn` (Québec day) and answers 409 `locked` after that day. Problem photos kept 90 days (`cleanPhotos`, once a day, marks `photosExpired`); the report itself stays.
- **Supervisor area** (`#patron`, boss role only): shortcut to the shift History, tabs Signalements (À régler / Tous, cards → `#probleme=id`, mark fixed/reopen) and Équipe (accounts, new password, remove). A problem link opened while signed out goes through sign-in and lands on the report.
- **History** (`#historique`, home button "Historique", every signed-in person): only logged shifts, no empty days, no "missed". Default **Récents** = latest first, grouped by day (Aujourd'hui / Hier / date), card = ring %, name, shift + hours, "✓ 14/14 tâches faites" or tags (problèmes · urgent, pas faites, non cochées, Remarques). Green = all done, nothing flagged; amber = something to look at; red = urgent or not done. "7 derniers jours" glance (quarts, x/y tout fait, problèmes). Secondary **Par semaine** (week arrows, only days with shifts). Tap → `openReview(summaryReport(s), { from: 'history' })`. Goal: Daniel opens it and sees at a glance that everything was validated.
- **Aperçu du gym** (`#apercu`), public to the whole team: a week strip (Mon–Sun, zone letters, status dots, week arrows, swipe the panel to change day) and three tabs: **Le jour** (map + morning/evening cards with who did the shift and that day's special tasks and statuses), **Protocole**, **Trucs** (tips per task = block tips + matching `TECHNIQUES` by area/key, plus Les bases). The Rapports tab was replaced by the History. Shared live through `/api/board` (CORS open so GitHub Pages can point `CONFIG.api` at the Netlify URL); on GitHub Pages without that, each phone only sees its own shifts. Owner refused Google Sheets / external databases. Everything must stay free.
- **Identity**: pool + gym floor world. Chlorine-white canvas, deep teal, aqua; coral/sun in small doses. Barlow Condensed (self-hosted, `fonts/`) for titles/times, system font for text. Signature: "le couloir" (timeline as a swim lane with lane ropes and a swimmer = now). Living background = slow pool-light blobs. ONE centered object per task in `js/illustrations.js` (96×96, same stroke, two neutrals + one aqua detail + soft ground shadow, theme-aware `--il-*` vars; owner rejected busy multi-object scenes) plus real diagrams (zone map, TV wall). Official logo (from the owner) in `icons/` (transparent PNG, light + dark versions, symbol-only `mark-*`), set in `CONFIG.logo`; never redraw or alter it. UI is monochrome charcoal (the logo's ink) with ONE accent (aqua `--accent`) reserved for live/current/tips. Background = faint pool-tile grid + one slow light. No emoji as UI icons (drawn SVG `ICON` set). Owner's direction: "premium tech feel, anti AI slop".
- **Ergonomics**: swipe right to check (tap still works), check button on the right, toasts above the bottom bar, sheet = bottom sheet on phone / centered dialog ≥900px. Motion is short and purposeful; `prefers-reduced-motion` kills all of it.
- **Floor plan (owner's sketch, confirmed)**: data in `FLOOR` (`js/manual.js`), drawing in `zoneMap()` (`js/illustrations.js`, 360×300). C = top-left = upper body. B = top-right = lower body: squat/leg machines sit in the LEFT CORNER OF THE RIGHT SIDE (toward the center), plus benches. A = bottom = cardio: a block of treadmills + StairMasters, 2 rowers, 2 more cardio machines, a few cardio machines in the box next to room 4, and the stretching area. Rooms: 1 gym door, 2 sink, 3 women's locker room, 4 spin studio, 5 men's locker room. One box in the upper-right of A on the sketch is still unidentified (drawn as plain equipment, no label).
- **Interactive map**: `mountMap(box, { highlight, mirrors, states, date })` in `app.js`. Tap/Enter on a zone or room shows what's in it (`FLOOR`) and what's planned there today (`todayIn`). Used in deep-clean and mirror task sheets and in the Aperçu (with state badges).
- **Shift templates** (`CONFIG.shiftPresets`): Jour 7:30–15:30, Soir 16:30–23:00, Soir court 18:00–23:00. A tap fills Début/Fin (still editable; custom hours = no template highlighted). Default by clock (before noon = day), then the phone's last hours for that shift type (`prefs.lastTimes`). Each card has a tiny 6:00–24:00 day bar.
- **Tickable steps**: detail steps are buttons; ticked indices live in `entry.steps`; the row shows "x/y étapes"; ticking the last step closes the sheet and checks the task. Steps must be precise actions, not headlines (owner: "put the material in its place" was too vague → dumbbells by weight in pairs, plates off bars onto holders, benches back with backrest flat, accessories on hooks/bins).
- Owner liked the teal step numbers, teal tip chip and teal primary button in dark mode: keep them.
- Reference photos of the gym are off (`guidePhotos: false`) until real photos exist in `photos/`.
- Public demo artifact stays unbranded (`gymName: ''`, `logo: null`, `api: ''`, `demo: true`).

- **Motion**: illustrations animate only inside `.alive` parents (task sheet visual, Now card, open tip card, empty folder) via `a a-*` classes; screen changes use View Transitions (`show()` tracks `current`, never test `.hidden` for screens); segmented/lang pills slide via a MutationObserver (`syncThumb`); a global touchstart listener enables `:active` on iPhone.

- **Layout source**: `js/floor-layout.js` (ZONES, ROOMS with doors, DOORS, GEAR list, WALK) feeds both `zoneMap` and `gym3d.js`; edit positions there only. Owner corrections: men's locker room on the LEFT wall (door into gym), spinning in the lower RIGHT corner on the right wall, women's door toward the right, a door in the top wall between C and B, mirrors in front of the left cardio, big grey stretching carpet top-right of A with cardio below and a big mirror on A's right. No "Miroirs" tag on the map (confusing); the info card says "Nettoyage des miroirs". B and C interiors (owner, round 3): B = black rubber L along the top and right; dumbbells on the TOP wall, bench presses top-left, squat racks + Smith on the right; leg machines + benches in the wood middle; mirrors top + right. C = green turf strip (sled) on the left; top strip with dumbbells, bench presses and cables; middle machines (pec, shoulder, abs, serratus, pulldown, row, biceps, triceps); assisted pull-up and rope crunches at the bottom near the turf; mirrors left + top. A: 5 TVs above the left cardio and 5 above the carpet, all on the partition. C/B names are tabs on the top wall. 3D is the default map mode; the canvas takes all touch gestures (touch-action: none).
- **3D view**: `js/gym3d.js` (Three.js r160 self-hosted in `vendor/`, MIT, lazy-loaded) builds the same layout as `zoneMap` (360×280 units). `mountMap` has a Plan / 3D toggle (`prefs.mapMode`); tap picks via raycast; idle camera sway; reduced motion = static. Rooms have no numbers (owner); the door is labeled Entrée.
- **Dark mode**: near-black (`--bg #050708`), hairline borders, aqua glow on the primary button (`--cta-shadow`), inset top highlight on cards (`--edge`).

- **Naming rule (owner)**: never "passage 1/2", "1re/2e tournée", "pass", "round" in task titles; one task = one clear name saying what you do (rags: "Guenilles : sécheuse et lavage", "… ramasser et redistribuer", "… plier et distribuer", "… ramasser et laver", "… finir et préparer demain"). Q1 last task is "Avant de partir" (so it never clashes with the "Fin du quart" button). A test enforces unique, round-free titles.
- **Ergonomics review (simulated staff + supervisors + designer)**: labeled top buttons ("Aperçu", "Menu"), no icon-only actions; Now card "C'est fait", bottom bar "Signaler" / "Fin du quart"; no chip strip or Heure/Zone toggle on the checklist (list order lives in the Menu); toast "Annuler" after every check; task sheets have an X and a fixed footer ("Pas pu faire" / "C'est fait"); setup hides the hours behind "Autres heures" unless custom, shows the date as text with "Changer", and no longer asks the report language (per supervisor: `CONFIG.supervisors[].lang` or the Menu). Menu: language, "Texte plus grand" (html.large zoom 1.15; also the Aa button on setup), list order, email language for the supervisor, Protocole, edit hours, erase. Aperçu tabs: Le jour · Protocole · Trucs; Protocole = both reference shifts for the selected day + rotation rules + priorities. Zone B is periwinkle (was coral, too close to "not done" red); "Non coché" on the map is neutral dashed (was amber, too close to zone A).

## Workflow

1. Edit; keep `fr` and `en` in sync (test "Toutes les tâches ont des étapes dans les deux langues" catches gaps).
2. `npm test`.
3. Visual check: `PORT=3200 node dev-server.js` (in-memory API, codes `equipe` / `patron`; mock `https://formsubmit.co/**` with `page.route`), then Playwright with iPhone 14 at `/opt/node-tools/node_modules/playwright/index.mjs`; use `page.clock.setFixedTime` to land inside a shift so the "Now" card shows.
4. Demo artifact: copy `index.html` body (strip doctype/html/head/body, charset, viewport, manifest), `styles.css`, `js/*.js` to a scratch folder; in the copy set `demo: true` and `gymName: ''` (the public demo stays unbranded); publish with the Artifact tool, `files` mapping each js file.

## Gotchas

- Don't `pkill -f "node dev-server.js"` from a bash line containing that text: it kills the shell. Loop over `pgrep -x node` and check `/proc/<pid>/cmdline`.
- Artifact viewer: `confirm()` returns false → use two-tap confirms (already done). mailto links may do nothing there.
- Monospace fonts make "18 h 45" too wide on the time column; digits use the system font with `tabular-nums`.
- Class `.break` is the break *row*; timeline segments use `.seg.rest`.
- GitHub push from cloud sessions needs the Claude GitHub App installed on the repo.
