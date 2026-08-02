import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBillOfMaterials, bomToCsv } from './bom.ts';
import type { PlacedObject } from './types.ts';

const obj = (id: string, productId: string): PlacedObject => ({
  id,
  productId,
  x: 0,
  y: 0,
  rotationDeg: 0,
  footprintM: { w: 0.5, l: 0.5 },
  customProperties: {},
});

const catalogue: Record<string, { name: string; price: number; funding_eligible: boolean }> = {
  swing: { name: 'Sensory Swing', price: 250, funding_eligible: true },
  lamp: { name: 'Bubble Lamp', price: 80, funding_eligible: false },
};
const lookup = (id: string) => catalogue[id];

test('aggregates quantity for duplicate products', () => {
  const lines = buildBillOfMaterials([obj('a', 'swing'), obj('b', 'swing'), obj('c', 'lamp')], lookup);
  assert.equal(lines.length, 2);
  const swing = lines.find((l) => l.productId === 'swing')!;
  assert.equal(swing.quantity, 2);
  assert.equal(swing.unitPrice, 250);
  assert.equal(swing.lineTotal, 500);
});

test('falls back to productId when lookup misses', () => {
  const lines = buildBillOfMaterials([obj('a', 'unknown-id')], lookup);
  assert.equal(lines[0].name, 'unknown-id');
  assert.equal(lines[0].unitPrice, 0);
  assert.equal(lines[0].lineTotal, 0);
  assert.equal(lines[0].fundingEligible, false);
});

test('CSV output has header, line rows, and total row', () => {
  const lines = buildBillOfMaterials([obj('a', 'swing'), obj('b', 'lamp')], lookup);
  const csv = bomToCsv(lines);
  const rows = csv.split('\n');
  assert.equal(rows.length, 4); // header + 2 lines + total
  assert.equal(rows[0], 'Product,Quantity,Unit price,Line total,Funding eligible');
  assert.match(rows[1], /Sensory Swing,1,250,250,Yes/);
  assert.match(rows[rows.length - 1], /^Total,,,330,$/);
});

test('S2: product names starting with =/+/-/@ are neutralised against CSV formula injection', () => {
  const catalogueWithFormula: Record<string, { name: string; price: number; funding_eligible: boolean }> = {
    evil: { name: '=cmd|"/c calc"!A1', price: 10, funding_eligible: false },
  };
  const lines = buildBillOfMaterials([obj('a', 'evil')], (id) => catalogueWithFormula[id]);
  const csv = bomToCsv(lines);
  // must not start a row cell with a bare '=' — should be quoted and prefixed with a leading apostrophe
  assert.match(csv, /"'=cmd\|""\/c calc""!A1"/);
});
