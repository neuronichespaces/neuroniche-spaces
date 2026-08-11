# Handoff — 2026-08-11 (session 2) — Phase 1 a11y tooling close-out

Closes the two items the prior same-day handoff (`handoff-2026-08-11-phase1-a11y.md`)
flagged as blocked on a dependency decision. User approved adding **Playwright** as a
dev dependency. Both items are now done.

## 1. Axe-core automated pass (`npm run test:a11y`)

- Added devDependencies only: `@playwright/test`, `@axe-core/playwright`. Not in
  `dependencies` — confirmed in `package.json`, cannot leak into the production bundle.
- `playwright.config.ts` (repo root): chromium-only project, `webServer` boots
  `npm run build && npm run start` against `localhost:3000` (real production-mode
  render, not `next dev`).
- `e2e/a11y.spec.ts`: one test per route, all 19 top-level routes under `src/app/`
  (`/`, `/spatial`, `/audit`, `/grants`, `/costing`, `/catalogue`, `/organisations`,
  `/business-case`, `/resources`, `/training`, `/login`, `/accessibility`, `/privacy`,
  `/terms`, `/dpa`, `/subprocessors`, `/aup`, `/child-safety`, `/complaints`). Runs
  axe with `wcag2a`/`wcag2aa`/`wcag22aa` tags, asserts zero violations.
- `npm run test:a11y` script added to `package.json`.
- Chromium browser binary installed via `npx playwright install --with-deps chromium`
  (chromium only, per instructions — not the full browser set).
- **Actually ran it**: 17/19 passed, **2 real, pre-existing violations found** (proof
  the suite catches genuine issues, not just "compiles"):
  1. `/spatial` — touch targets under 24px×24px on the layer-visibility/lock checkboxes
     in `RoomEditor2D.tsx`'s layer controls (`aria-label="Dimensions visible"` /
     `"Dimensions locked"`) — WCAG 2.2 `2.5.8 Target Size (Minimum)`.
  2. `/costing` — `<ul>` containing a non-`<li>` `role="alert"` child directly (the
     free-exit compliance banner) in `src/app/costing/page.tsx`'s
     `section[aria-labelledby="compliance-h"] > ul` — WCAG `1.3.1 Info and Relationships`.
  Per this session's scope (build the tooling, don't fix unrelated pre-existing
  violations found by it), these were **not fixed** — flagging for the next session.
  Not the live-region/PropertiesPanel work, not touched this session.
- **CI decision**: did **not** wire `test:a11y` into any CI gating job. It boots a full
  production build + server per run (~50s locally) and downloads/needs a browser
  binary — reasonable for a scheduled or pre-release check, but not confirmed fast or
  cache-friendly enough for a normal PR gate without a browser-binary cache step in CI.
  Flagging as a follow-up, not deciding it here.
- Added `/test-results`, `/playwright-report`, `/blob-report`, `/playwright/.cache` to
  `.gitignore` (Playwright's local run artifacts).

## 2. ARIA live-region for spatial mutations

- New `src/components/spatial/LiveRegionAnnouncer.tsx` — self-contained, no props,
  mounted once near the top of `src/app/spatial/page.tsx`'s render tree (first child
  of the `<main>`).
- **Reused `store.ts`'s existing `auditLog`** (each structural mutation — add/move/
  delete/rotate/edit/lock/etc. — already gets a plain-language `description` pushed by
  the `mutate()` helper, see `AuditLogPanel.tsx` for the existing visual consumer of
  the same field) instead of threading announcement calls through every store action
  call site, per the handoff's suggested least-invasive approach.
- Selection announcements handled separately (`"Selected <object>"`) since
  `selectObject()` is transient and intentionally never goes through `mutate`/
  `auditLog`. Only announces on selection appearing, not on deselect, to avoid a
  redundant announcement right after a delete clears the selection.
- Subscribes via `useRoomLayoutStore.subscribe(...)` — the same imperative-subscribe
  pattern `RoomViewer3D.tsx` already uses — rather than `useState`+`useEffect` diffing
  with a `useRef` for previous-value bookkeeping. That choice wasn't stylistic: this
  repo's `react-hooks` lint config is the stricter React Compiler-aligned rule set
  (`react-hooks/set-state-in-effect`, `react-hooks/refs`), which flags both "derive
  state via ref+setState in an effect" and "read/write a ref during render" as errors.
  `useRoomLayoutStore.subscribe`'s callback keeps the previous-value bookkeeping in a
  plain closure variable, not a React ref, so it avoids both rules cleanly (confirmed:
  `npx eslint src/components/spatial/LiveRegionAnnouncer.tsx` → "No issues found").
