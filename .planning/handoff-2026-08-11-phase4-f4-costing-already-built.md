# Handoff — 2026-08-11 — Phase 4 (F4 costing engine): already built, no new code

## Finding
Assigned to audit and refine F4 costing per `docs/BUILD-SPEC-v1.md` §4.2/§15 and the
2026-08-11 handoff's suggested next step. Investigation found F4 is already fully built
and meets the spec's stated acceptance criterion.

Spec text checked (`docs/BUILD-SPEC-v1.md`):
- Line 227 (feature table): `F4 | Costing engine (Bronze/Silver/Gold) | High | Med | MVP | Paid`
- Line 1345 (Phase 4 row, §15 build order): acceptance = "Costing produces 3 tiers;
  disclosures visible" — disclosures there refers to F5's affiliate-link disclosure, a
  separate feature, not F4.
- Line 761: `generateCosting` action — "Bronze/Silver/Gold ... Deterministic, not AI."
- Lines 411–421: `costings` table schema — `tier text`, `line_items jsonb`,
  `subtotal_aud`, `contingency_pct numeric default 10`, `total_aud`. No
  `funding_source_id` or offset column in the schema.

What exists, matching that schema field-for-field:
- `src/lib/costing/tiers.ts` — `buildTierCostings()`: bronze (60% of budget),
  silver (100%), gold (140%), 10% contingency carved out of tier budget (not
  added on top, so total never exceeds the stated budget), reuses the planner's
  `suggestProducts` greedy knapsack rather than re-implementing it. Deterministic,
  no AI. `src/lib/costing/tiers.test.ts` covers it.
- `src/app/costing/page.tsx` — needs input, budget input, three-tier display with
  itemized line items (name, price, funding-eligible flag) + subtotal +
  contingency + total per tier, plus the F6 compliance checker in the same page.
  Persists to Supabase `room_settings`/`sensory_profiles` when signed in with a
  room selected, else localStorage-only (matches the app's stated persistence
  pattern). Accessible: `a11y-target` (44px) classes throughout, `role="alert"`
  on failing compliance checks, semantic headings/labels.

## Gaps checked from the task brief, verified against spec (not assumed)
- **Itemized cost breakdown tied to shopping list**: exists (`t.lines` in
  `tiers.ts`, rendered per-tier in `page.tsx`).
- **Funding-offset display** ("how much of a matched grant would cover"): not
  in the DB schema (`costings` table has no funding reference/offset column) and
  not in the F4 acceptance criterion — this is a plausible future enhancement,
  not a spec gap. The existing integration point is budget prefill: `page.tsx`
  (main funding UI, out of scope this session) auto-fills the costing budget
  from the top funding match; `costing/page.tsx` already reads that via
  `?budget=` in `budgetFromUrl`. Building an offset *display* would mean reading
  funding match results into the costing page — plausible, but not spec-required
  and would cut close to the parallel Phase 4/F2 agent's `src/lib/funding/**`
  and funding-UI territory this session was told to avoid. Left alone.
- **Export of costing breakdown**: not in the F4 spec text. `src/lib/export/report.ts`
  covers the F3 business-case export (PDF via browser print, CSV via
  `businessCaseToCsv`), which is downstream of costing (`costing` →
  `business-case` link already wired in `page.tsx` line ~410) and inherits the
  costing figures once a business case cites them. No separate F4-only export
  path is specified.
- **"Not guaranteed" disclaimer / transparent monetization**: that CLAUDE.md rule
  targets *funding amounts* specifically ("every funding amount shown must carry
  its source_url and a 'not guaranteed' disclaimer") — costing figures are
  product prices from the demo catalogue, not funding amounts, so this rule
  doesn't apply here. No commission/percentage-of-grant logic exists in
  `tiers.ts` (flat product prices + flat 10% contingency only) — consistent
  with the flat-fee-only constraint.

## Personas used
None — screened the roster per `.claude/agents/README.md`; no diff was produced
so there was nothing for `spatial-rendering-engineer`, `a11y-auditor`, or
`qa-edge-case-tester` to review. Per the repo's "enhance in place, never
duplicate working code" rule and ponytail's "don't manufacture work" rule, no
speculative funding-offset or export feature was built against an unconfirmed
spec requirement.

## Verification (2026-08-11)
- `npx tsc --noEmit` — only the 4 pre-existing, known-acceptable errors in
  `src/lib/export/report.test.ts` (missing `reviewedBy`/`reviewedAt` on test
  fixtures), unrelated to costing, not touched.
- `npm run build` — exit 0, all 23 routes including `/costing` build clean.
- `node --test "src/lib/**/*.test.ts"` — 221/221 pass, 0 fail.
- `npm run lint` not re-run — no code changed, prior known-acceptable 13-error
  baseline assumed unchanged.

## What's actually next
F4 is done per spec. Two agents were running in parallel this session on Phase 4
F2 (grants finder) and Phase 1 a11y loose ends — check their outcomes before
picking a next slice. Remaining candidates from the prior handoff:
- §11.5 acceptance test: full screen-reader/keyboard-only walkthrough of the
  spatial designer.
- If a real product need for funding-offset-in-costing surfaces later, it
  belongs in the same session as the F2/funding-UI work (touches
  `src/lib/funding/**` results + `costing/page.tsx` together), not split
  across two sessions that were told to avoid each other's territory.
