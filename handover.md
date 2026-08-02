# NeuroNiche Spaces — Handover

**Repo:** https://github.com/neuronichespaces/neuroniche-spaces
**Branches:** `main` (stable baseline, 16 commits behind) and `feat/sensory-taxonomy-7dim` (active development, all work described below). No PR merged yet — `feat/sensory-taxonomy-7dim` is the branch to open a PR from.
**Governing spec:** `docs/BUILD-SPEC-v1.md` — read this first. It defines the product, the phasing, and every legal/security/accessibility rule the code follows.
**Last updated:** 2026-08-02.

## What this product is

A freemium B2B SaaS for Australian schools/organisations to assess, design, cost, and fund a neuro-inclusive (sensory-friendly) space, ending in an AI-assisted grant application. See `docs/BUILD-SPEC-v1.md` §1–4 for full product vision and feature list.

## Current state: what works today

Everything below runs client-side only (no database yet — see "What's blocked" below). Try it: `npm install`, `npm run dev`, open `localhost:3000`.

| Route | Feature | Spec ref |
|---|---|---|
| `/` | Landing page, links to everything | — |
| `/audit` | 7-section ASPECTSS sensory audit wizard, scored report, blocks export on a safety issue (lockable door) | F1, F6 |
| `/costing` | Bronze/Silver/Gold cost tiers + compliance/restrictive-practice checker | F4, F6 |
| `/grants` | Australian grant finder — filters, shows verification date and staleness warnings | F2 |
| `/resources` | 5 policy/protocol templates + cited evidence library | F12, F8 |
| `/business-case` | Auto-drafted business case (template-based, not AI yet) requiring named human approval; anonymous co-design surveys | F3, F11 |
| `/catalogue` | Equipment browse with standing affiliate-disclosure notice | F5 |
| `/spatial` | 2D/3D room designer (pre-existing from prior sessions) | F10 |

Every feature is keyboard-operable and respects the accessibility settings panel (press **Alt+0** anywhere) — calm-by-default theme, adjustable text size/spacing/motion, WCAG 2.2 AA target.

**Legal pages** (all in the footer): `/privacy`, `/terms`, `/dpa`, `/subprocessors`, `/aup`, `/child-safety`, `/complaints`, `/accessibility`. **These are DRAFTS, not legal advice, not in force** — prepared as a starting point for an Australian lawyer to review and approve. Every page says so on itself; do not publish or rely on them as-is.

## Quality bar this codebase holds itself to

- `npm run build` — production build, also the fastest full typecheck+lint smoke test.
- `node --test "src/lib/**/*.test.ts"` — 75 tests, all passing, using Node's native test runner (not Jest/Vitest — this is a deliberate repo convention).
- `npm audit` — 0 vulnerabilities.
- Every feature commit in this session's history passed a two-part merge-gate review (a second AI agent checking the spec's §9.9 security checklist and §11.7 accessibility checklist) before landing. Real defects were found and fixed this way — see commit messages for specifics (e.g. a timezone bug that made grant deadlines appear closed early, a corrupted-save crash class fixed at its root in two places).
- `.github/workflows/ci.yml` runs build, tests, npm audit, and greps for RLS-disabled migrations / leaked secrets — this will activate now that the repo is on GitHub.

## What's blocked — needs a decision or an account from the founder

1. **Supabase (Phase 2 — the next major step).** No live database exists yet; everything above runs on localStorage. Needs: a Supabase project created in the **Sydney region** (data-residency requirement, not a preference — see spec §10.3), then its project URL and `anon` key handed over (never the `service_role` key). Once connected: real accounts, the `memberships`/RLS schema already designed in spec §6, and migrating the localStorage-based state into real tenant-scoped tables.
2. **Stripe** — needed for billing, not started.
3. **Anthropic API key with Zero Data Retention** — needed to upgrade the business case generator and grant-application drafting from template-based to actually AI-drafted (spec F3/F9). The human-review gate architecture is already built and ready for this.
4. **An Australian lawyer** — must review and approve every legal page before publication; several clauses are marked `[LAWYER]` inline at the specific decisions that need a professional judgment call (see `/dpa` and `/terms` especially).

## Explicitly deferred (correct, not overlooked)

F13 (white-label), F14 (multi-site), F15 (certification), F16 (post-occupancy evaluation), F17 (3D planner hardening), F18 (marketplace), F19 (integrations), F20 (mobile capture) all depend on multi-tenancy, i.e. Phase 2. Building them on localStorage now would be wasted work.

## One open non-blocked task

Spec §11.5 requires a screen-reader + keyboard-only walkthrough of the `/spatial` room designer as an acceptance test. The ARIA groundwork exists from a prior session, but this specific manual test hasn't been run and recorded yet.

## Where to look for more detail

- `.planning/handoff-2026-08-02-full-pipeline.md` — the session-by-session build log with commit hashes.
- `docs/phase0-audit-2026-08-02.md` — the original brownfield security/accessibility audit this whole build responded to.
- `docs/BUILD-SPEC-v1.md` — the full spec; read §14–16 for phasing and launch checklist.
