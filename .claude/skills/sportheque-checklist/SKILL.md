---
name: sportheque-checklist
description: Work on the Sporthèque gym cleaners' shift checklist website (this repository). Use for any change to its tasks, wording, translations, schedule logic, report email, design, demo artifact or deployment.
---

# Sporthèque shift checklist

Mobile-first website (iPhone, Safari) for the cleaning staff of the Sporthèque gym
(Gatineau, 2nd floor). A cleaner enters name, start/end time and the supervisor on
duty; the site builds the shift plan from the training manual; they check tasks off,
note what couldn't be done, flag issues with photos; on submit a report is emailed
to the supervisor. Plain static site + one serverless function. No build step.

## Map

| File | Role |
|---|---|
| `js/manual.js` | Manual content, bilingual `{ fr, en }` per block: title, summary, steps, tips. Sequence + durations are the source of truth. |
| `js/planner.js` | Pure planning engine, `buildPlan({ shift, date, start, end, lang })`. Bilingual composed text lives in its `P` table. |
| `js/report.js` | `buildReport(planInReportLang, state, photoNames)` + HTML/text email renderers (labels in `R`). |
| `js/i18n.js` | All UI strings, `UI.fr` / `UI.en`. Every key must exist in both. |
| `js/app.js` | UI: setup → checklist → finish → sent. State in localStorage, photos in IndexedDB (`photos.js`). |
| `js/config.js` | Gym name, rotation anchor (Mon 2026-10-19 = week 1), break rules, demo flag. |
| `api/send-report.js` | Vercel function → Resend. Recipient only from env `SUPERVISOR_EMAIL`. |
| `tests/*.test.js` | `npm test` (node:test, no deps). |

## Rules from the manual (never break)

- Reference shifts: Q1 07:30–15:30, Q2 16:30–23:00 → reproduce the manual's tables to the minute (tests enforce it).
- Other hours: same blocks, same order, same durations; never shorten a block. Closing then opening kept first; what doesn't fit goes to `overflow`.
- CNESST: meal ≥ 30 min after 5 consecutive hours (gym gives 60, unpaid); 15-min break not legally required but granted and paid (from 4 h presence).
- A–B–C deep-clean rotation is continuous (Q1 then Q2, 2 sessions/day), never reset on Mondays. Walls every other day; tiles/mirrors alternate; Sunday = inspection.
- Compost only Q2 at 19:00 (Wednesday: bin to curb). Offices vacuumed only Q2 (Tue/Fri owners, Wed/Sat trainers). Spin room cleaned only Q1. No tennis tasks ever.

## Product decisions from the owner

