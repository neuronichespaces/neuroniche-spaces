// GLB Asset Registry (spec: .planning/GLB-Asset-Library-Master-Prompt-Claude-Sonnet.md, Phase 1/2/7).
// Scope decision: that spec's Phases 3/4 (Blender automation, marketplace ingestion) need a real
// Blender environment and actually-downloaded/purchased marketplace files — neither exists in this
// repo (confirmed: zero .glb files under public/). Generating untested bpy scripts nobody can run
// yet is exactly the "scaffolding for later" this codebase avoids elsewhere. What's built here is
// the part that's real code today: the registry schema, its validator/compliance report, and a
// load-by-assetId lookup — so the day a real .glb file lands, wiring it in is a one-line registry
// edit, not an architecture change.
//
// Reuses productId as the id space (matches PlacedObject.productId / sensoryLibrary.ts's keys)
// rather than inventing a second `assetId` namespace — same reasoning as this file's neighbours.

export type SourcingTier = 'A' | 'B' | 'C' | 'D';

export type SourceProvenance = {
  origin: 'polyhaven' | 'sketchfab' | 'cgtrader' | 'turbosquid' | 'custom-blender' | null;
  licenseType: 'CC0' | 'CC-BY' | 'royalty-free-commercial' | 'owned-ip' | null;
  licenseUrl: string | null;
  purchaseReceiptId: string | null;
  modifiedForWebGL: boolean;
  genericizedFrom: string | null;
  /** "PENDING" until a human has actually checked the licence and signed off. Never fabricated as reviewed. */
  reviewedBy: string;
  reviewDate: string | null;
};

export type LODLevel = { glbPath: string; maxTriangles: number };
export type LODSet = { lod0: LODLevel; lod1?: LODLevel; lod2?: LODLevel; lod3?: LODLevel };

export type AssetRegistryEntry = {
  productId: string;
  category: string;
  displayName: string;
  sourcingTier: SourcingTier;
  sourceProvenance: SourceProvenance;
  /** Tier D only: a data-only sensory-graph node (e.g. a sound-coverage zone) that must never render a mesh. */
  noMeshByDesign: boolean;
  /** null until an actual GLB has been sourced/built and reviewed — true for every entry today. */
  glb: LODSet | null;
};

const PENDING_PROVENANCE: SourceProvenance = {
  origin: null,
  licenseType: null,
  licenseUrl: null,
  purchaseReceiptId: null,
  modifiedForWebGL: false,
  genericizedFrom: null,
  reviewedBy: 'PENDING',
  reviewDate: null,
};

function pending(productId: string, category: string, displayName: string, sourcingTier: SourcingTier): AssetRegistryEntry {
  return {
    productId,
    category,
    displayName,
    sourcingTier,
    sourceProvenance: PENDING_PROVENANCE,
    noMeshByDesign: false,
    glb: null,
  };
}

// The 13 productIds are the only ones actually placed by templates.ts today (see sensoryLibrary.ts's
// own note on this being the one real id space in the app). Registry entries for the other ~21 items
// in the spec's taxonomy would be speculative — nothing in the app would ever look them up — so they're
// not added until a template actually places one, same call the spec's Phase 1 would make with real data.
export const ASSET_REGISTRY: Record<string, AssetRegistryEntry> = {
  'bean-bag-large': pending('bean-bag-large', 'regulation-calming', 'Bean Bag', 'C'),
  'dimmable-floor-lamp': pending('dimmable-floor-lamp', 'lighting', 'Dimmable Floor Lamp', 'C'),
  'weighted-lap-pad': pending('weighted-lap-pad', 'regulation-calming', 'Weighted Lap Pad', 'C'),
  'indoor-swing-frame': pending('indoor-swing-frame', 'movement-vestibular', 'Indoor Swing Frame', 'B'),
  'crash-mat': pending('crash-mat', 'movement-vestibular', 'Crash Mat', 'C'),
  'balance-beam-low': pending('balance-beam-low', 'movement-vestibular', 'Low Balance Beam', 'C'),
  'sensory-shelf-unit': pending('sensory-shelf-unit', 'furniture', 'Sensory Shelf Unit', 'A'),
  'noise-reducing-panel': pending('noise-reducing-panel', 'acoustic-treatment', 'Noise Reducing Panel', 'C'),
  'flexible-seating-cube': pending('flexible-seating-cube', 'furniture', 'Flexible Seating Cube', 'C'),
  'fidget-tool-bin': pending('fidget-tool-bin', 'regulation-calming', 'Fidget Tool Bin', 'A'),
  'bubble-tube-column': pending('bubble-tube-column', 'lighting', 'Bubble Tube Column', 'C'),
  'projector-calm-scenes': pending('projector-calm-scenes', 'lighting', 'Calm Scenes Projector', 'B'),
  'tactile-wall-panel-set': pending('tactile-wall-panel-set', 'tactile-proprioceptive', 'Tactile Wall Panel Set', 'C'),
};

