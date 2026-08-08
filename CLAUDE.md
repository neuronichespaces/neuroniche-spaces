# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Governing spec:** `docs/BUILD-SPEC-v1.md` (adopted 2026-08-02, with amendments in its adoption note: repo conventions win on toolchain conflicts). Phase 0 audit + re-sequenced roadmap: `docs/phase0-audit-2026-08-02.md` — that roadmap supersedes `.planning/PHASES.md` ordering.

## Commands

```bash
npm run dev            # dev server at localhost:3000
npm run build           # production build (also the fastest full typecheck+lint smoke test)
npm run lint             # eslint
npx tsc --noEmit          # typecheck only

# Tests use Node's native test runner + native TS stripping (Node 24), not Jest/Vitest.
node --test "src/lib/**/*.test.ts"        # all tests
node --test src/lib/funding/match.test.ts  # single file
```

No test framework config exists — `*.test.ts` files use `node:test` + `node:assert/strict` directly and sit next to the module they test (e.g. `src/lib/planner/plan.ts` / `plan.test.ts`). `tsconfig.json` has `allowImportingTsExtensions: true` specifically so these test files can `import './plan.ts'` with the extension, matching how `node --test` resolves them.

## Architecture

This is the **NeuroNiche Spaces** app: a sensory-room planner + Australia-only funding matcher for schools/orgs. The core domain logic is deliberately pure and framework-free, isolated from the UI:

- `src/lib/funding/match.ts` — funding eligibility matcher. Takes an `Organisation` + `FundingSource[]`, returns ranked matches grouped by type (recurring/one_off/corporate). **Country split is enforced here, not just in the UI**: `matchFunding()` returns an empty result for any `country !== 'Australia'` before any other logic runs. Eligibility rules (sector/nccd_tier/postcode) live in each `FundingSource.eligibility_rules_json`, not in code — adding a new country's funding engine is data entry, never a code change.
- `src/lib/planner/plan.ts` — sensory needs → shopping list (`suggestProducts`, greedy knapsack against budget) → room layout (`layoutRoom`, greedy shelf-packing on a 0.5m grid). Country-agnostic.
- `src/lib/assistant.ts` — downstream of the above two: builds AU application checklists (`buildChecklist`) and CSV export (`planToCsv`), consuming their output types directly.
- `src/lib/integration.test.ts` — the cross-module contract test (AU vs non-AU pipeline end to end). Run this after touching any of the three modules above.
- `src/app/page.tsx` — the entire UI is one client component. It holds a **demo `CATALOGUE` and `FUNDING` array inline** that mirrors `supabase/seed_funding_au.sql` — Supabase isn't wired yet, so keep these two in sync by hand until the DB client lands.

Data flow in the UI: organisation form → `matchFunding()` → top match auto-fills budget (AU only, unless user overrides) → `suggestProducts()` (filtered to `funding_eligible` when a match exists) → `layoutRoom()` for the SVG sketch → `buildChecklist()` per matched funding source.

### Database (not yet connected)

`supabase/migrations/0001_init.sql` defines the schema; nothing has been applied to a live Supabase project yet (see `docs/SCHEMA-DESIGN.md` for the relational design rationale). Key structural decision: `country`/`state_or_province` are plain text everywhere, and `funding_sources.eligibility_rules_json` is jsonb — this is what lets the funding engine stay generic. `sensory_profiles.category`/`preference` are CHECK-constrained to a fixed non-diagnostic vocabulary (movement/noise/light/touch/pressure × seeks/avoids/neutral) — this is a hard product constraint, enforced at the DB level, not just in app code.

`supabase/seed_funding_au.sql` holds researched-but-unapplied Australian funding rows with official source citations; several carry `REVIEW:` comments flagging real eligibility uncertainty (e.g. some state grants may require an auspicing charity rather than accepting direct school applicants) — read those before treating the amounts as fact.

### Product constraints that shape the code

- No student-identifiable fields anywhere (sensory data is room-level aggregate, never per-student).
- No diagnosis labels — only the five sensory categories above; enforced by DB CHECK.
- No commission/percentage-of-grant billing logic — flat-fee only, and none exists yet.
- Every funding amount shown must carry its `source_url` and a "not guaranteed" disclaimer.
- Calm-UX: deadlines render as plain dates + days remaining, never countdown/urgency styling.

See `.planning/PHASES.md` for the full phase pipeline and `.planning/handoff-*.md` for the latest session's state and open questions.

### Market scope

`docs/MARKET-SCOPE.md` (adopted 2026-08-08) — the product targets any Australian organisation planning a sensory-inclusive space, not schools exclusively (schools, early intervention, healthcare, universities, workplaces, mining/regional enterprise, NGOs, airports, councils, sports venues, hotels/tourism). Funding logic differs by sector: NCCD (schools-only) vs NDIS (per-participant, not yet implemented) vs competitive grants (broadly applicable, fits current `eligibility_rules_json` model) vs corporate CSR (region-based, different data model, not yet designed). Read it before broadening `organisations.sector` or adding non-education `funding_sources` rows.