- **Seamless for workers**: never show rule talk (custom hours, CNESST, deficits) to the cleaner. Leftover blocks appear as "Si tu as du temps". Fixed times outside the shift disappear from the worker view; the supervisor report keeps them.
- **Supervisors**: a fixed picker (Daniel, Mathieu) from `CONFIG.supervisors`; each may get an `email` later. During testing every report goes to `CONFIG.reportTo` (test address). Report language remembered per supervisor.
- **Languages**: UI FR/EN per phone; report in the supervisor's language; employee-typed text never translated.
- **Voice**: Quebec French, *tu*, short imperatives, local terms (balayeuse, vidanges, guenilles, moppe, brassée, poste de télé).
- **Supervisor side**: email (FormSubmit, free) = summary + "Voir le rapport" link; the report is compressed in the hash (`#r=…`) and opens a glance view. The old per-phone "Espace superviseur" was removed by the owner.
- **Aperçu du gym** (`#apercu`), public to the whole team: zones of the day (map), day highlights, shifts sent, what's left, open issues, tips. Shared live through `/api/board` (Netlify function + Blobs) when hosted on Netlify; on GitHub Pages it silently degrades to "plan du jour" + this phone's shifts. Owner refused Google Sheets / external databases. Everything must stay free.
- **Identity**: pool + gym floor world. Chlorine-white canvas, deep teal, aqua; coral/sun in small doses. Barlow Condensed (self-hosted, `fonts/`) for titles/times, system font for text. Signature: "le couloir" (timeline as a swim lane with lane ropes and a swimmer = now). Living background = slow pool-light blobs. ONE centered object per task in `js/illustrations.js` (96×96, same stroke, two neutrals + one aqua detail + soft ground shadow, theme-aware `--il-*` vars; owner rejected busy multi-object scenes) plus real diagrams (zone map, TV wall). Official logo (from the owner) in `icons/` (transparent PNG, light + dark versions, symbol-only `mark-*`), set in `CONFIG.logo`; never redraw or alter it. UI is monochrome charcoal (the logo's ink) with ONE accent (aqua `--accent`) reserved for live/current/tips. Background = faint pool-tile grid + one slow light. No emoji as UI icons (drawn SVG `ICON` set). Owner's direction: "premium tech feel, anti AI slop".
- **Ergonomics**: swipe right to check (tap still works), check button on the right, toasts above the bottom bar, sheet = bottom sheet on phone / centered dialog ≥900px. Motion is short and purposeful; `prefers-reduced-motion` kills all of it.
- **Floor plan (owner's sketch, confirmed)**: data in `FLOOR` (`js/manual.js`), drawing in `zoneMap()` (`js/illustrations.js`, 360×300). C = top-left = upper body. B = top-right = lower body: squat/leg machines sit in the LEFT CORNER OF THE RIGHT SIDE (toward the center), plus benches. A = bottom = cardio: a block of treadmills + StairMasters, 2 rowers, 2 more cardio machines, a few cardio machines in the box next to room 4, and the stretching area. Rooms: 1 gym door, 2 sink, 3 women's locker room, 4 spin studio, 5 men's locker room. One box in the upper-right of A on the sketch is still unidentified (drawn as plain equipment, no label).
- **Interactive map**: `mountMap(box, { highlight, mirrors, states, date })` in `app.js`. Tap/Enter on a zone or room shows what's in it (`FLOOR`) and what's planned there today (`todayIn`). Used in deep-clean and mirror task sheets and in the Aperçu (with state badges).
- **Tickable steps**: detail steps are buttons; ticked indices live in `entry.steps`; the row shows "x/y étapes"; ticking the last step closes the sheet and checks the task. Steps must be precise actions, not headlines (owner: "put the material in its place" was too vague → dumbbells by weight in pairs, plates off bars onto holders, benches back with backrest flat, accessories on hooks/bins).
- Owner liked the teal step numbers, teal tip chip and teal primary button in dark mode: keep them.
- Reference photos of the gym are off (`guidePhotos: false`) until real photos exist in `photos/`.
- Public demo artifact stays unbranded (`gymName: ''`, `logo: null`, `boardEndpoint: ''`).

## Workflow

1. Edit; keep `fr` and `en` in sync (test "Toutes les tâches ont des étapes dans les deux langues" catches gaps).
2. `npm test`.
3. Visual check: `DEMO=1 PORT=3200 node dev-server.js` (simulated email + in-memory board), then Playwright with iPhone 14 at `/opt/node-tools/node_modules/playwright/index.mjs`; use `page.clock.setFixedTime` to land inside a shift so the "Now" card shows.
4. Demo artifact: copy `index.html` body (strip doctype/html/head/body, charset, viewport, manifest), `styles.css`, `js/*.js` to a scratch folder; in the copy set `demo: true` and `gymName: ''` (the public demo stays unbranded); publish with the Artifact tool, `files` mapping each js file.

## Gotchas

- Don't `pkill -f "node dev-server.js"` from a bash line containing that text: it kills the shell. Loop over `pgrep -x node` and check `/proc/<pid>/cmdline`.
- Artifact viewer: `confirm()` returns false → use two-tap confirms (already done). mailto links may do nothing there.
- Monospace fonts make "18 h 45" too wide on the time column; digits use the system font with `tabular-nums`.
- Class `.break` is the break *row*; timeline segments use `.seg.rest`.
- GitHub push from cloud sessions needs the Claude GitHub App installed on the repo.
