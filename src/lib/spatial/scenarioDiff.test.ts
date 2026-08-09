import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffScenarios } from './scenarioDiff.ts';

function obj(id: string, x: number, y: number) {
  return { id, productId: 'p1', x, y, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} };
}

test('diffScenarios detects added/removed/moved/unchanged objects', () => {
  const before = { placedObjects: [obj('o1', 0, 0), obj('o2', 1, 1)], walls: [], zones: [] };
  const after = { placedObjects: [obj('o1', 0, 0), obj('o2', 5, 5), obj('o3', 2, 2)], walls: [], zones: [] };

  const diff = diffScenarios(before, after);
  assert.deepEqual(diff.objects, { added: 1, removed: 0, changed: 1, unchanged: 1 });
});

test('diffScenarios detects a removed object', () => {
  const before = { placedObjects: [obj('o1', 0, 0), obj('o2', 1, 1)], walls: [], zones: [] };
  const after = { placedObjects: [obj('o1', 0, 0)], walls: [], zones: [] };

  const diff = diffScenarios(before, after);
  assert.deepEqual(diff.objects, { added: 0, removed: 1, changed: 0, unchanged: 1 });
});

test('diffScenarios detects wall geometry changes independently of objects', () => {
  const wall1 = { id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 };
  const wall1Moved = { ...wall1, end: { x: 5, y: 0 } };
  const before = { placedObjects: [], walls: [wall1], zones: [] };
  const after = { placedObjects: [], walls: [wall1Moved], zones: [] };

  const diff = diffScenarios(before, after);
  assert.deepEqual(diff.walls, { added: 0, removed: 0, changed: 1, unchanged: 0 });
});

test('diffScenarios reports all-unchanged for identical layouts', () => {
  const layout = { placedObjects: [obj('o1', 0, 0)], walls: [], zones: [] };
  const diff = diffScenarios(layout, layout);
  assert.deepEqual(diff.objects, { added: 0, removed: 0, changed: 0, unchanged: 1 });
});
