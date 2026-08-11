# Non-clinical content review — 2026-08-11

Persona: `.claude/agents/non-clinical-content-reviewer.md`, run inline (Agent tool project
subagent_type dispatch workaround, per this session's convention).

## Scope reviewed

1. `src/lib/aspectss/score.ts` + `src/lib/aspectss/toNeeds.ts` — audit questions/scoring
2. `src/app/audit/page.tsx`, `src/app/business-case/page.tsx` — user-facing copy
3. `src/components/spatial/ScenarioCircuitOverlay.tsx` — Alerting/Organising/Calming labels
4. `src/lib/spatial/templates.ts` — room template descriptions (hospital waiting room,
   airport sensory room, workplace quiet pod)
5. Product/catalogue copy — CATALOGUE has moved out of `src/app/page.tsx` into
   `src/lib/demoData.ts` (grep confirmed no inline `CATALOGUE` in page.tsx anymore); reviewed
   `src/lib/demoData.ts` and `src/app/catalogue/page.tsx` instead.

## Findings: clean pass, no fixes made

- Audit questions (`score.ts`) use plain observational language ("Is the space quiet...",
  "Can a person leave the space freely..."), scored via yes/partial/no — no diagnostic
  framing anywhere in the criteria or question text.
- `toNeeds.ts` derives sensory needs from audit scores using only the five DB-constrained
  categories (noise/light here); comments explicitly document why 5 of 7 criteria are left
  unmapped rather than invented — good discipline, no overreach risk.
- `audit/page.tsx`, `business-case/page.tsx`: UI chrome and state logic, no promotional or
  outcome-promising copy. `page.tsx` line 324 explicitly disclaims: "does not provide
  assessments, therapy, or guarantees of funding."
- `ScenarioCircuitOverlay.tsx`: phase labels are "Alerting / Organising / Calming" — arousal-
  level language, not a named clinical protocol. File's own comment (line 5) notes this is
  deliberately non-diagnostic language, consistent with `templates.ts` line 363's comment
  ("plain arousal-level language rather than naming any particular clinical framework").
- `templates.ts`: `description` fields use "supports", "for travellers to regulate", "a
  single-person space for a short regulation break" — feature/space framing, not therapeutic
  claims. No "treats", "diagnoses", "prescribed", "therapy for X condition" found repo-wide
  in `.tsx`/`.ts` UI-facing files (grep across `src/` for
  `therapy|therapeutic|diagnos|treat|prescri|disorder|condition|meltdown|autis|ADHD|clinical`
  returned only: disclaimer/guarantee language in `aup`, `grants`, `terms`, `privacy`,
  `PrintableExport.tsx` — all "not guaranteed" boilerplate, correctly framed; and
  `templates.ts` line 248 "a section of a clinical waiting area" — describes the real-world
  hospital context the template is designed for, not a claim about the product itself).

## One judgment call flagged, not changed

- `templates.ts:248` — "A section of a clinical waiting area that supports patients and
  families..." The word "clinical" and "patients" describe the room's real-world setting
  (a hospital), not a therapeutic claim by NeuroNiche. Defensible as accurate scene-setting
  rather than overreach. Flagging per this persona's convention (judgment calls flagged, not
  unilaterally rewritten) rather than fixing — a build agent or the user can decide whether
  to soften "patients" to "visitors" for consistency with the product's non-clinical stance,
  but it isn't a diagnostic/therapeutic claim as written.

## Verification

No copy changes made — build/lint/test run skipped per task instructions for a clean pass.

## Out of scope (untouched, per instructions)

`src/app/api/checkout/**`, `src/app/api/stripe/**`, `src/app/billing/**`,
`src/lib/billing/stripe.ts`, `src/lib/supabase/**`, `src/lib/funding/**`.
