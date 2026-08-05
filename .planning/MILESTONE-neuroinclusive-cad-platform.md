# Milestone — Neuroinclusive Spatial Planning Platform (spatial graph / persona / heatmap engine)

**Status: Phase 1-5 (contracts only) done (2026-08-05). Explicit override milestone, separate from the active roadmap.**
Logged 2026-08-05 after the user explicitly chose to treat the "CAD/BIM/digital-twin"
proposal (pasted twice this session) as a real future initiative rather than build it
inline. Do not start work here without the user picking it up as the active session
task — `docs/phase0-audit-2026-08-02.md`'s re-sequenced roadmap (accessibility →
Supabase/auth → ASPECTSS audit → grants → costing/AI/compliance) remains the active
work until then.

## What already exists (Phase 1/2 below extend this, they don't replace it)

`/spatial` (`src/app/spatial/`, `src/lib/spatial/`, `src/components/spatial/`) is a real,
working 2D/3D room editor, not a placeholder:

- `src/lib/spatial/store.ts` — Zustand store, single source of truth for
  `walls`/`doors`/`floorDims`/`placedObjects`, undo/redo (50-deep), cross-tab sync via
  BroadcastChannel, localStorage autosave.
- `src/lib/spatial/types.ts` — `WallSegment`, `DoorPlacement`, `PlacedObject`,
  `FloorDims` types (this milestone's "parametric object system" already exists in
  skeleton form here — `PlacedObject` just needs `sensoryProfile`/`accessibilityProfile`/
  `anchors` added, not a rewrite).
- `src/lib/spatial/clearance.ts` — a real constraint check (clearance violations), i.e.
  a first hard-constraint already shipped, ahead of any "constraint engine" in this doc.
- `src/components/spatial/RoomEditor2D.tsx`, `RoomViewer3D.tsx`, `ObjectMesh3D.tsx`,
  `RoomGeometry3D.tsx` — 2D canvas editor + R3F/Three.js 3D viewer with WebGPU-with-
  WebGL-fallback (`webgpu.ts`), template picker, properties panel, CSV/PDF export.
- `.planning/GLB-Asset-Library-Master-Prompt-Claude-Sonnet.md` — an already-written spec
  for the GLB asset registry (provenance, licensing, LOD, sensoryProfile) this milestone's
  Phase 0/1 asset pipeline should reuse verbatim, not redesign.

So "Phase 0/1" of this milestone is genuinely **extend the existing store + types +
components**, not a fresh monorepo. No new frontend framework, no new 3D library, no
new state manager — Zustand + R3F stay.

## Phase breakdown (from the pasted brief, condensed to what's new vs. existing)

