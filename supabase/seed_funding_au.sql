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
 null, 'https://www.bhp.com/about/our-businesses/western-australia-community-grants');
