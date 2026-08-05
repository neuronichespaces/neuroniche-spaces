import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBestSnap } from './snapEngine.ts';
import { distanceBetween, clearanceToNearestWall } from './measurements.ts';

test('corner snap outscores plain grid snap when very close to a wall corner', () => {
  const walls = [{ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 }];
  const best = computeBestSnap(
    { x: 0.05, y: 0.05 },
    { gridM: 0.5, walls, zones: [], objects: [], footprintM: { w: 0.5, l: 0.5 } },
  );
  assert.equal(best.type, 'corner');
  assert.deepEqual(best.point, { x: 0, y: 0 });
});

test('object alignment candidate lines up on the shared axis', () => {
  const objects = [
    { id: 'o1', productId: 'desk', x: 2, y: 3, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} },
  ];
  const best = computeBestSnap(
    { x: 2.05, y: 5 },
    { gridM: 0.5, walls: [], zones: [], objects, footprintM: { w: 0.5, l: 0.5 }, excludeObjectId: 'o2' },
  );
  assert.equal(best.type, 'objectAlign');
  assert.equal(best.point.x, 2);
});

test('measurements: distance and wall clearance', () => {
  assert.equal(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  const walls = [{ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.2 }];
  const c = clearanceToNearestWall({ x: 2, y: 1 }, walls);
  assert.ok(c);
  assert.equal(c!.clearanceM, 0.9); // 1m to centreline - 0.1m half-thickness
});
