# Handoff — shared nav strip closes UX flow gap (2026-08-11)

**Follows up:** `.planning/ux-flow-review-2026-08-11.md` (Finding 1: no persistent nav, 5/6 feature pages were dead ends; Finding 2: home page's 11-link column had no hierarchy).

## What was built

1. **`src/components/NavBar.tsx`** (new) — persistent nav strip rendered from `src/app/layout.tsx`, above `{children}`, so it appears on every route including `/billing` (read-only checked, not edited). Links: Home, Audit, Plan (`/spatial`), Cost (`/costing`), Grants, Business case. Uses `usePathname()` to set `aria-current="page"` + bold/underline on the active route. Reuses the existing `.a11y-target` (44px) CSS class and `--a11y-*` tokens — no new styling patterns invented. `no-print` class carried over so it doesn't appear in the business-case PDF export.
2. **`src/app/layout.tsx`** — imports and renders `<NavBar />` inside `<A11yProvider>`, before `<div className="flex-1">{children}</div>`.
3. **`src/app/page.tsx`** (lines ~66-118) — the 11-link header column regrouped into "Start here" (Audit, room designer, Costing, Grants, Business case — the journey steps) and "Also available" (Your organisations, Templates, Catalogue, Training, Sign in — reference/secondary), with a de-emphasized style (smaller, no border box, underline-on-hover) for the secondary group. No links removed.

## Personas used (inline, per README workaround — Agent tool can't dispatch `.claude/agents/*.md`)

- **a11y-auditor** checklist applied to the diff: touch targets (44px via `a11y-target`/`min-h-11`, pass), keyboard nav (native `<Link>` anchors, pass), `aria-current="page"` for active-page indication (pass), color contrast — caught and fixed one issue: the new "Start here"/"Also available" section labels were originally `text-zinc-500`, borderline under 4.5:1 AA for small text; changed to `text-zinc-600` (dark: `text-zinc-400`) matching the existing contrast pattern already used throughout `page.tsx` (e.g. line 64, 230). Reduced-motion: no new animation added, `A11yProvider`'s global motion-duration override still applies unchanged.
- **qa-edge-case-tester** checklist applied: ran `node --test "src/lib/**/*.test.ts"` (235/235 pass, unaffected by this change since it's UI-only), confirmed `npm run build` statically generates all 26 routes including `/billing` with the new layout wrapping it, confirmed no fixed/absolute-positioned elements in `billing/page.tsx` that would visually collide with the new top nav bar.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run build` — clean, all 26 routes generated (including `/billing`, untouched file).
- `node --test "src/lib/**/*.test.ts"` — 235/235 pass.
- `npm run lint` — 13 pre-existing errors / 8 warnings, all in files this task didn't touch (`src/lib/spatial/validate.test.ts`, `src/app/costing/page.tsx`, `src/app/audit/page.tsx`, `src/app/training/page.tsx`, `src/app/business-case/page.tsx`, `src/app/organisations/page.tsx`, `src/components/A11yProvider.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/spatial/ScenariosPanel.tsx`) — none introduced by this change.
- `npm run test:a11y` — script does not exist in `package.json`; skipped. No axe/Playwright a11y test harness is currently wired into this repo (only `node_modules/.bin/playwright` binaries are present, no test script referencing them).

## Not touched (per instructions)

`src/app/api/checkout/**`, `src/app/api/stripe/**`, `src/app/billing/page.tsx`, `src/lib/billing/stripe.ts`.

## Open item

No `test:a11y` npm script exists yet — if a real axe-core/Playwright a11y CI check is wanted, that's a separate small setup task, not scoped here.
