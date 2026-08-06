# Handoff — 2026-08-06 (CAD milestone: GLB registry, Supabase wiring, 3D gizmo, dimension input)

**Commit:** `785026f` — clean, `npm run build` passes, `node --test` (full suite) 118/118 pass.

## What actually happened this session

1. **2D resize/rotate gizmo** (Konva `Transformer`) — verified live in browser, works.
2. **GLB asset registry** — schema/validator/compliance report for the 13 real productIds
   templates place. Zero real `.glb` files exist (confirmed, none in `public/`) — every
   registry entry is `glb: null`. Loader-by-id branch is real code in `ObjectMesh3D.tsx`,
   just unexercised until a real file is registered.
3. **Wired `/spatial` to Supabase for real.** Found it had zero DB persistence before this
   (localStorage-only, despite `room_layouts`/`placed_objects` tables existing since an
   earlier phase). New migration `0010_spatial_supabase_wiring.sql` adds
   `room_layouts.zones_json` (zones had no column at all) and `products.slug` + 13 seed
   rows (placed objects' `productId` slugs had no matching `products` row, so no object
   could ever have saved). **Not applied to any live Supabase project yet** — that's on
   the user, next session or whenever they're ready.
4. **Phase 6 finding**: RBAC/multi-tenancy was already fully built (`0004_memberships_and_rls.sql`)
   — the milestone doc's "Phase 6 not started" note was stale. The real gap was #3 above.
5. **A separate, much larger 10-foundation "rebuild the CAD platform" prompt was pasted**,
   emphasizing Babylon.js. Followed the prompt's own literal process (audit first, no
   blind rebuild) rather than executing it wholesale — see
   `docs/architecture/current-state-audit.md` and `foundation-plan.md`. **Verdict: keep
   Three.js/R3F.** The prompt's own condition ("don't replace a well-implemented
   Three.js architecture") is satisfied — audit found nothing blocking on the current
   stack. User asked about Babylon.js again later in the session; same answer given,
   not re-litigated, no code changed on that basis.
6. **Milestone 3** (from the foundation plan): 3D click-to-select + `<TransformControls>`
   gizmo in `ObjectMesh3D.tsx`/`RoomViewer3D.tsx`. Same store actions the 2D gizmo uses.
7. **Milestone 4 (scoped down under quota pressure, said so at the time)**: numeric room
   width/length editing (`units.ts`, `RoomDimensionsPanel.tsx`) — verified live, both the
   happy path (`"420cm"` → `4.20m`, canvas resizes) and the validation path (garbage
   input → red border + plain-language error, nothing silently clamped). Keyboard
   resize/rotate for objects (the other half of Milestone 4) was explicitly deferred,
   not done — flag this if picking Milestone 4 back up.

## What's verified live vs. build-only — read this before trusting anything blindly

**Verified in an actual browser this session** (chrome-devtools MCP): 2D gizmo + on-canvas
measurement label, heatmap overlay, persona selector, 3D mode-toggle UI + zero new console
errors, room-dimension text inputs (both valid and invalid input paths).

**NOT verified live — build/typecheck/tests pass, that's it:**
- 3D click-to-select and the 3D `TransformControls` drag itself. Same tooling ceiling as
  the 2D gizmo initially had: the available browser automation clicks/drags DOM elements
  by accessibility-tree id, not canvas pixel coordinates, and the 3D view is one single
  WebGL `<canvas>` (2D's Konva layers at least gave multiple canvas elements to reason
  about, still not pixel-clickable, but same root limitation). A real manual click-through
  is owed here before fully trusting it.
- The entire Supabase wiring (`persistence.ts`, the migration) — no live DB connected in
  this session. Migration hasn't been applied anywhere.

## Immediate next steps for whoever picks this up

1. **User needs to apply `supabase/migrations/0010_spatial_supabase_wiring.sql`** to their
   actual Supabase project before the persistence wiring means anything. Not something I
   can do from here (no DB creds, and applying migrations to a live project needs asking
   first per the user's standing rules anyway).
2. **Manual click-through owed**: 3D select + drag-to-move/rotate, and while at it the 2D
   zone/wall drawing tools (flagged as unverified in an earlier session too, still true).
3. Foundation plan recommends Milestone 7 (accessibility semantic tree) next, or finishing
   Milestone 4's deferred keyboard-resize-parity half. Neither started.

## Why this handoff exists

Session quota ran critically low near the end (dropped from "fine" to "may run dry within
the hour" over about 45 minutes of active building) — stopped deliberately rather than
starting Milestone 7 and risking a half-finished feature if quota cut out mid-edit. This
doc plus the milestone doc's own dated entries should be enough for a cold-start pickup.
