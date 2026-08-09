# Session handoff — 2026-08-09 (fourth pass)

**Date:** 2026-08-09
**Branch:** main
**Repo:** neuroniche-spaces
**Last commit:** `8d62b8e` (local, not pushed — `git log origin/main..HEAD` shows 17 commits ahead)

## What happened this session

Continuation of `.planning/handoff-2026-08-09-zone-selection-layer-parity.md`, which
named dimension `layerId` as the cheapest remaining Gap-4 item. Two commits:

1. `a399ce5` — **Layers extended to dimensions**, completing Gap 4's entity coverage.
   `Dimension.layerId?` added (same convention as the other three entity types). New
   `updateDimension` store action. `DimensionLayer.tsx` filters render through
   `isEffectivelyVisible` when given a `layers` prop. New minimal
   `DimensionPropertiesPanel.tsx` — dimensions have no other editable geometry
   (start/end come from the click-click draw tool), so it's just a Layer dropdown +
   Delete button.
2. `8d62b8e` — docs: recorded this in `cad-gap-audit.md`.

**All four canonical entity types (objects, zones, walls, dimensions) now have layer
support in 2D.**

## Verification state

- `npx tsc --noEmit`: clean (same 4 pre-existing unrelated `report.test.ts` errors).
- `node --test "src/**/*.test.ts"`: **179/179 pass** (2 new: `updateDimension` layer
  assignment, `isEffectivelyVisible`/`Locked` over a bare `Dimension` shape).
- `npm run build`: clean.
- **Live-verified in Chrome**: drew a dimension via the Dimension tool (discovered
  along the way that the two-click draft flow needs a real gap between the two
  `mousedown` events — firing both in the same synchronous script tick means React's
  `draftDimensionStart` state hasn't flushed yet, so the second click is silently
  treated as a *first* click instead of completing the dimension; splitting into two
  separate `evaluate_script` calls fixed it). Selected the dimension, assigned it to
  the already-hidden "Quiet Zone" layer via the new dropdown, confirmed the dimension
  line disappeared from the Konva canvas. Delete button also verified (dimension count
  in localStorage went to 0).

## Honest known gaps

- No 3D room-shell integration for wall layers, and no 3D filtering for zone/
  dimension layers at all (only objects have 3D layer filtering). Walls are
  structurally load-bearing for the 3D room shell in a way objects/zones/dimensions
  aren't — needs a real design decision (does "hide a wall's layer" mean visual-only,
  or does it need to punch a real gap in the shell geometry?), not a copy-paste of the
  2D pattern.
- No per-layer print/order/colour/lineweight fields, no named view-state save/restore,
  no default-layer *set* (Architecture/Doors/Furniture/etc. presets) — still just one
  seeded "Default" layer.
- Everything else in `cad-gap-audit.md`'s remaining lists (Gap 3 blocks/templates,
  Gap 5 outliner/batch-edit, Gap 6 leaders/sections/title-block, Gap 7
  scenarios/review-workflow, the Command-architecture cross-cutting item) — untouched.

## Next session should start with

Gap 4's 2D story is now essentially complete (four entity types, full CRUD,
visibility/lock, undo/redo, live-verified). The natural next moves, roughly in order
of value-to-effort:

1. **Gap 5 (outliner/batch-edit)** — "missing entirely" today, and would make every
   other gap's UI more usable (a single tree view of all objects/zones/walls/
   dimensions across layers, instead of clicking each one on canvas to find it).
   Biggest scope of the open items, but also the most load-bearing for usability.
2. **3D room-shell wall-layer design question** — worth a brainstorming pass before
   any implementation, per the gap above.
3. **Gap 3 (blocks/templates)** — `templates.ts` is a fixed preset system, not a real
   `BlockDefinition`/`BlockInstance` model with save-selection-as-block, versioning,
   or nesting. Genuinely unstarted.

Not pushed to `origin/main` — 17 commits ahead of last push, push was not requested.
