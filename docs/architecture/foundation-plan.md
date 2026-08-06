# Foundation Plan — Spatial Design Engine

Companion to `current-state-audit.md`. Framework decision made there (keep Three.js/R3F —
per the source prompt's own "don't replace a well-implemented Three.js architecture"
condition, confirmed satisfied by the audit). This doc sequences the real remaining gaps
into the prompt's milestone order, adapted to what's already built rather than a from-zero
plan — most of Milestones 1, 3, 5's infrastructure already exists.

Each milestone below is sized as its own future session (or several) — this doc is the
plan, not the implementation. Scope, cost, and quota were flagged as a real constraint
before this was written (session already ~$24, quota "hot burner" warnings active); no
milestone should be started without confirming it's still the priority when picked up.

## Milestone 1: Model and persistence — mostly done, real gaps are narrow

Existing: `types.ts` (entity types), `store.ts` (mutation layer + validation via
`clearance.ts`), `hydrateFromLocalStorage`/Supabase `persistence.ts` (save/load).

Remaining:
- Add `schemaVersion` to the persisted `RoomLayout` shape + a migration hook (currently:
  none — old-shape payloads are silently discarded, per `store.ts`'s own comment).
- Decide mm vs. m: the codebase deliberately chose metres (documented, cross-file
  decision, reverted once already when a second unit convention was tried). Recommend
  **keeping metres** — rewriting every spatial file's unit convention for zero functional
  gain repeats a mistake this codebase already reverted once. Flag as an explicit
  deviation from the source prompt rather than silently complying.
- Add missing entity kinds if actually needed: window (door exists, window doesn't),
  ceiling, material reference. Add only when a real feature needs one (YAGNI — don't
  pre-add unused entity kinds).

## Milestone 2: Command architecture — real, scoped refactor

Current `store.ts` undo/redo is whole-state-snapshot based (works, tested, but not
per-operation commands). To get the prompt's `EditorCommand.execute/undo/describe`
pattern:
- Introduce an `EditorCommand` interface and convert each existing mutator
  (`moveObject`, `rotateObject`, `updateObjectProps`, `addWall`, etc.) into a command
  object instead of an inline closure.
- Keep the snapshot-based `past`/`future` arrays as the *storage*, but have each entry
  carry a `describe()` string (e.g. "Move Cocoon Chair") for undo/redo UI — smallest
  change that satisfies the prompt's UX requirement without a full command-object
  rewrite of every mutation.
- A **full** per-operation command rewrite (replacing snapshots entirely) is a larger,
  higher-risk change for marginal benefit at this app's scale (≤25 objects/room) — the
  audit found no bug or limitation the snapshot approach actually causes. Recommend the
  lighter "add describe() metadata" version unless a concrete need for true command
  composability shows up.

## Milestone 3: Synchronized views — 3D picking/gizmo is the real gap

2D is functionally complete (selection, drag+snap, resize/rotate gizmo, verified live
this session). 3D has zero interaction beyond camera orbit.
- Add click-to-select on 3D meshes (`onClick` + raycasting, native R3F capability,
  `ObjectMesh3D.tsx`'s `ObjectBox` already has the right per-object boundary).
- Add `@react-three/drei`'s `<TransformControls>` for 3D move/rotate, wired to the same
  `store.moveObject`/`rotateObject` actions the 2D gizmo already calls — this is the
  "one command layer, two renderers" principle already established, just extended to 3D.
- Suspend `OrbitControls` while `TransformControls` is actively dragging (drei documents
  this exact pattern — `makeDefault`/`enabled` toggling).

## Milestone 4: CAD interaction — dimension editing + keyboard parity

- Numeric room/wall dimension inputs with unit-string parsing (`"4.2m"`, `"420cm"`,
  plain number = metres) — new, doesn't exist. `PropertiesPanel.tsx` already has the
  per-object numeric-slider pattern to extend from.
- Keyboard equivalents for resize/rotate (currently mouse-only via the Konva
  `Transformer`) — extend the existing Tab-select + arrow-move keydown handler in
  `RoomEditor2D.tsx` with resize/rotate modifier-key combos.

## Milestone 5: Asset catalogue — infrastructure done, assets themselves blocked

`assetRegistry.ts` (schema, validator, compliance report) and the `ObjectMesh3D.tsx`
load-by-id branch are built and tested (this session). What's blocked, and why it stays
blocked without new information:
- Real GLB models need either (a) actual licensed downloads from Poly Haven/Sketchfab/
  CGTrader with human licence review, or (b) Blender automation run in a real Blender
  environment — neither exists in this session's tooling. This isn't a code gap, it's a
  content-sourcing gap requiring the user's own action (see the dedicated GLB spec doc,
  `.planning/GLB-Asset-Library-Master-Prompt-Claude-Sonnet.md`).

## Milestone 6: Professional interface — real redesign, not started

Current UI is functional (tool buttons, dropdowns, properties panel) but not the
tool-rail/catalogue-panel/inspector/status-bar shell the prompt specifies. This is a
genuine UI rebuild of `spatial/page.tsx` and its component layout — sequencing note:
do this **after** Milestones 3/4 land (3D gizmo, numeric dimension editing), since the
new shell needs to host both.

## Milestone 7: Accessibility — partial, needs a real semantic layer

Existing: keyboard nudge (verified), reduced-motion setting, labelled buttons.
Missing: a semantic object tree (list of rooms/walls/zones/objects as real DOM/ARIA
tree, not just the canvas), live-region announcements for spatial actions ("Moved
Cocoon Chair", "Deleted Acoustic Panel"), and non-pointer resize/duplicate. This is
real, scoped, buildable work — a `<RoomObjectTree>` component reading the same store,
alongside `aria-live` regions wired into the existing mutator calls.

## Milestone 8: Sensory metadata — extend, don't rebuild

`SensoryImpact`/`scoring.ts`/`constraints.ts`/`persona.ts` are a real, tested,
non-diagnostic foundation. Gap: violations/scores don't carry the prompt's full
`Finding` shape (confidence, sourceType, evidenceReferences, dismissable/annotatable
state). Extend `constraints.ts`'s violation type with those fields rather than
building a parallel findings system.

**Flag for the user, not a code change**: `persona.ts`'s persona names ("Autistic
Adult", "ADHD Adult") read closer to diagnostic categories than the source prompt's
preference-dimension model (`soundSensitivity: 1-5` etc, no diagnostic labels at all).
This was a deliberate choice in an earlier session (matches product docs' plain-language
approach for a non-clinical audience) but is worth an explicit decision, not a silent
rename either way — raise before touching `persona.ts`.

## Milestone 9: Performance and hardening — not started, needs real instrumentation

No load-time/frame-time/memory-growth measurement exists yet. Smallest real first step:
add dev-mode `performance.now()` instrumentation around model load and drag-interaction
latency, not a full profiling suite, until a concrete perf problem is observed (no
evidence of one yet at this app's object-count scale).

## Sequencing recommendation

Milestones 3 → 4 → 7 are the highest product value for the lowest risk (3D parity with
the already-working 2D, then numeric/keyboard accessibility) and don't depend on
external blockers (unlike Milestone 5's asset sourcing) or large UI risk (unlike
Milestone 6). Recommend that order when a future session picks this up, but the actual
next milestone should be confirmed with the user first, same as every other piece of
work this session — not assumed from this plan alone.
