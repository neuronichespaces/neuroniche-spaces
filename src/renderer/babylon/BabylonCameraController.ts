// Owns camera-mode state so pointer-gesture routing between orbit navigation and gizmo
// dragging is a single explicit state machine, not ad-hoc detachControl()/attachControl()
// calls scattered across the viewer component (hardening spec §5's "pointer gesture
// routing must be owned by editor tool state, not scattered Babylon pointer callbacks").
//
// Walk-through mode is deliberately not one of these states: it swaps the active camera
// object entirely (UniversalCamera replaces ArcRotateCamera) rather than changing this
// orbit camera's interaction mode, so it stays owned by RoomViewer3D's walk-mode toggle,
// same as before this hardening pass.

import type { ArcRotateCamera } from '@babylonjs/core';

export type CameraInteractionMode = 'orbit' | 'pan' | 'frame-selection' | 'disabled-for-transform';

export class BabylonCameraController {
  private mode: CameraInteractionMode = 'orbit';

  constructor(
    private readonly camera: ArcRotateCamera,
    private readonly canvas: HTMLCanvasElement,
  ) {}

  getMode(): CameraInteractionMode {
    return this.mode;
  }

  /** Suspends orbit navigation for the duration of a gizmo drag — prevents camera orbit
   *  and object manipulation from fighting over the same pointer gesture (spec §5). */
  setMode(mode: CameraInteractionMode): void {
    this.mode = mode;
    if (mode === 'disabled-for-transform') {
      this.camera.detachControl();
    } else {
      this.camera.attachControl(this.canvas, true);
    }
  }

  /** Frames the camera on a world-space centre/radius — used for "frame selection" and
   *  reset-view. Pan mode reuses Babylon's own built-in two-finger/right-drag pan inside
   *  attachControl; no separate pan implementation is needed. */
  frame(centreX: number, centreZ: number, radius: number): void {
    this.camera.setTarget({ x: centreX, y: 0, z: centreZ } as never);
    this.camera.radius = radius;
  }
}
