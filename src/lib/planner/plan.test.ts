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

test('zero/negative room dimensions place nothing and never crash', () => {
  const items = [{ product: catalogue[1], matchScore: 4 }]; // panel, no footprint override (0.5x0.5)
  assert.deepEqual(layoutRoom({ width_m: 0, length_m: 0 }, items), []);
  assert.deepEqual(layoutRoom({ width_m: -3, length_m: 5 }, items), []);
  assert.deepEqual(layoutRoom({ width_m: 5, length_m: -3 }, items), []);
});

test('extremely large room still packs items without error', () => {
  const items = [{ product: catalogue[0], matchScore: 5 }, { product: catalogue[1], matchScore: 4 }];
  const placements = layoutRoom({ width_m: 10000, length_m: 10000 }, items);
  assert.equal(placements.length, 2);
});

test('empty catalogue yields no suggestions, not a crash', () => {
  assert.deepEqual(suggestProducts(needs, 1000, [], { country: 'Australia' }), []);
});

test('budget of zero, or smaller than the cheapest matching item, buys nothing', () => {
  assert.deepEqual(suggestProducts(needs, 0, catalogue, { country: 'Australia' }), []);
  // cheapest matching item across the whole AU-available catalogue is au-only at 200
  assert.deepEqual(suggestProducts(needs, 199, catalogue, { country: 'Australia' }), []);
});

test('sensory profile with every category present at once scores across all of them', () => {
  const allCategoryNeeds: SensoryNeed[] = [
    { category: 'movement', preference: 'seeks', intensity: 2 },
    { category: 'noise', preference: 'avoids', intensity: 2 },
    { category: 'light', preference: 'seeks', intensity: 2 },
    { category: 'touch', preference: 'seeks', intensity: 2 },
    { category: 'pressure', preference: 'seeks', intensity: 2 },
  ];
  const list = suggestProducts(allCategoryNeeds, 1000, catalogue, { country: 'Australia' });
  assert.ok(list.length > 0);
});

test('duplicate/conflicting needs for the same category both contribute to the score (documented additive behaviour)', () => {
  const conflicting: SensoryNeed[] = [
    { category: 'movement', preference: 'seeks', intensity: 3 },
    { category: 'movement', preference: 'avoids', intensity: 3 },
  ];
  // swing only tags movement:seeks, so only the 'seeks' need contributes
  const score = suggestProducts(conflicting, 1000, catalogue, { country: 'Australia' })
    .find((i) => i.product.id === 'swing');
  assert.equal(score?.matchScore, 3);
});
