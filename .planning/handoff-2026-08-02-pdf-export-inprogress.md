# Handoff — PDF export build in progress (2026-08-02, ~16:44 Perth)

**Context is about to auto-compact. This is the current task state.**

## What the user asked for
"PDF export only (fully polished) — 1.5-2h. Proper styling, preview, CSV
fallback, tests. do this first once complete commit and handover with rest
of task to complete like flow stitching (both polished)"

## Decision made (not yet built)
Approach: **browser-native print-to-PDF** via a dedicated print stylesheet
(`@media print`), not a new dependency (jsPDF/react-pdf). This is the
ponytail-correct call — rung 4 of the ladder (native platform feature) —
and matches the repo's explicit "no new deps" convention already
established this session (see CLAUDE.md: "Enhance existing code in place...
never add a dependency when an installed one can do it").

Just confirmed via package.json: no PDF library installed. Confirmed this
is the right call, not a gap.

## What "PDF export" needs to cover (per user ask)
A polished export button that produces a document combining:
- Audit report (from `/audit`, `src/lib/aspectss/score.ts`)
- Costing breakdown (from `/costing`, `src/lib/costing/tiers.ts`)
- Compliance check results (from `src/lib/compliance/check.ts`)
- Business case (from `/business-case`, `src/lib/businesscase/generate.ts`)

## Plan
1. Build a dedicated `/export` (or `/report`) page/component that reads the
   same localStorage keys already used by `/audit`, `/business-case` etc.,
   and renders a single clean document.
2. Add a print stylesheet (`@page` margins, hide nav/footer/buttons via
   `@media print`, force light background for ink-friendliness) in
   `globals.css` or a scoped `<style>` in the export page.
3. "Export as PDF" button calls `window.print()` — every modern browser's
   print dialog offers "Save as PDF" natively. This IS the PDF export;
   no library needed.
4. CSV fallback: reuse `planToCsv` pattern already in `src/lib/assistant.ts`
   if one exists, or add a minimal CSV serializer for the same data, with a
   plain download link/button next to the PDF button.
5. Add a lib module (e.g. `src/lib/export/report.ts`) with pure functions
   assembling the report content from the stored audit/costing/business
   case data, so it's unit-testable with `node --test` (repo convention).
6. Tests: verify the report-assembly functions handle missing data
   gracefully (no audit saved yet, no costing saved yet, etc.) — same
   corrupted/missing-localStorage pattern already fixed elsewhere this
   session (JSON.parse guards).
7. Link from relevant pages (`/audit`, `/costing`, `/business-case`) to the
   export page, or add the button directly on `/business-case` since it
   already assembles from audit+costing+grants.
8. Run `node --test "src/lib/**/*.test.ts"` and `npm run build`, then a
   Sonnet merge-gate review (same pattern used all session), fix any
   findings, commit, push to `feat/sensory-taxonomy-7dim` AND merge to
   `main` (repo is now on a merge-to-main-directly workflow per this
   session's later exchanges — user merged main already once via git
   command line after a GitHub UI compare-view bug).

## After PDF export ships
Two remaining polished builds still owed (per user's explicit ask), to do
AFTER PDF export is committed, in the SAME session if quota allows, else
next session:
1. **Flow stitching** — continuous wizard feel: "continue from your audit"
   button in `/costing` pre-filling from saved audit; same linking `/grants`
   → `/costing` → `/business-case`.
2. **Room templates** — 5-10 pre-built sensory room archetypes in the 3D
   designer (`/spatial`, `src/lib/spatial/templates.ts` already has a
   `TemplatePicker` component — check if this already covers it before
   building new; likely just needs more/better template entries, not new
   architecture).

## Repo state at this point
- Branch: `main` (merged from `feat/sensory-taxonomy-7dim`, commit `30b4eb7`
  is origin/main HEAD, includes the local merge of `9199e19`)
- Both branches pushed and in sync as of last check
- All work happens in `C:\NEURONICHE\neuroniche-spaces`
- Tests: 82/82 passing before this task started
- Cost this session has been high (>$70) — be efficient, no unrequested
  extras beyond what's asked
