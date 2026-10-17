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

- **Seamless for workers**: never show rule talk ("hors plage", "horaire personnalisé", CNESST, deficits) to the cleaner. The plan just adapts; leftover blocks appear as "Si tu as du temps". Fixed times outside the shift (e.g. compost) disappear from the worker view. The *supervisor report* does carry those details.
- **Supervisor is not fixed**: entered each shift (Daniel, Mathieu, Marie, Oli, Amélie…); report addressed to that name. Report language chosen per supervisor (remembered on the phone).
- **Languages**: UI FR/EN per phone; report in the supervisor's language; employee-typed text (remarks, flags, notes) is never translated.
- **Voice**: Quebec French, *tu*, short imperatives, local terms (balayeuse, vidanges, guenilles, moppe, brassée, poste de télé). Headline titles follow the manual; details are the simplified layer.
- **Design**: professional, calm, "tech" through clarity, not decoration. Hairline surfaces, one teal accent, state colors separate, tabular digits, timeline + "Now" card, bottom sheet for details with numbered steps and a "Bon à savoir" callout. Ergonomics first (big tap targets, check on the right, nothing hidden behind toasts).
- Reference photos of the gym are off (`guidePhotos: false`) until real photos exist in `photos/`.

## Workflow

1. Edit; keep `fr` and `en` in sync (test "Toutes les tâches ont des étapes dans les deux langues" catches gaps).
2. `npm test`.
3. Visual check: `node dev-server.js` (simulated email → `last-report.html`), then Playwright with iPhone 14 at `/opt/node-tools/node_modules/playwright/index.mjs`; use `page.clock.setFixedTime` to land inside a shift so the "Now" card shows.
4. Demo artifact: copy `index.html` body (strip doctype/html/head/body, charset, viewport, manifest), `styles.css`, `js/*.js` to a scratch folder; in the copy set `demo: true` and `gymName: ''` (the public demo stays unbranded); publish with the Artifact tool, `files` mapping each js file.

## Gotchas

- Don't `pkill -f "node dev-server.js"` from a bash line containing that text: it kills the shell. Loop over `pgrep -x node` and check `/proc/<pid>/cmdline`.
- Artifact viewer: `confirm()` returns false → use two-tap confirms (already done). mailto links may do nothing there.
- Monospace fonts make "18 h 45" too wide on the time column; digits use the system font with `tabular-nums`.
- Class `.break` is the break *row*; timeline segments use `.seg.rest`.
- GitHub push from cloud sessions needs the Claude GitHub App installed on the repo.
