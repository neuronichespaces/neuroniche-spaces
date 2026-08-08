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
// Escape-cancel-mid-drag: capture the node's transform on drag start, and on Escape
// reset it and force-release whichever sub-gizmo drag behavior is active (see
// BabylonGizmoController.cancelActiveDrag) — its onDragEndObservable still fires as
// normal, so the existing commit path runs and simply re-commits the pre-drag transform.

import { Vector3, type Scene, type TransformNode } from '@babylonjs/core';
import { BabylonGizmoController, type GizmoMode } from './BabylonGizmoController.ts';

export type { GizmoMode };

export class BabylonTransformBridge {
  private readonly controller: BabylonGizmoController;
  private preDragPosition: Vector3 | null = null;
  private preDragRotationY: number | null = null;

  constructor(
    scene: Scene,
    private readonly onDraggingChange: (dragging: boolean) => void,
    private readonly onCommit: (x: number, y: number, rotationDeg: number) => void,
  ) {
    this.controller = new BabylonGizmoController(scene);
    this.controller.onDragStart(() => {
      const node = this.controller.getAttachedNode();
      this.preDragPosition = node ? node.position.clone() : null;
      this.preDragRotationY = node ? node.rotation.y : null;
      this.onDraggingChange(true);
    });
    this.controller.onDragEnd(() => {
      this.onDraggingChange(false);
      this.commitFromNode();
      this.preDragPosition = null;
      this.preDragRotationY = null;
    });
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || this.preDragPosition === null || this.preDragRotationY === null) return;
    const node = this.controller.getAttachedNode();
    if (!node) return;
    node.position.copyFrom(this.preDragPosition);
    node.rotation.y = this.preDragRotationY;
    this.controller.cancelActiveDrag();
  };

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
    window.removeEventListener('keydown', this.handleKeyDown);
    this.controller.dispose();
  }
}
