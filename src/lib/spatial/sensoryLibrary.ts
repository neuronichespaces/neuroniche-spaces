// Sensory profile lookup for the sensory-equipment productIds used in templates.ts.
// One shared table, not per-template-object literals — a productId's sensory impact is a
// property of the *product*, so it belongs in one place products are defined, the same
// reasoning as demoData.ts's CATALOGUE being one shared table rather than copies per page.
// Values use SensoryImpact's convention (types.ts): magnitude 1-5, positive = produces/
// adds that stimulus, negative = reduces/absorbs it.

import type { SensoryImpact } from './types.ts';

export const SENSORY_LIBRARY: Record<string, SensoryImpact> = {
  'bean-bag-large': { pressure: 2, touch: 1 },
  'dimmable-floor-lamp': { light: 2 },
  'weighted-lap-pad': { pressure: 3, touch: 1 },
  'indoor-swing-frame': { movement: 4 },
  'crash-mat': { movement: 3, pressure: 2 },
  'balance-beam-low': { movement: 3 },
  'sensory-shelf-unit': {}, // storage — no meaningful sensory effect
  'noise-reducing-panel': { noise: -4 },
  'flexible-seating-cube': { movement: 1, pressure: 1 },
  'fidget-tool-bin': { touch: 2 },
  'bubble-tube-column': { light: 3 },
  'projector-calm-scenes': { light: 1 },
  'tactile-wall-panel-set': { touch: 3 },
};

export function sensoryProfileFor(productId: string): SensoryImpact | undefined {
  return SENSORY_LIBRARY[productId];
}
