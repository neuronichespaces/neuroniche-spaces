// Phase 1 deliverable: generates asset-registry.json for all 34 seed assets, each
// PENDING review (Core Principle: never fabricate a reviewed sourceProvenance). Anchors
// are computed from dimensionsMm rather than hand-typed per asset — a box-footprint
// convention (center at origin, front/back along depth, left/right along width, 4 top
// corners) that's correct for every item in this seed set; genuinely non-box items
// (sensory-swing-01's hanging envelope) get the same convention applied to their bounding
// envelope, which is what anchors are for (attachment/approach points, not visual truth).
//
// sensoryProfile/accessibilityProfile values here are category-level baselines with a
// few item-specific overrides where the default would be obviously wrong (e.g. a bubble
// tube needs high visualStimulation regardless of its "lighting" category average) —
// Phase 5 of the source prompt explicitly scopes real per-item refinement as later work;
// Phase 1's job is a fully-shaped, schema-valid registry, not final scoring.

import { writeFileSync } from 'node:fs';
import { assetRegistryEntrySchema, type AssetCategory, type AssetRegistryEntry, type SensoryProfile, type SourcingTier } from './schema.ts';

type Dims = { width: number; depth: number; height: number };

type SeedItem = {
  id: string;
  category: AssetCategory;
  displayName: string;
  tier: SourcingTier;
  dims: Dims;
  large?: boolean; // pods/booths/etc — 15k LOD0 budget instead of 5k
  wheelchairAccessible?: boolean; // default true
  sensoryOverride?: Partial<SensoryProfile>;
  noMeshByDesign?: boolean;
};

const CATEGORY_SENSORY_BASELINE: Record<AssetCategory, SensoryProfile> = {
  'regulation-calming': { noiseReduction: 3, visualStimulation: 3, tactileSupport: 6, vestibularSupport: 5, proprioceptiveSupport: 6, regulationSupport: 9 },
  'focus-privacy': { noiseReduction: 6, visualStimulation: 2, tactileSupport: 2, vestibularSupport: 0, proprioceptiveSupport: 1, regulationSupport: 7 },
  'acoustic-treatment': { noiseReduction: 9, visualStimulation: 1, tactileSupport: 3, vestibularSupport: 0, proprioceptiveSupport: 0, regulationSupport: 5 },
  lighting: { noiseReduction: 0, visualStimulation: 8, tactileSupport: 0, vestibularSupport: 0, proprioceptiveSupport: 0, regulationSupport: 6 },
  'movement-vestibular': { noiseReduction: 0, visualStimulation: 2, tactileSupport: 4, vestibularSupport: 9, proprioceptiveSupport: 8, regulationSupport: 5 },
  'tactile-proprioceptive': { noiseReduction: 0, visualStimulation: 1, tactileSupport: 9, vestibularSupport: 2, proprioceptiveSupport: 8, regulationSupport: 6 },
  'visual-reflective': { noiseReduction: 0, visualStimulation: 7, tactileSupport: 0, vestibularSupport: 0, proprioceptiveSupport: 0, regulationSupport: 4 },
  'sound-music-zone': { noiseReduction: 0, visualStimulation: 2, tactileSupport: 0, vestibularSupport: 0, proprioceptiveSupport: 0, regulationSupport: 5 },
  'furniture-architectural': { noiseReduction: 1, visualStimulation: 1, tactileSupport: 2, vestibularSupport: 0, proprioceptiveSupport: 1, regulationSupport: 2 },
};

