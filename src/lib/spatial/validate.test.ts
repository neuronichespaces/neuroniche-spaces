import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRoomLayout } from './validate.ts';

const validLayout = {
  walls: [{ id: 'w1', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, thicknessM: 0.1 }],
  doors: [{ wallId: 'w1', offsetM: 0.5, widthM: 0.9 }],
  floorDims: { widthM: 6, lengthM: 6 },
  placedObjects: [
    { id: 'o1', productId: 'p1', x: 1, y: 1, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {} },
  ],
  zones: [{ id: 'z1', kind: 'calm', x: 1, y: 1, widthM: 2, lengthM: 2, rotationDeg: 0 }],
  dimensions: [{ id: 'd1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, offsetM: 0.3 }],
  layers: [{ id: 'layer-default', name: 'Default', visible: true, locked: false }],
  leaders: [{ id: 'l1', anchor: { x: 1, y: 1 }, labelPoint: { x: 2, y: 0.5 }, text: 'Note' }],
};

test('accepts a well-formed layout', () => {
  assert.deepEqual(validateRoomLayout(validLayout), validLayout);
});

test('defaults missing zones to empty array (pre-zone payloads)', () => {
  const { zones, ...withoutZones } = validLayout;
  const result = validateRoomLayout(withoutZones);
  assert.deepEqual(result?.zones, []);
});

test('defaults missing dimensions to empty array (pre-dimensions payloads)', () => {
  const { dimensions, ...withoutDimensions } = validLayout;
  const result = validateRoomLayout(withoutDimensions);
  assert.deepEqual(result?.dimensions, []);
});

test('defaults missing leaders to empty array (pre-leaders payloads)', () => {
  const { leaders, ...withoutLeaders } = validLayout;
  const result = validateRoomLayout(withoutLeaders);
  assert.deepEqual(result?.leaders, []);
});

test('rejects malformed leaders array', () => {
  const broken = { ...validLayout, leaders: [{ id: 'l1' }] };
  assert.equal(validateRoomLayout(broken), null);
});

test('accepts a dimension with an optional label', () => {
  const withLabel = { ...validLayout, dimensions: [{ ...validLayout.dimensions[0], label: 'Custom 4.2m' }] };
  const result = validateRoomLayout(withLabel);
  assert.equal(result?.dimensions[0].label, 'Custom 4.2m');
});

test('rejects non-object input', () => {
  assert.equal(validateRoomLayout(null), null);
  assert.equal(validateRoomLayout('garbage'), null);
  assert.equal(validateRoomLayout(42), null);
});

test('rejects a wall missing required fields', () => {
  const broken = { ...validLayout, walls: [{ id: 'w1' }] };
  assert.equal(validateRoomLayout(broken), null);
});

test('rejects a placedObject with wrong footprint shape', () => {
  const broken = { ...validLayout, placedObjects: [{ ...validLayout.placedObjects[0], footprintM: 'nope' }] };
  assert.equal(validateRoomLayout(broken), null);
});

test('rejects malformed zones array', () => {
  const broken = { ...validLayout, zones: [{ id: 'z1' }] };
  assert.equal(validateRoomLayout(broken), null);
});

test('rejects malformed dimensions array', () => {
  const broken = { ...validLayout, dimensions: [{ id: 'd1' }] };
  assert.equal(validateRoomLayout(broken), null);
});

test('defaults missing layers to the seeded default-layer preset set (pre-layers payloads)', () => {
  const { layers, ...withoutLayers } = validLayout;
  const result = validateRoomLayout(withoutLayers);
  assert.ok(result?.layers.some((l) => l.id === 'layer-default'));
});

test('rejects malformed layers array', () => {
  const broken = { ...validLayout, layers: [{ id: 'l1' }] };
  assert.equal(validateRoomLayout(broken), null);
});
