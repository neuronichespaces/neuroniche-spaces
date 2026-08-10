# CAD-Grade Capability Gap Audit

Milestone 0 of the "CAD-Grade Capability Upgrade" prompt (2026-08-07). Audited against
the 7 structural gaps, using this session's own extensive, current knowledge of the
codebase (Babylon migration + hardening, spatial store, 2D editor all touched today —
no stale assumptions here).

**Build/test state at audit time**: `npm run build` clean, 136/136 `node --test` pass,
lint clean in every spatial/renderer file (13 pre-existing errors remain in unrelated
pages — costing/audit/training/business-case/organisations/A11yProvider/ErrorBoundary/
ScenariosPanel, unchanged all session).

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
- **Closed (saved camera views + orthographic toggle, 2026-08-10)**: `RoomViewer3D.tsx`
  exposes an imperative `CameraApi` (`onCameraApiReady` prop — the store has no renderer
  access) with `getSnapshot`/`applySnapshot`/`toggleOrthographic`. `ViewStatesPanel.tsx`
  + `store.ts`'s `saveViewState`/`restoreViewState`/`deleteViewState` persist named
  camera+layer-visibility snapshots (own localStorage key, not undo-tracked — same
  reasoning as `blocks`/`comments`). Orthographic is a live toggle button (top-right of
  the 3D view), bounds recomputed from radius/aspect on toggle, camera-apply, and resize.
- **Closed (section-box/cut-plane preview, 2026-08-10)**: `scene.clipPlane` — a single
  horizontal plane at an adjustable height (0.2m–4m slider), clipping away everything
  above it to reveal the interior from above. One plane, not a full multi-axis
  section-box editor — the audit item asked for a *preview*, and that's what this is;
  a real section-box (movable/rotatable clip planes, multiple simultaneous cuts) is a
  bigger, separate feature. "Section view" toggle + height slider, top-right of the 3D
  view.
- **Closed (frame-selection/reset-view UI, 2026-08-10)**: "Frame selection" fits the
  camera target/radius to the bounding box of the currently selected object(s) —
  multi-select if any, else the single selection, else every placed object (never a
  silent no-op). "Reset view" restores the camera's original centre/radius/alpha/beta
  from scene creation. Both are plain functions closed over the live `orbitCamera`,
  exposed via the same imperative-ref pattern as `toggleOrthographicRef`.
- **Closed (2D↔3D sync test, 2026-08-10)**: added a `node:test` making the specific
  claim this entry named — that a store mutation is immediately visible, identically,
  to every subsequent read, because RoomEditor2D and RoomViewer3D's `syncFromStore`
  both call the same `useRoomLayoutStore.getState()` with no per-view derived copy.
  This doesn't replace live-browser pixel verification (a separate, still-legitimate
  gap — literal on-screen rendering isn't asserted by a store test) — it closes the
  specific "no automated test proves this" complaint, at the level where the actual
  architectural guarantee lives.

## Gap 2 — Precision numeric and keyboard-driven input

**Status: fully closed as of 2026-08-10 — this section badly predated several sessions
of Milestone 1/2 work and was corrected in place below rather than rewritten, so the
"Missing entirely"/"Stale" labels are literal, not decorative.**

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
  `geometry.ts`, wired into `RoomEditor2D.tsx`).
- **Re-examined and closed (mid-drag typed entry, 2026-08-10)**: this was previously
  logged as "genuinely still missing." Re-reading `RoomEditor2D.tsx` directly: the wall
  length/angle overlay (lines ~765+) already renders and is fully interactive for the
  entire `draftWall`-truthy span, i.e. from `mousedown` to `mouseup` — the whole drag,
  not just "between clicks." Konva doesn't call `setPointerCapture` anywhere in this
  file, so keyboard focus can move into the overlay's inputs via Tab without a click
  while the drag is still physically held; releasing the mouse button over the overlay
  (a plain HTML div outside the Konva `<Stage>`) also doesn't fire the Stage's own
  `onMouseUp`/`finishWallDraft`, so `draftWall` survives release-over-overlay too,
  leaving it open for typed refinement before Enter commits. The literal case this
  entry names — typing into a field while a single mouse is *simultaneously* still
  depressed for the drag *and* that same click focuses the field — isn't reachable by
  a single pointer device regardless of app code; that's a hardware/interaction-model
  constraint, not a gap this codebase can close.
