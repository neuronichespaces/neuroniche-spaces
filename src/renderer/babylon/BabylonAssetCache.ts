// Caches loaded GLB AssetContainers by glbPath so repeated placements of the same
// catalogue item reuse one load instead of re-fetching. Foundation spec: "Use asset
// containers/templates for repeated asset instantiation", "Never dispose shared assets
// still used by another equipment instance" (refcounted here via `instanceCount`).

import { LoadAssetContainerAsync, type AssetContainer, type Scene } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

type CacheEntry = { container: Promise<AssetContainer>; instanceCount: number };

export class BabylonAssetCache {
  private readonly cache = new Map<string, CacheEntry>();

  /** Loads (or reuses) the container for glbPath, then returns a fresh instantiated
   *  clone rooted at a new TransformNode — instances share GPU-side geometry/materials
   *  but have independent transforms. */
  async instantiate(scene: Scene, glbPath: string) {
    let entry = this.cache.get(glbPath);
    if (!entry) {
      entry = { container: LoadAssetContainerAsync(glbPath, scene), instanceCount: 0 };
      this.cache.set(glbPath, entry);
    }
    const container = await entry.container;
    entry.instanceCount += 1;
    const instance = container.instantiateModelsToScene((name) => name, false);
    return instance;
  }

  /** Call when an instance created via instantiate() is disposed. Disposes the shared
   *  container only once nothing references it anymore. */
  release(glbPath: string): void {
    const entry = this.cache.get(glbPath);
    if (!entry) return;
    entry.instanceCount -= 1;
    if (entry.instanceCount <= 0) {
      entry.container.then((c) => c.dispose()).catch(() => {});
      this.cache.delete(glbPath);
    }
  }

  disposeAll(): void {
    for (const entry of this.cache.values()) {
      entry.container.then((c) => c.dispose()).catch(() => {});
    }
    this.cache.clear();
  }
}
