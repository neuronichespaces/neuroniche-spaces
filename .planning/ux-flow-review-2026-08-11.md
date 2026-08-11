# UX flow review — cross-feature journey coherence

**Date:** 2026-08-11
**Persona:** ux-interaction-designer (design-only, no code changes made)
**Scope:** navigation/flow across `/`, `/audit`, `/costing`, `/grants`, `/business-case`, `/spatial`, `/billing`

## Question asked

Does "org signs up → audit → plan room → costing → grants → business case" hang together as one path, or do these read as bolted-on separate tools?

## Verdict: bolted-on. This is the one real finding, and it's high-priority.

## Finding 1 (high) — no persistent nav/shell; five of six feature pages are navigational dead ends

`src/app/layout.tsx:33-49` renders only a legal-links footer (Privacy/Terms/DPA/etc.) around `{children}`. There is no header, nav bar, or breadcrumb component shared across pages.

Checked every page for outbound `Link`/`<nav>` elements:

- `src/app/page.tsx:66-127` — has links out (see Finding 2), but nothing links back once you leave it.
- `src/app/audit/page.tsx` — zero links to `/`, `/costing`, `/grants`, or `/business-case`. Its only "Back" (line 236, 329) moves between its own internal wizard steps, not back to the app.
- `src/app/costing/page.tsx` — zero `Link` usages that navigate anywhere. A user who lands here (e.g. from `/grants`) has no way to get to `/audit`, `/business-case`, `/spatial`, or even home except the browser back button.
- `src/app/grants/page.tsx:33-35` — one outbound link, `/costing?budget=${amount}`. This is a genuinely good connection (grant amount flows into costing budget) but it's the only inter-page link in the entire grants page.
- `src/app/business-case/page.tsx` — zero navigation links. It reads the audit's localStorage answers directly (comment at line 4-5 confirms this is intentional data-coupling), but there's no visible affordance telling the user that relationship exists, and no way to jump to `/audit` if the audit hasn't been done yet.
- `src/app/spatial/page.tsx` — zero navigation links out (checked full header block, lines 1-50 and the panel imports — it's a self-contained editor shell).
- `src/app/billing/page.tsx` — zero navigation links (single-purpose pricing page, lower stakes but still a dead end).

**Why it matters for the target user** (non-technical facilities manager, per CLAUDE.md/MARKET-SCOPE): the moment they leave `/`, the app stops telling them there *is* a sequence. `/grants` → `/costing` (via the budget link) is the only step of the "audit → plan → cost → fund → business case" journey that has a UI affordance at all. Everything else requires either remembering the URL or clicking browser-back to the one page (`/`) that lists every route.

**Minimal flow change to propose (not implemented):** a thin persistent header/breadcrumb — even just "NeuroNiche Spaces · Audit · Costing · Grants · Business case" as a shared nav strip in `layout.tsx` — would fix this at the one shared point (rule: fix at the shared point, not per-page). Given `/audit`, `/costing`, `/business-case` already share state via `localStorage`/`?room=`/`?org=` query params, a nav strip could reflect "audit done ✓ / costing not started" progress instead of being static links, but even static links beat the current zero.

## Finding 2 (medium) — home page's 11-link column has no hierarchy or sequence

`src/app/page.tsx:66-127`: the header's right-hand column lists 11 destinations (Sign in, Your organisations, Open room designer, Start audit, Costing, Find grants, Templates, Business case, Catalogue, Training) as identically-styled buttons in insertion order — not in the CLAUDE.md-stated journey order (org → audit → plan → cost → grants → business case), and with no visual distinction between "core next step" and "secondary/reference" (Training, Catalogue, Templates are reference material, not journey steps, but are styled identically to "Start a sensory space audit").

This sits directly above the page's own numbered "1. Your organisation" → "6. Application assistant" flow (lines 130-321), so the page contains two competing hierarchies: an unordered flat link list and a clearly-sequenced numbered form. A first-time user has no signal for which one is "the app."

**Minimal flow change to propose:** group the column into "Start here" (Audit or the on-page planner) vs. "Also available" (Catalogue, Templates, Training, Sign in) — doesn't require new components, just reordering + a subheading or two, and dropping the identical button styling for the reference-material links.

## What's fine (no finding)

- The `/audit` → `/business-case` data coupling via shared localStorage key (`neuroniche-audit-answers`) and the `/grants` → `/costing` budget-passthrough query param are both real, working connections — the underlying data model is not the problem, only its visibility/discoverability in the UI.
- No dark patterns found: no countdown/urgency styling anywhere in the reviewed pages. `/billing` (`src/app/billing/page.tsx:46-50`) explicitly states "easy to cancel" language matching CLAUDE.md's calm-UX rule. `/audit` has no forced-completion gating — it autosaves and allows leaving mid-way (per its own header comment, lines 3-7).
- No mouse-only interactions spotted in the reviewed page-level code (this pass didn't audit the 3D viewport's own controls — that's `spatial-rendering-engineer`/`a11y-auditor` territory, out of scope here).

## Handoff for a future build session

This is scoped as a single follow-up task: **add a shared, lightweight nav/breadcrumb to `src/app/layout.tsx`** (or a small client component it renders) covering the six feature routes, plus reordering `src/app/page.tsx`'s header link column into "Start here" vs "Also available" groups. Both are additive/reordering changes to existing files — no new pages, no new data model. Estimate: small, single-session, no backend involvement (all six pages already exist and are functional in isolation).
