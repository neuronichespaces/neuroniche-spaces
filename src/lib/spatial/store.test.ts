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
    leaders: [],
    layers: [{ id: 'layer-default', name: 'Default', visible: true, locked: false }],
    selectedObjectId: null,
    selectedWallId: null,
    selectedZoneId: null,
    selectedDimensionId: null,
    selectedLeaderId: null,
    multiSelectedObjectIds: [],
    multiSelectedZoneIds: [],
    multiSelectedWallIds: [],
    multiSelectedDimensionIds: [],
    isolatedObjectIds: null,
    blocks: [],
    viewStates: [],
    auditLog: [],
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

test('toggleObjectMultiSelect adds/removes ids and clears single selection (CAD Gap 5)', () => {
  reset();
  const { addObject, selectObject, toggleObjectMultiSelect } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  addObject({ id: 'o2', productId: 'p2', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  selectObject('o1');

  toggleObjectMultiSelect('o1');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedObjectIds, ['o1']);
  assert.equal(useRoomLayoutStore.getState().selectedObjectId, null);

  toggleObjectMultiSelect('o2');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedObjectIds, ['o1', 'o2']);

  toggleObjectMultiSelect('o1');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedObjectIds, ['o2']);
});

test('batchRemoveObjects deletes all given ids and clears multi-select (CAD Gap 5)', () => {
  reset();
  const { addObject, toggleObjectMultiSelect, batchRemoveObjects } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  addObject({ id: 'o2', productId: 'p2', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  addObject({ id: 'o3', productId: 'p3', x: 2, y: 2, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  toggleObjectMultiSelect('o1');
  toggleObjectMultiSelect('o2');

  batchRemoveObjects(['o1', 'o2']);
  const remaining = useRoomLayoutStore.getState().placedObjects.map((o) => o.id);
  assert.deepEqual(remaining, ['o3']);
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedObjectIds, []);
});

test('batchSetObjectLayer/batchSetObjectsLocked/batchSetObjectsHidden apply to every given id (CAD Gap 5)', () => {
  reset();
  const { addObject, batchSetObjectLayer, batchSetObjectsLocked, batchSetObjectsHidden } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  addObject({ id: 'o2', productId: 'p2', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });

  batchSetObjectLayer(['o1', 'o2'], 'layer-arch');
  batchSetObjectsLocked(['o1', 'o2'], true);
  batchSetObjectsHidden(['o1', 'o2'], true);

  const objects = useRoomLayoutStore.getState().placedObjects;
  assert.ok(objects.every((o) => o.layerId === 'layer-arch' && o.locked === true && o.hidden === true));
});

test('isolateObjects/unisolate toggle the transient view filter (CAD Gap 5)', () => {
  reset();
  const { isolateObjects, unisolate } = useRoomLayoutStore.getState();
  assert.equal(useRoomLayoutStore.getState().isolatedObjectIds, null);

  isolateObjects(['o1', 'o2']);
  assert.deepEqual(useRoomLayoutStore.getState().isolatedObjectIds, ['o1', 'o2']);

  unisolate();
  assert.equal(useRoomLayoutStore.getState().isolatedObjectIds, null);
});

test('every mutate() call appends a persisted audit log entry, unaffected by undo (CAD Gap 7)', () => {
  reset();
  const { addWall, addObject, undo } = useRoomLayoutStore.getState();
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });

  const log = useRoomLayoutStore.getState().auditLog;
  assert.equal(log.length, 2);
  assert.equal(log[0].description, 'Add wall');
  assert.equal(log[1].description, 'Add object');
  assert.ok(log[0].id); // same command id convention as past/future entries
  assert.ok(typeof log[0].timestamp === 'number');

  // Undo rewinds the model, but the audit trail is a record of what happened —
  // it must NOT shrink back down, unlike `past`/`future`.
  undo();
  assert.equal(useRoomLayoutStore.getState().auditLog.length, 2);
});

test('zone/wall/dimension multi-select is mutually exclusive with each other and with single-selection (CAD Gap 5)', () => {
  reset();
  const { addZone, toggleZoneMultiSelect, toggleWallMultiSelect, selectObject } = useRoomLayoutStore.getState();
  addZone({ id: 'z1', kind: 'focus', x: 0, y: 0, widthM: 1, lengthM: 1, rotationDeg: 0 });

  toggleZoneMultiSelect('z1');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedZoneIds, ['z1']);

  // Starting a wall multi-select clears the zone one — only one kind active at a time.
  toggleWallMultiSelect('w1');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedZoneIds, []);
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedWallIds, ['w1']);

  // A normal single-select clears whichever multi-select was active.
  selectObject('o1');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedWallIds, []);
});

