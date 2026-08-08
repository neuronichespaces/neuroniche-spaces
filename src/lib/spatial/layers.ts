// CAD-upgrade Gap 4: pure effective-state helpers for placed objects vs. their layer.
// An object can be individually locked/hidden AND belong to a locked/hidden layer —
// the effective state is the OR of both, never AND (a layer lock overrides, an object
// can't opt out of its layer's lock).
import type { PlacedObject, Layer } from './types.ts';

export const DEFAULT_LAYER_ID = 'layer-default';

export function defaultLayers(): Layer[] {
  return [{ id: DEFAULT_LAYER_ID, name: 'Default', visible: true, locked: false }];
}

function layerFor(obj: PlacedObject, layers: Layer[]): Layer | undefined {
  return layers.find((l) => l.id === (obj.layerId ?? DEFAULT_LAYER_ID));
}

/** True if the object should render/be pickable — false if either the object itself
 *  is hidden, or its layer is (an unknown/deleted layerId is treated as visible,
 *  never silently hides an object). */
export function isEffectivelyVisible(obj: PlacedObject, layers: Layer[]): boolean {
  if (obj.hidden) return false;
  const layer = layerFor(obj, layers);
  return layer ? layer.visible : true;
}

/** True if the object should be immovable — object's own lock OR its layer's lock. */
export function isEffectivelyLocked(obj: PlacedObject, layers: Layer[]): boolean {
  if (obj.locked) return true;
  const layer = layerFor(obj, layers);
  return layer ? layer.locked : false;
}
