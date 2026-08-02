# Handoff — 2026-08-02 (full pipeline, pre-Supabase)

Branch: `feat/sensory-taxonomy-7dim`. Every commit below passed a Sonnet
merge-gate review (§9.9/§11.7 checklists) before landing; build green,
75/75 tests, npm audit clean throughout.

## What shipped this session (in order)

| Commit | Phase | What it built |
|---|---|---|
| `34414aa` | 0 | Adopted `docs/BUILD-SPEC-v1.md`; Phase 0 audit; security headers |
| `a4c135b` | 1 | Accessibility settings system (F7): Alt+0 panel, CSS custom-property architecture, DRAFT legal pages, CI workflow |
| `7645cd7` | 3 | F1 — ASPECTSS sensory audit wizard, seclusion export-block (F6 tie-in) |
| `645fb2a` | 5 | F4 costing engine (bronze/silver/gold) + F6 compliance checker |
| `bad0764` | 4 | F2 — grant finder (last_verified_at, staleness warning, plain-date deadlines) |
| `7dc24a9` | 6 | F12 templates (5 policy/protocol documents) + F8 evidence library |
| `16d2f27` | 7 | F3 business case (template-based draft + human review gate) + F11 co-design surveys |
| `ee528cd` | 8 | F5 equipment catalogue browse |

Every route is linked from the landing page (`src/app/page.tsx`). Full route list: `/`, `/audit`, `/costing`, `/grants`, `/resources`, `/business-case`, `/catalogue`, `/spatial`, `/accessibility`, `/privacy`, `/terms`.

## What the review process caught (so it's visible, not buried in commit messages)

A Sonnet agent ran the spec's security+accessibility checklists against every slice before commit. Real defects found and fixed:
- Tailwind's motion utilities could silently override the reduce-motion setting (globals.css).
- A corrupted/tampered accessibility profile or audit save could crash the whole app (both `a11y/settings.ts` and `aspectss/score.ts` now sanitise untrusted JSON before use).
- Grant deadline math parsed dates as UTC, causing a deadline to appear "closed" hours before local midnight in every Australian timezone (`funding/match.ts`).
- `approve()` on a business case only checked for a blank reviewer name in the UI, not the shared function — any other future caller could bypass the human-review gate (`businesscase/generate.ts`).

## What is genuinely blocked — cannot proceed without you

**Phase 2 — Supabase.** This is the one remaining phase from the spec and it needs an action from you, not more code:
1. Create a Supabase project at supabase.com. **Region must be Sydney (`ap-southeast-2`)** — this is a data-residency requirement in the spec (§10.3 WA Privacy Act), not a preference.
2. Give me the project URL and the `anon` public key (never the `service_role` key — that one stays server-only and should never be pasted into chat).
3. Once connected, I wire: `memberships` table + RLS policies + isolation tests (the schema/policy design is already written in `docs/BUILD-SPEC-v1.md` §6), auth (passkeys per spec §9.3), and migrate the localStorage-based accessibility settings / audit answers / survey responses into real tenant-scoped tables.

Also blocked, lower priority: Stripe (needs your Stripe account), real AI drafting for F3/F9 (needs an Anthropic API key with Zero Data Retention requested), legal pages need an Australian privacy lawyer before they're real policies.

## Explicitly deferred (v2/v3, correct per spec's own phasing)

F13 white-label, F14 multi-site portfolio, F15 certification, F16 POE, F17 3D planner (exists as a prototype already, not spec-hardened), F18 marketplace, F19 integrations, F20 mobile capture. All of these need multi-tenancy (Phase 2) as a prerequisite — building them now would mean building on a foundation of localStorage, which becomes wasted work the moment auth lands.

## One outstanding non-blocked item

§11.5's acceptance test ("a screen-reader user, keyboard only, can create a complete room layout and export it") on the existing `/spatial` designer has not been formally re-verified this session — the properties panel has ARIA support from a prior session's remediation, but a fresh manual walkthrough is worth scheduling before launch.

## Everything else needed before Supabase

Nothing. The moment you provide Supabase credentials, Phase 2 can start immediately in the next session.
