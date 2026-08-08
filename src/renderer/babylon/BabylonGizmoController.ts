// Owns the GizmoManager's lifecycle, visuals, and attach/detach — nothing about what a
// completed drag means to the canonical document. That conversion lives in
// BabylonTransformBridge.ts, which wraps this controller. Splitting the two keeps "how
// the gizmo looks and attaches" separate from "what a commit does" (hardening spec §4).
//
// One GizmoManager per viewer instance, reused across every selection change (never
// recreated per-entity) — Babylon's GizmoManager already owns a single internal
// UtilityLayerRenderer for its whole lifetime, which already satisfies the spec's "do
// not create a utility layer per selected entity" rule; a separate
// BabylonUtilityLayerManager wrapper around that single Babylon-owned instance would add
// a file with no behavioural difference, so it's deliberately not built (see the
// infrastructure-hardening report's scope notes).

import { GizmoManager, type Scene, type TransformNode } from '@babylonjs/core';

export type GizmoMode = 'translate' | 'rotate';

export class BabylonGizmoController {
  private readonly manager: GizmoManager;
  private mode: GizmoMode = 'translate';

  constructor(scene: Scene) {
    this.manager = new GizmoManager(scene);
    // Selection must always be driven through the editor's own picking service, never
    // Babylon's own click-to-attach convenience behaviour (spec §4).
    this.manager.usePointerToAttachGizmos = false;
    this.applyMode();
  }

  onDragStart(callback: () => void): void {
    for (const gizmo of [this.manager.gizmos.positionGizmo, this.manager.gizmos.rotationGizmo]) {
      gizmo?.onDragStartObservable.add(callback);
    }
  }

  onDragEnd(callback: () => void): void {
    for (const gizmo of [this.manager.gizmos.positionGizmo, this.manager.gizmos.rotationGizmo]) {
      gizmo?.onDragEndObservable.add(callback);
    }
  }

  getAttachedNode(): TransformNode | null {
    return this.manager.attachedNode as TransformNode | null;
  }

  /** Force-ends whichever sub-gizmo drag behavior is currently mid-drag, without
   *  applying its pending delta. Caller resets the node's transform first, then calls
   *  this — releaseDrag() stops the pointer-move handler from computing further delta,
   *  and its onDragEndObservable fires as normal so the bridge's existing commit path
   *  runs (committing the just-reset, pre-drag transform). */
  cancelActiveDrag(): void {
    const position = this.manager.gizmos.positionGizmo;
    const rotation = this.manager.gizmos.rotationGizmo;
    const behaviors = [
      position?.xGizmo.dragBehavior,
      position?.yGizmo.dragBehavior,
      position?.zGizmo.dragBehavior,
      position?.xPlaneGizmo.dragBehavior,
      position?.yPlaneGizmo.dragBehavior,
      position?.zPlaneGizmo.dragBehavior,
      rotation?.xGizmo.dragBehavior,
      rotation?.yGizmo.dragBehavior,
      rotation?.zGizmo.dragBehavior,
    ];
    for (const behavior of behaviors) {
      if (behavior?.dragging) behavior.releaseDrag();
    }
  }

  private applyMode(): void {
    this.manager.positionGizmoEnabled = this.mode === 'translate';
    this.manager.rotationGizmoEnabled = this.mode === 'rotate';
    // Floor-mounted objects only (spec §4): translate stays on the XZ plane (no Y
    // handle), rotate is Y-axis only (no X/Z handles) — matches PlacedObject's data
    // model, there's nowhere to persist a tilt or an elevation change.
    const position = this.manager.gizmos.positionGizmo;
    if (position) position.yGizmo.isEnabled = false;
    const rotation = this.manager.gizmos.rotationGizmo;
    if (rotation) {
      rotation.xGizmo.isEnabled = false;
      rotation.zGizmo.isEnabled = false;
    }
  }

  setMode(mode: GizmoMode): void {
    this.mode = mode;
    this.applyMode();
  }

  /** Detaches (and hides) when node is null — spec §4: "detach gizmos when selection
   *  clears, entity unloads, or entity becomes hidden/locked". This app has no
   *  locked/hidden flag on PlacedObject yet (documented gap, not fabricated here). */
  attachTo(node: TransformNode | null): void {
    this.manager.attachToNode(node);
    this.applyMode();
  }

  dispose(): void {
    this.manager.dispose();
  }
}
