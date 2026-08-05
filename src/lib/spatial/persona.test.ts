import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHeatmapGrid } from './heatmap.ts';
import { PERSONA_LIBRARY, personaZoneSuitability, evaluateAllPersonas } from './persona.ts';
import type { RoomState } from './graph.ts';

const autisticAdult = PERSONA_LIBRARY.find((p) => p.id === 'autistic-adult')!;
const sensorySeeking = PERSONA_LIBRARY.find((p) => p.id === 'sensory-seeking-child')!;

test('a loud zone scores lower for a noise-sensitive persona than a low-sensitivity one', () => {
  const state: RoomState = {
    floorDims: { widthM: 4, lengthM: 4 },
    walls: [],
    doors: [],
    zones: [{ id: 'z1', kind: 'focus', x: 2, y: 2, widthM: 1, lengthM: 1, rotationDeg: 0 }],
    placedObjects: [
      { id: 'o1', productId: 'speaker', x: 2, y: 2, rotationDeg: 0, footprintM: { w: 0.3, l: 0.3 }, customProperties: {}, sensoryProfile: { noise: 5 } },
    ],
  };
  const grid = buildHeatmapGrid(state, 0.5);
  const zone = state.zones[0];
  const sensitiveScore = personaZoneSuitability(autisticAdult, zone, grid);
  const tolerantScore = personaZoneSuitability(sensorySeeking, zone, grid);
  assert.ok(sensitiveScore < tolerantScore, `expected sensitive (${sensitiveScore}) < tolerant (${tolerantScore})`);
});

test('evaluateAllPersonas returns one report per library persona, empty room = perfect score for everyone', () => {
  const state: RoomState = { floorDims: { widthM: 4, lengthM: 4 }, walls: [], doors: [], zones: [{ id: 'z1', kind: 'calm', x: 1, y: 1, widthM: 1, lengthM: 1, rotationDeg: 0 }], placedObjects: [] };
  const grid = buildHeatmapGrid(state, 0.5);
  const reports = evaluateAllPersonas(state.zones, grid);
  assert.equal(reports.length, PERSONA_LIBRARY.length);
  assert.ok(reports.every((r) => r.overallScore === 100));
});