test('batchSetZoneLayer/batchRemoveZones apply to exactly the given ids and clear the selection (CAD Gap 5)', () => {
  reset();
  const { addZone, addLayer, toggleZoneMultiSelect, batchSetZoneLayer, batchRemoveZones } = useRoomLayoutStore.getState();
  addZone({ id: 'z1', kind: 'focus', x: 0, y: 0, widthM: 1, lengthM: 1, rotationDeg: 0 });
  addZone({ id: 'z2', kind: 'calm', x: 2, y: 0, widthM: 1, lengthM: 1, rotationDeg: 0 });
  addLayer({ id: 'layer-arch', name: 'Architecture', visible: true, locked: false });
  toggleZoneMultiSelect('z1');
  toggleZoneMultiSelect('z2');

  batchSetZoneLayer(['z1', 'z2'], 'layer-arch');
  assert.ok(useRoomLayoutStore.getState().zones.every((z) => z.layerId === 'layer-arch'));

  batchRemoveZones(['z1']);
  assert.equal(useRoomLayoutStore.getState().zones.length, 1);
  assert.equal(useRoomLayoutStore.getState().zones[0].id, 'z2');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedZoneIds, []);
});

test('batchRemoveWalls clears associated doors, same rule as the single removeWall (CAD Gap 5)', () => {
  reset();
  const { addWall, addDoor, batchRemoveWalls } = useRoomLayoutStore.getState();
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });
  addDoor({ wallId: 'w1', offsetM: 1, widthM: 0.9 });

  batchRemoveWalls(['w1']);
  assert.equal(useRoomLayoutStore.getState().walls.length, 0);
  assert.equal(useRoomLayoutStore.getState().doors.length, 0);
});

test('batchSetDimensionLayer/batchRemoveDimensions apply to exactly the given ids (CAD Gap 5)', () => {
  reset();
  const { addDimension, addLayer, batchSetDimensionLayer, batchRemoveDimensions } = useRoomLayoutStore.getState();
  addDimension({ id: 'd1', start: { x: 0, y: 0 }, end: { x: 2, y: 0 }, offsetM: 0.3 });
  addDimension({ id: 'd2', start: { x: 0, y: 1 }, end: { x: 2, y: 1 }, offsetM: 0.3 });
  addLayer({ id: 'layer-dim', name: 'Dims', visible: true, locked: false });

  batchSetDimensionLayer(['d1'], 'layer-dim');
  assert.equal(useRoomLayoutStore.getState().dimensions.find((d) => d.id === 'd1')?.layerId, 'layer-dim');
  assert.equal(useRoomLayoutStore.getState().dimensions.find((d) => d.id === 'd2')?.layerId, undefined);

  batchRemoveDimensions(['d1', 'd2']);
  assert.equal(useRoomLayoutStore.getState().dimensions.length, 0);
});

test('saveSelectionAsBlock captures items relative to the selection centroid (CAD Gap 3)', () => {
  reset();
  const { addObject, saveSelectionAsBlock } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  addObject({ id: 'o2', productId: 'p2', x: 2, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });

  saveSelectionAsBlock('Reading Corner', ['o1', 'o2']);
  const blocks = useRoomLayoutStore.getState().blocks;
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].name, 'Reading Corner');
  assert.equal(blocks[0].items.length, 2);
  // Centroid of (0,0) and (2,0) is (1,0) — items stored relative to it.
  const relXs = blocks[0].items.map((i) => i.relX).sort();
  assert.deepEqual(relXs, [-1, 1]);
});

