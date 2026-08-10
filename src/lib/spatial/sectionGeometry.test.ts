import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSectionProfile } from './sectionGeometry.ts';
import type { WallSegment, PlacedObject, SectionLine } from './types.ts';

function wall(patch: Partial<WallSegment> = {}): WallSegment {
  return { id: 'w1', start: { x: 0, y: 0 }, end: { x: 0, y: 6 }, thicknessM: 0.1, ...patch };
}

function obj(patch: Partial<PlacedObject> = {}): PlacedObject {
  return { id: 'o1', productId: 'p1', x: 3, y: 3, rotationDeg: 0, footprintM: { w: 1, l: 1 }, customProperties: {}, ...patch };
}

test('a horizontal section line picks up a wall it crosses, positioned along the line', () => {
  const line: SectionLine = { id: 's1', start: { x: -1, y: 3 }, end: { x: 5, y: 3 } };
  const profile = computeSectionProfile(line, [wall()], []);
  assert.equal(profile.length, 1);
  assert.equal(profile[0].kind, 'wall');
  // wall runs y:0->6 at x=0; the line runs x:-1->5 at y=3 — wall crosses at along=1 (x=0 is 1m from line start x=-1)
  assert.ok(profile[0].startM <= 1 && profile[0].endM >= 1);
});

test('a wall entirely outside the corridor is excluded', () => {
  const line: SectionLine = { id: 's1', start: { x: -1, y: 10 }, end: { x: 5, y: 10 } }; // far from the wall at x=0,y:0-6
  const profile = computeSectionProfile(line, [wall()], []);
  assert.equal(profile.length, 0);
});

test('an object near the line is included, positioned by its projection onto the line axis', () => {
  const line: SectionLine = { id: 's1', start: { x: 0, y: 3 }, end: { x: 6, y: 3 } };
  const profile = computeSectionProfile(line, [], [obj({ x: 3, y: 3.1, footprintM: { w: 1, l: 1 } })]);
  assert.equal(profile.length, 1);
  assert.equal(profile[0].kind, 'object');
  assert.equal(profile[0].label, 'p1');
  assert.ok(profile[0].startM < 3 && profile[0].endM > 3);
});

test('entries are sorted by position along the line', () => {
  const line: SectionLine = { id: 's1', start: { x: 0, y: 3 }, end: { x: 10, y: 3 } };
  const profile = computeSectionProfile(line, [], [obj({ id: 'far', x: 8, y: 3 }), obj({ id: 'near', x: 1, y: 3 })]);
  assert.deepEqual(profile.map((p) => p.id), ['near', 'far']);
});

test('a zero-length line yields an empty profile, not a crash', () => {
  const line: SectionLine = { id: 's1', start: { x: 2, y: 2 }, end: { x: 2, y: 2 } };
  assert.deepEqual(computeSectionProfile(line, [wall()], [obj()]), []);
});

test('object height falls back to 1m when customProperties.heightM is unset', () => {
  const line: SectionLine = { id: 's1', start: { x: 0, y: 3 }, end: { x: 6, y: 3 } };
  const profile = computeSectionProfile(line, [], [obj({ x: 3, y: 3 })]);
  assert.equal(profile[0].heightM, 1);
});
