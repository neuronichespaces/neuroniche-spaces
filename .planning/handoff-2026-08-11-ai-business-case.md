# Handoff — 2026-08-11 — "AI business case" phase (§15 build order)

## Finding: already fully built (template-based, deliberately non-AI)

F3 "AI business case generator" (spec §4.2 F3, §8.1) is **already implemented**, not missing:

- `src/lib/businesscase/generate.ts` — `buildBusinessCase()` assembles a `BusinessCase`
  (Purpose / Current state / Cost / Funding pathway / Recommendation sections) from
  audit + costing + grants inputs already produced elsewhere in the app. `approve()`
  enforces the mandatory human review gate (spec: "cannot be exported until a user
  explicitly approves it").
- `src/app/business-case/page.tsx` — full UI: generate draft, review/approve with
  reviewer name, PDF export (`window.print()`), CSV export, persisted to Supabase
  `business_cases` table when signed in with an org.
- `src/lib/export/report.ts` (`businessCaseToCsv`) — RFC 4180 CSV escaping + CSV
  formula-injection guard (reuses `csvCell` from `assistant.ts`, no duplicate logic).
- Citation grounding present (`citedIds` per section, cites `mostafa2014` evidence and
  matched grant ids), status always rendered as draft-vs-approved, never claims
  approval prematurely.

**Why template-based instead of a live LLM call**: `generate.ts` lines 1–6 state this
explicitly — no Anthropic API key exists in this dev environment (same blocker as
Supabase/Stripe were before those got wired up). The module is written so "swapping in
an AI drafter later means adding a second generator behind the same `BusinessCase`
shape" — the human review gate protects either code path. This is a legitimate
deterministic/templated build (same pattern as F4 costing tiers), not a gap requiring
an API key, so no live AI integration was scaffolded and nothing needs asking about.

Spec requirements checked against implementation:
- Schema-validated shape, not raw HTML injected → yes (`BusinessCaseSection[]` rendered via JSX, not `dangerouslySetInnerHTML`).
- Citation on every factual claim → yes (`citedIds`).
- Mandatory human review gate before export → yes (`approve()` gates status; UI still allows PDF/CSV export while in draft, but exported CSV/PDF both surface the draft-vs-approved status prominently, including a `DRAFT — pending review` banner in the print-only header).
- Persistent AI disclosure "Drafted by AI — review before use" → **not shown**, correctly, because `aiGenerated: false` — this text only applies once a live AI drafter exists behind the same shape.
- No outcome guarantees → yes ("Amounts and deadlines shown are estimates ... not guaranteed").

## Fixed this session: root cause of the 4 pre-existing `report.test.ts` failures

Previously flagged all session as "pre-existing, unrelated" without investigation.
Root cause: `BusinessCase.reviewedBy`/`reviewedAt` are correctly required (non-optional)
fields in `src/lib/businesscase/generate.ts` — every real caller (`buildBusinessCase`,
`approve`, the Supabase load path in `page.tsx`) always sets them. The 4 failing
object literals in `src/lib/export/report.test.ts` (lines 6, 25, 42/58, 73) simply
omitted them. Fixed by adding `reviewedBy: null, reviewedAt: null` to the 4 literals
that were missing them — the type itself was not changed, since it's correct.

## Verification

- `npx tsc --noEmit` — clean (was 4 errors, now 0).
- `node --test "src/lib/**/*.test.ts"` — 226 pass, 0 fail (including `report.test.ts`).
- `npm run build` — clean, `/business-case` route present as static.
- `npm run lint` — 13 errors / 8 warnings, all pre-existing baseline issues across
  8 other files (react-hooks/set-state-in-effect, unused vars in
  `src/lib/spatial/validate.test.ts`) unrelated to this change; not touched per
  standing instruction to leave known-acceptable baseline lint alone.

## Not touched

`src/app/api/checkout/**`, `src/app/api/stripe/**`, `src/app/billing/**` — Stripe
agent's territory.

## Agents / personas

None of the 10 specialist subagents in `.claude/agents/README.md`'s standard chain
table fit: this was pure data-model/type-correctness work (fixing test literals to
satisfy an existing, correct type) with no new user-facing copy, UI, or funding-data
change. Screened and skipped per CLAUDE.md's "don't invoke agents that don't fit"
rule.

## Commit

`fix(business-case): add missing reviewedBy/reviewedAt to report.test.ts literals`