- **Closed (zone width/length dynamic overlay, 2026-08-10)**: `RoomEditor2D.tsx` gained
  a Width/Length overlay for the zone tool, mirroring the wall Length/Angle one exactly
  (same dirty-flag-per-field pattern, same Enter-to-commit/Escape-to-reset). Zones are
  axis-aligned rectangles with no natural angle, so Width/Length replaces Length/Angle;
  typed values always grow the rectangle right/down from the anchored start corner
  (the standard "enter width/height from a fixed corner" CAD convention), rather than
  trying to infer a drag direction from typed numbers alone.
- Validation is real where it exists (`RoomDimensionsPanel.tsx` never silently clamps,
  shows plain-language errors) — the *pattern* is correct, just not yet applied to
  walls/coordinates/polar input.

## Gap 3 — Blocks, components, and template library

**Status: core save/insert loop, linked-instance edit-propagation, versioning,
nesting, and click-to-place all closed (2026-08-09/10). Only persistence remains
scoped out.**

- `templates.ts` (`Calm Corner`, `Movement Zone`, etc.) remains a separate, fixed,
  hard-coded set of starting-room presets applied once at room creation — distinct by
  design from the block system below, not superseded by it.
- **Closed**: `BlockDefinition` (`types.ts`) — a named, stable-id group of objects,
  captured from the current multi-selection (`saveSelectionAsBlock`, items stored
  relative to the selection's centroid) and re-insertable anywhere
  (`insertBlock` — undo-tracked, unlike the block library itself). `BlocksPanel.tsx`
  is the library UI; `OutlinerPanel.tsx`'s batch bar gained "Save as block."
  Live-verified in Chrome end-to-end (see `cad-upgrade-plan.md`'s dated entry).
- **Closed (linked-instance edit-propagation, 2026-08-10)**: instances created by
  `insertBlock` are tagged `blockId`/`blockItemIndex` (`types.ts`). `pushInstanceToBlock`
  (`store.ts`) syncs one instance's shared fields — rotation/footprint/customProperties/
  productId, deliberately never x/y, each instance keeps its own placement — back into
  the block definition and out to every sibling instance. `PropertiesPanel.tsx` surfaces
  this as an "Apply changes to all instances" button when the selected object has
  siblings. Not a live/reactive binding (editing the block definition directly, if that
  existed, wouldn't auto-push) — a deliberate one-shot sync, matching the scope of what
  was asked; a fully reactive binding is a bigger data-model change than this pass.
- **Closed (versioning, nesting, click-to-place, 2026-08-10)**: `BlockDefinition`
  gained `version` (bumped by `pushInstanceToBlock`; a change counter, not a full
  revision history — that's a bigger, separate feature) and `nestedBlocks?: Array<{
  blockId, relX, relY }>` — one block placed inside another at an offset,
  translation-only (no rotation composition, since blocks carry no whole-block
  rotation to compose against). `insertBlock` recursively flattens a block's own items
  plus every nested block's items (cycle-guarded); `nestBlock`/`unnestBlock`
  (`store.ts`) manage the relationship and refuse self-nesting or creating a cycle.
  Click-to-place: `pendingBlockPlacement` (transient, not undo-tracked) armed from
  `BlocksPanel.tsx`'s "Click to place" button; `RoomEditor2D.tsx`'s stage-click handler
  checks it before any tool branch and calls `insertBlock` at the clicked point.
- **Not done**: blocks are in-memory only, not yet persisted to localStorage/Supabase
  (stated scope cut, matches how the rest of this session's newer entities work before
  their own persistence pass).

## Gap 4 — Layers, visibility, locking, and view states

**Status: real layer entity covers all four canonical entity types (objects, zones,
walls, dimensions) in both 2D and 3D, plus per-layer colour/lineweight/printable/order
fields, a default-layer preset set, and named view-state save/restore (as of
2026-08-10).**

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
- **Closed (3D wall-shell layer filtering, 2026-08-10)**: the design question above is
  resolved — a hidden wall's layer means visual+pick exclusion only (same rule as
  every other entity type's 3D behavior), never a structural change to the
  floor/ceiling shell. `syncRoomShell()` takes an optional `layers` param and skips a
  wall's box mesh when `!isEffectivelyVisible(wall, layers)`. Live-verified in Chrome:
  assigned a wall to a hidden layer, switched to 3D, saw a visible gap in the room
  shell where that wall would be, zero console errors. Not scene-graph-verified (same
  disclosed limitation as the 3D-objects entry above — no Babylon debug hook).
- **Closed (zones rendered + layer-filtered in 3D, 2026-08-10)**: zones had zero 3D
  presence before this — `BabylonRendererAdapter.syncZones()` (new) renders flat,
  translucent, colour-per-kind floor overlays and is layer-filtered from day one (no
  prior unfiltered version existed to retrofit). `ZONE_KIND_COLOURS`/`ZONE_KIND_LABELS`
  extracted from `ZoneLayer.tsx` (a react-konva component) into a new pure
  `zoneKinds.ts` so the 3D-only bundle doesn't pull in Konva. Non-pickable — zones are
  a 3D visual planning aid, not yet a selectable 3D entity (that's separate, larger
  scope). Switching to 3D with a zone present: zero console errors. **Visually
  confirmed 2026-08-10**: orbited the live 3D view (angled and near-top-down) with
  the "Quiet Zone" layer visible — the translucent green floor patch renders
  distinctly against the room floor/walls and object boxes, correctly positioned
  within the room shell. Screenshot-verified via Chrome DevTools MCP, not just
  code-reviewed.
- **Closed (dimensions rendered + layer-filtered in 3D)**: `BabylonRendererAdapter.syncDimensions()`
  builds the extension-line/dimension-line/label layout in 3D (mirroring
  `DimensionLayer.tsx`'s 2D render, y-up at metre scale) and is layer-filtered from day
  one via `isEffectivelyVisible`. Wired into `RoomViewer3D.tsx` alongside `syncZones`/
  `syncRoomShell`. This entry was previously (incorrectly) logged as "not done" in an
  earlier revision of this doc — corrected 2026-08-10 after re-reading the code directly
  rather than trusting the stale handoff note that repeated the error.
- **Closed (per-layer colour/lineweight/printable fields, 2026-08-10)**: `Layer` gained
  three optional fields — `color?` (hex override, consumed by wall/zone material and
  dimension line colour in both `BabylonRendererAdapter.ts` and the 2D
  `WallLayer`/`ZoneLayer`/`DimensionLayer` components, falling back to each entity's
  existing per-type colour when unset), `lineweightPx?` (2D dimension/annotation stroke
  width only — walls are solid 3D boxes so lineweight doesn't apply there), and
  `printable?` (new `isPrintable()` helper in `layers.ts`, defaults to true; wired into
  `PrintableExport.tsx`/`ExportPanel.tsx` so a non-printable layer's walls/objects are
  now excluded from the PDF/print export, which previously ignored layers entirely).
  `LayersPanel.tsx` exposes all three as UI controls.
- **Closed (layer `order` field, 2026-08-10)**: `Layer.order?: number` — no renderer in
  this codebase has a z-order/draw-order compositing concept to hook into, so this only
  drives list order (`sortedByOrder()` in `layers.ts`, consumed by `LayersPanel.tsx`),
  an honest partial implementation rather than a fabricated render-order effect.
- **Closed (default-layer presets, 2026-08-10)**: `defaultLayers()` now seeds four
  layers on a new project — Default, Walls, Zones, Dimensions — instead of just one
  undifferentiated "Default". `DEFAULT_LAYER_ID`/its position are unchanged, so every
  already-unassigned entity still resolves there; the new layers are an organisational
  starting point, not an auto-assignment (existing entities aren't retroactively moved
  onto the type-matched layer — that would require touching every entity-creation call
  site across the store, out of scope for this pass).
- **Closed (named view-state save/restore, 2026-08-10)**: `ViewState` (`types.ts`) —
  camera alpha/beta/radius/target + a layer-visibility snapshot, named and persisted to
  its own localStorage key (not undo-tracked, same reasoning as `blocks`/`comments`).
  `store.ts`'s `saveViewState`/`restoreViewState`/`deleteViewState` + `RoomViewer3D.tsx`'s
  `CameraApi` bridge (the store has no renderer access) + `ViewStatesPanel.tsx` (new)
  close this out. See Gap 1's "Closed (saved camera views...)" entry — same underlying
  mechanism, cross-referenced rather than duplicated.
- **Not done**: nothing outstanding in this gap beyond what's listed above.

## Gap 5 — Advanced selection, filtering, outliner, batch editing

**Status: core loop, per-kind batch mutators, true cross-type multi-select, Quick-
Select-style filtering, and saved selection sets all closed (2026-08-09/10).**

- **Closed (objects only)**: `OutlinerPanel.tsx` — a flat tree of every
  object/zone/wall/dimension, grouped by layer, click-to-select. `multiSelectedObjectIds`
  (Shift-click in the outliner) + `isolatedObjectIds` (transient view filter, not a
  persisted flag) in the store. Batch mutators: `batchSetObjectLayer`,
  `batchRemoveObjects`, `batchSetObjectsLocked`, `batchSetObjectsHidden`. All
  live-verified in Chrome (isolate correctly filtered the Konva render, batch delete
  removed exactly the selected objects).
- **Closed (zone/wall/dimension multi-select + batch layer/delete, 2026-08-10)**: one
  `multiSelected<Kind>Ids` array per type (`store.ts`) — not a single mixed set, since
  only objects have their own `locked`/`hidden` flags to batch-toggle; zones/walls/
  dimensions get a narrower action set (`batchSet<Kind>Layer`/`batchRemove<Kind>s`
  only). `OutlinerPanel.tsx`'s shift-click routes to whichever kind the row is; the
  batch-action bar renders per active kind (full bar for objects, unchanged; layer+
  delete for the other three). Leaders remain excluded — no batch mutators exist for
  them, same "not every entity type needs this" scoping the rest of this doc uses.
- **Closed (true cross-type multi-select, 2026-08-10, same day)**: the four
  `multiSelected<Kind>Ids` arrays were mutually exclusive when first added earlier the
  same day — shift-clicking a wall cleared any zone selection. That's now removed:
  shift-click ADDS to its own kind's array without touching the others, so an object +
  a zone (+ a wall, + a dimension) can be selected together. A normal single-select
  still clears every array — clicking one thing means "just this one." Only leaders
  stay outside multi-select (no batch mutators for them).
- **Closed (Quick-Select-style filtering, 2026-08-10)**: `OutlinerPanel.tsx` gained a
  text filter narrowing the tree by label, plus "Select all filtered" — adds every
  currently-filtered, non-leader row into its kind's multi-select array (additive, so
  refining the filter and clicking again grows rather than resets the selection).
- **Closed (saved selection sets, 2026-08-10)**: `SelectionSet` (`types.ts`) — one id
  array per kind, named, persisted to its own localStorage key (not undo-tracked, same
  reasoning as `blocks`/`viewStates`). `saveSelectionSet`/`restoreSelectionSet`/
  `deleteSelectionSet` (`store.ts`) + a small list UI in `OutlinerPanel.tsx`.
- **Not done**: canvas click still does single-select only; the outliner is the only
  multi-select entry point (a rubber-band drag-select on the 2D canvas doesn't exist).

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
- **Stale, corrected 2026-08-10**: this bullet previously said "No wall selection
  concept exists," contradicting Gap 2's own body a few sections up, which documents
  `selectedWallId`/`WallDimensionsPanel.tsx` as closed 2026-08-09. Wall selection does
  exist. What's still true and worth keeping from the original point: no
  *automatic* wall-length dimension is generated from that selection (Gap 6's
  auto-dimension idea) — that's a real, separate, still-open gap, just not "no
  selection at all."
- The existing render-role hardening (`src/renderer/babylon/types.ts`, this session)
  is directly reusable for Gap 4's "layer visibility must affect picking" requirement —
  the same `isEditorPickable`-style filter, extended to also check layer lock/visibility.
