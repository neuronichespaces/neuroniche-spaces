# CAD Upgrade Plan

Milestone 0 deliverable, paired with `cad-gap-audit.md`. Maps the prompt's 10-milestone
order onto this codebase's actual state rather than a from-zero build.

| # | Scope (per prompt) | Adjusted for this repo |
|---|---|---|
| 1 | Canonical model extensions, geometry hardening, units, validation, persistence | Add wall selection concept + numeric wall inspector; formalize `EditorCommand`-style metadata on top of existing `mutate()` (command ID/description), without breaking the working undo/redo stack |
| 2 | Command architecture, preview transactions, undo/redo, selection state | Largely exists (store's `mutate`/`past`/`future`); add command *description* + *id* fields so Gap 7's audit log has something to persist later |
| 3 | SVG 2D plan, grid, numeric input, coordinate parser, dimensions, shared selection | **Biggest real decision**: keep Konva (huge existing investment: snapping, zones, gizmo, heatmap overlay all built on it) vs. rewrite to SVG for the accessibility win the prompt wants. Recommend: do NOT rewrite yet — add `#x,y`/`@x,y`/`1500<90` parsing as a renderer-independent module first (Gap 2), reassess Konva-vs-SVG only once that's proven, since the parser work is renderer-agnostic and not wasted either way |
| 4 | 3D sync, shared render model, bidirectional editing | Already done (this session) |
| 5 | Layers, view states, outliner, Quick Select, batch edit | Real net-new work; layer model can extend the render-role pattern already proven in `src/renderer/babylon/types.ts` |
| 6 | Annotations, dimensions, tags, sections/elevations | Real net-new work; needs Milestone 1's wall-selection first (dimensions need something to anchor to) |
| 7 | Blocks/templates | Real net-new work; `templates.ts`'s fixed presets are a reasonable reference for what "insert a Calm Corner" should feel like, not reusable code |
| 8 | Scenarios, audit log, comments, review/publish | Builds on existing Supabase `room_layouts`/`organisation_memberships`; needs Milestone 1's command-id/description work first |
| 9 | Accessibility hardening | Partially ongoing (locked/hidden this session, keyboard shortcuts); full pass blocked on Milestone 3's Konva-vs-SVG decision |
| 10 | Performance, export, E2E, docs | Last, as specified |

## Milestone 1 — proposed scope for the next session

**Scope**: wall selection + numeric wall inspector, command id/description fields.

Files to add/change:
- `src/lib/spatial/types.ts` — no new fields needed (WallSegment already has id/start/end/thicknessM); add `selectedWallId` to store state.
- `src/lib/spatial/store.ts` — `selectWall`, `updateWallGeometry(id, {start,end,thicknessM})`; add `lastCommandDescription: string` to each history entry (small, additive).
- `src/components/spatial/WallDimensionsPanel.tsx` (new) — numeric start/end/length/angle/thickness, same draft-string/never-silently-clamp pattern as `RoomDimensionsPanel.tsx`.
- `src/components/spatial/WallLayer.tsx` — click-to-select a wall (parity with object click-to-select).
- Tests: wall selection + numeric update round-trip.

**Acceptance criteria**:
1. Click a wall in 2D → it's selected (visually distinguished, matches object-selection convention). PASS/PARTIAL/BLOCKED to be marked at execution time, not now.
2. Numeric wall length/angle edit updates canonical `WallSegment` and both 2D+3D re-render.
3. Invalid wall edits (zero length, NaN) rejected with plain-language error, never clamped.
4. Existing 118+ tests still pass; new wall tests added.
5. `npm run build`/lint clean.

**Explicitly NOT in Milestone 1**: coordinate-string parsing (`#x,y` etc — Milestone 1
lays the wall-selection groundwork it needs first), layers, blocks, annotations,
sections, scenarios — all later milestones per the prompt's own dependency order.
