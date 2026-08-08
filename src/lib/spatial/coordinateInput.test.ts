import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoordinateInput } from './coordinateInput.ts';

const ref = { x: 2, y: 2 };

test('parses absolute #x,y in bare metres', () => {
  const r = parseCoordinateInput('#4,3', ref);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.point, { x: 4, y: 3 });
});

test('parses absolute #x,y with unit suffixes', () => {
  const r = parseCoordinateInput('#400cm,300cm', ref);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.point, { x: 4, y: 3 });
});

test('parses relative @dx,dy against the reference point', () => {
  const r = parseCoordinateInput('@1,-1', ref);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.point, { x: 3, y: 1 });
});

test('parses polar distance<angle against the reference point', () => {
  const r = parseCoordinateInput('5<90', { x: 0, y: 0 });
  assert.ok(r.ok);
  if (r.ok) {
    assert.ok(Math.abs(r.point.x - 0) < 1e-9);
    assert.ok(Math.abs(r.point.y - 5) < 1e-9);
  }
});

test('polar accepts a unit suffix on the distance component', () => {
  const r = parseCoordinateInput('500cm<0', { x: 0, y: 0 });
  assert.ok(r.ok);
  if (r.ok) {
    assert.ok(Math.abs(r.point.x - 5) < 1e-9);
    assert.ok(Math.abs(r.point.y - 0) < 1e-9);
  }
});

test('rejects an unrecognized format with a plain-language error, never guesses', () => {
  const r = parseCoordinateInput('4,3', ref);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /#x,y/);
});

test('rejects an absolute coordinate with a non-numeric component', () => {
  const r = parseCoordinateInput('#abc,3', ref);
  assert.equal(r.ok, false);
});

test('rejects a polar coordinate with a non-numeric angle', () => {
  const r = parseCoordinateInput('5<abc', ref);
  assert.equal(r.ok, false);
});

test('rejects empty input', () => {
  const r = parseCoordinateInput('', ref);
  assert.equal(r.ok, false);
});