const SEED_ITEMS: SeedItem[] = [
  // 1. Regulation & Calming
  { id: 'sensory-swing-01', category: 'regulation-calming', displayName: 'Sensory Swing', tier: 'C', dims: { width: 1200, depth: 1200, height: 2200 }, large: true, wheelchairAccessible: false },
  { id: 'compression-chair-01', category: 'regulation-calming', displayName: 'Compression Chair', tier: 'C', dims: { width: 700, depth: 700, height: 1100 } },
  { id: 'beanbag-01', category: 'regulation-calming', displayName: 'Bean Bag', tier: 'C', dims: { width: 900, depth: 900, height: 700 } },
  { id: 'weighted-blanket-station-01', category: 'regulation-calming', displayName: 'Weighted Blanket Station', tier: 'C', dims: { width: 1200, depth: 900, height: 400 } },
  { id: 'rocking-chair-01', category: 'regulation-calming', displayName: 'Rocking Chair', tier: 'C', dims: { width: 650, depth: 800, height: 1000 }, wheelchairAccessible: false },
  { id: 'calm-corner-composite-01', category: 'regulation-calming', displayName: 'Calm Corner Composite', tier: 'C', dims: { width: 1800, depth: 1800, height: 1600 }, large: true },
  { id: 'fidget-station-01', category: 'regulation-calming', displayName: 'Fidget Station', tier: 'C', dims: { width: 600, depth: 400, height: 900 } },
  // 2. Focus & Privacy
  { id: 'quiet-pod-01', category: 'focus-privacy', displayName: 'Quiet Pod', tier: 'C', dims: { width: 1400, depth: 1400, height: 2000 }, large: true },
  { id: 'focus-pod-01', category: 'focus-privacy', displayName: 'Focus Pod', tier: 'C', dims: { width: 1600, depth: 1200, height: 2100 }, large: true },
  { id: 'privacy-screen-01', category: 'focus-privacy', displayName: 'Privacy Screen', tier: 'C', dims: { width: 1200, depth: 30, height: 1600 } },
  { id: 'desk-divider-01', category: 'focus-privacy', displayName: 'Desk Divider', tier: 'C', dims: { width: 600, depth: 20, height: 400 } },
  // 3. Acoustic Treatment
  { id: 'acoustic-panel-fabric-01', category: 'acoustic-treatment', displayName: 'Acoustic Fabric Panel', tier: 'C', dims: { width: 1200, depth: 50, height: 600 } },
  { id: 'sound-curtain-01', category: 'acoustic-treatment', displayName: 'Sound Curtain', tier: 'C', dims: { width: 1500, depth: 100, height: 2400 } },
  { id: 'noise-booth-01', category: 'acoustic-treatment', displayName: 'Noise Booth', tier: 'C', dims: { width: 1000, depth: 1000, height: 2100 }, large: true },
  { id: 'sound-rug-01', category: 'acoustic-treatment', displayName: 'Sound-Dampening Rug', tier: 'C', dims: { width: 1500, depth: 1000, height: 20 } },
  // 4. Lighting
  { id: 'task-light-01', category: 'lighting', displayName: 'Task Light', tier: 'C', dims: { width: 200, depth: 200, height: 450 }, sensoryOverride: { visualStimulation: 3 } },
  { id: 'dimmable-led-01', category: 'lighting', displayName: 'Dimmable LED Panel', tier: 'C', dims: { width: 600, depth: 600, height: 50 }, sensoryOverride: { visualStimulation: 5 } },
  { id: 'bubble-tube-01', category: 'lighting', displayName: 'Bubble Tube', tier: 'C', dims: { width: 200, depth: 200, height: 1500 }, sensoryOverride: { visualStimulation: 9, regulationSupport: 7 } },
  { id: 'fiber-optic-01', category: 'lighting', displayName: 'Fiber Optic Feature', tier: 'C', dims: { width: 300, depth: 300, height: 1800 }, sensoryOverride: { visualStimulation: 8, tactileSupport: 3 } },
  { id: 'nature-projection-01', category: 'lighting', displayName: 'Nature Projection Screen', tier: 'C', dims: { width: 2000, depth: 10, height: 1500 }, sensoryOverride: { visualStimulation: 7, regulationSupport: 7 } },
  // 5. Movement & Vestibular
  { id: 'trampoline-01', category: 'movement-vestibular', displayName: 'Trampoline', tier: 'C', dims: { width: 1400, depth: 1400, height: 300 }, large: true, wheelchairAccessible: false },
  { id: 'ball-pit-01', category: 'movement-vestibular', displayName: 'Ball Pit', tier: 'C', dims: { width: 2000, depth: 2000, height: 500 }, large: true, wheelchairAccessible: false },
  { id: 'wobble-board-01', category: 'movement-vestibular', displayName: 'Wobble Board', tier: 'C', dims: { width: 400, depth: 400, height: 100 }, wheelchairAccessible: false },
  // 6. Tactile & Proprioceptive
  { id: 'foam-blocks-01', category: 'tactile-proprioceptive', displayName: 'Foam Blocks (Modular Set)', tier: 'C', dims: { width: 400, depth: 400, height: 400 } },
  { id: 'floor-mat-folding-01', category: 'tactile-proprioceptive', displayName: 'Folding Floor Mat', tier: 'C', dims: { width: 1800, depth: 600, height: 50 } },
  { id: 'tactile-panel-01', category: 'tactile-proprioceptive', displayName: 'Tactile Wall Panel', tier: 'C', dims: { width: 600, depth: 50, height: 600 } },
  // 7. Visual/Reflective
  { id: 'mirror-panel-01', category: 'visual-reflective', displayName: 'Mirror Panel', tier: 'A', dims: { width: 600, depth: 20, height: 1200 } },
  { id: 'infinity-panel-01', category: 'visual-reflective', displayName: 'Infinity Light Panel', tier: 'C', dims: { width: 900, depth: 100, height: 900 }, sensoryOverride: { visualStimulation: 9 } },
  // 8. Sound/Music Zones
  { id: 'sound-zone-marker-01', category: 'sound-music-zone', displayName: 'Sound Zone Marker', tier: 'C', dims: { width: 300, depth: 300, height: 50 } },
  { id: 'sound-coverage-zone', category: 'sound-music-zone', displayName: 'Sound Coverage Zone', tier: 'D', dims: { width: 6000, depth: 6000, height: 1 }, noMeshByDesign: true },
  // 9. Furniture (baseline) + Architectural
  { id: 'standing-desk-01', category: 'furniture-architectural', displayName: 'Standing Desk', tier: 'A', dims: { width: 1400, depth: 700, height: 1150 } },
  { id: 'task-chair-01', category: 'furniture-architectural', displayName: 'Task Chair', tier: 'A', dims: { width: 650, depth: 650, height: 950 } },
  { id: 'storage-cabinet-01', category: 'furniture-architectural', displayName: 'Storage Cabinet', tier: 'A', dims: { width: 900, depth: 450, height: 1800 } },
  { id: 'ceiling-baffle-01', category: 'furniture-architectural', displayName: 'Ceiling Acoustic Baffle', tier: 'C', dims: { width: 1200, depth: 300, height: 50 }, sensoryOverride: { noiseReduction: 7 } },
];

