// Phase 6 integration tests — full pipeline: org -> funding match ->
// budget (auto vs manual) -> product suggestion -> checklist/CSV.
// Run: node --test src/lib/integration.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchFunding, topMatch, type FundingSource, type Organisation } from './funding/match.ts';
import { suggestProducts, type Product } from './planner/plan.ts';
import { buildChecklist, planToCsv } from './assistant.ts';

const funding: FundingSource[] = [{
  id: 'g1', name: 'Test Grant', type: 'one_off', country: 'Australia', state_or_province: 'WA',
  amount_range_min: 800, amount_range_max: 1200, eligibility_rules_json: { notes: 'test' },
  deadline_date: '2026-12-01', source_url: 'https://example.gov.au',
}];

const catalogue: Product[] = [
  { id: 'a', name: 'Eligible Swing', category: 'movement', sensory_tags: ['movement:seeks'], price: 400, funding_eligible: true, available_countries: ['*'] },
  { id: 'b', name: 'Ineligible Pod', category: 'furniture', sensory_tags: ['movement:seeks'], price: 300, funding_eligible: false, available_countries: ['*'] },
];

const needs = [{ category: 'movement' as const, preference: 'seeks' as const, intensity: 5 }];
const room = { name: 'Test room', width_m: 4, length_m: 4 };

const auOrg: Organisation & { name: string } = { name: 'Test PS', country: 'Australia', state_or_province: 'WA', sector: 'government', nccd_tier: null, postcode: '6000' };
const ukOrg = { ...auOrg, country: 'United Kingdom' };

test('AU pipeline: match -> auto-budget -> funding-eligible-only list -> checklist', () => {
  const matches = matchFunding(auOrg, funding);
  const top = topMatch(matches);
  assert.ok(top, 'AU org should match');
  assert.equal(top.estimated_amount, 1000); // midpoint = auto budget
  const items = suggestProducts(needs, top.estimated_amount!, catalogue, { country: 'Australia', fundingEligibleOnly: true });
  assert.deepEqual(items.map((i) => i.product.id), ['a']); // ineligible pod filtered out
  const checklist = buildChecklist(auOrg, room, items, top);
  assert.ok(checklist.some((c) => c.prefilled === 'Test PS'));
  assert.ok(checklist.some((c) => c.prefilled?.includes('example.gov.au')));
});

test('non-AU pipeline: no matches, manual budget, unfiltered list, CSV works', () => {
  const matches = matchFunding(ukOrg, funding);
  assert.equal(topMatch(matches), null); // no funding module outside AU
  const manualBudget = 700;
  const items = suggestProducts(needs, manualBudget, catalogue, { country: 'United Kingdom' });
  assert.deepEqual(items.map((i) => i.product.id).sort(), ['a', 'b']); // no eligibility filter; tie-break = cheaper first
  const csv = planToCsv(room, items);
  assert.ok(csv.includes('Eligible Swing'));
  assert.ok(csv.split('\n').length === items.length + 3); // room row + header + items + total
});
