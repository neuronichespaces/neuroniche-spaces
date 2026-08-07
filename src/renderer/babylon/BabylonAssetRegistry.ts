// Load-by-productId bridge between the canonical asset metadata (src/lib/spatial/
// assetRegistry.ts — provenance/licensing/LOD, renderer-independent) and Babylon's GLB
// loading. UI code must never load by raw filename (spec's core asset-pipeline
// principle) — this is the only place a glbPath is read out of the registry entry.

import type { Scene } from '@babylonjs/core';
import { getAssetEntry } from '@/lib/spatial/assetRegistry.ts';
import { BabylonAssetCache } from './BabylonAssetCache.ts';

const cache = new BabylonAssetCache();

/** Returns the loaded root nodes for productId's LOD0 GLB, or null if the catalogue
 *  entry has no glb yet (every entry today — public/ has zero .glb files, see
 *  assetRegistry.ts's own note) so callers fall back to a labelled placeholder box. */
export async function loadEquipmentModel(scene: Scene, productId: string) {
  const entry = getAssetEntry(productId);
  const glbPath = entry?.glb?.lod0.glbPath;
  if (!glbPath) return null;
  const instance = await cache.instantiate(scene, glbPath);
  return { instance, glbPath };
}

export function releaseEquipmentModel(glbPath: string): void {
  cache.release(glbPath);
}

export function disposeAllEquipmentModels(): void {
  cache.disposeAll();
}
