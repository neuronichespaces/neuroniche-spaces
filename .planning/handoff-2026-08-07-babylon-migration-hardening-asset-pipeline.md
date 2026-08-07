# Session handoff — 2026-08-07

**Date:** 2026-08-07
**Commit:** `86c0047` (local, not yet pushed — branch is ahead of `origin/main` by 9 commits total)
**Repo:** neuroniche-spaces
**Branch:** main

## What happened this session

Four large pasted specs, executed in sequence, each explicitly confirmed with the user
before starting given their size:

1. **3D runtime migration: Three.js/R3F → Babylon.js.** User pasted an "APPROVED 3D
   RUNTIME: BABYLON.JS" directive that explicitly overrode a prior session's audit
   verdict to keep Three.js. Full swap: `src/renderer/babylon/` (engine factory with
   real WebGPU-with-WebGL-fallback, scene/camera/gizmo controllers, entity mapper,
   picking service, disposal manager), `RoomViewer3D.tsx` rewritten on it, four
   obsolete Three.js files deleted, `three`/`@react-three/*` removed from
   `package.json`. Found and fixed a real bug during live verification: Babylon's
   `HemisphericLight.groundColor` defaults to black (unlike Three's uniform ambient
   light), making walls render near-black — fixed in `BabylonSceneController.ts`.

2. **Babylon.js infrastructure hardening.** A follow-up spec asking for render-role
   separation, hardened picking, gizmo/camera controller extraction, error boundary,
   perf monitor. Built the render-role system (`types.ts` — 12 roles, only
   `ARCHITECTURE`/`EQUIPMENT_PICK_PROXY` are selectable), a dedicated invisible pick
   proxy per object (independent of visual complexity), split
   `BabylonGizmoController.ts` out of `BabylonTransformBridge.ts`, added
   `BabylonCameraController.ts` (explicit interaction-mode state machine),
   `BabylonErrorBoundary.ts` (typed init-failure result instead of a stuck status
   pill), `BabylonPerformanceMonitor.ts` (not yet wired to any UI). Deliberately did
   NOT build `BabylonUtilityLayerManager.ts`/`BabylonOverlayManager.ts`/
   `BabylonAssetInstanceManager.ts` — documented why in
   `docs/architecture/babylon-infrastructure-audit.md`'s "Scope for this hardening
   pass" section (ceremony/no behavioural difference, or no 3D overlay content exists
   yet to manage).

   User then asked to close 3 flagged gaps "completely": WebGL-fallback path and
   renderer-failure-state path were verified live via new `?forceWebGL=1`/
   `?forceFail=1` dev query-param hooks; real gizmo mouse-drag interaction was
   attempted via synthetic PointerEvent dispatch (same technique that worked for
   camera orbit) but could not reliably hit a small object from screenshot-guessed
   coordinates — **genuinely still unverified, not silently claimed done**. The
   fourth "gap" (locked/hidden entity fields not existing) required real feature
   work: added `PlacedObject.locked`/`hidden`, store actions, Babylon `setEnabled`
   guard, 2D editor parity (drag/keyboard/Transformer), and `PropertiesPanel.tsx`
   Lock/Hide buttons — verified live (locked an object, pressed `r`, rotation stayed
   at 15° instead of jumping to 30°).

3. **GLB asset-pipeline Phase 1.** A separate spec for a 34-item sensory-equipment
   catalogue (`tools/asset-pipeline/` — offline tooling, not bundled by Next.js,
   distinct from the already-shipped 13-item runtime registry at
   `src/lib/spatial/assetRegistry.ts`). Built `schema.ts` (Zod), `generate-registry.ts`
   (programmatic entry builder, computes anchors from dimensions rather than
   hand-typing them), `asset-registry.json` (34 entries, every one `reviewedBy:
   "PENDING"`, every `glbPath: null`). User then raised a legal-risk concern about the
   6 "Tier B" (paid marketplace) items — reassigned all 6 to Tier C (custom Blender
   builds, owned IP), leaving **zero marketplace-licensing risk anywhere in the
   catalogue** (A=4 CC0, B=0, C=29, D=1).

4. **CAD-grade capability upgrade — Milestone 0 only.** A third large spec (7
   structural gaps: dual-view sync, precision input, blocks/templates, layers,
   advanced selection, annotations/sections, collaboration/audit). Wrote
   `docs/architecture/cad-gap-audit.md` (honest gap-by-gap status against the actual
   codebase) and `cad-upgrade-plan.md` (10-milestone plan adapted to this repo, with
   Milestone 1 fully scoped: wall selection + numeric wall inspector + command
   id/description fields). **Did not start Milestone 1 implementation** — quota ran
   critically low (session context ballooned to ~290k+ tokens from the three prior
   specs, making every subsequent tool call disproportionately expensive) and
   starting a multi-file feature with no safety margin risked a broken, unverified
   half-state. Stopped at the last clean, fully-tested boundary instead.

## Also completed earlier in the session (before the four specs above)

- Milestone 4 completion: keyboard resize/rotate for 2D objects (`R`/`Shift+R`
  rotate, `[`/`]`/`Shift+[`/`Shift+]` resize) — the deferred half of a prior
  session's numeric-room-dimensions milestone.

## Verification state as of the last commit

- `npm run build`: clean.
- `node --test "src/**/*.test.ts"`: 123/123 pass.
- `eslint`: 0 issues in every file touched this session (12 pre-existing errors
  remain in unrelated pages — costing/audit/training/business-case/organisations/
  A11yProvider/ErrorBoundary — unchanged all session, not this work's concern).
- Multiple live browser verifications via chrome-devtools MCP this session: WebGPU
  backend detection, WebGL forced-fallback, renderer failure state, the lighting
  fix, orbit-camera drag/zoom, click-to-select through the hardened picking layer,
  and the lock/hide keyboard-guard round-trip.

## Honest known gaps (not hidden, see the relevant milestone-doc entries for detail)

- Real mouse-drag gizmo interaction (actually dragging a gizmo handle with the
  pointer) has never been click-tested by automation — same canvas-pixel-drag
  limitation logged for the 2D Konva editor all session. A manual click-through in
  a real browser is still owed before fully trusting gizmo drag end-to-end.
- Escape-cancel-mid-gizmo-drag isn't wired (parity with the prior Three.js
  implementation, not a new regression — documented in
  `BabylonTransformBridge.ts`'s header comment).
- `BabylonPerformanceMonitor.ts` exists but isn't wired into any UI yet (no perf HUD
  exists in this app).
- GLB loading path is real, working, load-by-productId code exercised by zero real
  data — every catalogue entry (both the runtime 13-item registry and the new
  34-item pipeline registry) has `glb: null`/`glbPath: null`. No actual `.glb` files
  exist anywhere in this repo yet.
- CAD-upgrade Milestone 1 (wall selection + numeric wall inspector) is scoped in
  `docs/architecture/cad-upgrade-plan.md` but **not implemented**.

## Next session should start with

Pick up `docs/architecture/cad-upgrade-plan.md`'s Milestone 1 scope directly — it's
fully specified (files to add/change, acceptance criteria, explicitly-excluded scope).
Alternatively, the two "not silently dropped" items above (manual gizmo-drag
click-through verification; `BabylonUtilityLayerManager.ts`/overlay-manager if 3D
overlay content is ever added) are smaller, bounded follow-ups if a full new milestone
isn't wanted.

Not yet pushed to `origin/main` — branch is 9 commits ahead. Push was not requested
this session.
