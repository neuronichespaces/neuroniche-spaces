// Heatmap engine (milestone brief §13): multi-layer scalar grid, influence-field
// propagation (intensity / distance²), CPU canvas-friendly data — not GPU textures/
// shaders. Milestone doc non-goal: this app has no WebGPU compute pipeline and no room
// size that would need one; a plain 2D array the UI can draw onto a <canvas> (or, later,
// upload as a texture) covers the same "floor overlay" use case for far less complexity.
//
// Layers are the app's existing 5-category sensory taxonomy (movement/noise/light/touch/
// pressure — same as SensoryImpact in types.ts), not the brief's separate named layers
// (noise/clutter/lighting/...) — one taxonomy, reused everywhere, per the decision already
// recorded in types.ts and the milestone doc.

import type { PlacedObject, SensoryImpact } from './types.ts';
import type { RoomState } from './graph.ts';
import type { SensoryNeed } from '../planner/plan.ts';

export type SensoryCategory = SensoryNeed['category'];

export type HeatCell = Record<SensoryCategory, number> & { crowding: number };

export type HeatmapGrid = {
  cellSizeM: number;
  cols: number;
  rows: number;
  cells: HeatCell[][]; // [row][col], row = y-axis, col = x-axis
};

const CATEGORIES: SensoryCategory[] = ['movement', 'noise', 'light', 'touch', 'pressure'];
const CROWDING_RADIUS_M = 1.5;

function emptyCell(): HeatCell {
  return { movement: 0, noise: 0, light: 0, touch: 0, pressure: 0, crowding: 0 };
}

function cellCentre(row: number, col: number, cellSizeM: number) {
  return { x: col * cellSizeM + cellSizeM / 2, y: row * cellSizeM + cellSizeM / 2 };
}

// Influence = intensity / distance², capped at close range so a cell directly on top of
// an object doesn't divide by ~0 and blow the field out — matches the brief's formula
// while staying numerically sane.
function influence(intensity: number, distanceM: number): number {
  const d = Math.max(distanceM, 0.3);
  return intensity / (d * d);
}

function applyObjectInfluence(cell: HeatCell, obj: PlacedObject, distanceM: number) {
  const profile: SensoryImpact = obj.sensoryProfile ?? {};
  for (const category of CATEGORIES) {
    const intensity = profile[category];
    if (intensity) cell[category] += influence(intensity, distanceM);
  }
}

/** Builds the full grid from current room state. Full recompute, not localized
 *  invalidation (brief §8's event-driven update) — same MVP-object-count trade-off
 *  already documented in graph.ts; revisit if a room's object count makes this slow. */
export function buildHeatmapGrid(state: RoomState, cellSizeM = 0.2): HeatmapGrid {
  const cols = Math.max(1, Math.ceil(state.floorDims.widthM / cellSizeM));
  const rows = Math.max(1, Math.ceil(state.floorDims.lengthM / cellSizeM));
  const cells: HeatCell[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, emptyCell));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const centre = cellCentre(row, col, cellSizeM);
      const cell = cells[row][col];
      for (const obj of state.placedObjects) {
        const d = Math.hypot(centre.x - obj.x, centre.y - obj.y);
        applyObjectInfluence(cell, obj, d);
        if (d <= CROWDING_RADIUS_M) cell.crowding += 1;
      }
    }
  }

  return { cellSizeM, cols, rows, cells };
}

/** Nearest cell's values for a world-space point — used to sample the grid for scoring or a UI readout. */
export function sampleGrid(grid: HeatmapGrid, point: { x: number; y: number }): HeatCell {
  const col = Math.min(grid.cols - 1, Math.max(0, Math.floor(point.x / grid.cellSizeM)));
  const row = Math.min(grid.rows - 1, Math.max(0, Math.floor(point.y / grid.cellSizeM)));
  return grid.cells[row][col];
}
