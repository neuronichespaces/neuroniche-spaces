# QA edge-case pass — 2026-08-11

Persona: qa-edge-case-tester (run inline per this session's `Agent` tool workaround).
Scope: `src/lib/planner/plan.ts`, `src/lib/funding/match.ts`, `src/lib/aspectss/score.ts`,
`src/lib/costing/tiers.ts`, plus UI-level spot checks in `src/app/page.tsx` and reduced-motion
handling. Did not touch `src/app/api/checkout/**`, `src/app/api/stripe/**`, `src/app/billing/**`,
`src/lib/export/report.ts`/`report.test.ts` (other agents' active territory this session).

## Edge cases checked

| Area | Case | Result |
|---|---|---|
| `matchFunding` | non-AU country returns fully empty result | pass, already covered in `match.test.ts` |
| `matchFunding` | country match is case-sensitive exact string (`'australia'` lowercase) | pass — verified deliberate, exact-string gate; UI only ever emits the literal `'Australia'` via a fixed `<select>`, so no fix needed. New test added. |
| `matchFunding` | empty `sources` array | pass, no crash. New test added. |
| `matchFunding` | org with `sector`/`nccd_tier`/`postcode` all null | pass — correctly excluded from any rule that restricts that field. New test added. |
| `matchFunding` | non-education sectors (airport, etc.) | pass, already covered |
| `suggestProducts` | empty catalogue | pass, no crash. New test added. |
| `suggestProducts` | budget of zero | pass, empty list. New test added. |
| `suggestProducts` | budget smaller than every matching item's price | pass, empty list. New test added. |
| `suggestProducts` | sensory profile with all 5 categories present at once | pass. New test added. |
| `suggestProducts` | duplicate/conflicting needs for the same category (seeks + avoids) | pass — additive scoring is intentional (ponytail-documented greedy design), not a bug. New test documents this. |
| `layoutRoom` | zero/negative room dimensions | **bug found and fixed** — see below |
| `layoutRoom` | extremely large room (10,000m × 10,000m) | pass, packs correctly. New test added. |
| `buildTierCostings` (costing/tiers) | empty catalogue, tier budget math | pass, already covered |
| `scoreAudit` (aspectss) | tampered/invalid answers, incomplete audits, seclusion flag | pass, already covered |
| UI: large product catalogue rendering | `page.tsx` maps `CATALOGUE`/`FUNDING` directly, no virtualization | not a bug at current (small, hand-authored) catalogue size — flagged as a future item, not fixed (would be speculative work ahead of an actual large-catalogue product decision) |
| Reduced-motion / high-contrast | grepped for all `transition`/`animate` usage | pass — `globals.css` gates `transition-duration`/`animation-duration` on `var(--a11y-motion-duration)` with `!important` (defeats Tailwind utility specificity) and additionally forces `animation: none; transition: none` under `@media (prefers-reduced-motion: reduce)`. Confirmed this is a single global chokepoint, not per-component opt-in, so nothing can bypass it. |

## Bug found and fixed

**`layoutRoom` (`src/lib/planner/plan.ts`) placed items outside the room's actual bounds when
`width_m` was zero/negative but `length_m` was still positive.** The per-item loop only
re-validates the y-bound (`y + l > maxY`) after wrapping to a new row — it never re-checks that
`x` itself is within the room once `maxX` is negative. With `width_m: -3, length_m: 5`, the loop
wrapped rows forever without breaking and pushed a placement at `x: 0.5` even though `maxX` was
`-3.5`.

This is reachable from the UI: `src/app/page.tsx:186-189` has `<input type="number" min={1}>` for
both room dimensions, but `min` is only an HTML hint — `Number(e.target.value)` writes straight to
state with no clamp, so typing `-5` reaches `layoutRoom` (and would also break the SVG sketch,
which sizes itself as `width={room.width_m * scale}`).

Fix (root cause, single call site — `layoutRoom` is only called from `page.tsx`): added one bounds
guard at the top of the function that returns `[]` when the room has less than one margin-square
of usable space in either axis:

```ts
if (maxX < margin || maxY < margin) return [];
```

Verified this doesn't change behavior for any legitimate room size (existing "tiny room" test at
1.5m×1.5m still passes item-by-item as before).

## Not fixed / flagged for the user

- **Large-catalogue UI virtualization** — not a bug today (demo catalogue is small and
  hand-maintained per `CLAUDE.md`'s note that `page.tsx`'s inline `CATALOGUE`/`FUNDING` arrays
  mirror the Supabase seed by hand). Worth revisiting once the Supabase client lands and the
  catalogue can grow past what a plain `.map()` comfortably renders — no action taken now per the
  "don't add speculative defensive code" rule.
- **Room dimension input clamping in the UI** (`min={1}` not enforced on state) — the root-cause
  fix in `layoutRoom` prevents any bad placement/crash, but the number input itself will still
  silently accept `-5` and show a negative label in the layout sketch heading
  (`{room.width_m}m × {room.length_m}m`) and an `svg width` attribute that would render oddly.
  This is a small UI polish item, not a data-integrity or crash bug — flagging rather than
  unilaterally adding input clamping, since that's a UI/UX call outside this task's scope.

## Verification

- `node --test "src/lib/**/*.test.ts"` — **235/235 pass** (0 fail), including 11 new tests.
- `npx tsc --noEmit` — clean, no errors.
- `npm run build` — clean, compiled successfully, all 26 routes generated.
- `npm run lint` — 13 errors / 8 warnings, all pre-existing baseline in files this pass didn't
  touch (`src/lib/spatial/validate.test.ts`, `src/app/costing/page.tsx`, `src/app/audit/page.tsx`,
  `src/app/training/page.tsx`, `src/app/business-case/page.tsx`, `src/app/organisations/page.tsx`,
  `src/components/A11yProvider.tsx`, `src/components/ErrorBoundary.tsx`,
  `src/components/spatial/ScenariosPanel.tsx`). None introduced by this pass.

## Commit note

`git add` on this pass's three files (`src/lib/planner/plan.ts`, `src/lib/planner/plan.test.ts`,
`src/lib/funding/match.test.ts`) swept in other agents' already-**staged** work (Stripe
checkout/webhook routes, `src/app/billing/page.tsx`, `src/lib/billing/stripe.ts`,
`src/lib/supabase/client.ts`, `.env.example`, `package.json`/`package-lock.json`) into the same
commit, since those files were already in the git index when this pass ran `git add`. Nothing was
lost or overwritten — it's a commit-boundary mixing issue, not a data-loss issue. No destructive
git command was run to try to separate it, since that risks another agent's in-flight work.