const BRAND_BLOCKLIST = [
  'sensei',
  'senteq',
  'aspire inclusion',
  'sensory guru',
  'helpkidzlearn',
  'magic carpet',
  'magic room',
];

/** Structural + licensing-rule validation (spec Phase 7's QA rules). Doesn't check the licence is actually valid — that's the human review `reviewedBy` gates. */
export function validateAssetEntry(entry: AssetRegistryEntry): string[] {
  const errors: string[] = [];

  if (entry.noMeshByDesign && entry.sourcingTier !== 'D') {
    errors.push(`${entry.productId}: noMeshByDesign is only valid for Tier D`);
  }
  if (entry.sourcingTier === 'D') {
    if (!entry.noMeshByDesign) errors.push(`${entry.productId}: Tier D assets must set noMeshByDesign`);
    if (entry.glb !== null) errors.push(`${entry.productId}: Tier D (data-only) assets must not have a glb reference`);
  }
  if (entry.sourcingTier === 'B' && entry.glb !== null && !entry.sourceProvenance.modifiedForWebGL) {
    errors.push(`${entry.productId}: Tier B asset must have modifiedForWebGL=true before use`);
  }

  const haystack = `${entry.displayName} ${entry.productId}`.toLowerCase();
  for (const banned of BRAND_BLOCKLIST) {
    if (haystack.includes(banned)) errors.push(`${entry.productId}: banned brand-name substring "${banned}"`);
  }

  return errors;
}

export function isProductionReady(entry: AssetRegistryEntry): boolean {
  if (validateAssetEntry(entry).length > 0) return false;
  if (entry.noMeshByDesign) return entry.sourceProvenance.reviewedBy !== 'PENDING';
  return entry.glb !== null && entry.sourceProvenance.reviewedBy !== 'PENDING';
}

/** Load-by-id, never by filename, per the spec's core principle. */
export function getAssetEntry(productId: string): AssetRegistryEntry | undefined {
  return ASSET_REGISTRY[productId];
}

export type ComplianceReport = {
  total: number;
  byTier: Record<SourcingTier, number>;
  productionReady: number;
  pendingReview: string[];
  invalid: { productId: string; errors: string[] }[];
};

/** Spec Phase 2/7's compliance report, minus the CLI wrapper — this is the pure function a CLI or a future admin UI would both call. */
export function complianceReport(entries: AssetRegistryEntry[] = Object.values(ASSET_REGISTRY)): ComplianceReport {
  const byTier: Record<SourcingTier, number> = { A: 0, B: 0, C: 0, D: 0 };
  const pendingReview: string[] = [];
  const invalid: { productId: string; errors: string[] }[] = [];
  let productionReady = 0;

  for (const entry of entries) {
    byTier[entry.sourcingTier]++;
    const errors = validateAssetEntry(entry);
    if (errors.length > 0) invalid.push({ productId: entry.productId, errors });
    if (isProductionReady(entry)) productionReady++;
    else if (entry.sourceProvenance.reviewedBy === 'PENDING') pendingReview.push(entry.productId);
  }

  return { total: entries.length, byTier, productionReady, pendingReview, invalid };
}
