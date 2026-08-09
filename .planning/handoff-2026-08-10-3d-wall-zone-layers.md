# Session handoff — 2026-08-10

**Last commit:** `c80111f` (local, not pushed — ~35 commits ahead of origin)

## What happened this pass

1. `b3c9445` — 3D room-shell wall-layer filtering. Resolved the design question
   `cad-gap-audit.md` had flagged as blocking this: a hidden wall's layer means
   visual+pick exclusion only in 3D (same rule as objects), never a structural change
   to the floor/ceiling shell. Live-verified in Chrome (visible gap in the 3D room
   shell where the hidden wall would be, zero console errors).
2. `bd6a655` — Zones rendered in 3D for the first time (previously zero 3D presence).
   `BabylonRendererAdapter.syncZones()`, layer-filtered from day one. Extracted
   `ZONE_KIND_COLOURS`/`ZONE_KIND_LABELS` into a new pure `zoneKinds.ts` so the 3D
   bundle doesn't pull in `react-konva`. **Not visually confirmed** the coloured
   overlay is distinctly visible — code-reviewed, follows the floor's own proven
   pattern, but not screenshot-verified showing the actual patch. Stated honestly in
   `cad-gap-audit.md` rather than assumed.
3. `c80111f` — docs recording both.

`tsc`/`build` clean throughout (same 4 pre-existing unrelated `report.test.ts`
errors). 195/195 `node --test` pass (unchanged both times — pure rendering additions,
no new testable logic; this file already has no test harness, confirmed via `ls`
before either change).

## What's left, unchanged from prior handoffs

- Dimension rendering/layer-filtering in 3D still doesn't exist at all.
- Live Supabase verification for `ScenariosPanel` — no live project in this dev
  environment.
- Audit-log actor tagging — no auth/identity system in the app yet.
- Command-architecture refactor — deliberately not attempted, a real rewrite.
- Per-layer print/colour/lineweight fields, named view-state save/restore,
  default-layer presets — none exist.
- Zones/walls are non-pickable in 3D (visual only) — 3D selection for them is
  separate, larger scope not attempted.

## Suggested next slice (small, well-scoped)

Verify the zone 3D overlay is actually visible — orbit the camera or check from
directly above (top-down) rather than the default angled view, since that's the one
thing this pass left genuinely unconfirmed rather than just "not attempted."

Not pushed to `origin/main` — push was never requested.
