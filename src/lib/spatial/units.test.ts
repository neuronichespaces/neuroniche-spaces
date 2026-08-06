import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLengthToMetres, formatMetres } from './units.ts';

test('parses a bare number as metres', () => {
  assert.equal(parseLengthToMetres('4.2'), 4.2);
  assert.equal(parseLengthToMetres('6'), 6);
});

test('parses explicit units', () => {
  assert.equal(parseLengthToMetres('4200mm'), 4.2);
  assert.equal(parseLengthToMetres('420 cm'), 4.2);
  assert.equal(parseLengthToMetres('4.2m'), 4.2);
  assert.equal(parseLengthToMetres('4.2 m'), 4.2);
});

test('rejects garbage input', () => {
  assert.equal(parseLengthToMetres('abc'), null);
  assert.equal(parseLengthToMetres(''), null);
  assert.equal(parseLengthToMetres('4.2 furlongs'), null);
  assert.equal(parseLengthToMetres('Infinity'), null);
  assert.equal(parseLengthToMetres('NaN'), null);
});

test('formatMetres renders two decimal places with unit suffix', () => {
  assert.equal(formatMetres(4.2), '4.20m');
  assert.equal(formatMetres(0.1), '0.10m');
});
