# Current-State Audit — Spatial Design Engine

Written per the "Neuroinclusive CAD-Style Spatial Room Planner Foundation" prompt's
Phase 0 requirement, before any code changes. Baseline commands run this session:

```
npm run build   → clean (23 routes, /spatial included)
npm run lint    → 12 errors / 2 warnings, ALL in files outside src/lib/spatial and
                   src/components/spatial (costing, audit, training, business-case,
                   organisations pages; A11yProvider, ErrorBoundary) — pre-existing,
                   unrelated to the spatial editor, unchanged by recent sessions
node --test "src/lib/**/*.test.ts"   → 114/114 pass
```

## 1. Current technical architecture

| Layer | What's actually there |
|---|---|
| Framework/build | Next.js 16.2.12 (App Router, Turbopack), React 19.2.4, TypeScript strict |
| Package manager | npm |
| Rendering engine | **Three.js 0.185.1** via `@react-three/fiber` 9.7 + `@react-three/drei` 10.7 (3D), **Konva 10.3** via `react-konva` 19.2 (2D plan view) |
| WebGPU init | R3F's built-in WebGPU-with-WebGL-fallback path, `webgpu.ts` (thin capability check); fixed this session (resize-before-init bug, logged in `.planning/MILESTONE-neuroinclusive-cad-platform.md`) |
| Routing | Next.js file-based (`src/app/**/page.tsx`) |
| Project-state management | **Zustand** single store, `src/lib/spatial/store.ts` — one `useRoomLayoutStore` holds `walls`/`doors`/`floorDims`/`placedObjects`/`zones`, both 2D and 3D components subscribe to it, neither holds local derived transform state |
| Renderer-state management | None separate — 2D (`RoomEditor2D.tsx`) and 3D (`RoomViewer3D.tsx`/`ObjectMesh3D.tsx`) both read directly from the Zustand store; no renderer-owned business state found |
| Geometry generation | `src/lib/spatial/geometry.ts` (grid snap, wall projection, bounds clamp), rooms are wall-segment lists, not parametric solids |
| Scene graph | Implicit in R3F's JSX tree; a separate **Spatial Graph Engine** (`graph.ts`) exists as a *data* graph (geometry/visibility/movement/sensory/accessibility/zone layers) independent of the render tree — this is a real, working asset the prompt's Foundation 1 largely wants |
| Object selection | `store.ts`'s `selectedObjectId`, shared by both views; picking currently: Konva click handler (2D, per-shape), Tab-cycle + arrow-key move (keyboard, verified this session); 3D click-to-select not yet wired (see defects) |
| Pointer interaction | 2D: Konva drag events → `snapEngine.ts`'s `computeBestSnap` → `store.moveObject`. 3D: no drag interaction on meshes yet, `OrbitControls` only |
| Camera controls | 3D: `@react-three/drei`'s `OrbitControls` (orbit/pan/zoom), plus a first-person `WalkControls3D.tsx` walkthrough mode |
| Transform controls | **New this session**: Konva `Transformer` on the 2D `ObjectLayer.tsx` (resize/rotate handles, wired to `store.rotateObject`/`updateObjectProps`, verified live in browser). No 3D transform gizmo exists |
| Persistence | Two layers: (a) `localStorage` + `BroadcastChannel` autosave (always-on, `store.ts`), (b) **new this session** — real Supabase wiring (`persistence.ts`, `0010_spatial_supabase_wiring.sql`) for `room_layouts`/`placed_objects`, not yet exercised against a live DB |
| Testing | `node:test` + `node:assert/strict` (Node 24 native, no Jest/Vitest/Playwright) — `*.test.ts` sits next to its module. 114 tests total, 44 in `src/lib/spatial/`. No E2E framework; browser verification this session used the chrome-devtools MCP tool manually, not an automated suite |
| Accessibility | Room-level: `A11yProvider.tsx` (site-wide contrast/density/reduced-motion settings), keyboard nudge (Tab-select + arrow-move, verified working), `aria-label`s on tool buttons. **No semantic object tree**, no live-region announcements for spatial actions, no full non-pointer workflow for resize/duplicate |
| Asset-loading pipeline | `assetRegistry.ts` (new this session) — real `productId`-keyed registry, `validateAssetEntry`, `getAssetEntry`; `ObjectMesh3D.tsx` checks the registry and would `useGLTF()`-load a real model, falling back to a coloured box. **Zero `.glb` files exist anywhere in the repo** — every entry's `glb` field is `null` |
| Sensory data model | `SensoryImpact` (5 fixed categories: movement/noise/light/touch/pressure, magnitude 1–5, signed) — deliberately the *only* taxonomy in the app (a prior session tried a richer one and reverted it, per `types.ts`'s own comment). `PERSONA_LIBRARY` (7 non-diagnostic persona profiles) scores rooms against a heatmap grid |

## 2. Architectural defects found, against the prompt's specific checklist

| Defect the prompt asks to search for | Found here? |
|---|---|
| Business state stored only on meshes | **No** — confirmed clean. `store.ts` is genuinely the single source of truth; 2D/3D both read from it, no local derived transform state duplicated on either side |
| Dimensions inferred from mesh scale | **No** — `PlacedObject.footprintM`/`rotationDeg` are stored numeric fields; 3D (`ObjectMesh3D.tsx`) reads them to size a `boxGeometry`, doesn't invert scale back into data |
| Direct mesh mutation without commands | **Partially** — no command layer exists at all (see below); mutations go through typed Zustand actions (`moveObject`, `rotateObject`, etc.), which is *not* raw mesh mutation, but also isn't the prompt's `execute`/`undo` command-object pattern |
| Duplicated 2D/3D state | **No** — both read the one store |
| Hard-coded room dimensions | **No** — `floorDims` is user-set / template-set, no magic constants found in components |
| UI components directly modifying the renderer | **No** — components call store actions, never touch Three.js/Konva internals directly from outside their own render function |
| Unstable array-index identifiers | **No** — every entity (`WallSegment`, `PlacedObject`, `Zone`) has a stable string `id`, generated via `Date.now()`-based or `gen_random_uuid()` in DB |
| Primitive meshes presented as completed equipment | **Yes, by design and openly documented** — `ObjectMesh3D.tsx`'s own comment: "Placed objects rendered as labelled coloured boxes when no real GLB model has been sourced... currently every object." This is Foundation 7's actual gap |
| Camera controls conflicting with object dragging | **Not applicable yet** — 3D has no object dragging to conflict with (2D's Konva canvas and 3D's OrbitControls are separate view modes, never simultaneous) |
| Absent resource disposal | **Not audited in depth this pass** — R3F/drei generally handle disposal on unmount; no explicit leak found in code review, not measured under repeated load/unload |
| Absent scene teardown | Same as above — not specifically instrumented |
| Non-versioned project JSON | **Yes — real gap.** `store.ts`'s persisted shape (`RoomLayout`) has no `schemaVersion` field; `hydrateFromLocalStorage`'s own comment admits "corrupt/old-shape localStorage payload — ignore and start fresh, no migration path yet" |
| Absent undo/redo | **No — exists**, but as whole-state snapshot push/pop (`past`/`future` arrays of full `RoomLayout` snapshots, 50-deep), not the prompt's per-operation `EditorCommand.execute/undo` pattern. Functionally works (verified undo/redo tests pass), architecturally different from Foundation 6's spec |
| Mouse-only interactions | **Partially fixed this session** — Tab-select + arrow-key move exists and is verified; resize/rotate gizmo is mouse-only (Konva `Transformer`), no keyboard equivalent yet; wall/zone drawing is mouse-only |
| Unlabelled canvas controls | **No** — tool buttons (`Select`/`Wall`/`Door`/`Zone`), heatmap/persona selectors all have visible text labels; Konva canvas itself has no `aria-label` (it's a raw `<canvas>`) |
| Medical/diagnostic claims | **No** — confirmed clean; `PERSONA_LIBRARY` uses named scenario profiles ("Autistic Adult", "ADHD Adult" etc. — see note below), sensory scores are geometric/environmental, not diagnostic |
| Universal neurodiversity scores | **No single universal score exists** — `scoring.ts` produces per-zone calm/focus/regulation scores (0–100) from real geometric/sensory data, not a single "neurodiversity compliance" number. **Caveat**: persona names in `persona.ts` (e.g. "Autistic Adult", "ADHD Adult") are closer to diagnostic-category labels than the target prompt's preference-dimension model (`soundSensitivity: 1-5` etc). Worth reviewing against Foundation 10's stricter non-diagnostic language bar |
| Unexplained sensory recommendations | **Partial** — `constraints.ts` violations carry `severity`/`reason`/description; no `confidence`, `sourceType`, or `evidenceReferences` fields as Foundation 10 specifies. `aiContracts.ts` defines the *shape* AI recommendations would need (Problem/Impact/Risk/Recommendation) but no live AI call exists |

## 3. Framework decision — Three.js/R3F vs. Babylon.js

The source prompt is explicit: *"If the application already has a well-implemented
Three.js architecture, do not replace it automatically... Do not use both Babylon.js
and Three.js in the same production editor."*

Assessment against that bar:

- **Renderer abstraction**: exists and is clean — components never touch Three.js internals directly, all reads/writes go through the Zustand store.
- **Picking**: 2D picking works (Konva); 3D picking (click-to-select a mesh) does **not** exist yet — a real gap, but one R3F/drei's own `onClick`/raycasting supports natively, no framework swap required to fix it.
- **Transform controls**: 2D gizmo done this session (Konva `Transformer`); 3D gizmo not built, but `@react-three/drei` ships `<TransformControls>` — the exact primitive Foundation 4 asks for, already available in an installed dependency.
- **Asset loading**: `useGLTF` (drei) already wired into `ObjectMesh3D.tsx` and load-by-registry-id verified structurally this session.
- **Fallback behaviour**: WebGPU-with-WebGL-fallback already fixed and verified live this session.

**Conclusion**: the existing Three.js/R3F stack satisfies every capability Foundation
1–7 needs (canonical model, dimensions, sync'd views, gizmos, snapping, GLB assets) —
the remaining gaps (3D picking, 3D gizmo, command-pattern undo, mm-based schema,
semantic accessibility tree, explainable-findings metadata shape) are **all additive
work on the current stack**, not blocked by, or requiring, a framework change. Per the
source prompt's own stated condition, a Babylon.js migration is not justified by
anything found in this audit.

## 4. What's genuinely reusable vs. what the prompt's foundations still need

**Directly satisfies (or is close to) a foundation, reusable as-is:**
- Foundation 1 (canonical model) — `types.ts`'s `PlacedObject`/`Wall`/`Zone`/`FloorDims` types are most of the way there; missing `schemaVersion`, mm units (currently metres, a deliberate documented decision), and some entity kinds (window, ceiling, material reference).
- Foundation 5 (snapping) — `snapEngine.ts` is a dedicated, renderer-independent, weighted-scoring service, already matching the prompt's "don't bury snapping in pointer handlers" requirement almost exactly.
- Foundation 10 (sensory metadata) — `SensoryImpact`, `PERSONA_LIBRARY`, `scoring.ts`, `constraints.ts` are a real, working, non-diagnostic-by-design foundation; needs the `Finding` shape (confidence/provenance/evidence) layered on top, not rebuilt.
- Foundation 3 (sync'd views) — architecturally already true (one store, two renderers); the 2D view isn't yet a fully-labelled technical plan (no dimension annotations, no grid-line hierarchy) and 3D has no click-to-select.

**Real gaps, need new work:**
- Foundation 2 (precise numeric editing) — properties panel exists for objects; no numeric room/wall dimension editing with unit parsing (`"4.2m"`, `"420cm"` etc).
- Foundation 4 (3D selection/gizmo) — 2D done, 3D not started.
- Foundation 6 (command architecture) — undo/redo works but isn't the `EditorCommand` pattern; would need a real refactor of `store.ts`'s mutation layer.
- Foundation 7 (GLB assets) — registry infrastructure exists, zero real assets (documented, deliberate, per the earlier GLB milestone entry — licensing/sourcing needs human action this session can't do).
- Foundation 8 (CAD-style UI) — current UI is functional but not restructured into the tool-rail/inspector/status-bar shell the prompt specifies.
- Foundation 9 (accessibility) — partial (keyboard nudge, Tab-select); no semantic object tree, no live-region announcements, no full non-pointer workflow for every operation.

## 5. Explicitly not evaluated this pass

Performance budgets (load time, frame time, memory growth), visual-regression
screenshots, and a full manual mouse-drag click-through (blocked by the same
browser-automation tooling limit logged in the milestone doc: the available
tool clicks/drags DOM elements by accessibility-tree id, not canvas pixel
coordinates) are out of scope for this audit pass — Phase 0 is architecture and
defect-finding, not full QA.
