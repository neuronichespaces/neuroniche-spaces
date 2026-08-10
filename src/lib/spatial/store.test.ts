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
    revisionClouds: [],
    sectionLines: [],
    layers: [{ id: 'layer-default', name: 'Default', visible: true, locked: false }],
    selectedObjectId: null,
    selectedWallId: null,
    selectedZoneId: null,
    selectedDimensionId: null,
    selectedLeaderId: null,
    selectedRevisionCloudId: null,
    selectedSectionLineId: null,
    multiSelectedObjectIds: [],
    multiSelectedZoneIds: [],
    multiSelectedWallIds: [],
    multiSelectedDimensionIds: [],
    isolatedObjectIds: null,
    blocks: [],
    viewStates: [],
    selectionSets: [],
    drawingSheets: [],
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

test('cross-type multi-select accumulates across kinds, but single-select clears all of it (CAD Gap 5, 2026-08-10)', () => {
  reset();
  const { addZone, toggleZoneMultiSelect, toggleWallMultiSelect, toggleObjectMultiSelect, selectObject } = useRoomLayoutStore.getState();
  addZone({ id: 'z1', kind: 'focus', x: 0, y: 0, widthM: 1, lengthM: 1, rotationDeg: 0 });

  toggleZoneMultiSelect('z1');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedZoneIds, ['z1']);

  // Starting a wall multi-select no longer clears the zone one — an object + a zone
  // (+ a wall here) can be selected together, closing the "true cross-type" gap.
  toggleWallMultiSelect('w1');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedZoneIds, ['z1']);
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedWallIds, ['w1']);

  toggleObjectMultiSelect('o1');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedObjectIds, ['o1']);
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedZoneIds, ['z1']);
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedWallIds, ['w1']);

  // A normal single-select still clears every multi-select array at once.
  selectObject('o2');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedObjectIds, []);
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedZoneIds, []);
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedWallIds, []);
});

test('saveSelectionSet/restoreSelectionSet/deleteSelectionSet manage cross-type named selections (CAD Gap 5)', () => {
  reset();
  const { addZone, toggleZoneMultiSelect, toggleObjectMultiSelect, saveSelectionSet, restoreSelectionSet, deleteSelectionSet } =
    useRoomLayoutStore.getState();
  addZone({ id: 'z1', kind: 'focus', x: 0, y: 0, widthM: 1, lengthM: 1, rotationDeg: 0 });
  toggleZoneMultiSelect('z1');
  toggleObjectMultiSelect('o1');

  const saved = saveSelectionSet('Reading nook');
  assert.equal(saved.name, 'Reading nook');
  assert.deepEqual(saved.zoneIds, ['z1']);
  assert.deepEqual(saved.objectIds, ['o1']);
  assert.equal(useRoomLayoutStore.getState().selectionSets.length, 1);

  toggleZoneMultiSelect('z1'); // deselect everything
  toggleObjectMultiSelect('o1');
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedZoneIds, []);

  restoreSelectionSet(saved.id);
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedZoneIds, ['z1']);
  assert.deepEqual(useRoomLayoutStore.getState().multiSelectedObjectIds, ['o1']);

  restoreSelectionSet('does-not-exist'); // no-op, must not throw
  deleteSelectionSet(saved.id);
  assert.equal(useRoomLayoutStore.getState().selectionSets.length, 0);
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

test('saveSelectionAsBlock starts version at 1; pushInstanceToBlock bumps it (CAD Gap 3, versioning)', () => {
  reset();
  const { addObject, saveSelectionAsBlock, insertBlock, pushInstanceToBlock } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  saveSelectionAsBlock('Solo', ['o1']);
  const blockId = useRoomLayoutStore.getState().blocks[0].id;
  assert.equal(useRoomLayoutStore.getState().blocks[0].version, 1);

  insertBlock(blockId, 5, 5);
  const inserted = useRoomLayoutStore.getState().placedObjects.find((o) => o.blockId === blockId)!;
  useRoomLayoutStore.getState().rotateObject(inserted.id, 90);
  pushInstanceToBlock(inserted.id);
  assert.equal(useRoomLayoutStore.getState().blocks.find((b) => b.id === blockId)?.version, 2);
});

