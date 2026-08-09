import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultLayers, isEffectivelyVisible, isEffectivelyLocked, DEFAULT_LAYER_ID } from './layers.ts';
import type { PlacedObject, Zone } from './types.ts';

function obj(patch: Partial<PlacedObject> = {}): PlacedObject {
  return { id: 'o1', productId: 'p1', x: 0, y: 0, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {}, ...patch };
}

function zone(patch: Partial<Zone> = {}): Zone {
  return { id: 'z1', kind: 'focus', x: 0, y: 0, widthM: 2, lengthM: 2, rotationDeg: 0, ...patch };
}

test('defaultLayers seeds one visible, unlocked layer', () => {
  const layers = defaultLayers();
  assert.equal(layers.length, 1);
  assert.equal(layers[0].id, DEFAULT_LAYER_ID);
  assert.equal(layers[0].visible, true);
  assert.equal(layers[0].locked, false);
});

test('an object with no layerId is effectively on the default layer', () => {
  const layers = defaultLayers();
  assert.equal(isEffectivelyVisible(obj(), layers), true);
  assert.equal(isEffectivelyLocked(obj(), layers), false);
});

test('a hidden layer makes an unhidden object effectively invisible', () => {
  const layers = [{ id: DEFAULT_LAYER_ID, name: 'Default', visible: false, locked: false }];
  assert.equal(isEffectivelyVisible(obj({ hidden: false }), layers), false);
});

test('an individually hidden object stays hidden even on a visible layer', () => {
  const layers = defaultLayers();
  assert.equal(isEffectivelyVisible(obj({ hidden: true }), layers), false);
});

test('a locked layer makes an unlocked object effectively locked', () => {
  const layers = [{ id: DEFAULT_LAYER_ID, name: 'Default', visible: true, locked: true }];
  assert.equal(isEffectivelyLocked(obj({ locked: false }), layers), true);
});

test('an individually locked object stays locked even on an unlocked layer', () => {
  const layers = defaultLayers();
  assert.equal(isEffectivelyLocked(obj({ locked: true }), layers), true);
});

test('an unknown/deleted layerId never silently hides or locks an object', () => {
  const layers = defaultLayers();
  const orphan = obj({ layerId: 'does-not-exist' });
  assert.equal(isEffectivelyVisible(orphan, layers), true);
  assert.equal(isEffectivelyLocked(orphan, layers), false);
});

test('an object explicitly assigned to a specific layer picks up that layer\'s state', () => {
  const layers = [
    { id: DEFAULT_LAYER_ID, name: 'Default', visible: true, locked: false },
    { id: 'layer-arch', name: 'Architecture', visible: false, locked: true },
  ];
  const archObj = obj({ layerId: 'layer-arch' });
  assert.equal(isEffectivelyVisible(archObj, layers), false);
  assert.equal(isEffectivelyLocked(archObj, layers), true);
});

test('a Zone (no own hidden/locked fields) is filtered by its layer too — CAD Gap 4', () => {
  const layers = [
    { id: DEFAULT_LAYER_ID, name: 'Default', visible: true, locked: false },
    { id: 'layer-arch', name: 'Architecture', visible: false, locked: true },
  ];
  assert.equal(isEffectivelyVisible(zone(), layers), true);
  const archZone = zone({ layerId: 'layer-arch' });
  assert.equal(isEffectivelyVisible(archZone, layers), false);
  assert.equal(isEffectivelyLocked(archZone, layers), true);
});
