# CAD-Grade Capability Gap Audit

Milestone 0 of the "CAD-Grade Capability Upgrade" prompt (2026-08-07). Audited against
the 7 structural gaps, using this session's own extensive, current knowledge of the
codebase (Babylon migration + hardening, spatial store, 2D editor all touched today —
no stale assumptions here).

**Build/test state at audit time**: `npm run build` clean, 123/123 `node --test` pass,
lint clean in every spatial/renderer file (12 pre-existing errors remain in unrelated
pages — costing/audit/training/business-case/organisations/A11yProvider/ErrorBoundary,
unchanged all session).

## Gap 1 — Synchronized 2D/3D dual-view architecture

**Status: substantially exists, with one architectural deviation from this prompt.**

- Canonical state: `useRoomLayoutStore` (Zustand) — `walls`/`doors`/`floorDims`/
  `placedObjects`/`zones`/`selectedObjectId`. Both views read this and only this; no
  renderer holds a second editable transform copy. This is the load-bearing rule this
  whole prompt cares about, and it already holds.
- **2D renderer is Konva canvas, not SVG.** This predates every session today and was
  already flagged as a deviation in the Babylon hardening audit
  (`docs/architecture/babylon-infrastructure-audit.md`). This prompt's Foundation A
  says "Use SVG... unless the repository audit demonstrates a clearly superior existing
  renderer that preserves equivalent technical quality, accessibility, print quality,
  and interaction precision" — Konva does NOT currently meet the accessibility bar
  (bare `<canvas>`, no per-shape DOM nodes, confirmed this session: browser-automation
  tooling cannot click/drag individual shapes, only whole-canvas synthetic events).
  A full SVG rewrite of `RoomEditor2D.tsx`/`WallLayer.tsx`/`ObjectLayer.tsx`/
  `ZoneLayer.tsx` is real, multi-session work — flagged as a blocking sub-item of
  Foundation A, not silently kept.
- 3D renderer: Babylon.js (migrated + hardened this session) — orbit/walk cameras,
  gizmo, WebGPU-with-WebGL-fallback, render-role-filtered picking, all store-driven.
- Selection sync: `selectedObjectId` is shared state; both views read/write it. 2D→3D
  and 3D→2D selection sync already works (browser-verified this session).
- **Missing**: saved camera views, orthographic 3D option, section-box/cut-plane
  preview, frame-selection/reset-view UI, independent viewport-state persistence.
- **Missing tests**: no automated test proves "2D movement updates 3D" or "3D gizmo
  movement updates 2D" end-to-end — this session's verification was manual/live-browser
  only, not a `node:test`/Playwright assertion.

## Gap 2 — Precision numeric and keyboard-driven input

**Status: mostly closed as of 2026-08-09 — this section badly predates several
sessions of Milestone 1/2 work and was corrected in place below rather than rewritten,
so the "Missing entirely"/"Stale" labels are literal, not decorative.**

- Numeric inspector exists for objects (`PropertiesPanel.tsx`: width/depth/height/
  rotation/brightness/colour-temp/noise sliders + new Lock/Hide) and for room dimensions
  (`RoomDimensionsPanel.tsx`: `parseLengthToMetres` accepts `"4200"`,`"4200mm"`,
  `"420cm"`,`"4.2m"`).
