// Development performance instrumentation (spec §9). Pull-based (a getSnapshot() call),
// not a push/subscribe API — this app has no perf HUD yet, so there's nothing to push
// to; a future dev-only overlay can poll this on a timer. Reads Babylon's own already-
// computed counters rather than re-measuring anything.

import type { Engine, Scene, WebGPUEngine } from '@babylonjs/core';
import type { RendererBackend } from './BabylonEngineFactory.ts';

export type PerformanceSnapshot = {
  frameTimeMs: number;
  activeMeshCount: number;
  backend: RendererBackend;
};

export function getPerformanceSnapshot(engine: Engine | WebGPUEngine, scene: Scene, backend: RendererBackend): PerformanceSnapshot {
  return {
    frameTimeMs: engine.getDeltaTime(),
    activeMeshCount: scene.getActiveMeshes().length,
    backend,
  };
}
