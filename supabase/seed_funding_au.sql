-- DRAFT — Australian funding sources, researched 2026-07-10.
-- STATUS: awaiting Stefan's review. Do NOT apply until approved.
-- Every row cites an official source_url. Amounts are indicative only;
-- the app must always show the "not guaranteed" disclaimer.

insert into funding_sources
  (name, type, country, state_or_province, amount_range_min, amount_range_max,
   eligibility_rules_json, deadline_date, source_url)
values
-- 1. NCCD student-with-disability loading (federal, recurring).
--    NOTE: no fixed per-student amount exists — funding flows as a lump sum
--    to school authorities (est. $5.1B nationally in 2026). Amounts left null;
--    app shows this as an "optimisation suggestion", not a dollar figure.
('NCCD Student with Disability Loading (Australian Government)', 'recurring',
 'Australia', null, null, null,
 '{"nccd_tiers": ["supplementary", "substantial", "extensive"],
   "notes": "Recurrent federal loading based on NCCD adjustment levels. Paid as a lump sum to school authorities, distributed by needs-based arrangements — no fixed per-student amount. Accurate NCCD evidence and moderation directly affect your school authority allocation."}',
 null, 'https://www.education.gov.au/recurrent-funding-schools/schooling-resource-standard'),

-- 2. Julia Farr Disability Inclusion Grants (SA).
--    CAVEAT: eligible applicants are SA organisations/ACCOs/local government/
--    community orgs — schools NOT explicitly listed. Flagged for review.
('Julia Farr Disability Inclusion Grants (SA, DHS)', 'one_off',
 'Australia', 'SA', 20000, 100000,
 '{"notes": "Up to $20,000 (12-month projects) or $100,000 (24-month projects) for disability inclusion in SA. REVIEW: schools are not explicitly listed as eligible applicants — may require an auspicing organisation. Check current round guidelines."}',
 null, 'https://dhs.sa.gov.au/how-we-help/grants/available-grants/julia-farr-disability-inclusion-grant-round-2-2025-2026'),

-- 3. State Trustees Australia Foundation Community Inclusion Grants (VIC).
--    CAVEAT: applicants must be ACNC-registered charities — a school itself
--    is typically not; may apply via P&C/foundation. Flagged for review.
('State Trustees Australia Foundation Community Inclusion Grants (VIC)', 'one_off',
 'Australia', 'VIC', null, 20000,
 '{"notes": "Up to $20,000 for social-inclusion projects for people with disability in Victoria. REVIEW: requires ACNC-registered charity status — schools may need to apply through an associated charitable entity. Regional/rural applicants prioritised."}',
 null, 'https://www.statetrustees.com.au/philanthropy-and-charitable-giving/granting/community-inclusion/'),

-- 4. ACT Disability Inclusion Grants.
--    CAVEAT: government entities are NOT eligible — public schools excluded;
--    non-government schools/small orgs may qualify. Flagged for review.
('ACT Disability Inclusion Grants (Health and Community Services Directorate)', 'one_off',
 'Australia', 'ACT', null, 20000,
 '{"sectors": ["independent", "catholic"],
   "notes": "Up to $20,000 for projects improving inclusion of people with disability in the ACT. REVIEW: government entities are ineligible, so public schools are excluded; non-government incorporated entities may apply. One application per round."}',
 null, 'https://www.act.gov.au/money-and-tax/grants-funding-and-incentives/funding-to-improve-the-inclusion-and-participation-of-people-with-disability'),

-- 5. BHP Western Australia Community Grants (corporate CSR, WA regions).
--    Amounts not published as a fixed range; grassroots community grants.
('BHP Western Australia Community Grants', 'corporate',
 'Australia', 'WA', null, null,
 '{"notes": "Grassroots community grants in BHP WA operating regions (e.g. Pilbara). Amounts vary per project; 70+ grants delivered. Check current program guidelines for eligible localities and application windows."}',
 null, 'https://www.bhp.com/about/our-businesses/western-australia-community-grants'),

-- Rows 6-8 added per docs/MARKET-SCOPE.md (adopted 2026-08-08): competitive one-off/
-- recurring grants outside schools, verified against official sources 2026-08-11.

-- 6. Regional Airports Program Round 5 (federal, one-off) — airports/aerodromes.
('Regional Airports Program (Round 5)', 'one_off',
 'Australia', null, 20000, 5000000,
 '{"sectors": ["airport"],
   "notes": "Owners/operators of regional airports or aerodromes; covers safety and accessibility upgrades up to 50% of project cost. REVIEW: Round 5 is closed as of this write (2026-08-11) — check business.gov.au for the next round before quoting to a user."}',
 null, 'https://business.gov.au/grants-and-programs/regional-airports-program-round-5'),

-- 7. Accessible Australia Tranche 2 (NSW, one-off) — councils/gov/NFP public-space facilities.
--    CAVEAT: NSW-specific and gov/NFP-only, correcting the "no restriction on who can
--    apply" claim in docs/MARKET-SCOPE.md's evidence list. Flagged for review.
('Accessible Australia (NSW, Tranche 2)', 'one_off',
 'Australia', 'NSW', 20000, 300000,
 '{"sectors": ["council", "government", "nfp"],
   "notes": "Government-owned and not-for-profit organisations only (commercial ineligible); facility must be in a public space. Funds Changing Places toilets, inclusive play spaces, and accessible beach/park equipment; caps vary by category ($20k-$300k). REVIEW: Tranche 2 closed 4 March 2026 — check nsw.gov.au for the next tranche and confirm current eligibility."}',
 '2026-03-04', 'https://www.nsw.gov.au/grants-and-funding/accessible-australia-tranche-2'),

-- 8. Higher Education Disability Support Program (federal, recurring) — universities.
--    NOTE: like NCCD (row 1), this is a formula-based recurring payment to the
--    institution, not a per-project competitive grant — no fixed amount.
('Higher Education Disability Support Program (Australian Government)', 'recurring',
 'Australia', null, null, null,
 '{"sectors": ["university"],
   "notes": "Ongoing Commonwealth funding to Table A public universities: 55% enrolment-based, 45% reimbursement of individual student disability-support/equipment costs above $5,000/year. No fixed per-institution amount. REVIEW: confirm a given university passes this through to sensory-space equipment purchases before quoting an amount."}',
 null, 'https://www.education.gov.au/higher-education-disability-support-program');
