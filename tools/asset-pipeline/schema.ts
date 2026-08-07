// Asset-pipeline registry schema (Phase 1 of the GLB Asset Library build). This is a
// separate, richer superset of the already-shipped runtime registry at
// src/lib/spatial/assetRegistry.ts (13 productIds, reviewedBy: PENDING for all, zero
// real GLBs). That file stays the runtime source of truth the Babylon renderer actually
// loads from; this tools/asset-pipeline/ system is offline sourcing/compliance/Blender
// tooling for building out the full 34-item catalogue this prompt specifies — not
// something Next.js bundles or imports at runtime. Once an item here is production-ready
// (reviewedBy set, glb populated), promoting it into the runtime registry is a data copy,
// not a schema change (see Phase 7's "Integration & QA").
//
// Zod is a new dependency (added this phase) — nothing else in this repo validates
// structured data against a schema at this granularity; JSON.parse + hand-written
// TS interfaces would let a malformed registry entry (missing sourceProvenance, a Tier B
// asset with modifiedForWebGL: false) reach the pipeline silently.

import { z } from 'zod';

export const SOURCING_TIERS = ['A', 'B', 'C', 'D'] as const;
export type SourcingTier = (typeof SOURCING_TIERS)[number];

export const ASSET_CATEGORIES = [
  'regulation-calming',
  'focus-privacy',
  'acoustic-treatment',
  'lighting',
  'movement-vestibular',
  'tactile-proprioceptive',
  'visual-reflective',
  'sound-music-zone',
  'furniture-architectural',
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

// Banned brand-name substrings (Core Principle 1 + Phase 7's QA blocklist). Checked
// case-insensitively against assetId/displayName/tags. "infinity panel" is allowed as a
// generic category term (used in this taxonomy itself) — only literal competitor product
// names are banned, per the prompt's own parenthetical.
export const BANNED_BRAND_SUBSTRINGS = [
  'sensei',
  'senteq',
  'aspire inclusion',
  'sensory guru',
  'helpkidzlearn',
  'borealis',
  'magic room',
  'magic carpet',
] as const;

const sourceProvenanceSchema = z
  .object({
    origin: z.enum(['polyhaven', 'sketchfab', 'cgtrader', 'turbosquid', 'custom-blender']),
    licenseType: z.enum(['CC0', 'CC-BY', 'royalty-free-commercial', 'owned-ip']),
    licenseUrl: z.string(),
    purchaseReceiptId: z.string().nullable(),
    modifiedForWebGL: z.boolean(),
    genericizedFrom: z.string().nullable(),
    // "PENDING" until a human has actually checked the licence and signed off — never
    // fabricated as reviewed by this pipeline (Core Principle: "never fabricate a
    // sourceProvenance record as if an asset were already reviewed").
    reviewedBy: z.string(),
    reviewDate: z.string().nullable(),
  })
  .refine((p) => p.reviewedBy === 'PENDING' || p.reviewDate !== null, {
    message: 'reviewDate is required once reviewedBy is set to a real reviewer',
  });

const sensoryProfileSchema = z.object({
  noiseReduction: z.number().min(0).max(10),
  visualStimulation: z.number().min(0).max(10),
  tactileSupport: z.number().min(0).max(10),
  vestibularSupport: z.number().min(0).max(10),
  proprioceptiveSupport: z.number().min(0).max(10),
  regulationSupport: z.number().min(0).max(10),
});

const accessibilityProfileSchema = z.object({
  wheelchairAccessible: z.boolean(),
  clearanceRequiredMm: z.number().min(0),
});

const anchorSchema = z.object({ x: z.number(), y: z.number(), z: z.number() });
const anchorsSchema = z.object({
  center: anchorSchema,
  front: anchorSchema,
  back: anchorSchema,
  left: anchorSchema,
  right: anchorSchema,
  corners: z.array(anchorSchema).length(4),
});

const lodLevelSchema = z.object({
  glbPath: z.string().nullable(),
  targetTriangles: z.number().int().min(0),
});
const lodSetSchema = z.object({
  lod0: lodLevelSchema,
  lod1: lodLevelSchema,
  lod2: lodLevelSchema,
  lod3: lodLevelSchema,
});

const dimensionsMmSchema = z.object({ width: z.number().positive(), depth: z.number().positive(), height: z.number().positive() });

export const assetRegistryEntrySchema = z
  .object({
    id: z.string().min(1),
    category: z.enum(ASSET_CATEGORIES),
    displayName: z.string().min(1),
    sourcingTier: z.enum(SOURCING_TIERS),
    dimensionsMm: dimensionsMmSchema,
    sensoryProfile: sensoryProfileSchema,
    accessibilityProfile: accessibilityProfileSchema,
    anchors: anchorsSchema,
    lod: lodSetSchema,
    sourceProvenance: sourceProvenanceSchema,
    /** Tier D only — a data-only Sensory Graph node that must never render a mesh. */
    noMeshByDesign: z.boolean(),
  })
  .refine((e) => !BANNED_BRAND_SUBSTRINGS.some((b) => `${e.displayName} ${e.id}`.toLowerCase().includes(b)), {
    message: 'displayName/id contains a banned brand-name substring',
  })
  .refine((e) => e.sourcingTier !== 'D' || e.noMeshByDesign, { message: 'Tier D assets must set noMeshByDesign' })
  .refine((e) => e.sourcingTier === 'D' || !e.noMeshByDesign, { message: 'noMeshByDesign is only valid for Tier D' })
  .refine((e) => !e.noMeshByDesign || (e.lod.lod0.glbPath === null && e.lod.lod1.glbPath === null && e.lod.lod2.glbPath === null && e.lod.lod3.glbPath === null), {
    message: 'Tier D / noMeshByDesign assets must not have any glbPath set',
  })
  .refine((e) => e.sourcingTier !== 'B' || e.sourceProvenance.reviewedBy === 'PENDING' || e.sourceProvenance.modifiedForWebGL, {
    message: 'Tier B asset must have modifiedForWebGL=true before it can be marked reviewed',
  });

export type SourceProvenance = z.infer<typeof sourceProvenanceSchema>;
export type SensoryProfile = z.infer<typeof sensoryProfileSchema>;
export type AccessibilityProfile = z.infer<typeof accessibilityProfileSchema>;
export type Anchor = z.infer<typeof anchorSchema>;
export type Anchors = z.infer<typeof anchorsSchema>;
export type LODSet = z.infer<typeof lodSetSchema>;
export type AssetRegistryEntry = z.infer<typeof assetRegistryEntrySchema>;

export function isProductionReady(entry: AssetRegistryEntry): boolean {
  if (!assetRegistryEntrySchema.safeParse(entry).success) return false;
  if (entry.noMeshByDesign) return entry.sourceProvenance.reviewedBy !== 'PENDING';
  return entry.lod.lod0.glbPath !== null && entry.sourceProvenance.reviewedBy !== 'PENDING';
}
