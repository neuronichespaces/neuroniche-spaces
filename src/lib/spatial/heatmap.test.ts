import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHeatmapGrid, sampleGrid } from './heatmap.ts';
import { scoreZone } from './scoring.ts';
import type { RoomState } from './graph.ts';

test('a noisy object raises the noise field near it and less further away', () => {
  const state: RoomState = {
    floorDims: { widthM: 4, lengthM: 4 },
    walls: [],
    doors: [],
    zones: [],
    placedObjects: [
      { id: 'o1', productId: 'speaker', x: 2, y: 2, rotationDeg: 0, footprintM: { w: 0.3, l: 0.3 }, customProperties: {}, sensoryProfile: { noise: 5 } },
    ],
  };
  const grid = buildHeatmapGrid(state, 0.5);
  const near = sampleGrid(grid, { x: 2, y: 2 }).noise;
  const far = sampleGrid(grid, { x: 0.2, y: 0.2 }).noise;
  assert.ok(near > far, `expected near noise (${near}) > far noise (${far})`);
});

test('a calm zone with no nearby stimulation scores near 100 for calm', () => {
  const state: RoomState = {
    floorDims: { widthM: 6, lengthM: 6 },
    walls: [],
    doors: [],
    zones: [{ id: 'z1', kind: 'calm', x: 1, y: 1, widthM: 1, lengthM: 1, rotationDeg: 0 }],
    placedObjects: [],
  };
  const grid = buildHeatmapGrid(state, 0.5);
  const score = scoreZone(state.zones[0], grid);
  assert.equal(score.calmScore, 100);
});

test('a calm zone next to a loud object scores lower for calm than an untouched one', () => {
  const quiet: RoomState = {
    floorDims: { widthM: 6, lengthM: 6 },
    walls: [],
    doors: [],
    zones: [{ id: 'z1', kind: 'calm', x: 5, y: 5, widthM: 1, lengthM: 1, rotationDeg: 0 }],
    placedObjects: [],
  };
  const loud: RoomState = {
    ...quiet,
    placedObjects: [
      { id: 'o1', productId: 'speaker', x: 5, y: 5, rotationDeg: 0, footprintM: { w: 0.3, l: 0.3 }, customProperties: {}, sensoryProfile: { noise: 5, light: 3 } },
    ],
  };
  const quietScore = scoreZone(quiet.zones[0], buildHeatmapGrid(quiet, 0.5));
  const loudScore = scoreZone(loud.zones[0], buildHeatmapGrid(loud, 0.5));
  assert.ok(loudScore.calmScore < quietScore.calmScore);
});