- Visually hidden via Tailwind's built-in `sr-only` (Tailwind v4, no new CSS needed),
  `aria-live="polite"` + `role="status"` — calm-UX: no exclamation-heavy phrasing, one
  announcement per event, never repeated.

## Personas used (workaround per `.claude/agents/README.md` — Agent tool can't
dispatch `.claude/agents/*.md` in this harness)

- `spatial-rendering-engineer`: build persona for `LiveRegionAnnouncer.tsx` — audited
  `store.ts`'s existing `auditLog`/`mutate` and `RoomViewer3D.tsx`'s subscribe pattern
  before writing anything, reused both rather than inventing a new mechanism.
- `a11y-auditor`: adversarial pass on the live-region diff — checked `aria-live`
  region is genuinely visually hidden and doesn't trap focus, confirmed calm phrasing
  (no urgency/exclamation), confirmed announcements fire on real store mutation events
  by manually tracing `mutate()`'s call path. Separately ran the axe suite itself as
  the load-bearing verification for the automated-pass deliverable — it found 2 real
  violations (listed above), which is the proof the pipeline works, not a false pass.
- `qa-edge-case-tester`: ran full `node --test`, `npx tsc --noEmit`, `npm run lint`,
  `npm run build`, and `npm run test:a11y` end to end; traced that selecting then
  deleting an object doesn't produce two competing announcements (delete's audit-log
  description wins, since selection is cleared in the same tick and the "only
  announce on appearing" guard suppresses the deselect side).

## Verification (this session)

- `npx tsc --noEmit`: only the same 4 pre-existing unrelated errors in
  `src/lib/export/report.test.ts` (`BusinessCase` missing `reviewedBy`/`reviewedAt`) —
  unchanged.
- `npm run build`: clean, 23 routes (unchanged route count — no new pages added).
- `node --test "src/lib/**/*.test.ts"`: 221/221 pass (was 220 in the prior handoff —
  net +1 is pre-existing drift from the parallel Phase 4 session, not this session's
  work; nothing under `src/lib/spatial/**` or `src/lib/a11y/**` was touched).
- `npm run lint`: same 13 pre-existing errors / 8 warnings as before this session —
  confirmed via diff of `npx eslint` output before/after the `LiveRegionAnnouncer.tsx`
  rewrite; zero new issues.
- `npm run test:a11y`: **ran for real**, 17/19 pass, 2 genuine pre-existing violations
  found (see above) — not a stub, not just "the command exists."

## Files touched

- `src/components/spatial/LiveRegionAnnouncer.tsx` — new.
- `src/app/spatial/page.tsx` — mounts `<LiveRegionAnnouncer />` as first child of
  `<main>`, one import line added.
- `playwright.config.ts` — new.
- `e2e/a11y.spec.ts` — new.
- `package.json` — two new devDependencies, one new script (`test:a11y`).
- `.gitignore` — four new ignore entries for Playwright run artifacts.

## Constraint respected

Did not touch `src/lib/funding/**`, `supabase/seed_funding_au.sql`, or any funding UI
in `src/app/page.tsx` (parallel Phase 4 work). The live-region mount in
`src/app/spatial/page.tsx` is a two-line, top-of-file diff (one import, one JSX line)
specifically to minimise merge-conflict surface, per the task's instruction.

## Next session should

1. Fix the two real axe violations found above (`RoomEditor2D.tsx` layer-checkbox
   touch targets; `costing/page.tsx`'s `<ul><li role="alert">` structure) — small,
   isolated fixes, not done this session to keep this session's diff to "build the
   tooling."
2. Decide whether/how to wire `test:a11y` into CI (see CI decision note above).
3. Screen-reader walkthrough with a real AT (NVDA/VoiceOver) is still not manually
   recorded — the axe pass covers static/DOM-structure violations but not the
   experiential SR walkthrough item from the original Phase 1 ask. Flagging, not done.
