# Session handoff — 2026-08-10 (CAD-gap closure + NeuroNiche ND-enhancement start)

**Last commit:** `b8a2d85`

## What happened this pass

1. **Closed every remaining item in `docs/architecture/cad-gap-audit.md`** except two
   explicitly out-of-scope items (Konva→SVG 2D-renderer rewrite — multi-session; live
   Supabase verification — no live project in this dev environment). Commits, in order:
   - `649e583` — view states, orthographic camera, linked block instances, batch
     editing extended to zones/walls/dimensions
   - `99841ef` — agent roster (`.claude/agents/`) + harness dispatch-gap fix (see below)
   - `c14cc82` — cross-type multi-select, Quick-Select filtering, saved selection sets;
     block versioning/nesting/click-to-place
   - `47aee91` — zone width/length dynamic overlay + mid-drag entry re-audit
   - `a5b2eb4` — section-box preview, frame/reset view, 2D↔3D sync test
   - `a61651d` + `35b492d` — revision clouds, section lines, generated section views,
     leaders on export, export metadata, drawing sheets

2. **Fixed a real platform gap**: this harness's `Agent` tool doesn't dispatch
   `.claude/agents/*.md` project subagents (only `ecc:*`/`gsd:*`/built-ins resolve) —
   confirmed via a hard error, not assumed. Added a `UserPromptSubmit` hook
   (`.claude/settings.json`) that reinjects the correct workaround every prompt: read
   the matched agent `.md` and follow it inline as that persona, since dispatch-by-name
   fails here. Verified firing on every subsequent prompt this session.

3. **Started a new ND-enhancement pass** (per user's "existing codebase, additive-only"
   brief covering 2D/3D flow, snapping, ND object attributes, scene presets, templates,
   a11y, versioning, export, performance). Did the audit + prioritized plan first (see
   below), then built **item #1 only** before quota ran out:
   - `b8a2d85` — Scene lighting presets (Calm/Active/Assessment). New isolated module
     `src/renderer/babylon/scenePresets.ts` — mutates the existing named `'ambient'`/
     `'sun'` lights via `scene.getLightByName`, no change to
     `BabylonSceneController.ts`'s `createLights()`. Toggle buttons wired into
     `RoomViewer3D.tsx`'s 3D-view controls, additive/opt-in (`null` = untouched default
     lighting). No dedicated tests added for this one — flagged honestly, not silently
     skipped, due to quota running out immediately after.

## Verified state at handoff

`npm run build` clean, `npx tsc --noEmit` clean (only 4 pre-existing unrelated errors
in `src/lib/export/report.test.ts`, unchanged all session), 149/149 `node --test` pass.
13 pre-existing lint *errors* remain in unrelated pages (unchanged); lint *warnings*
grew by 2 in `validate.test.ts` following that file's own pre-existing unfixed
destructure-to-omit pattern for the two new entity types.

## Audit + prioritized plan for the ND-enhancement brief (not yet built beyond #1)

Full audit is in the conversation, not yet copied into a doc file — summary:

| # | Item | Tag | Status |
|---|---|---|---|
| 1 | Scene presets (Calm/Active/Assessment) | ADD | **Done, `b8a2d85`** |
| 2 | Camera-pose preservation across 2D↔3D toggle | EXTEND | Not started — reuse this session's `CameraApi`/`ViewState` machinery |
| 3 | High-contrast theme toggle | ADD | Not started — extend `A11yProvider.tsx` (reduced-motion already exists there and is wired into 3D) |
| 4 | Version-history checkpoint UI | EXTEND | Not started — undo/redo history + command IDs already exist in `store.ts`, just needs a browsable/named checkpoint UI beyond `CommandHistoryPanel.tsx` |
| 5 | Remaining templates (hospital waiting room, airport sensory room, workplace quiet pod) + scenario-circuit overlay layer (Alerting→Organising→Calming) | ADD | Not started — largest single item, do last |
| 6 | Live clearance-radius ring while dragging | EXTEND | Not started — smaller polish |

**Already existed, correctly identified as NOT gaps** (don't rebuild these): ND object
attributes (`brightness`/`colourTempK`/`noiseLevelDb`/`SensoryImpact` already on
`PlacedObjectProps`/`types.ts`), PDF export + CSV BOM export (`PrintableExport.tsx`/
`bom.ts` already fully built), 5 of 6 named templates already exist in `templates.ts`.

## Next session

1. Copy the audit table above (and the full prose audit from this conversation, if
   still available) into a proper doc — `docs/architecture/` or `.planning/` — before
   starting more work, so it survives context loss cleanly (this handoff is the only
   copy right now).
2. Continue down the priority list, items #2–#6, same incremental-commit-per-item
   discipline as this session.
3. Watch quota — this session hit ~15% remaining mid-item and had to stop; budget
   accordingly, especially item #5 which is the largest.