function computeAnchors(d: Dims): AssetRegistryEntry['anchors'] {
  const hw = d.width / 2;
  const hd = d.depth / 2;
  return {
    center: { x: 0, y: 0, z: 0 },
    front: { x: 0, y: 0, z: hd },
    back: { x: 0, y: 0, z: -hd },
    left: { x: -hw, y: 0, z: 0 },
    right: { x: hw, y: 0, z: 0 },
    corners: [
      { x: -hw, y: d.height, z: -hd },
      { x: hw, y: d.height, z: -hd },
      { x: hw, y: d.height, z: hd },
      { x: -hw, y: d.height, z: hd },
    ],
  };
}

function computeLod(large: boolean | undefined, noMesh: boolean | undefined): AssetRegistryEntry['lod'] {
  if (noMesh) {
    const empty = { glbPath: null, targetTriangles: 0 };
    return { lod0: empty, lod1: empty, lod2: empty, lod3: empty };
  }
  const lod0Budget = large ? 15000 : 5000;
  return {
    lod0: { glbPath: null, targetTriangles: lod0Budget },
    lod1: { glbPath: null, targetTriangles: Math.round(lod0Budget * 0.5) },
    lod2: { glbPath: null, targetTriangles: Math.round(lod0Budget * 0.2) },
    lod3: { glbPath: null, targetTriangles: 150 },
  };
}

function sourceProvenanceFor(tier: SourcingTier): AssetRegistryEntry['sourceProvenance'] {
  const origin = tier === 'A' ? 'sketchfab' : tier === 'B' ? 'cgtrader' : 'custom-blender';
  const licenseType = tier === 'A' ? 'CC0' : tier === 'B' ? 'royalty-free-commercial' : 'owned-ip';
  return {
    origin,
    licenseType,
    // Placeholder — populated when a human sources/purchases the real asset (Phase 2).
    licenseUrl: '',
    purchaseReceiptId: null,
    modifiedForWebGL: false,
    genericizedFrom: null,
    reviewedBy: 'PENDING',
    reviewDate: null,
  };
}

function buildEntry(seed: SeedItem): AssetRegistryEntry {
  const baseline = CATEGORY_SENSORY_BASELINE[seed.category];
  return {
    id: seed.id,
    category: seed.category,
    displayName: seed.displayName,
    sourcingTier: seed.tier,
    dimensionsMm: seed.dims,
    sensoryProfile: { ...baseline, ...seed.sensoryOverride },
    accessibilityProfile: { wheelchairAccessible: seed.wheelchairAccessible ?? true, clearanceRequiredMm: 800 },
    anchors: computeAnchors(seed.dims),
    lod: computeLod(seed.large, seed.noMeshByDesign),
    sourceProvenance: sourceProvenanceFor(seed.tier),
    noMeshByDesign: seed.noMeshByDesign ?? false,
  };
}

const entries = SEED_ITEMS.map(buildEntry);

const errors: string[] = [];
for (const entry of entries) {
  const result = assetRegistryEntrySchema.safeParse(entry);
  if (!result.success) errors.push(`${entry.id}: ${result.error.issues.map((i) => i.message).join('; ')}`);
}
if (errors.length > 0) {
  console.error('Registry generation produced invalid entries:\n' + errors.join('\n'));
  process.exit(1);
}
if (entries.length !== 34) {
  console.error(`Expected 34 seed assets, got ${entries.length}`);
  process.exit(1);
}

const outPath = new URL('./asset-registry.json', import.meta.url);
writeFileSync(outPath, JSON.stringify(entries, null, 2) + '\n');
console.log(`Wrote ${entries.length} entries to ${outPath.pathname.replace(/^\//, '')}`);
console.log(`By tier: A=${entries.filter((e) => e.sourcingTier === 'A').length} B=${entries.filter((e) => e.sourcingTier === 'B').length} C=${entries.filter((e) => e.sourcingTier === 'C').length} D=${entries.filter((e) => e.sourcingTier === 'D').length}`);
