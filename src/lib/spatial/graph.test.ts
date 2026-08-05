import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraphFromRoom } from './graph.ts';
import { evaluateConstraints } from './constraints.ts';
import type { RoomState } from './graph.ts';

function room(overrides: Partial<RoomState> = {}): RoomState {
  return {
    floorDims: { widthM: 6, lengthM: 6 },
    walls: [{ id: 'w1', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thicknessM: 0.1 }],
    doors: [],
    zones: [],
    placedObjects: [],
    ...overrides,
  };
}

test('object inside a zone gets an INSIDE edge to it', () => {
  const state = room({
    zones: [{ id: 'z1', kind: 'focus', x: 3, y: 3, widthM: 2, lengthM: 2, rotationDeg: 0 }],
    placedObjects: [
      { id: 'o1', productId: 'desk', x: 3, y: 3, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} },
    ],
  });
  const graph = buildGraphFromRoom(state);
  const edges = graph.edgesFrom('o1', { relation: 'INSIDE', layer: 'zone' });
  assert.equal(edges.length, 1);
  assert.equal(edges[0].target, 'z1');
});

test('object outside every zone gets no INSIDE edge, and unzoned_placement warns once zones exist', () => {
  const state = room({
    zones: [{ id: 'z1', kind: 'focus', x: 0, y: 0, widthM: 1, lengthM: 1, rotationDeg: 0 }],
    placedObjects: [
      { id: 'o1', productId: 'desk', x: 5, y: 5, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} },
    ],
  });
  const graph = buildGraphFromRoom(state);
  assert.equal(graph.edgesFrom('o1', { relation: 'INSIDE', layer: 'zone' }).length, 0);
  const violations = evaluateConstraints(state, graph);
  assert.ok(violations.some((v) => v.ruleId === 'unzoned_placement' && v.targetId === 'o1'));
});

test('no zones defined at all means no unzoned_placement noise', () => {
  const state = room({
    placedObjects: [
      { id: 'o1', productId: 'desk', x: 5, y: 5, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} },
    ],
  });
  const graph = buildGraphFromRoom(state);
  const violations = evaluateConstraints(state, graph);
  assert.ok(!violations.some((v) => v.ruleId === 'unzoned_placement'));
});

test('object against a wall gets an ADJACENT edge to it', () => {
  const state = room({
    placedObjects: [
      { id: 'o1', productId: 'shelf', x: 3, y: 0.15, rotationDeg: 0, footprintM: { w: 1, l: 0.4 }, customProperties: {} },
    ],
  });
  const graph = buildGraphFromRoom(state);
  const edges = graph.edgesFrom('o1', { relation: 'ADJACENT', layer: 'geometry' });
  assert.equal(edges.length, 1);
  assert.equal(edges[0].target, 'w1');
});

test('clearance violation still produces a blocker constraint (wraps existing clearance.ts)', () => {
  const state = room({
    placedObjects: [
      { id: 'o1', productId: 'desk', x: 3, y: 3, rotationDeg: 0, clearanceRadiusM: 1, footprintM: { w: 1, l: 1 }, customProperties: {} },
      { id: 'o2', productId: 'chair', x: 3.3, y: 3, rotationDeg: 0, clearanceRadiusM: 1, footprintM: { w: 0.5, l: 0.5 }, customProperties: {} },
    ],
  });
  const graph = buildGraphFromRoom(state);
  const violations = evaluateConstraints(state, graph);
  const blockers = violations.filter((v) => v.ruleId === 'clearance' && v.severity === 'blocker');
  assert.equal(blockers.length, 2); // both objects are within each other's clearance radius
});
