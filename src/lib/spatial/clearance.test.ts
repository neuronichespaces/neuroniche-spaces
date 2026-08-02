import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeClearanceViolations } from './clearance.ts';
import type { PlacedObject, WallSegment } from './types.ts';

const obj = (id: string, x: number, y: number, r?: number): PlacedObject => ({
  id,
  productId: 'p1',
  x,
  y,
  rotationDeg: 0,
  clearanceRadiusM: r,
  footprintM: { w: 0.5, l: 0.5 },
  customProperties: {},
});

test('no violation when objects are far apart', () => {
  const violated = computeClearanceViolations([obj('a', 0, 0, 1), obj('b', 5, 5, 1)], []);
  assert.equal(violated.size, 0);
});

test('flags overlapping clearance radii', () => {
  const violated = computeClearanceViolations([obj('a', 0, 0, 1), obj('b', 1, 0, 1)], []);
  assert.deepEqual([...violated].sort(), ['a', 'b']);
});

test('flags object too close to a wall', () => {
  const wall: WallSegment = { id: 'w1', start: { x: -5, y: 1 }, end: { x: 5, y: 1 }, thicknessM: 0.1 };
  const violated = computeClearanceViolations([obj('a', 0, 0, 1.5)], [wall]);
  assert.deepEqual([...violated], ['a']);
});

test('object with no clearance radius never violates', () => {
  const violated = computeClearanceViolations([obj('a', 0, 0), obj('b', 0, 0, 5)], []);
  assert.equal(violated.has('a'), false);
});
