import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSET_REGISTRY,
  validateAssetEntry,
  isProductionReady,
  getAssetEntry,
  complianceReport,
  type AssetRegistryEntry,
} from './assetRegistry.ts';
import { SENSORY_LIBRARY } from './sensoryLibrary.ts';

test('every registry entry matches a real productId used by templates (sensoryLibrary.ts)', () => {
  for (const productId of Object.keys(ASSET_REGISTRY)) {
    assert.ok(productId in SENSORY_LIBRARY, `${productId} has no matching sensoryLibrary entry`);
  }
});

test('every PENDING-review entry validates structurally clean (no glb, provenance stub correct)', () => {
  for (const entry of Object.values(ASSET_REGISTRY)) {
    assert.deepEqual(validateAssetEntry(entry), []);
    assert.equal(entry.glb, null);
    assert.equal(isProductionReady(entry), false);
  }
});

test('getAssetEntry looks up by productId, returns undefined for unknown ids', () => {
  assert.equal(getAssetEntry('bean-bag-large')?.category, 'regulation-calming');
  assert.equal(getAssetEntry('nonexistent-product'), undefined);
});

test('Tier D entries must be data-only: noMeshByDesign true, glb forbidden', () => {
  const valid: AssetRegistryEntry = {
    productId: 'sound-coverage-zone-01',
    category: 'sound-music-zone',
    displayName: 'Sound Coverage Zone',
    sourcingTier: 'D',
    sourceProvenance: {
      origin: null,
      licenseType: null,
      licenseUrl: null,
      purchaseReceiptId: null,
      modifiedForWebGL: false,
      genericizedFrom: null,
      reviewedBy: 'PENDING',
      reviewDate: null,
    },
    noMeshByDesign: true,
    glb: null,
  };
  assert.deepEqual(validateAssetEntry(valid), []);

  const invalid: AssetRegistryEntry = { ...valid, glb: { lod0: { glbPath: '/x.glb', maxTriangles: 100 } } };
  assert.equal(validateAssetEntry(invalid).length, 1);
});

test('Tier B asset with a glb reference must be modifiedForWebGL before use', () => {
  const entry: AssetRegistryEntry = {
    productId: 'indoor-swing-frame',
    category: 'movement-vestibular',
    displayName: 'Indoor Swing Frame',
    sourcingTier: 'B',
    sourceProvenance: {
      origin: 'cgtrader',
      licenseType: 'royalty-free-commercial',
      licenseUrl: 'https://example.test/license',
      purchaseReceiptId: 'R-001',
      modifiedForWebGL: false,
      genericizedFrom: 'original-marketplace-name',
      reviewedBy: 'PENDING',
      reviewDate: null,
    },
    noMeshByDesign: false,
    glb: { lod0: { glbPath: '/assets/movement-vestibular/indoor-swing-frame/indoor-swing-frame_lod0.glb', maxTriangles: 15000 } },
  };
  const errors = validateAssetEntry(entry);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /modifiedForWebGL/);
});

test('banned brand-name substrings are rejected', () => {
  const entry: AssetRegistryEntry = {
    productId: 'sensei-pod-01',
    category: 'focus-privacy',
    displayName: 'SENSEi Quiet Pod',
    sourcingTier: 'C',
    sourceProvenance: {
      origin: 'custom-blender',
      licenseType: 'owned-ip',
      licenseUrl: null,
      purchaseReceiptId: null,
      modifiedForWebGL: true,
      genericizedFrom: null,
      reviewedBy: 'PENDING',
      reviewDate: null,
    },
    noMeshByDesign: false,
    glb: null,
  };
  const errors = validateAssetEntry(entry);
  assert.ok(errors.some((e) => e.includes('sensei')));
});

test('complianceReport tallies by tier and flags every current entry as pending review', () => {
  const report = complianceReport();
  assert.equal(report.total, Object.keys(ASSET_REGISTRY).length);
  assert.equal(report.productionReady, 0);
  assert.equal(report.pendingReview.length, report.total);
  assert.equal(report.invalid.length, 0);
  assert.equal(report.byTier.A + report.byTier.B + report.byTier.C + report.byTier.D, report.total);
});
