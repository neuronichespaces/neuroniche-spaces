// WebGPU-with-WebGL-fallback engine creation. Feature-detects navigator.gpu + a real
// adapter request (not a blind try/catch) before attempting WebGPUEngine, mirroring the
// same detection contract the old webgpu.ts used for the Three.js WebGPURenderer.

import { Engine, WebGPUEngine } from '@babylonjs/core';

export type RendererBackend = 'webgpu' | 'webgl';

export type EngineHandle = {
  engine: Engine | WebGPUEngine;
  backend: RendererBackend;
};

async function detectWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    const adapter = await gpu?.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/** Async factory: tries WebGPUEngine first when supported, falls back to WebGL2 Engine
 *  silently on any init failure. No core planning feature may require WebGPU-only support
 *  (foundation-spec rule) — this function is the single place that enforces the fallback. */
export async function createBabylonEngine(canvas: HTMLCanvasElement, forceWebGL = false): Promise<EngineHandle> {
  if (!forceWebGL && (await detectWebGPU())) {
    try {
      const engine = new WebGPUEngine(canvas, { antialias: true });
      await engine.initAsync();
      return { engine, backend: 'webgpu' };
    } catch {
      // fall through to WebGL2 below
    }
  }
  return { engine: new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }), backend: 'webgl' };
}