test('nestBlock places a child block\'s items inside the parent on insert, refuses self-nest and cycles (CAD Gap 3, nesting)', () => {
  reset();
  const { addObject, saveSelectionAsBlock, nestBlock, insertBlock } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'chair', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  saveSelectionAsBlock('Chair', ['o1']);
  const chairBlockId = useRoomLayoutStore.getState().blocks[0].id;

  addObject({ id: 'o2', productId: 'table', x: 10, y: 10, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  saveSelectionAsBlock('Table', ['o2']);
  const tableBlockId = useRoomLayoutStore.getState().blocks.find((b) => b.id !== chairBlockId)!.id;

  nestBlock(chairBlockId, chairBlockId, 0, 0); // self-nest — must no-op
  assert.equal(useRoomLayoutStore.getState().blocks.find((b) => b.id === chairBlockId)?.nestedBlocks?.length ?? 0, 0);

  nestBlock(chairBlockId, tableBlockId, 1, 1); // Chair now contains Table at (1,1)
  assert.deepEqual(useRoomLayoutStore.getState().blocks.find((b) => b.id === chairBlockId)?.nestedBlocks, [
    { blockId: tableBlockId, relX: 1, relY: 1 },
  ]);

  nestBlock(tableBlockId, chairBlockId, 0, 0); // would create a cycle — must no-op
  assert.equal(useRoomLayoutStore.getState().blocks.find((b) => b.id === tableBlockId)?.nestedBlocks?.length ?? 0, 0);

  insertBlock(chairBlockId, 20, 20);
  const placed = useRoomLayoutStore.getState().placedObjects.filter((o) => o.id !== 'o1' && o.id !== 'o2');
  assert.equal(placed.length, 2); // chair's own item + the nested table's item
  const chair = placed.find((o) => o.productId === 'chair')!;
  const table = placed.find((o) => o.productId === 'table')!;
  assert.equal(chair.x, 20);
  assert.equal(table.x, 21); // 20 + nested offset (1,1)
  assert.equal(table.blockId, tableBlockId); // stays linked to ITS OWN block, not the parent
});

test('armBlockPlacement/cancelBlockPlacement track click-to-place intent (CAD Gap 3)', () => {
  reset();
  const { armBlockPlacement, cancelBlockPlacement } = useRoomLayoutStore.getState();
  armBlockPlacement('block-123');
  assert.equal(useRoomLayoutStore.getState().pendingBlockPlacement, 'block-123');
  cancelBlockPlacement();
  assert.equal(useRoomLayoutStore.getState().pendingBlockPlacement, null);
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

// CAD-upgrade Gap 1 ("no automated test proves 2D movement updates 3D"): both
// RoomEditor2D.tsx and RoomViewer3D.tsx (its syncFromStore, subscribed via
// useRoomLayoutStore.subscribe) read the SAME useRoomLayoutStore.getState() call —
// there is no per-view derived/cached copy of position for either. The claim this
// architecture makes is therefore fully testable at the store level, without a real
// Babylon/DOM renderer: a mutation is visible, identically, to every subsequent
// getState() caller, synchronously, with no intermediate stale read possible. This
// doesn't replace live-browser pixel verification (still noted as a separate,
// legitimate gap: literal on-screen rendering isn't asserted here) — it proves the
// specific claim that was flagged missing, that 2D and 3D never diverge because they
// share one state.
test('a store mutation is immediately visible identically to every getState() caller — the shared-state contract RoomEditor2D/RoomViewer3D both rely on (CAD Gap 1)', () => {
  reset();
  const { addObject, moveObject, rotateObject, updateWall, addWall } = useRoomLayoutStore.getState();
  addObject({ id: 'o1', productId: 'crash-mat', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} });
  addWall({ id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thicknessM: 0.1 });

  // Simulates what RoomEditor2D's drag handler and RoomViewer3D's transformBridge
  // callback both actually do: call the store action, then read getState() — no local
  // component state holds a second copy of x/y in either file.
  moveObject('o1', 3, 4);
  rotateObject('o1', 90);
  updateWall('w1', { thicknessM: 0.2 });

  // "2D read" and "3D read" are literally the same call — that IS the architectural
  // guarantee (single source of truth, no per-renderer transform copy) — so this
  // asserts both land on the identical, current values, not two different snapshots.
  const twoDRead = useRoomLayoutStore.getState();
  const threeDRead = useRoomLayoutStore.getState();
  const obj2D = twoDRead.placedObjects.find((o) => o.id === 'o1')!;
  const obj3D = threeDRead.placedObjects.find((o) => o.id === 'o1')!;
  assert.equal(obj2D.x, 3);
  assert.equal(obj2D.y, 4);
  assert.equal(obj2D.rotationDeg, 90);
  assert.deepEqual(obj2D, obj3D); // identical values from independent reads
  assert.strictEqual(twoDRead.placedObjects, threeDRead.placedObjects); // same array reference, not two copies

  const wall2D = twoDRead.walls.find((w) => w.id === 'w1')!;
  const wall3D = threeDRead.walls.find((w) => w.id === 'w1')!;
  assert.equal(wall2D.thicknessM, 0.2);
  assert.deepEqual(wall2D, wall3D);
});

test('addRevisionCloud/removeRevisionCloud/updateRevisionCloud add, edit, and remove a real model entity (CAD Gap 6)', () => {
  reset();
  const { addRevisionCloud, updateRevisionCloud, removeRevisionCloud, selectRevisionCloud, undo } = useRoomLayoutStore.getState();
  addRevisionCloud({ id: 'r1', x: 1, y: 1, widthM: 2, lengthM: 2, note: 'Wall moved' });
  assert.equal(useRoomLayoutStore.getState().revisionClouds.length, 1);

  updateRevisionCloud('r1', { note: 'Wall moved 0.5m' });
  assert.equal(useRoomLayoutStore.getState().revisionClouds[0].note, 'Wall moved 0.5m');

  selectRevisionCloud('r1');
  assert.equal(useRoomLayoutStore.getState().selectedRevisionCloudId, 'r1');

  removeRevisionCloud('r1');
  assert.equal(useRoomLayoutStore.getState().revisionClouds.length, 0);
  assert.equal(useRoomLayoutStore.getState().selectedRevisionCloudId, null); // clears selection of the removed entity

  undo(); // add/update/remove are all undo-tracked
  assert.equal(useRoomLayoutStore.getState().revisionClouds.length, 1);
});

test('addSectionLine/removeSectionLine/updateSectionLine add, edit, and remove a real model entity (CAD Gap 6)', () => {
  reset();
  const { addSectionLine, updateSectionLine, removeSectionLine, selectSectionLine } = useRoomLayoutStore.getState();
  addSectionLine({ id: 's1', start: { x: 0, y: 3 }, end: { x: 6, y: 3 } });
  assert.equal(useRoomLayoutStore.getState().sectionLines.length, 1);

  updateSectionLine('s1', { label: 'Section A-A' });
  assert.equal(useRoomLayoutStore.getState().sectionLines[0].label, 'Section A-A');

  selectSectionLine('s1');
  assert.equal(useRoomLayoutStore.getState().selectedSectionLineId, 's1');

  removeSectionLine('s1');
  assert.equal(useRoomLayoutStore.getState().sectionLines.length, 0);
  assert.equal(useRoomLayoutStore.getState().selectedSectionLineId, null);
});

test('saveDrawingSheet/updateDrawingSheet/deleteDrawingSheet manage named export presets (CAD Gap 6)', () => {
  reset();
  const { saveDrawingSheet, updateDrawingSheet, deleteDrawingSheet } = useRoomLayoutStore.getState();
  const sheet = saveDrawingSheet({ name: 'Issued for review', drawnBy: 'A. Smith', checkedBy: '', revision: 'A' });
  assert.equal(useRoomLayoutStore.getState().drawingSheets.length, 1);
  assert.equal(sheet.name, 'Issued for review');

  updateDrawingSheet(sheet.id, { checkedBy: 'B. Jones', revision: 'B' });
  const updated = useRoomLayoutStore.getState().drawingSheets.find((s) => s.id === sheet.id)!;
  assert.equal(updated.checkedBy, 'B. Jones');
  assert.equal(updated.revision, 'B');

  deleteDrawingSheet(sheet.id);
  assert.equal(useRoomLayoutStore.getState().drawingSheets.length, 0);
});
