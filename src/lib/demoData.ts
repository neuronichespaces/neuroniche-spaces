// Shared demo/seed data used by both the main planner (src/app/page.tsx) and
// the Spatial Design Engine (src/app/spatial/page.tsx). Extracted so the two
// pages don't maintain separate fake catalogues — mirrors supabase/seed_funding_au.sql
// per the original comment in page.tsx; Supabase isn't wired yet.
import type { FundingSource } from '@/lib/funding/match.ts';
import type { Product } from '@/lib/planner/plan.ts';

export const CATALOGUE: Product[] = [
  { id: 'p1', name: 'Sensory Swing (ceiling mount)', category: 'movement', sensory_tags: ['movement:seeks'], price: 420, funding_eligible: true, available_countries: ['*'], footprint_m: { w: 1.5, l: 1.5 } },
  { id: 'p2', name: 'Crash Mat', category: 'movement', sensory_tags: ['movement:seeks', 'pressure:seeks'], price: 260, funding_eligible: true, available_countries: ['*'], footprint_m: { w: 1.2, l: 1.8 } },
  { id: 'p3', name: 'Acoustic Wall Panels (set of 6)', category: 'acoustic', sensory_tags: ['noise:avoids'], price: 340, funding_eligible: true, available_countries: ['*'] },
  { id: 'p4', name: 'Noise-reducing Ear Defenders (5 pack)', category: 'acoustic', sensory_tags: ['noise:avoids'], price: 95, funding_eligible: true, available_countries: ['*'] },
  { id: 'p5', name: 'Bubble Tube with Dimmer', category: 'visual', sensory_tags: ['light:seeks'], price: 380, funding_eligible: true, available_countries: ['*'], footprint_m: { w: 0.5, l: 0.5 } },
  { id: 'p6', name: 'Blackout Blind Kit', category: 'visual', sensory_tags: ['light:avoids'], price: 150, funding_eligible: true, available_countries: ['*'] },
  { id: 'p7', name: 'Textured Tactile Wall Panels', category: 'tactile', sensory_tags: ['touch:seeks'], price: 220, funding_eligible: true, available_countries: ['*'] },
  { id: 'p8', name: 'Weighted Lap Pads (3 pack)', category: 'tactile', sensory_tags: ['pressure:seeks', 'touch:seeks'], price: 130, funding_eligible: true, available_countries: ['*'] },
  { id: 'p9', name: 'Soft Seating Pod', category: 'furniture', sensory_tags: ['pressure:seeks', 'noise:avoids'], price: 490, funding_eligible: false, available_countries: ['*'], footprint_m: { w: 1.0, l: 1.0 } },
  { id: 'p10', name: 'Wobble Cushions (4 pack)', category: 'movement', sensory_tags: ['movement:seeks'], price: 110, funding_eligible: true, available_countries: ['*'] },
];

// Mirrors supabase/seed_funding_au.sql — DRAFT data, pending review.
export const FUNDING: FundingSource[] = [
  { id: 'f1', name: 'NCCD Student with Disability Loading (Australian Government)', type: 'recurring', country: 'Australia', state_or_province: null, amount_range_min: null, amount_range_max: null, eligibility_rules_json: { nccd_tiers: ['supplementary', 'substantial', 'extensive'], notes: 'Recurrent federal loading; paid as a lump sum to school authorities — no fixed per-student amount.' }, deadline_date: null, source_url: 'https://www.education.gov.au/recurrent-funding-schools/schooling-resource-standard' },
  { id: 'f2', name: 'Julia Farr Disability Inclusion Grants (SA, DHS)', type: 'one_off', country: 'Australia', state_or_province: 'SA', amount_range_min: 20000, amount_range_max: 100000, eligibility_rules_json: { notes: 'Schools may need an auspicing organisation — check current round guidelines.' }, deadline_date: null, source_url: 'https://dhs.sa.gov.au/how-we-help/grants/available-grants/julia-farr-disability-inclusion-grant-round-2-2025-2026' },
  { id: 'f3', name: 'State Trustees Australia Foundation Community Inclusion Grants (VIC)', type: 'one_off', country: 'Australia', state_or_province: 'VIC', amount_range_min: null, amount_range_max: 20000, eligibility_rules_json: { notes: 'Requires ACNC-registered charity status — schools may apply via an associated charitable entity.' }, deadline_date: null, source_url: 'https://www.statetrustees.com.au/philanthropy-and-charitable-giving/granting/community-inclusion/' },
  { id: 'f4', name: 'ACT Disability Inclusion Grants', type: 'one_off', country: 'Australia', state_or_province: 'ACT', amount_range_min: null, amount_range_max: 20000, eligibility_rules_json: { sectors: ['independent', 'catholic'], notes: 'Government entities ineligible; non-government incorporated entities may apply.' }, deadline_date: null, source_url: 'https://www.act.gov.au/money-and-tax/grants-funding-and-incentives/funding-to-improve-the-inclusion-and-participation-of-people-with-disability' },
  { id: 'f5', name: 'BHP Western Australia Community Grants', type: 'corporate', country: 'Australia', state_or_province: 'WA', amount_range_min: null, amount_range_max: null, eligibility_rules_json: { notes: 'Grassroots grants in BHP WA operating regions; amounts vary per project.' }, deadline_date: null, source_url: 'https://www.bhp.com/about/our-businesses/western-australia-community-grants' },
];