- Keyboard alternative exists for objects: Tab-select, arrow-key move, `R`/`Shift+R`
  rotate, `[`/`]` resize (this session's Milestone 4 work) — all locked-aware as of
  this session.
- **Stale as of 2026-08-09 — now closed**: wall numeric inspector
  (`WallDimensionsPanel.tsx`: length/angle/thickness/layer) and zone numeric inspector
  (`ZonePropertiesPanel.tsx`: kind/label/centre-X-Y/width/length/rotation/layer) both
  exist now — walls and zones both have a real selection concept
  (`selectedWallId`/`selectedZoneId`). This paragraph originally predated that work;
  left the "Missing entirely" framing below for the items that are still actually
  missing rather than rewriting history.
- **Also stale — also now closed** (per `cad-upgrade-plan.md`'s dated entries, the
  authoritative done/remaining record this file should have been cross-checked
  against): absolute/relative/polar coordinate entry, axis lock, 3-tier keyboard
  increments, and Tab-between-fields dynamic input are all implemented and
  live-verified (`parseAbsolute`/`parseRelative`/`parsePolar`/`axisLock` in
  `geometry.ts`, wired into `RoomEditor2D.tsx`). Genuinely still missing: typed
  coordinate entry literally *while the mouse button is held down* mid-drag (works
  between clicks and via the dynamic overlay, not mid-`mousedown`), and the zone tool
  has no length/angle-style dynamic overlay (only a single coordinate-corner field) —
  zones don't have a natural "length/angle from a pivot" shape the way walls do.
- Validation is real where it exists (`RoomDimensionsPanel.tsx` never silently clamps,
  shows plain-language errors) — the *pattern* is correct, just not yet applied to
  walls/coordinates/polar input.

## Gap 3 — Blocks, components, and template library

**Status: core save/insert loop closed (2026-08-09); linked instances, versioning,
nesting, and click-to-place still missing.**

- `templates.ts` (`Calm Corner`, `Movement Zone`, etc.) remains a separate, fixed,
  hard-coded set of starting-room presets applied once at room creation — distinct by
  design from the block system below, not superseded by it.
- **Closed**: `BlockDefinition` (`types.ts`) — a named, stable-id group of objects,
  captured from the current multi-selection (`saveSelectionAsBlock`, items stored
  relative to the selection's centroid) and re-insertable anywhere
  (`insertBlock` — undo-tracked, unlike the block library itself). `BlocksPanel.tsx`
  is the library UI; `OutlinerPanel.tsx`'s batch bar gained "Save as block."
  Live-verified in Chrome end-to-end (see `cad-upgrade-plan.md`'s dated entry).
- **Not done**: every instance is fully detached (no linked-instance/"edit propagates
  to all copies" concept), no versioning, no nesting (a block can't contain another
  block), no click-to-place — `insertBlock` always lands at the room's centre point,
  repositioning after insert relies on existing drag. Blocks are in-memory only, not
  yet persisted to localStorage/Supabase (stated scope cut, matches how the rest of
  this session's newer entities work before their own persistence pass).

## Gap 4 — Layers, visibility, locking, and view states

**Status: real layer entity now covers all four canonical entity types (objects,
zones, walls, dimensions) in 2D as of 2026-08-09, and objects in 3D. 3D room-shell
integration for the other three and view-state save/restore still missing.**

- **Closed (objects, 2026-08-09)**: `Layer` (`types.ts`) — `{id, name, visible, locked}`
  — seeded with one "Default" layer (`layers.ts`'s `DEFAULT_LAYER_ID`), full CRUD
  through the store's normal undo/redo path. `PlacedObject.layerId?` assigns an object
  to a layer (absent = default). Effective state is computed, not stored twice:
  `isEffectivelyVisible`/`isEffectivelyLocked` OR the object's own locked/hidden flags
  with its layer's — an object can be individually locked AND on a locked layer.
  `LayersPanel.tsx` does CRUD + visibility/lock toggles; `PropertiesPanel.tsx` has a
  layer-assignment dropdown; `ObjectLayer.tsx`'s render filter, drag-ability, and
  Transformer-attach all route through the effective-state helpers, not raw
  per-object flags.
- **Closed (3D objects, 2026-08-09, later same day)**: `BabylonRendererAdapter.syncObjects`/
  `updateObjectTransform` take `layers: Layer[]` and gate `root.setEnabled()` on
  `isEffectivelyVisible()` — a hidden layer excludes its objects from both render and
  picking in 3D (Babylon disables picking automatically on a disabled node), same as
  2D. `RoomViewer3D.tsx`'s gizmo-attach condition checks `isEffectivelyLocked`/
  `isEffectivelyVisible` (own flag OR layer's). **Not** scene-graph-verified — no
  Babylon-side debug hook equivalent to `window.Konva.stages`, so this rests on code
  review + the already-unit-tested helper, not a live pixel check.
- **Closed (zone selection + zone/wall layers, 2026-08-09, later session)**: zones had
  no selection concept at all before this — `selectedZoneId`/`selectZone` added to the
  store (mutually exclusive with object/wall/dimension selection, same pattern as
  `selectWall`), `ZonePropertiesPanel.tsx` (new) is the numeric zone inspector (kind,
  label, centre X/Y, width, length, rotation, delete). `Zone.layerId?` and
  `WallSegment.layerId?` both now exist; `layers.ts`'s `isEffectivelyVisible`/
  `isEffectivelyLocked` were generalized from a `PlacedObject`-specific signature to a
  structural `LayeredEntity` type so `Zone`/`WallSegment` (neither has its own
  `hidden`/`locked` fields) reuse the same logic instead of a duplicated copy.
  `ZoneLayer.tsx`/`WallLayer.tsx` filter render through `isEffectivelyVisible` when
  given a `layers` prop; `ZonePropertiesPanel.tsx`/`WallDimensionsPanel.tsx` both gained
  a Layer-assignment dropdown. Live-verified in Chrome for both: assigning a zone/wall
  to a hidden layer removed it from the Konva canvas (dashed zone-rect count and Line
  count both dropped by exactly one).
- **Closed (dimensions, 2026-08-09, later same session)**: `Dimension.layerId?` added,
  same convention. New `updateDimension` store action (layerId + label patch).
  `DimensionLayer.tsx` filters render through `isEffectivelyVisible` when given a
  `layers` prop. New `DimensionPropertiesPanel.tsx` — dimensions have no other
  editable geometry (start/end come from the click-click draw tool, not typed), so
  it's just the Layer dropdown plus a Delete button (parity with the existing
  Delete-key shortcut). Live-verified in Chrome: drew a dimension, assigned it to a
  hidden layer via the dropdown, confirmed it disappeared from the Konva canvas.
  **All four canonical entity types now have layer support in 2D.**
- **Not done**: no 3D room-shell integration for wall layers —
  `BabylonRendererAdapter.syncRoomShell` rebuilds walls unconditionally; walls are
  structurally load-bearing for the 3D room-shell geometry in a way objects/zones
  aren't, so hiding one via layer needs its own design decision rather than a
  copy-paste of the object/zone pattern (deliberately scoped out, not an oversight).
  No zone/wall/dimension layer filtering in 3D at all yet (only objects). No
  per-layer print/order/colour/lineweight fields. No named view-state save/restore. No
  default-layer *set* (still just one seeded "Default", not
  Architecture/Doors/Furniture/etc. presets).

## Gap 5 — Advanced selection, filtering, outliner, batch editing

**Status: core loop closed for objects (2026-08-09); cross-type multi-select, saved
selection sets, and Quick-Select-style filtering still missing.**

- **Closed (objects only)**: `OutlinerPanel.tsx` — a flat tree of every
  object/zone/wall/dimension, grouped by layer, click-to-select. `multiSelectedObjectIds`
  (Shift-click in the outliner) + `isolatedObjectIds` (transient view filter, not a
  persisted flag) in the store. Batch mutators: `batchSetObjectLayer`,
  `batchRemoveObjects`, `batchSetObjectsLocked`, `batchSetObjectsHidden`. All
  live-verified in Chrome (isolate correctly filtered the Konva render, batch delete
  removed exactly the selected objects).
- **Not done**: zones/walls/dimensions have no batch mutators or multi-select — scoped
  to objects deliberately (see `OutlinerPanel.tsx`'s own comment for why: true
  cross-type multi-select needs every entity's actions to accept an id array, a bigger
  change than this pass). Canvas click still does single-select only; the outliner is
  the only multi-select entry point. No Quick-Select-style filter system, no saved
  selection sets.

## Gap 6 — Annotation, sections, elevations, documentation

**Status: dimensions and leaders/callouts are real model entities; north arrow, scale
bar, title block, and per-wall elevations exist in the printable export (all as of
2026-08-09). Section-cut views (as opposed to per-wall elevations), revision clouds,
and export metadata beyond project/date remain missing.**

- **Closed (dimensions)**: manual dimension tool. `Dimension` (`types.ts`) is a
  canonical model entity — `{id, start, end, offsetM, label?}` — persisted through the
  store's normal `mutate()`/undo-redo/validate path, not rendering-only pixels.
  `DimensionLayer.tsx` is a pure view over it. Click-click tool in `RoomEditor2D.tsx`;
  select + Delete to remove.
- **Closed (leaders/callouts, 2026-08-09, later session)**: `Leader` (`types.ts`) —
  `{id, anchor, labelPoint, text, layerId?}` — same canonical-entity treatment as
  Dimension. `LeaderLayer.tsx` renders it; `LeaderPropertiesPanel.tsx` edits text/
  layer; a `leader` tool in `RoomEditor2D.tsx` (click anchor, click label point, type
  the callout text). Listed in `OutlinerPanel.tsx` and layer-filterable like every
  other entity.
- **Closed (north arrow, scale bar, title block, wall elevations, same session)**:
  `PrintableExport.tsx`'s floor-plan SVG now draws a north arrow (fixed up-is-north
  convention — no compass/orientation field exists to make this configurable yet) and
  a labelled scale bar. A title block (project name, print date, and a pointer to the
  scale bar rather than a fabricated "1:N" ratio, since that needs a physical page DPI
  this app doesn't control) sits below the header. A new "Wall elevations" section
  renders one SVG per wall (length x `DEFAULT_WALL_HEIGHT_M`, with the wall's door
  shown as a cutout) — a real second projection derived from the same
  `WallSegment`/`DoorPlacement` data as the floor plan and 3D view, not a decorative
  addition. This is per-wall elevation, not a true section-cut (an arbitrary vertical
  slice through the room) — see "Still missing" below.
- 2D view still renders room-name/area/wall-length text and a clearance readout as
  **rendering-only** Konva `<Text>` nodes, unrelated to Dimension/Leader — same gap as
  before for those specific labels.
- **Still missing**: revision clouds, a distinct section-line/cut-plane entity and
  generated section views (today's "elevations" are always the full wall face, not an
  arbitrary cut through the room), leaders aren't drawn on the printable export yet,
  export metadata beyond project/date (no drawn-by/checked-by/revision fields), and no
  named/versioned drawing-sheet system (`PrintableExport.tsx` always renders "the
  current state," not a saved sheet).

## Gap 7 — Collaboration, versioning, review, audit

**Status: substantively complete as of 2026-08-09 — scenarios, review status,
persisted audit log, comments, and diffing all exist. Not actor-tagged (no auth
identity flows through yet) and ScenariosPanel is unverified against a live DB.**

- Real, already-shipped: `organisation_memberships` (owner/member roles) + RLS scoping
  (`0004_memberships_and_rls.sql`), `room_layouts` Supabase persistence (load/save by
  room UUID, from an earlier session).
- **Closed (scenario versioning)**: `0011_scenario_versioning.sql` adds `name`/
  `status` (draft/in_review/approved/superseded) to `room_layouts`, which already
  technically permitted multiple rows per room but was never used that way — every
  prior save/load upserted the single earliest row. `persistence.ts` gains
  `listScenarios`/`saveScenarioAs`/`loadScenarioById`/`setScenarioStatus`, additive —
  existing load/save-the-default functions unchanged. `ScenariosPanel.tsx` wires it
  into the UI: save-as-new, list with status dropdown, load, diff. **Not verified
  against a live Supabase project** — no live project in this dev environment; same
  disclosed limitation `persistence.ts`'s own header comment already carries for its
  pre-existing code.
- **Closed (persisted audit log)**: `store.ts`'s `mutate()` now appends every command
  to `auditLog`, written immediately to its own `localStorage` key — deliberately
  separate from `past`/`future` (undo/redo mechanics: capped, rewound by undo). The
  audit trail records what happened and never shrinks on undo. Live-verified: survives
  a full page reload, unlike command history. `AuditLogPanel.tsx` is the read-only
  view. **Not yet actor-tagged** — there's no auth-identity concept flowing into the
  spatial editor yet, so entries carry a command id/description/timestamp but no
  "who."
- **Closed (comments/markups)**: `Comment` (`types.ts`) — `{id, x, y, text, resolved,
  createdAt}` — distinct from `Leader` (a permanent drawing annotation) in that a
  comment is a review artifact meant to be resolved and go away. In-memory only this
  pass (not yet in Supabase). `CommentsPanel.tsx`: form-based add (typed/fixed
  coordinates — no click-to-place canvas tool, same stated gap as block insertion),
  resolve/reopen, delete. Not rendered as a canvas pin, panel-only.
- **Closed (scenario diffing)**: `scenarioDiff.ts`'s pure `diffScenarios(before,
  after)` — added/removed/changed/unchanged counts per entity type (objects/walls/
  zones), by id. Whether an object moved matters more than which specific field
  changed, so this isn't a full deep-diff. Wired into `ScenariosPanel.tsx`'s "Compare"
  control.

## Cross-cutting observations

- **The store's mutation pattern is not a formal Command architecture.** Every mutator
  (`moveObject`, `rotateObject`, etc.) directly patches state and pushes a snapshot to
  history — there's no `EditorCommand` interface with `validate()`/`execute()`/`undo()`/
  `describe()`, no command ID, no per-command validation-result object. This works
  correctly today but doesn't yet support per-command audit metadata (Gap 7) or
  named/typed undo history labels ("Undo Move Cocoon Chair") without a real rewrite of
  the mutation layer — this is the single highest-leverage foundational change, since
  Gaps 4/5/6/7 (layers, batch edit, annotations-as-entities, audit log) all want to
  attach richer metadata to "a thing that changed", which today's plain `set()` calls
  don't carry.
- **No wall selection concept exists** — walls can be drawn/deleted but not selected,
  inspected, or numerically edited. This blocks large parts of Gap 2 and all of Gap 6's
  "wall length dimension" automatic-dimension idea (nothing to anchor it to yet).
- The existing render-role hardening (`src/renderer/babylon/types.ts`, this session)
  is directly reusable for Gap 4's "layer visibility must affect picking" requirement —
  the same `isEditorPickable`-style filter, extended to also check layer lock/visibility.
