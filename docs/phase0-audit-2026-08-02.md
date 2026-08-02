# Phase 0 Brownfield Audit — 2026-08-02

Audit of the codebase against `docs/BUILD-SPEC-v1.md` §14, run against what actually exists.
Reality check: **no live Supabase project, no auth, no Stripe, no AI calls, no uploads, no API routes.**
The app is pure client-side domain logic + a 2D/3D room designer with inline demo data.
Many §14 tasks therefore return "not built yet" — they become build-time requirements, not remediation.

## Findings by task

| # | Task | Status | Finding |
|---|---|---|---|
| A1 | RLS on every table | **PASS (design-level)** | No live DB. All 8 tables across `supabase/migrations/0001_init.sql:92-99` and `0003_room_layouts.sql:60-64` have `enable row level security`. Tenant tables (organisations, rooms, sensory_profiles, room_layouts, placed_objects) are deny-by-default (RLS on, zero policies = locked shut). `using (true)` appears only on global read-only catalogue tables (products, funding_sources, scenario_templates), which the spec §6.4 explicitly permits. **Gap:** membership policies + isolation tests must land with the auth phase; migrations lack a `memberships` table entirely. |
| A2 | Secrets | **PASS** | Repo-wide grep for `service_role`, `NEXT_PUBLIC_`, key/token/password literals: zero hits in `src/`. No `.env` files exist. Nothing to rotate. |
| A3 | API authz + validation | **N/A** | Zero route handlers, zero server actions. All logic is client-side pure functions. Requirement attaches when the first server surface lands. |
| A4 | Data inventory | **PASS** | No stored data anywhere (no DB connected). Demo data in `src/lib/demoData.ts` and `src/app/page.tsx` is synthetic, room-level aggregate, no child-identifiable fields. Existing product constraints (no student-identifiable fields, no diagnosis labels) already enforced by 0001 CHECK constraints. **No children's-data findings; no HUMAN_DECISION_REQUIRED.** |
| A5 | AI call sites | **N/A** | Zero AI calls in the codebase. §8 controls (spotlighting, lethal trifecta, restrictive-practice guardrail) attach when the first call lands. |
| A6 | Accessibility | **PARTIAL** | Prior a11y remediation exists (commit 4688601: keyboard access, first-run guidance, plain-language copy). The spatial designer has keyboard nudging and a properties panel (form path). **Gaps vs §11:** no accessibility-settings system (F7), no `:root` CSS custom-property architecture, no Alt+0 panel, no automated axe run, screen-reader walkthrough not recorded, canvas list/tree equivalent needs verification against §11.5's acceptance test. This is the Phase 1 workload. |
| A7 | Supply chain | **PASS (baseline)** | `npm audit`: 0 vulnerabilities (2026-08-02). Lockfile committed. 9 runtime deps, all mainstream. **Gaps:** no Renovate, no Socket.dev, no CI at all yet, no gitleaks hook. |
| A8 | Headers/CSP | **FAIL (not configured)** | `next.config.ts` is empty — no security headers, no CSP. No custom domain yet so DNS/DMARC items are moot. **First remediation item** (config-only, no deps needed). |
| A9 | Uploads | **N/A** | No upload code exists. |
| A10 | Stripe | **N/A** | No payments code exists. |

Verification this run: `npm run build` exit 0 · `node --test` 35/35 pass · `npm audit` 0 vulnerabilities.

## Remediation queue (replaces §14.2 for this codebase)

1. **Security headers in `next.config.ts`** — the only real FAIL; pure config, do first.
2. Accessibility settings architecture (§11.4) + axe pass over `/` and `/spatial` — Phase 1.
3. `memberships` table + RLS policies + isolation tests — lands WITH the auth/Supabase-connection phase, not before (nothing to protect until then).
4. CI pipeline (build, node:test, lint, npm audit, RLS-pattern grep, secret grep) — before the first server surface.
5. Everything else in §14.2 attaches to the phase that introduces the surface (uploads → upload phase, AI hardening → AI phase, etc.).

## Re-sequenced roadmap (supersedes `.planning/PHASES.md` ordering)

| Phase | Content | Spec ref |
|---|---|---|
| 0 (done) | This audit + headers fix + spec adoption | §14 |
| 1 | Accessibility settings system + WCAG 2.2 AA pass on existing routes + legal page stubs | §11, F7 |
| 2 | Supabase connection (Sydney) + auth + memberships/RLS policies + isolation tests + CI | §6, §9.3–9.4 |
| 3 | F1 ASPECTSS audit wizard (extends existing planner logic) | §4.2 F1 |
| 4 | F2 grants DB + finder (extends `src/lib/funding/match.ts`) | §4.2 F2 |
| 5+ | Follow spec §15 order (costing → AI business case → compliance/Stripe → launch) | §15 |

## Phase 0 exit criteria — status

- [x] Zero tables without RLS (design-level; isolation tests deferred to Phase 2 with auth)
- [x] Zero secrets client-side
- [x] Data inventory complete; no children's-data findings
- [x] All API surfaces have authz + validation (vacuously — none exist)
- [ ] Security headers configured ← **only open item; next task**
- [x] Upload/AI/payment criteria — N/A until those surfaces exist
- [ ] axe-core clean on existing routes — moved to Phase 1 (needs Playwright/axe tooling decision)
- [ ] Review-agent merge gating — process adoption, applies from next feature PR
