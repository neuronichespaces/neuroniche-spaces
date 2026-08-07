# Babylon.js Infrastructure Audit

Phase 0 of the Babylon hardening milestone (2026-08-07), audited against the setup
built the same day in the "Three.js → Babylon.js" migration (see
`.planning/MILESTONE-neuroinclusive-cad-platform.md`'s corresponding entry).

## Current state

- **Version**: `@babylonjs/core` / `@babylonjs/loaders` `^7.54.3`.
- **Engine init**: `BabylonEngineFactory.ts` — async, feature-detects `navigator.gpu` +
  a real adapter request before attempting `WebGPUEngine`, falls back to `Engine`
  (WebGL2) on any init failure. No forced-WebGL dev flag exists yet (gap).
- **WebGPU detection**: real (adapter request), not a blind try/catch. Good.
- **WebGL fallback**: works, but untested by an automated test — only browser-verified
  once via WebGPU succeeding, fallback path itself unexercised (gap).
- **Scene creation/disposal**: one `Scene` per `RoomViewer3D` mount, disposed in the
  effect's cleanup. No scene pooling/reuse — acceptable at this app's one-viewer-at-a-time
  usage.
- **Render loop**: `engine.runRenderLoop(() => scene.render())`, torn down on unmount.
  No pause-when-hidden (gap — spec §9 asks for this).
- **Camera setup**: `createOrbitCamera`/`createWalkCamera` in `BabylonSceneController.ts`,
  swapped directly by `RoomViewer3D.tsx`'s walk-mode toggle. No `BabylonCameraController`
  abstraction — camera-mode switching is inlined in the component (gap, spec §5).
- **Picking**: `BabylonPickingService.ts`'s `attachClickSelection` — picks via
  `scene.pick`, resolves through `BabylonEntityMapper.resolveEntityId` by walking the
  parent chain. **No render-role filtering exists yet** — anything with a registered
  `metadata.entityId` is selectable; nothing prevents a future gizmo/grid/overlay mesh
  from accidentally being tagged and picked (gap, spec §2/§3 — this is the milestone's
  main target).
- **GizmoManager usage**: `BabylonTransformBridge.ts` creates one `GizmoManager` per
  `RoomViewer3D` mount (not per-selection — already correct per spec §4's "do not create
  a utility layer per selected entity"), reused across selections via `attachTo`/
  `attachToNode`. Uses the manager's own default utility layer — no dedicated
  `BabylonUtilityLayerManager` (gap).
- **GLTF loader registration**: `import '@babylonjs/loaders/glTF'` side-effect import in
  `BabylonAssetCache.ts`. Correct, minimal.
- **AssetContainer usage**: `LoadAssetContainerAsync` + `instantiateModelsToScene` in
  `BabylonAssetCache.ts`, refcounted via `instanceCount`. No real GLB exists yet to
  exercise this path (every catalogue entry is `glb: null` — confirmed, see
  `assetRegistry.ts`'s own note).
- **Disposal**: `BabylonDisposalManager.ts` groups disposables by string key,
  `disposeGroup`/`disposeAll`. Used for the room shell and per-object mesh groups.
  Not yet used for GLB instance resources (asset cache disposal is separate, not unified
  under one manager — gap, spec §6 wants one lifecycle model).
- **Mesh/texture/material disposal**: tracked per-object via `BabylonDisposalManager`;
  materials created fresh per object (no sharing/instancing — acceptable at ≤25 objects,
  but spec §7's "avoid accidental cross-asset material mutation" doesn't yet apply since
  nothing is shared).
- **Asset caching**: `BabylonAssetCache.ts` keys by `glbPath` only — spec §6 wants
  `assetId + assetVersion + checksum + rendererCompatibilityVersion`. Current key is
  simpler because there is exactly one real GLB source (none) — flagged as a gap to fix
  once real assets exist, not fabricated now.
- **Scene metadata usage**: `TransformNode.metadata = { entityId }` only. No render-role
  tagging yet (this milestone's core deliverable).
- **EntityId mapping**: `BabylonEntityMapper.ts` exists, bidirectional, walks parent
  chain for GLB-child resolution. Correct shape, needs role-filtering added (not a
  rewrite).
- **Pointer/event routing**: `scene.onPointerObservable` in `BabylonPickingService.ts`
  (selection) + Babylon's own camera `attachControl` (orbit) + `GizmoManager`'s internal
  `PointerDragBehavior` (gizmo drag) + manual `window` keydown/keyup (walk mode). Three
  separate pointer-handling paths, not yet unified under one tool-state owner (gap,
  spec §5's "pointer gesture routing must be owned by editor tool state").
- **Multi-canvas/multi-view**: single canvas for 3D. The 2D view is Konva
  (`<canvas>`-based, not SVG) per `RoomEditor2D.tsx`. **Deviation from this spec's §2/§5
  assumption of an SVG 2D plan**: this codebase's 2D editor has always been Konva
  canvas, predating both Babylon migrations. Documented here as a pre-existing
  architectural fact, not something this hardening pass changes — an SVG-plan rewrite is
  out of scope for a Babylon-infrastructure milestone.
- **Babylon GUI usage**: none. 3D object labels use a `DynamicTexture`-on-plane
  (core-only), not `@babylonjs/gui` — deliberate, avoids an extra dependency for one
  label use case.
- **Diagnostic/error boundaries**: `BabylonDiagnostics.ts`'s `watchDeviceLoss` exists;
  no `BabylonErrorBoundary.ts` (gap) — engine-creation failure inside the async IIFE in
  `RoomViewer3D.tsx` has no visible recovery UI today, just a stuck "Starting renderer…"
  label.
- **Performance instrumentation**: none (gap, spec §9 — `BabylonPerformanceMonitor.ts`
  doesn't exist yet).
- **Existing tests**: zero renderer/asset-lifecycle tests — the Babylon layer was built
  and browser-verified but has no `node:test` coverage (gap, this milestone's §11).

## Direct violations found against this spec's rules

1. **No render-role system** — every Babylon node the app creates (room shell, object
   boxes, labels) is equally pickable via `scene.pick`; nothing marks gizmo/overlay/grid
   nodes as excluded. Room-shell meshes (walls/floor/ceiling) are *not* currently
   registered with the entity mapper at all, so they're not selectable today — but
   that's accidental (no `entityId` metadata was ever set on them), not an enforced rule.
   Fixing this properly (explicit role tagging + `isEditorPickable` guard) is the
   milestone's central deliverable.
2. **No pick-proxy separation** — the visible box mesh IS the pick target; there's no
   simplified invisible `EQUIPMENT_PICK_PROXY` separate from `EQUIPMENT_VISUAL`. At
   placeholder-box-only content this is harmless (box IS the visual), but once a real GLB
   with many child meshes loads, picking a small decorative sub-mesh should still resolve
   the same proxy-level footprint, not depend on which triangle was hit.
3. **Camera control ownership is ad hoc** — `orbitCamera.detachControl()`/
   `attachControl()` calls are inlined in `RoomViewer3D.tsx`'s transform-bridge callback,
   not centralized in a `CameraInteractionMode` state machine.
4. **No performance/diagnostic instrumentation** beyond the backend/device-loss status
   pill.

## What's already correct (retain, don't rebuild)

- Async engine factory with real WebGPU feature detection and WebGL fallback.
- GizmoManager instantiated once per viewer, not per selection.
- Store-driven sync (`syncFromStore`) — Babylon never owns canonical transforms; every
  render is a projection of `useRoomLayoutStore`'s state, matching this spec's core
  ownership boundary already.
- Disposal grouping by key, entity mapper's parent-chain walk for GLB-child resolution.
- SVG-vs-canvas 2D plan question is moot for *this* codebase (Konva canvas, pre-existing,
  out of scope) — the boundary that matters here (Babylon never becomes 2D-plan truth)
  already holds because the 2D editor doesn't read from Babylon at all.

## Scope for this hardening pass

Given session/quota constraints, this pass prioritises the spec's core ownership/safety
boundary (render roles + entity/pick hardening + gizmo/utility-layer separation) over
the full 17-file/full-test-matrix build. Camera-controller extraction, performance
monitor, and error boundary are included where cheap; asset-cache key upgrade to the
full `assetId+version+checksum` scheme is deferred until a real GLB exists to key
against (same "don't build for data that doesn't exist yet" call made throughout this
codebase's asset-pipeline work).
