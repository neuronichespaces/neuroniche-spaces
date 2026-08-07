// Renderer backend/device-loss diagnostics, surfaced in the CAD status bar per the
// foundation spec ("Show active renderer backend", "Handle device/context loss with a
// clear recoverable error state"). Kept as plain callbacks rather than a global
// singleton — only one 3D viewer instance exists at a time in this app.

import type { Engine, WebGPUEngine } from '@babylonjs/core';
import type { RendererBackend } from './BabylonEngineFactory.ts';

export type DiagnosticsState = {
  backend: RendererBackend;
  contextLost: boolean;
};

/** Wires context-lost/restored listeners (WebGL) so the UI can show a recoverable error
 *  state instead of a silently frozen canvas. WebGPUEngine surfaces device loss via its
 *  own onContextLostObservable in recent Babylon versions; guarded with `in` checks since
 *  the two engine classes don't share an exact interface here. */
export function watchDeviceLoss(engine: Engine | WebGPUEngine, onChange: (lost: boolean) => void): () => void {
  const lostObservable = 'onContextLostObservable' in engine ? engine.onContextLostObservable : undefined;
  const restoredObservable = 'onContextRestoredObservable' in engine ? engine.onContextRestoredObservable : undefined;

  const lostObserver = lostObservable?.add(() => onChange(true));
  const restoredObserver = restoredObservable?.add(() => onChange(false));

  return () => {
    if (lostObserver) lostObservable?.remove(lostObserver);
    if (restoredObserver) restoredObservable?.remove(restoredObserver);
  };
}
