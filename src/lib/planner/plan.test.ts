// Run: node --test src/lib/planner/plan.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestProducts, layoutRoom, totalCost, type Product, type SensoryNeed } from './plan.ts';

const needs: SensoryNeed[] = [
  { category: 'movement', preference: 'seeks', intensity: 5 },
  { category: 'noise', preference: 'avoids', intensity: 4 },
  { category: 'light', preference: 'neutral', intensity: 3 },
];

const catalogue: Product[] = [
  { id: 'swing', name: 'Sensory Swing', category: 'movement', sensory_tags: ['movement:seeks'],
    price: 400, funding_eligible: true, available_countries: ['*'], footprint_m: { w: 1.5, l: 1.5 } },
  { id: 'panel', name: 'Acoustic Panel Set', category: 'acoustic', sensory_tags: ['noise:avoids'],
    price: 300, funding_eligible: true, available_countries: ['*'] },
  { id: 'lamp', name: 'Bubble Lamp', category: 'visual', sensory_tags: ['light:seeks'],
    price: 250, funding_eligible: false, available_countries: ['*'] },
  { id: 'au-only', name: 'AU-only Crash Mat', category: 'movement', sensory_tags: ['movement:seeks'],
    price: 200, funding_eligible: false, available_countries: ['Australia'] },
];

test('suggests only need-matching products within budget, best match first', () => {
  const list = suggestProducts(needs, 750, catalogue, { country: 'United Kingdom' });
  // lamp excluded (neutral light = no score), au-only excluded (country), swing+panel fit 750
  assert.deepEqual(list.map((i) => i.product.id), ['swing', 'panel']);
  assert.equal(totalCost(list), 700);
});

test('funding-eligible filter excludes ineligible products (AU funded path)', () => {
  const list = suggestProducts(needs, 1000, catalogue, { country: 'Australia', fundingEligibleOnly: true });
  assert.ok(list.every((i) => i.product.funding_eligible));
  assert.ok(!list.some((i) => i.product.id === 'au-only'));
});

test('country availability respected for AU', () => {
  const list = suggestProducts(needs, 1000, catalogue, { country: 'Australia' });
  assert.ok(list.some((i) => i.product.id === 'au-only'));
});

test('layout places items inside room bounds with margins', () => {
  const list = suggestProducts(needs, 1000, catalogue, { country: 'Australia' });
  const placements = layoutRoom({ width_m: 4, length_m: 5 }, list);
  assert.ok(placements.length > 0);
  for (const p of placements) {
    assert.ok(p.x >= 0.5 && p.x + p.w <= 3.5, `x bounds: ${p.product.id}`);
    assert.ok(p.y >= 0.5 && p.y + p.l <= 4.5, `y bounds: ${p.product.id}`);
  }
});

test('tiny room places nothing oversized', () => {
  const placements = layoutRoom({ width_m: 1.5, length_m: 1.5 }, [
    { product: catalogue[0], matchScore: 5 }, // 1.5x1.5 swing can't fit with margins
  ]);
  assert.equal(placements.length, 0);
});
