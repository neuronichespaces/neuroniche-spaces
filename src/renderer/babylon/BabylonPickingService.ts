// Standard (CPU) picking only, per the spec's picking rules — GPU picking is explicitly
// gated behind measured need, which this app has never hit at its ≤25-object ceiling.
// Resolves any picked mesh (including nested GLB children) to its canonical EntityId via
// BabylonEntityMapper, respecting pickable/enabled state for locked/hidden entities.
//
// Render-role filtering (hardening spec §2/§3): only ARCHITECTURE and
// EQUIPMENT_PICK_PROXY roles participate in selection. A hit on a gizmo/overlay/debug
// node is ignored outright (not treated as empty space) — clicking a gizmo handle or a
// heatmap overlay must never clear the current selection.

import type { Scene } from '@babylonjs/core';
import type { BabylonEntityMapper } from './BabylonEntityMapper.ts';
import { isEditorPickable } from './types.ts';

/** Attaches a click-to-select handler. Fires onSelect(null) on a genuine empty-space
 *  click (or a hit on non-selectable architecture, e.g. a bare wall), matching the 2D
 *  editor and the old R3F onPointerMissed behaviour. Ignores the pointer-up that ends a
 *  gizmo drag via `isDraggingRef` — otherwise releasing a drag over empty canvas space
 *  would clear the selection it was just dragging. */
export function attachClickSelection(
  scene: Scene,
  mapper: BabylonEntityMapper,
  onSelect: (entityId: string | null) => void,
  isDraggingRef: { current: boolean },
): () => void {
  const observer = scene.onPointerObservable.add((info) => {
    if (info.type !== 1 /* POINTERUP */) return; // PointerEventTypes.POINTERUP without importing the enum for one comparison
    if (isDraggingRef.current) return;
    const pick = scene.pick(scene.pointerX, scene.pointerY);
    if (!pick?.hit) {
      onSelect(null);
      return;
    }
    if (!isEditorPickable(pick.pickedMesh)) return; // gizmo/overlay/debug hit — leave selection untouched
    onSelect(mapper.resolveEntityId(pick.pickedMesh));
  });
  return () => scene.onPointerObservable.remove(observer);
}
