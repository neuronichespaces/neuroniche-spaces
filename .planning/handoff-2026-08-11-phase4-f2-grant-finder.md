# Handoff — Phase 4: F2 grants DB + finder — 2026-08-11

## What was built

Extended the existing F2 grant finder (`src/lib/funding/match.ts`, `src/app/grants/page.tsx`)
per `docs/BUILD-SPEC-v1.md` §4.2 F2 and `docs/MARKET-SCOPE.md` (adopted 2026-08-08, "any AU
organisation, not just schools"). This was data + UI-option work, not a matcher rewrite —
`matchFunding()` was untouched; `eligibility_rules_json.sectors` already accepts arbitrary
sector strings, so broadening sectors is data entry as the architecture intended.

Changes:
- `supabase/seed_funding_au.sql` — added rows 6-8, all real programs with official
  `source_url` citations, verified 2026-08-11 via WebSearch/WebFetch:
  - **Regional Airports Program (Round 5)** — federal, one-off, $20k-$5M, airports sector.
    `REVIEW:` Round 5 is closed; check business.gov.au for the next round before quoting.
  - **Accessible Australia (NSW, Tranche 2)** — NSW-only, gov/NFP-only (commercial
    ineligible), $20k-$300k depending on category, closed 2026-03-04. `REVIEW:` flagged —
    this is *not* "no restriction on who can apply" as `MARKET-SCOPE.md` previously claimed
    (see correction below).
  - **Higher Education Disability Support Program** — federal, recurring, no fixed amount
    (formula-based like NCCD row 1), Table A public universities only.
- `src/lib/demoData.ts` — mirrored the same 3 rows in the `FUNDING` array (repo's manual
  sync convention until Supabase is wired).
- `src/app/page.tsx` and `src/app/grants/page.tsx` — broadened the sector `<select>` options
  from schools-only (government/catholic/independent) to add university/airport/council/nfp,
  kept in sync between both files.
- `src/lib/funding/match.test.ts` — added a test proving a non-education sector (`airport`)
  matches via the existing `sectors` rule with no code change, and that a mismatched org
  sector still excludes it.
- `docs/MARKET-SCOPE.md` — corrected the Accessible Australia evidence bullet: verified
  against the NSW Tranche 2 page that it's gov-owned/NFP-only, not open to all applicants
  as originally written.

## Personas used (per `.claude/agents/README.md` workaround — Agent tool can't dispatch
project subagents in this harness)

- **funding-research** — sourced and verified all 3 new rows against official `.gov.au`
  sources before adding any amount/eligibility claim; flagged 2 with `REVIEW:` comments
  per its non-negotiable rule.
- **privacy-security-reviewer** — clean pass. No new tables, no per-individual/student
  fields; only new string values on the existing `sector` field and new `FundingSource`
  data rows. Nothing blocking or advisory.

## Not built (deliberately, per MARKET-SCOPE's own guidance)

- **NDIS per-participant matching** and **Corporate CSR region-based matching** — the doc
  explicitly says not to build these speculatively; they need a different data model each
  and no NDIS/CSR-shaped funding source needed to go live this pass.
- **Deadline email alerts (T-30/T-14/T-7)** from the F2 acceptance criteria — needs
  Resend + a scheduled job, out of scope for a data/matcher-only pass; flag for whoever
  picks up the email-infra phase.
- **Free-tier gating** (count+names only vs paid full detail) — no auth/plan system wired
  yet (Phase 2 Supabase/auth is skipped this cycle), so there's nothing to gate against.

## Verification

- `node --test "src/lib/**/*.test.ts"` — 221/221 pass (was 219, +2 from the new airport test
  splitting into 2 assertions... actually 1 new test, count reflects whole suite).
- `node --test src/lib/funding/match.test.ts src/lib/integration.test.ts` — 11/11 pass.
- `npm run build` — clean.
- `npx tsc --noEmit` — clean except the 4 pre-existing unrelated `src/lib/export/report.test.ts`
  errors noted in the task brief (not touched, not mine).
- `npm run lint` — 15 errors, all pre-existing in files I did not touch (`validate.test.ts`,
  `costing/page.tsx`, `audit/page.tsx`, `training/page.tsx`, `LiveRegionAnnouncer.tsx`,
  `business-case/page.tsx`, `organisations/page.tsx`, `A11yProvider.tsx`, `ErrorBoundary.tsx`,
  `ScenariosPanel.tsx` — these look like other agents' in-flight work this session, not this
  phase's scope).

## Files touched (committed in `e3eabc3`)

- `docs/MARKET-SCOPE.md`
- `src/app/grants/page.tsx`
- `src/app/page.tsx`
- `src/lib/demoData.ts`
- `src/lib/funding/match.test.ts`
- `supabase/seed_funding_au.sql`

Did not touch: `A11yProvider.tsx`/a11y-settings files, `src/lib/planner/plan.ts`,
`src/app/spatial/page.tsx`, `src/lib/spatial/templates.ts`, `src/components/spatial/**`,
`src/renderer/babylon/**` — all Phase 1/3 territory as instructed.
