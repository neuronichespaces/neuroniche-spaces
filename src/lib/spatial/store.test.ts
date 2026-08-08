// Store logic tests for the Spatial Design Engine — focuses on the audit-fix
// surfaces: resize-writes-footprintM, single-door-per-wall, and undo/redo.
// Store uses 'use client' + zustand; node:test can still import and drive it
// directly since zustand's create() has no DOM dependency.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useRoomLayoutStore } from './store.ts';

function reset() {
  useRoomLayoutStore.setState({
    walls: [],
    doors: [],
    floorDims: { widthM: 6, lengthM: 6 },
    placedObjects: [],
    zones: [],
    selectedObjectId: null,
    selectedWallId: null,
    clearanceViolations: new Set(),
    hasLoadedInitialData: false,
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,
  });
}

test('updateObjectProps writes widthM/depthM into footprintM (B2)', () => {
  reset();
  const { addObject, updateObjectProps } = useRoomLayoutStore.getState();
  addObject({
    id: 'o1',
    productId: 'crash-mat',
    x: 1,
    y: 1,
    rotationDeg: 0,
    footprintM: { w: 1, l: 1 },
    customProperties: {},
  });
  updateObjectProps('o1', { widthM: 2.5, depthM: 1.5, heightM: 0.4 });
  const obj = useRoomLayoutStore.getState().placedObjects.find((o) => o.id === 'o1')!;
  assert.equal(obj.footprintM.w, 2.5);
  assert.equal(obj.footprintM.l, 1.5);
  // heightM has no footprintM slot — stays in customProperties only
  assert.equal(obj.customProperties.heightM, 0.4);
});

test('addDoor replaces any existing door on the same wall (B1)', () => {
  reset();
  const { addDoor } = useRoomLayoutStore.getState();
  addDoor({ wallId: 'w1', offsetM: 0.2, widthM: 0.8 });
  addDoor({ wallId: 'w1', offsetM: 1.0, widthM: 0.9 });
  const doors = useRoomLayoutStore.getState().doors;
  assert.equal(doors.length, 1);
  assert.equal(doors[0].offsetM, 1.0);
});

test('undo/redo restores structural mutations, not selection', () => {
  reset();
  const { addObject, moveObject, selectObject, undo, redo } = useRoomLayoutStore.getState();
  addObject({
    id: 'o1',
    productId: 'crash-mat',
    x: 1,
    y: 1,
    rotationDeg: 0,
    footprintM: { w: 1, l: 1 },
    customProperties: {},
  });
  moveObject('o1', 3, 3);
  selectObject('o1');
  assert.equal(useRoomLayoutStore.getState().placedObjects[0].x, 3);

  undo();
  assert.equal(useRoomLayoutStore.getState().placedObjects[0].x, 1);
  // selection is transient and untouched by undo
  assert.equal(useRoomLayoutStore.getState().selectedObjectId, 'o1');

  undo();
  assert.equal(useRoomLayoutStore.getState().placedObjects.length, 0);
  assert.equal(useRoomLayoutStore.getState().canUndo, false);

  redo();
  assert.equal(useRoomLayoutStore.getState().placedObjects.length, 1);
  redo();
  assert.equal(useRoomLayoutStore.getState().placedObjects[0].x, 3);
  assert.equal(useRoomLayoutStore.getState().canRedo, false);
});

test('selectWall and selectObject are mutually exclusive', () => {
  reset();
  const { addWall, addObject, selectWall, selectObject } = useRoomLayoutStore.getState();
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });
  addObject({ id: 'o1', productId: 'crash-mat', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });

  selectObject('o1');
  assert.equal(useRoomLayoutStore.getState().selectedObjectId, 'o1');
  assert.equal(useRoomLayoutStore.getState().selectedWallId, null);

  selectWall('w1');
  assert.equal(useRoomLayoutStore.getState().selectedWallId, 'w1');
  assert.equal(useRoomLayoutStore.getState().selectedObjectId, null);
});

test('updateWallGeometry updates canonical wall fields and is undoable', () => {
  reset();
  const { addWall, updateWallGeometry, undo } = useRoomLayoutStore.getState();
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });

  updateWallGeometry('w1', { end: { x: 4, y: 3 }, thicknessM: 0.2 });
  const wall = useRoomLayoutStore.getState().walls.find((w) => w.id === 'w1')!;
  assert.deepEqual(wall.end, { x: 4, y: 3 });
  assert.equal(wall.thicknessM, 0.2);

  undo();
  const reverted = useRoomLayoutStore.getState().walls.find((w) => w.id === 'w1')!;
  assert.deepEqual(reverted.end, { x: 4, y: 0 });
  assert.equal(reverted.thicknessM, 0.1);
});

test('history entries carry a plain-language command description and a stable id', () => {
  reset();
  const { addWall, updateWallGeometry } = useRoomLayoutStore.getState();
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });
  updateWallGeometry('w1', { thicknessM: 0.15 });
  const past = useRoomLayoutStore.getState().past;
  assert.equal(past[0].lastCommandDescription, 'Add wall');
  assert.equal(past[1].lastCommandDescription, 'Edit wall geometry');
  assert.equal(typeof past[0].id, 'string');
  assert.notEqual(past[0].id, past[1].id);
});

test('undo/redo preserve the command id across the past/future move', () => {
  reset();
  const { addWall, undo, redo } = useRoomLayoutStore.getState();
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });
  const originalId = useRoomLayoutStore.getState().past[0].id;

  undo();
  assert.equal(useRoomLayoutStore.getState().future[0].id, originalId);

  redo();
  assert.equal(useRoomLayoutStore.getState().past[0].id, originalId);
});

test('jumpToCommand jumps backward into past by id, in one multi-step move', () => {
  reset();
  const { addWall, addObject, jumpToCommand } = useRoomLayoutStore.getState();
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });
  const targetId = useRoomLayoutStore.getState().past[0].id; // "Add wall" command
  addObject({ id: 'o1', productId: 'p1', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  addObject({ id: 'o2', productId: 'p2', x: 2, y: 2, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });

  jumpToCommand(targetId);

  const s = useRoomLayoutStore.getState();
  // Restored to the state right before "Add wall" — i.e. before anything happened.
  assert.equal(s.walls.length, 0);
  assert.equal(s.placedObjects.length, 0);
  // The two later commands (add o1, add o2) are now redoable, plus the wall command itself.
  assert.equal(s.future.length, 3);
});

test('jumpToCommand jumps forward into future by id, in one multi-step move', () => {
  reset();
  const { addWall, addObject, undo, jumpToCommand } = useRoomLayoutStore.getState();
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });
  addObject({ id: 'o1', productId: 'p1', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  addObject({ id: 'o2', productId: 'p2', x: 2, y: 2, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  undo();
  undo();
  undo();
  // Now fully undone: nothing exists, all 3 commands sit in `future`.
  const targetId = useRoomLayoutStore.getState().future[1].id; // the "add o1" command

  jumpToCommand(targetId);

  const s = useRoomLayoutStore.getState();
  assert.equal(s.walls.length, 1);
  assert.equal(s.placedObjects.length, 1);
  assert.equal(s.placedObjects[0].id, 'o1');
  // Only "add o2" remains ahead in future.
  assert.equal(s.future.length, 1);
});

test('jumpToCommand no-ops on an unknown id', () => {
  reset();
  const { addWall, jumpToCommand } = useRoomLayoutStore.getState();
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });
  jumpToCommand('does-not-exist');
  assert.equal(useRoomLayoutStore.getState().walls.length, 1);
});
