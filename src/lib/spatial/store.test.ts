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
    dimensions: [],
    layers: [{ id: 'layer-default', name: 'Default', visible: true, locked: false }],
    selectedObjectId: null,
    selectedWallId: null,
    selectedZoneId: null,
    selectedDimensionId: null,
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

test('selectZone is mutually exclusive with object/wall/dimension selection', () => {
  reset();
  const { addZone, addObject, selectZone, selectObject } = useRoomLayoutStore.getState();
  addZone({ id: 'z1', kind: 'focus', x: 2, y: 2, widthM: 2, lengthM: 2, rotationDeg: 0 });
  addObject({ id: 'o1', productId: 'crash-mat', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });

  selectObject('o1');
  assert.equal(useRoomLayoutStore.getState().selectedObjectId, 'o1');

  selectZone('z1');
  assert.equal(useRoomLayoutStore.getState().selectedZoneId, 'z1');
  assert.equal(useRoomLayoutStore.getState().selectedObjectId, null);

  selectObject('o1');
  assert.equal(useRoomLayoutStore.getState().selectedObjectId, 'o1');
  assert.equal(useRoomLayoutStore.getState().selectedZoneId, null);
});

test('updateZoneGeometry updates canonical zone fields and is undoable', () => {
  reset();
  const { addZone, updateZoneGeometry, undo } = useRoomLayoutStore.getState();
  addZone({ id: 'z1', kind: 'focus', x: 2, y: 2, widthM: 2, lengthM: 2, rotationDeg: 0 });

  updateZoneGeometry('z1', { widthM: 2.5, label: 'Reading nook' });
  const zone = useRoomLayoutStore.getState().zones.find((z) => z.id === 'z1')!;
  assert.equal(zone.widthM, 2.5);
  assert.equal(zone.label, 'Reading nook');

  undo();
  const reverted = useRoomLayoutStore.getState().zones.find((z) => z.id === 'z1')!;
  assert.equal(reverted.widthM, 2);
  assert.equal(reverted.label, undefined);
});

test('removeZone clears selection when the removed zone was selected', () => {
  reset();
  const { addZone, selectZone, removeZone } = useRoomLayoutStore.getState();
  addZone({ id: 'z1', kind: 'focus', x: 2, y: 2, widthM: 2, lengthM: 2, rotationDeg: 0 });
  selectZone('z1');
  assert.equal(useRoomLayoutStore.getState().selectedZoneId, 'z1');

  removeZone('z1');
  assert.equal(useRoomLayoutStore.getState().selectedZoneId, null);
  assert.equal(useRoomLayoutStore.getState().zones.length, 0);
});

test('updateWallGeometry can assign a wall to a layer (CAD Gap 4)', () => {
  reset();
  const { addWall, updateWallGeometry } = useRoomLayoutStore.getState();
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });

  updateWallGeometry('w1', { layerId: 'layer-arch' });
  const wall = useRoomLayoutStore.getState().walls.find((w) => w.id === 'w1')!;
  assert.equal(wall.layerId, 'layer-arch');
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

test('addDimension/removeDimension add and remove a real model entity (Gap 6)', () => {
  reset();
  const { addDimension, removeDimension, undo } = useRoomLayoutStore.getState();
  addDimension({ id: 'dim1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, offsetM: 0.3 });
  assert.equal(useRoomLayoutStore.getState().dimensions.length, 1);
  assert.equal(useRoomLayoutStore.getState().dimensions[0].id, 'dim1');

  removeDimension('dim1');
  assert.equal(useRoomLayoutStore.getState().dimensions.length, 0);

  // Both operations are real undoable commands, same as every other mutator.
  undo(); // undoes the remove
  assert.equal(useRoomLayoutStore.getState().dimensions.length, 1);
  undo(); // undoes the add
  assert.equal(useRoomLayoutStore.getState().dimensions.length, 0);
});

test('updateDimension can assign a dimension to a layer (CAD Gap 4)', () => {
  reset();
  const { addDimension, updateDimension } = useRoomLayoutStore.getState();
  addDimension({ id: 'dim1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, offsetM: 0.3 });

  updateDimension('dim1', { layerId: 'layer-arch' });
  const dim = useRoomLayoutStore.getState().dimensions.find((d) => d.id === 'dim1')!;
  assert.equal(dim.layerId, 'layer-arch');
});

test('selectDimension is mutually exclusive with object/wall selection', () => {
  reset();
  const { addDimension, addWall, addObject, selectDimension, selectWall, selectObject } = useRoomLayoutStore.getState();
  addDimension({ id: 'dim1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, offsetM: 0.3 });
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });
  addObject({ id: 'o1', productId: 'p1', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });

  selectDimension('dim1');
  assert.equal(useRoomLayoutStore.getState().selectedDimensionId, 'dim1');
  assert.equal(useRoomLayoutStore.getState().selectedWallId, null);
  assert.equal(useRoomLayoutStore.getState().selectedObjectId, null);

  selectWall('w1');
  assert.equal(useRoomLayoutStore.getState().selectedDimensionId, null);

  selectDimension('dim1');
  selectObject('o1');
  assert.equal(useRoomLayoutStore.getState().selectedDimensionId, null);
});

test('addLayer/updateLayer/removeLayer manage real layer entities (Gap 4)', () => {
  reset();
  const { addLayer, updateLayer, removeLayer, addObject, setObjectLayer } = useRoomLayoutStore.getState();
  addLayer({ id: 'layer-arch', name: 'Architecture', visible: true, locked: false });
  assert.equal(useRoomLayoutStore.getState().layers.length, 2); // seeded default + new

  updateLayer('layer-arch', { visible: false, locked: true });
  const layer = useRoomLayoutStore.getState().layers.find((l) => l.id === 'layer-arch')!;
  assert.equal(layer.visible, false);
  assert.equal(layer.locked, true);

  addObject({ id: 'o1', productId: 'p1', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  setObjectLayer('o1', 'layer-arch');
  assert.equal(useRoomLayoutStore.getState().placedObjects[0].layerId, 'layer-arch');

  // Deleting the layer never leaves an object pointing at a dangling layerId.
  removeLayer('layer-arch');
  assert.equal(useRoomLayoutStore.getState().layers.length, 1);
  assert.equal(useRoomLayoutStore.getState().placedObjects[0].layerId, 'layer-default');
});
