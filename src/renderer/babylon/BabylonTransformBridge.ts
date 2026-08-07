// Converts a completed gizmo drag into exactly one committed store action — never the
// source of persisted project truth itself (foundation spec's core gizmo rule). Gizmo
// lifecycle/visuals (creating the GizmoManager, attach/detach, mode switching) live in
// BabylonGizmoController.ts, which this bridge wraps; this file owns only the
// preview-drag -> commit-on-drop conversion (hardening spec §4's separation of concerns).
//
// Three.js's Y rotation is CCW-positive around +Y; the 2D store's rotationDeg is
// clockwise-positive, so commit negates it — same convention the old ObjectMesh3D.tsx
// used before the Babylon migration.
//
// Known limitation (parity with the prior Three.js TransformControls implementation, not
// a regression): Escape-cancel-mid-drag isn't wired. Babylon's GizmoManager commits
// whatever the live drag position is on pointer-up; there's no cheap way to intercept an
// Escape keypress mid-PointerDragBehavior without patching Babylon internals. Add if this
// becomes a real accessibility gap in practice.

import type { Scene, TransformNode } from '@babylonjs/core';
import { BabylonGizmoController, type GizmoMode } from './BabylonGizmoController.ts';

export type { GizmoMode };

export class BabylonTransformBridge {
  private readonly controller: BabylonGizmoController;

  constructor(
    scene: Scene,
    private readonly onDraggingChange: (dragging: boolean) => void,
    private readonly onCommit: (x: number, y: number, rotationDeg: number) => void,
  ) {
    this.controller = new BabylonGizmoController(scene);
    this.controller.onDragStart(() => this.onDraggingChange(true));
    this.controller.onDragEnd(() => {
      this.onDraggingChange(false);
      this.commitFromNode();
    });
  }

  private commitFromNode(): void {
    const node = this.controller.getAttachedNode();
    if (!node) return;
    const rotationDeg = Math.round(((-node.rotation.y * 180) / Math.PI) % 360);
    this.onCommit(node.position.x, node.position.z, ((rotationDeg % 360) + 360) % 360);
  }

  setMode(mode: GizmoMode): void {
    this.controller.setMode(mode);
  }

  attachTo(node: TransformNode | null): void {
    this.controller.attachTo(node);
  }

  dispose(): void {
    this.controller.dispose();
  }
}
