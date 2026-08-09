# Session handoff — 2026-08-09 (sixth pass)

**Last commit:** `06d817e` (local, not pushed — ~26 commits ahead of origin)

## What happened

Closed the bulk of Gap 6 (annotation/sections/elevations/documentation):

- `Leader` model entity (leaders/callouts) — full CRUD, 2D render, inspector panel,
  draw tool, outliner integration, layer support. Commit `524a3d4`.
- `PrintableExport.tsx` gained a north arrow, scale bar, title block (project/date,
  honest about not fabricating a "1:N" scale ratio without knowing page DPI), and a
  real wall-elevations section (one SVG per wall, door cutouts, derived from the same
  wall/door data as everything else — not decorative). Same commit.
- `cad-gap-audit.md` updated (`06d817e`).

190/190 `node --test` pass, `tsc`/`build` clean (same 4 pre-existing unrelated
`report.test.ts` errors, untouched all session).

## What's genuinely NOT done in Gap 6 (stated plainly)

- No true section-cut views — only per-wall elevations (a fixed wall face, not an
  arbitrary vertical slice through the room).
- No revision clouds.
- Leaders aren't drawn on the printable export yet (2D editor only).
- No drawn-by/checked-by/revision fields, no named/versioned drawing sheets.

## Gap 7 (collaboration/versioning) — NOT STARTED

User asked for this to be completed too. It wasn't touched this pass — DB primitives
(`organisation_memberships`, RLS, `room_layouts` Supabase persistence) already exist
from earlier sessions, but there's no scenarios (multiple named layouts per room), no
draft/review/approved workflow states, no persisted audit log (undo/redo history is
in-memory only, lost on reload), no comments/markups, no diffing between scenarios.
This is a full app-level feature — new DB migration(s), new UI surfaces, a real
workflow state machine — not a quick follow-on to what exists.

## Technique notes worth keeping for next session

- Chrome automation: `evaluate_script`'s `dialogAction` param auto-handles ANY dialog
  opened during that call — if you fire an event that triggers `window.prompt()` and
  don't pass `dialogAction`, it silently accepts with empty text. Pass the intended
  response directly as `dialogAction` on the SAME call that triggers the dialog.
- `window.print()` genuinely blocks CDP automation in this environment (unlike
  prompt/confirm) — stub `window.print = () => {}` before triggering it if you need to
  inspect what would have been printed, rather than trying to dismiss the dialog.

Not pushed to `origin/main` — push was not requested.
