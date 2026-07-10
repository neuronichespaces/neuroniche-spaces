// Run: node --test src/lib/funding/match.test.ts  (Node 24 strips types natively)
// Synthetic data only — real funding rows are seeded separately with citations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchFunding, topMatch, type FundingSource, type Organisation } from './match.ts';

const auOrg: Organisation = {
  country: 'Australia',
  state_or_province: 'WA',
  sector: 'government',
  nccd_tier: 'substantial',
  postcode: '6430',
};

const sources: FundingSource[] = [
  {
    id: 'rec-1', name: 'Test Recurring Inclusion Funding', type: 'recurring',
    country: 'Australia', state_or_province: null,
    amount_range_min: 10000, amount_range_max: 30000,
    eligibility_rules_json: { nccd_tiers: ['substantial', 'extensive'], notes: 'tier-based' },
    deadline_date: null, source_url: 'https://example.gov.au/rec',
  },
  {
    id: 'grant-1', name: 'Test WA Grant', type: 'one_off',
    country: 'Australia', state_or_province: 'WA',
    amount_range_min: 5000, amount_range_max: 5000,
    eligibility_rules_json: { sectors: ['government'] },
    deadline_date: '2026-09-30', source_url: 'https://example.gov.au/wa',
  },
  {
    id: 'grant-vic', name: 'Test VIC Grant', type: 'one_off',
    country: 'Australia', state_or_province: 'VIC',
    amount_range_min: 8000, amount_range_max: 8000,
    eligibility_rules_json: {},
    deadline_date: '2026-08-01', source_url: 'https://example.gov.au/vic',
  },
  {
    id: 'csr-1', name: 'Test Goldfields Mining CSR', type: 'corporate',
    country: 'Australia', state_or_province: 'WA',
    amount_range_min: null, amount_range_max: 15000,
    eligibility_rules_json: { postcode_prefixes: ['643'] },
    deadline_date: null, source_url: 'https://example.com/csr',
  },
];

test('non-AU org gets a completely empty match set', () => {
  const result = matchFunding({ ...auOrg, country: 'United Kingdom' }, sources);
  assert.deepEqual(result, { recurring: [], one_off: [], corporate: [] });
});

test('AU org matches are grouped and state/sector/tier/postcode filtered', () => {
  const result = matchFunding(auOrg, sources);
  assert.deepEqual(result.recurring.map((m) => m.funding_source_id), ['rec-1']);
  assert.deepEqual(result.one_off.map((m) => m.funding_source_id), ['grant-1']); // VIC grant excluded
  assert.deepEqual(result.corporate.map((m) => m.funding_source_id), ['csr-1']);
});

test('postcode prefix mismatch excludes CSR program', () => {
  const perthOrg = { ...auOrg, postcode: '6000' };
  assert.deepEqual(matchFunding(perthOrg, sources).corporate, []);
});

test('estimated amount is range midpoint; top match feeds auto-budget', () => {
  const result = matchFunding(auOrg, sources);
  assert.equal(result.recurring[0].estimated_amount, 20000);
  assert.equal(topMatch(result)?.funding_source_id, 'rec-1');
});

test('wrong nccd_tier excludes tier-gated funding', () => {
  const result = matchFunding({ ...auOrg, nccd_tier: 'supplementary' }, sources);
  assert.deepEqual(result.recurring, []);
});
