// Run: node --test src/lib/spatial/geometry.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  snapToGrid,
  wallSegmentsWithDoorGap,
  projectPointToSegment,
  snapObjectToNearestWall,
  clampPointToBounds,
} from './geometry.ts';
import type { WallSegment } from './types.ts';

test('snapToGrid rounds to nearest grid step', () => {
  assert.ok(Math.abs(snapToGrid(1.24, 0.1) - 1.2) < 1e-9);
  assert.ok(Math.abs(snapToGrid(1.26, 0.1) - 1.3) < 1e-9);
});

test('wallSegmentsWithDoorGap splits an axis-aligned wall around the door', () => {
  const wall: WallSegment = { id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 };
  const segs = wallSegmentsWithDoorGap(wall, { wallId: 'w1', offsetM: 1, widthM: 0.9 });
  assert.equal(segs.length, 2);
  assert.deepEqual(segs[0], { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } });
  assert.deepEqual(segs[1], { start: { x: 1.9, y: 0 }, end: { x: 4, y: 0 } });
});

test('wallSegmentsWithDoorGap works on an angled wall (arc-length projection, not axis math)', () => {
  const wall: WallSegment = { id: 'w2', start: { x: 0, y: 0 }, end: { x: 3, y: 4 }, thicknessM: 0.1 }; // len 5
  const segs = wallSegmentsWithDoorGap(wall, { wallId: 'w2', offsetM: 2, widthM: 1 });
  assert.equal(segs.length, 2);
  // offset 2/5 along the 3-4-5 line = (1.2, 1.6); offset 3/5 = (1.8, 2.4)
  assert.ok(Math.abs(segs[0].end.x - 1.2) < 1e-9 && Math.abs(segs[0].end.y - 1.6) < 1e-9);
  assert.ok(Math.abs(segs[1].start.x - 1.8) < 1e-9 && Math.abs(segs[1].start.y - 2.4) < 1e-9);
});

test('projectPointToSegment clamps to segment ends', () => {
  const r = projectPointToSegment({ x: -5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 });
  assert.deepEqual(r.point, { x: 0, y: 0 });
});

test('snapObjectToNearestWall pulls a nearby object flush to the wall', () => {
  const wall: WallSegment = { id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 };
  const p = snapObjectToNearestWall(2, 0.1, { w: 0.6, l: 0.6 }, [wall], 0.15);
  assert.ok(p.y > 0.1); // pushed away from the wall centreline, not left on it
});

test('clampPointToBounds leaves in-bounds points unchanged', () => {
  assert.deepEqual(clampPointToBounds({ x: 2, y: 3 }, 4, 5), { x: 2, y: 3 });
});

test('clampPointToBounds clamps negative and over-max coordinates to the floor rect', () => {
  assert.deepEqual(clampPointToBounds({ x: -1, y: 10 }, 4, 5), { x: 0, y: 5 });
  assert.deepEqual(clampPointToBounds({ x: 100, y: -100 }, 4, 5), { x: 4, y: 0 });
});

test('snapObjectToNearestWall leaves position unchanged when no wall is close enough', () => {
  const wall: WallSegment = { id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 };
  const p = snapObjectToNearestWall(2, 2, { w: 0.6, l: 0.6 }, [wall], 0.15);
  assert.deepEqual(p, { x: 2, y: 2 });
});