| Phase | Adds | Builds on |
|---|---|---|
| 0 | Directory layout for graph/constraint/heatmap/persona engines under `src/lib/spatial/engine/` (not a new package/monorepo — this is one Next.js app) | existing `src/lib/spatial/` |
| 1 | `zones[]` on the room type; `PlacedObject.sensoryProfile`/`accessibilityProfile`/`anchors`; graph layers (geometry/visibility/movement/sensory/accessibility/zone) as plain adjacency-list modules; spatial indexing (start with a flat array + bounding-box filter — RBush/BVH only once object counts justify it, current MVP ceiling is ~25 objects per `store.ts`'s own comment) | `store.ts`, `types.ts`, `clearance.ts` |
| 2 | Snap engine (grid/wall/corner/object/zone/clearance scoring), TransformControls-based move/rotate/scale, measurement tool | `RoomEditor2D.tsx`, existing undo/redo |
| 3 | Heatmap grid (start CPU/canvas-2d, not GPU shaders — this app has no WebGPU compute pipeline yet and premature GPU heatmaps are the single biggest scope/risk item in the whole brief); neuroinclusive scoring functions | `clearance.ts`'s violation pattern |
| 4 | Persona data models + scoring pipeline (pure functions over the heatmap grid, same style as `src/lib/aspectss/score.ts`'s deterministic scoring) | `aspectss/score.ts` pattern |
| 5 | AI JSON-only layout/recommendation contracts — **no AI calls exist anywhere in this codebase yet** (`docs/phase0-audit-2026-08-02.md` A5); this is also where §8 AI-safety controls (spotlighting, restrictive-practice guardrail) first apply, same gate as any other AI feature on this roadmap | none yet — first AI surface in the app |
| 6 | Projects/scenarios/RBAC/audit-log — needs real multi-tenant schema design (orgs/rooms already exist per Phase 2 of the *active* roadmap; scenario versioning is new) | `organisations`/`rooms` tables |

## Non-goals for now (cut from the brief, would be added only if a phase proves them necessary)

- GPU/WebGPU compute shaders for heatmaps — CPU canvas-2d heatmap first; only move to
  GPU if profiling on a real room shows it's needed.
- BVH/Octree/RBush — flat-array spatial queries first; the brief's own performance
  numbers (100+ objects) are far above this app's current room sizes.
- A monorepo split (frontend/engine/assets/ai/api packages) — stays one Next.js app;
  splitting into packages is pure overhead at this project's size and contradicts the
  "no dependency/scaffolding you don't need yet" rule this codebase otherwise follows.
- Multi-persona journey simulation, RBAC, audit log — Phase 4+/6 items, sequenced last
  because they depend on everything above actually existing first.

## Why this is a separate milestone, not this session's task

- Adds real new dependencies (RBush/BVH libs when object counts justify them, GLB
  tooling) that the standing rule "never add a dependency when installed one can do it"
  gates until actually needed.
- Multi-week/multi-session scope — the phase table above is itself only the outline;
  each row is its own planning + build session.
- The active roadmap (`docs/phase0-audit-2026-08-02.md`) has unfinished, scoped, already-
  in-progress work (accessibility pass, ASPECTSS wizard, grants finder) that this would
  otherwise silently displace.

## Phase 1 — done (2026-08-05)

- `types.ts`: `Zone`/`ZoneKind`, `SensoryImpact` (reuses the app's real 5-category
  taxonomy, not a new one — see comment in-file), `AccessibilityProfile`; `PlacedObject`
  gained optional `category`/`sensoryProfile`/`accessibilityProfile`.
- `anchors.ts` (new): derived (not stored) anchor points + `pointInFootprint`.
- `spatialIndex.ts` (new): flat-array nearest/within-radius queries (RBush/BVH deferred,
  see Non-goals).
- `graph.ts` (new): `SpatialGraph` + `buildGraphFromRoom` — one graph, layer-tagged edges.
- `constraints.ts` (new): `evaluateConstraints` — wraps existing `clearance.ts` as the
  hard "clearance" rule, adds soft "unzoned_placement".
- `store.ts`: `zones[]` + `addZone`/`updateZone`/`removeZone`, wired into
  snapshot/undo-redo/autosave/localStorage-migration.
- `graph.test.ts` (new): 5 tests covering zone membership, wall adjacency, and the
  constraint wrapper. `node --test`: 98/98 pass. `npm run build`: clean.
- Not wired into any UI yet — `/spatial` doesn't let a user draw a zone or see a
  violation from this engine. That's Phase 2 (CAD interaction layer).

## Phase 2 — engine layer done, UI wiring NOT done (2026-08-05)

- `snapEngine.ts` (new): `computeBestSnap` — weighted multi-candidate scoring
  (grid/wall/corner/objectAlign/zone), highest score wins, per brief §10. Reuses
  `geometry.ts`'s existing `snapPointToGrid`/`snapObjectToNearestWall` rather than
  duplicating them.
- `measurements.ts` (new): `distanceBetween`, `clearanceToNearestWall` — pure functions
  for a future live-readout UI.
- `snapEngine.test.ts` (new): 3 tests. `node --test`: 101/101 pass. `npm run build`: clean.
- **Not done**: `RoomEditor2D.tsx` still uses its original grid-only drag snap — the new
  scoring engine isn't called from the UI yet. No TransformControls-based rotate/scale
  handles, no on-canvas measurement readout, no zone-drawing tool. This is real
  next-session work, not a small wire-up — the 2D editor's drag/pointer handling needs
  restructuring to consume `computeBestSnap`'s candidate+type (for a "snapped to wall"
  vs "snapped to grid" indicator) instead of a single silent snapped point.

## Phase 3 — engine layer done, no UI overlay (2026-08-05)

- `heatmap.ts` (new): `buildHeatmapGrid` — CPU scalar grid (0.2m cells default), influence
  fields (intensity/distance², saturating at close range) over the existing 5-category
  `sensoryProfile` taxonomy, plus a `crowding` field (object density within 1.5m). No GPU/
  shader work — milestone-doc non-goal, this app has no compute pipeline and no room size
  that would need one.
- `scoring.ts` (new): `scoreZone`/`scoreAllZones` — calm/focus/regulation scores (0-100)
  per zone, derived from each `ZoneKind`'s expected low-stimulation categories. Explicitly
  scoped to 3 scores buildable from real data now; Accessibility Score already exists as
  `constraints.ts`'s violations, Movement/Cognitive-Load Score need Phase 2's UI-wired
  movement graph and Phase 4's persona weighting to mean anything, so not faked here.
- `heatmap.test.ts` (new): 3 tests (influence falls off with distance, empty zone scores
  100, a loud object measurably lowers a zone's calm score). `node --test`: 104/104 pass.
  `npm run build`: clean.
- **Fixed 2026-08-05**: `sensoryProfile` was empty on every real placed object. Root cause
  found — `demoData.ts`'s `CATALOGUE` (Product type, ids `p1`-`p10`) and `templates.ts`'s
  `defaultObjects` (PlacedObject type, ids like `indoor-swing-frame`) are two unrelated
  productId spaces; `addObject` is only called from `store.test.ts`, so templates are the
  *only* real source of placed objects in the app today. Fix: `sensoryLibrary.ts` (new) —
  one shared `SENSORY_LIBRARY` table keyed by the 13 productIds templates actually use,
  `sensoryProfileFor()` helper — wired into all 15 `defaultObjects` across the 5 templates.
  Single source of truth, not per-literal duplication (same reasoning as `demoData.ts`
  being one shared catalogue). Build clean, 104/104 tests pass.
- **Still not done**: no `<canvas>`/texture overlay in `/spatial` — nothing renders this
  data yet. That's the real remaining Phase 3 UI item.

## Phase 4 — engine layer done, no UI dashboard (2026-08-05)

- `persona.ts` (new): `PERSONA_LIBRARY` (7 personas — Autistic Adult, ADHD Adult, AuDHD,
  Sensory Seeking/Avoiding Child, PTSD, Anxiety), `personaZoneSuitability`,
  `evaluatePersonaForRoom`/`evaluateAllPersonas`. Shared-environment pattern: one heatmap
  grid built once (`heatmap.ts`), every persona scored against the same grid.
- Scoped out: Wheelchair User/Low Vision/Hearing Impaired personas — their real need is
  accessibility/visibility data (clearances, sightlines) this codebase doesn't compute as
  a graph yet, only as `constraints.ts`'s persona-independent clearance rule. Not stubbed
  with fake sensitivity numbers; add them once that data exists.
- Journey simulation (enter/navigate/work/collaborate/rest/exit) — not built. Needs the
  movement graph wired to real UI interaction (Phase 2's remaining work) to simulate an
  actual path through the room, not just static zone snapshots.
- `persona.test.ts` (new): 2 tests. `node --test`: 106/106 pass. `npm run build`: clean.

## Phase 5 — JSON contracts done, NO live AI call (2026-08-05)

- `aiContracts.ts` (new): `buildAIContext()` composes Phases 1-4's engines (graph,
  constraints, heatmap, scoring, persona) into one JSON-serialisable input object; output-
  side types (`AIRecommendationResponse`, `AIZoneSuggestion`, `AIObjectSuggestion`,
  `AIRecommendation` in the brief's Problem/Impact/Risk/Recommendation shape) define what
  an AI call would be allowed to return — zones/objects/recommendations only, never
  geometry/meshes, per the brief's core principle.
- **Deliberately not done, needs the user's explicit go-ahead first**: no live API call.
  This is the first AI surface anywhere in this codebase (confirmed zero elsewhere,
  `docs/phase0-audit-2026-08-02.md` finding A5) — wiring a real key/provider is an
  API-keys decision the user's standing rules require asking about before touching, and
  it's also where the roadmap's AI-safety controls (spotlighting, restrictive-practice
  guardrail) first apply. Stopped here on the user's own explicit choice mid-session.
- `aiContracts.test.ts` (new): 1 test. `node --test`: 107/107 pass. `npm run build`: clean.
- Phase 6 (projects/scenarios/RBAC/audit-log) not started — genuinely needs its own schema
  design session, not a quick extension of what exists.

## To activate this milestone

Pick one row from the phase table above as a session's actual task, and it goes through
the normal work-order process (restate/deliverables/KNOWN-UNKNOWN) like any other request
— starting with Phase 1's `zones[]` + `sensoryProfile` type additions, since everything
else in the table depends on that data existing first.