test('insertBlock places a new detached instance offset from the target point, undoably (CAD Gap 3)', () => {
  reset();
  const { addObject, saveSelectionAsBlock, insertBlock, undo } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  addObject({ id: 'o2', productId: 'p2', x: 2, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  saveSelectionAsBlock('Pair', ['o1', 'o2']);
  const blockId = useRoomLayoutStore.getState().blocks[0].id;

  insertBlock(blockId, 5, 5);
  const objects = useRoomLayoutStore.getState().placedObjects;
  assert.equal(objects.length, 4); // original 2 + 2 new
  const newXs = objects.slice(2).map((o) => o.x).sort((a, b) => a - b);
  assert.deepEqual(newXs, [4, 6]); // 5 + (-1) and 5 + 1

  undo();
  assert.equal(useRoomLayoutStore.getState().placedObjects.length, 2); // insert is undoable
});

test('removeBlock deletes from the library without touching placed objects (CAD Gap 3)', () => {
  reset();
  const { addObject, saveSelectionAsBlock, removeBlock } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  saveSelectionAsBlock('Solo', ['o1']);
  const blockId = useRoomLayoutStore.getState().blocks[0].id;

  removeBlock(blockId);
  assert.equal(useRoomLayoutStore.getState().blocks.length, 0);
  assert.equal(useRoomLayoutStore.getState().placedObjects.length, 1);
});

test('insertBlock tags new instances with blockId/blockItemIndex (CAD Gap 3, linked instances)', () => {
  reset();
  const { addObject, saveSelectionAsBlock, insertBlock } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  saveSelectionAsBlock('Solo', ['o1']);
  const blockId = useRoomLayoutStore.getState().blocks[0].id;

  insertBlock(blockId, 3, 3);
  const inserted = useRoomLayoutStore.getState().placedObjects.find((o) => o.id !== 'o1')!;
  assert.equal(inserted.blockId, blockId);
  assert.equal(inserted.blockItemIndex, 0);
});

test('pushInstanceToBlock syncs shared fields (not position) to the block and every sibling instance (CAD Gap 3)', () => {
  reset();
  const { addObject, saveSelectionAsBlock, insertBlock, pushInstanceToBlock, undo } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  saveSelectionAsBlock('Solo', ['o1']);
  const blockId = useRoomLayoutStore.getState().blocks[0].id;
  insertBlock(blockId, 5, 5);
  insertBlock(blockId, 9, 9);
  const [a, b] = useRoomLayoutStore.getState().placedObjects.filter((o) => o.blockId === blockId);

  useRoomLayoutStore.getState().updateObjectProps(a.id, { widthM: 2 });
  useRoomLayoutStore.getState().rotateObject(a.id, 45);
  pushInstanceToBlock(a.id);

  const block = useRoomLayoutStore.getState().blocks.find((bl) => bl.id === blockId)!;
  assert.equal(block.items[0].footprintM.w, 2);
  assert.equal(block.items[0].rotationDeg, 45);

  const bAfter = useRoomLayoutStore.getState().placedObjects.find((o) => o.id === b.id)!;
  assert.equal(bAfter.footprintM.w, 2); // propagated to the sibling instance
  assert.equal(bAfter.rotationDeg, 45);
  assert.equal(bAfter.x, 9); // position untouched — each instance keeps its own placement

  undo(); // the push itself is undoable (placedObjects side)
  const bUndone = useRoomLayoutStore.getState().placedObjects.find((o) => o.id === b.id)!;
  assert.equal(bUndone.footprintM.w, 1);
});

test('pushInstanceToBlock no-ops on a non-linked object', () => {
  reset();
  const { addObject, pushInstanceToBlock } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  pushInstanceToBlock('o1'); // no blockId — must not throw
  assert.equal(useRoomLayoutStore.getState().placedObjects[0].footprintM.w, 1);
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

test('addLeader/removeLeader add and remove a real model entity (CAD Gap 6)', () => {
  reset();
  const { addLeader, removeLeader, undo } = useRoomLayoutStore.getState();
  addLeader({ id: 'l1', anchor: { x: 1, y: 1 }, labelPoint: { x: 2, y: 0.5 }, text: 'Mount switch here' });
  assert.equal(useRoomLayoutStore.getState().leaders.length, 1);
  assert.equal(useRoomLayoutStore.getState().leaders[0].text, 'Mount switch here');

  removeLeader('l1');
  assert.equal(useRoomLayoutStore.getState().leaders.length, 0);

  undo(); // undoes the remove
  assert.equal(useRoomLayoutStore.getState().leaders.length, 1);
  undo(); // undoes the add
  assert.equal(useRoomLayoutStore.getState().leaders.length, 0);
});

test('updateLeader edits text/layer, and selectLeader is mutually exclusive (CAD Gap 6)', () => {
  reset();
  const { addLeader, updateLeader, selectLeader, selectObject, addObject } = useRoomLayoutStore.getState();
  addLeader({ id: 'l1', anchor: { x: 1, y: 1 }, labelPoint: { x: 2, y: 0.5 }, text: 'Original' });
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });

  updateLeader('l1', { text: 'Updated', layerId: 'layer-arch' });
  const leader = useRoomLayoutStore.getState().leaders.find((l) => l.id === 'l1')!;
  assert.equal(leader.text, 'Updated');
  assert.equal(leader.layerId, 'layer-arch');

  selectLeader('l1');
  assert.equal(useRoomLayoutStore.getState().selectedLeaderId, 'l1');

  selectObject('o1');
  assert.equal(useRoomLayoutStore.getState().selectedObjectId, 'o1');
  assert.equal(useRoomLayoutStore.getState().selectedLeaderId, null);
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

test('saveViewState/deleteViewState manage a real, persisted-shape entity (CAD Gap 4)', () => {
  reset();
  const { saveViewState, deleteViewState } = useRoomLayoutStore.getState();
  const camera = { cameraAlpha: 1.1, cameraBeta: 0.9, cameraRadius: 5, cameraTarget: { x: 1, y: 0, z: 2 } };
  const saved = saveViewState('Overview', camera);
  assert.equal(useRoomLayoutStore.getState().viewStates.length, 1);
  assert.equal(saved.name, 'Overview');
  assert.deepEqual(saved.cameraTarget, camera.cameraTarget);
  assert.deepEqual(saved.layerVisibility, { 'layer-default': true });

  deleteViewState(saved.id);
  assert.equal(useRoomLayoutStore.getState().viewStates.length, 0);
});

test('restoreViewState applies saved layer visibility and skips deleted layers, no-ops on unknown id', () => {
  reset();
  const { addLayer, updateLayer, saveViewState, restoreViewState, removeLayer } = useRoomLayoutStore.getState();
  addLayer({ id: 'layer-arch', name: 'Architecture', visible: true, locked: false });
  const camera = { cameraAlpha: 0, cameraBeta: 0, cameraRadius: 1, cameraTarget: { x: 0, y: 0, z: 0 } };
  const saved = saveViewState('Both visible', camera);

  updateLayer('layer-default', { visible: false });
  updateLayer('layer-arch', { visible: false });
  removeLayer('layer-arch'); // the saved state still references it — must not throw or resurrect it

  const restored = restoreViewState(saved.id);
  assert.equal(restored?.id, saved.id);
  assert.equal(useRoomLayoutStore.getState().layers.find((l) => l.id === 'layer-default')?.visible, true);
  assert.equal(useRoomLayoutStore.getState().layers.some((l) => l.id === 'layer-arch'), false);

  assert.equal(restoreViewState('does-not-exist'), undefined);
});
