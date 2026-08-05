import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAIContext } from './aiContracts.ts';
import type { RoomState } from './graph.ts';

test('buildAIContext packages violations, zone scores, and persona reports for a room', () => {
  const state: RoomState = {
    floorDims: { widthM: 4, lengthM: 4 },
    walls: [{ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 }],
    doors: [],
    zones: [{ id: 'z1', kind: 'calm', x: 2, y: 2, widthM: 1, lengthM: 1, rotationDeg: 0 }],
    placedObjects: [
      { id: 'o1', productId: 'speaker', x: 2, y: 2, rotationDeg: 0, footprintM: { w: 0.3, l: 0.3 }, customProperties: {}, sensoryProfile: { noise: 5 } },
    ],
  };
  const ctx = buildAIContext(state);
  assert.equal(ctx.zones.length, 1);
  assert.equal(ctx.zoneScores.length, 1);
  assert.equal(ctx.zoneScores[0].zoneId, 'z1');
  assert.equal(ctx.personaReports.length > 0, true);
  assert.equal(Array.isArray(ctx.violations), true);
});
