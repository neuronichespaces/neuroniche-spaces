// CAD-upgrade Gap 4: pure effective-state helpers for placed objects vs. their layer.
// An object can be individually locked/hidden AND belong to a locked/hidden layer —
// the effective state is the OR of both, never AND (a layer lock overrides, an object
// can't opt out of its layer's lock).
import type { Layer } from './types.ts';

export const DEFAULT_LAYER_ID = 'layer-default';

// Starter set for new projects (default-layer presets) — organisational categories
// matching this app's own entity types, so a new project has somewhere sensible to
// sort things into instead of one undifferentiated "Default" bucket. 'layer-default'
// keeps its id/position so every unassigned entity (layerId undefined) still resolves
// there, same as before this preset set existed.
export function defaultLayers(): Layer[] {
  return [
    { id: DEFAULT_LAYER_ID, name: 'Default', visible: true, locked: false },
    { id: 'layer-walls', name: 'Walls', visible: true, locked: false },
    { id: 'layer-zones', name: 'Zones', visible: true, locked: false },
    { id: 'layer-dimensions', name: 'Dimensions', visible: true, locked: false },
  ];
}

// Structural type, not PlacedObject specifically — Zone also carries `layerId` (CAD
// Gap 4) but has no own hidden/locked flags, and both entities satisfy this shape.
type LayeredEntity = { layerId?: string; hidden?: boolean; locked?: boolean };

export function layerFor(entity: LayeredEntity, layers: Layer[]): Layer | undefined {
  return layers.find((l) => l.id === (entity.layerId ?? DEFAULT_LAYER_ID));
}

/** True if the entity should render/be pickable — false if either the entity itself
 *  is hidden, or its layer is (an unknown/deleted layerId is treated as visible,
 *  never silently hides an entity). */
export function isEffectivelyVisible(entity: LayeredEntity, layers: Layer[]): boolean {
  if (entity.hidden) return false;
  const layer = layerFor(entity, layers);
  return layer ? layer.visible : true;
}

/** True if the entity should be immovable — its own lock OR its layer's lock. */
export function isEffectivelyLocked(entity: LayeredEntity, layers: Layer[]): boolean {
  if (entity.locked) return true;
  const layer = layerFor(entity, layers);
  return layer ? layer.locked : false;
}

/** True if the entity's layer allows it into the printed/PDF export. An unknown/
 *  deleted layerId or a layer with `printable` unset defaults to printable — same
 *  fail-open convention as isEffectivelyVisible. */
export function isPrintable(entity: LayeredEntity, layers: Layer[]): boolean {
  const layer = layerFor(entity, layers);
  return layer ? layer.printable !== false : true;
}
