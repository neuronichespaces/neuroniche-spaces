# NeuroNiche Spaces — Phase Pipeline (saved 2026-07-10)

## Phase 1 — Data model ✅ DONE (commit bffc0b6)
Schema in `supabase/migrations/0001_init.sql`, decisions in `docs/SCHEMA-DESIGN.md`.

## Phase 2 — AU-only funding eligibility matcher
Input: org (country, state, sector, nccd_tier, postcode).
Non-AU → empty match set, no funding UI. AU → ranked matches grouped:
recurring NCCD / one-off grants / corporate CSR. Each match:
funding_source_id, display_name, type, estimated_amount, deadline,
source_url, eligibility notes. DO NOT invent funding rules — flag and ask.

## Phase 3 — Global sensory room planner
Onboarding (country/state), room inputs (dimensions, equipment, sensory
needs, budget). All countries: shopping list + grid layout diagram.
AU with matches: auto-budget from top match, filter to funding_eligible
products. Non-AU: manual budget, zero funding UI.

## Phase 4 — Application assistant (AU-only)
Pre-filled application checklist per match, deadline countdown, Resend
email reminders. Non-AU: hidden; PDF/CSV export of room plan instead.

## Phase 5 — Compliance & country-split audit
Report (don't silently fix): student-identifiable fields, commission
logic, therapeutic/diagnostic language, AU-funding leaks to non-AU users.

## Phase 6 — Orchestrator review & integration tests
Vision review of layout diagrams; AU and non-AU end-to-end flow checks;
integration tests: matcher by country, budget auto/manual split, product
filtering. Report Vercel staging readiness.

## Dependency order
2 and 3 parallel-safe → 4 needs 2 → 5 needs 2–4 → 6 last.

## Standing decisions
- Funding RULES live in `funding_sources` rows (data), the matcher engine
  is generic — so "don't invent rules" = don't invent seed data; the
  engine itself is safe to build.
- Deadline countdowns: calm display (date + days remaining), no urgency
  styling — per BrightSprout calm-UX values.
