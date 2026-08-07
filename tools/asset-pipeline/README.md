# GLB Sensory-Equipment Asset Pipeline — Phase 1

Offline sourcing/compliance/build tooling for the 34-item sensory-equipment catalogue.
Separate from `src/lib/spatial/assetRegistry.ts` (the app's runtime registry, 13
productIds actually placed by templates today) — this directory is not imported by
Next.js; it's where the catalogue gets sourced, validated, and built before anything
here is promoted into the runtime registry.

## What Phase 1 built

- `schema.ts` — Zod schema + inferred TypeScript types for `AssetRegistryEntry`,
  `SourceProvenance`, `SensoryProfile`, `AccessibilityProfile`, `Anchors`, `LODSet`.
  Enforces the core rules: every entry needs a `sourceProvenance`; Tier D entries must
  set `noMeshByDesign` and carry no `glbPath`; Tier B entries can't be marked reviewed
  without `modifiedForWebGL: true`; displayName/id is checked against a banned
  brand-name substring list.
- `generate-registry.ts` — builds all 34 seed assets (anchors computed from
  `dimensionsMm`, not hand-typed), validates every entry against the schema, writes
  `asset-registry.json`. Re-run with `node tools/asset-pipeline/generate-registry.ts`
  after editing `SEED_ITEMS` or the category sensory baselines.
- `asset-registry.json` — the 34 entries. Tier breakdown: **A=4, B=0, C=29, D=1**.
  Tier B (paid marketplace/licensed assets) is deliberately empty — after a legal-risk
  check, the 6 geometrically complex items originally slated for Tier B (pods, booths,
  trampoline, ball pit, sensory swing) were reassigned to Tier C custom Blender builds
  instead, eliminating any marketplace-licensing/"substantially modified" judgment call
  from the catalogue entirely. Tier A stays CC0-only (zero risk by definition); Tier D
  is the one data-only sound-coverage-zone.

## Honest status — every entry is PENDING

Every single entry's `sourceProvenance.reviewedBy` is `"PENDING"` and every `glbPath`
is `null`. Nothing here is production-ready yet. `sensoryProfile`/`accessibilityProfile`
values are **category-level baselines** with a handful of item-specific overrides where
the default was obviously wrong (e.g. `bubble-tube-01` overrides `visualStimulation` to
9) — real per-item scoring is explicitly Phase 5's job, not this one.

## What a human must do before Phase 2 can fully complete

Phase 2 (sourcing/compliance CLI) can be built without this, but the checklist rows it
produces are only useful once a human actually:

1. Searches Poly Haven / Sketchfab (CC0 filter) for the 4 Tier A items
   (`mirror-panel-01`, `standing-desk-01`, `task-chair-01`, `storage-cabinet-01`) and
   confirms a real CC0 match exists close to the target dimensions.
2. Downloads Poly Haven CC0 PBR textures for the 29 Tier C Blender scripts (Phase 3) to
   reference — none are downloaded yet; Phase 3's scripts will list exact expected
   filenames/paths as placeholders when written.

No marketplace purchases are needed at all — Tier B is empty by deliberate choice (see
above), so there's no licensing/genericization review step in this pipeline anymore.

Nothing in this repo currently uses `tools/asset-pipeline/`'s output — it exists to be
picked up by Phase 2 onward when that work is scheduled.
