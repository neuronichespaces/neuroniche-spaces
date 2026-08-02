import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTierCostings, TIER_MULTIPLIER } from './tiers.ts';
import type { Product, SensoryNeed } from '../planner/plan.ts';

const catalogue: Product[] = [
  { id: 'p1', name: 'Weighted blanket', category: 'weighted', sensory_tags: ['pressure:seeks'], price: 80, funding_eligible: true, available_countries: ['*'] },
  { id: 'p2', name: 'Bubble tube', category: 'lighting', sensory_tags: ['light:seeks'], price: 400, funding_eligible: true, available_countries: ['*'] },
  { id: 'p3', name: 'Crash mat', category: 'movement', sensory_tags: ['movement:seeks'], price: 250, funding_eligible: false, available_countries: ['*'] },
];

const needs: SensoryNeed[] = [
  { category: 'pressure', preference: 'seeks', intensity: 5 },
  { category: 'light', preference: 'seeks', intensity: 4 },
  { category: 'movement', preference: 'seeks', intensity: 3 },
];

test('produces exactly bronze, silver, gold tiers', () => {
  const tiers = buildTierCostings(needs, 1000, catalogue, { country: 'Australia' });
  assert.deepEqual(tiers.map((t) => t.tier), ['bronze', 'silver', 'gold']);
});

test('tier budgets scale by the documented multipliers', () => {
  const tiers = buildTierCostings(needs, 1000, catalogue, { country: 'Australia' });
  for (const t of tiers) {
    assert.equal(t.budgetUsed, 1000 * TIER_MULTIPLIER[t.tier]);
  }
});

test('total never exceeds the tier budget (contingency carved out, not added on top)', () => {
  const tiers = buildTierCostings(needs, 1000, catalogue, { country: 'Australia' });
  for (const t of tiers) {
    assert.ok(t.total <= t.budgetUsed + 0.01, `${t.tier}: ${t.total} > ${t.budgetUsed}`);
  }
});

test('gold affords more than bronze given the same catalogue', () => {
  const tiers = buildTierCostings(needs, 1000, catalogue, { country: 'Australia' });
  const bronze = tiers.find((t) => t.tier === 'bronze')!;
  const gold = tiers.find((t) => t.tier === 'gold')!;
  assert.ok(gold.subtotal >= bronze.subtotal);
});

test('empty catalogue produces zero-cost tiers, not a crash', () => {
  const tiers = buildTierCostings(needs, 1000, [], { country: 'Australia' });
  for (const t of tiers) {
    assert.equal(t.subtotal, 0);
    assert.equal(t.total, 0);
    assert.deepEqual(t.lines, []);
  }
});
