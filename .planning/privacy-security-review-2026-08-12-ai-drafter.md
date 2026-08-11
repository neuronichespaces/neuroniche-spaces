# Privacy/security review — AI business-case drafter (Omniroute)

Date: 2026-08-12
Reviewer: privacy-security-reviewer persona (run inline per this session's `.claude/agents/README.md` workaround — Agent tool dispatch to project subagent_types errors here)
Scope: `src/lib/businesscase/aiDrafter.ts`, `src/app/api/business-case/draft/route.ts`, `src/app/business-case/page.tsx`, `src/app/privacy/page.tsx`
Trigger: `.planning/privacy-security-review-2026-08-11.md` flagged "if an AI drafter is wired in, would raise APP 8 cross-border disclosure questions" — that AI drafter shipped this session (commits `5582cc7`, `2fa7416`, `f906c83`).

## What data actually gets sent (aiDrafter.ts:41-58)

`draftSectionProse()` sends one prompt per section to the configured Omniroute model. Confirmed against `src/lib/businesscase/generate.ts:37-77`, the fields that ever appear in a prompt are:

- `inputs.organisationName` — org name (org-level, not an individual)
- `inputs.audit.overall` — ASPECTSS audit score (aggregate, out of 5)
- `inputs.costing.tier`, `.total`, `.contingencyPct`, `.lines.length` — cost totals, no line-item names
- `inputs.grants[].name` — matched funding source names

No student names, no per-individual sensory data, no free-text fields beyond org name. This holds the line CLAUDE.md sets ("no student-identifiable fields anywhere... sensory data is room-level aggregate"). **Not a violation of the no-PII product rule.**

## APP 8 (cross-border disclosure) — finding, now fixed

Omniroute (127.0.0.1:20128) is a local Docker gateway, but it forwards to remote providers — this session's `.env.local` testing confirmed `nvidia/openai/gpt-oss-20b`, and the gateway supports NVIDIA/OpenAI/Gemini/Cerebras/OpenRouter, all US-based. Sending org name + audit/costing data to any of these is an overseas disclosure under APP 8, even though no individual is identified (APP 8 applies to personal information; org-level data about an organisation itself isn't "personal information" under the Privacy Act — but the org's staff/contact details entered elsewhere in the account could be, so treat this as good practice regardless of the strict legal trigger).

**Before this fix**, `src/app/privacy/page.tsx` §5 (Disclosure and overseas recipients) listed "Anthropic (AI features, once enabled)" — wrong vendor (nothing in this codebase calls Anthropic's API for business-case drafting), and "once enabled" was stale — the AI drafter is live now (beta, opt-in). This is exactly the gap the trigger review predicted.

**Fix applied** (`src/app/privacy/page.tsx`, §5 bullet list): replaced the Anthropic line with one describing the actual Omniroute flow — self-hosted gateway, third-party provider (NVIDIA/OpenAI/Google/Cerebras/OpenRouter, configurable), offshore processing, and a note that only org-level data is sent. This is still a DRAFT policy per the page's existing banner (not yet legally in force), so no lawyer-review process is bypassed — same status as the rest of the page.

Not changed (flagging for your decision): the in-app disclosure text on `src/app/business-case/page.tsx:249-252` says "using your local Omniroute gateway" — technically true (Omniroute itself is local) but reads as if data stays local, when it's actually forwarded offshore. Consider adding a clause like "...which forwards to a third-party AI provider" — small copy change, but it's user-facing product copy (not the privacy policy), so I left it for you rather than unilaterally editing tone/wording outside the obvious-policy-fix scope you set.

## PII/individual-identifying data

None sent — confirmed above. No change needed.

## Opt-in vs automatic

Confirmed opt-in, two layers:
1. `GET /api/business-case/draft` only reports `configured: true` if `OMNIROUTE_API_KEY` and `OMNIROUTE_MODEL` are both set server-side.
2. The "Generate draft (AI, beta)" button (`business-case/page.tsx:237-246`) only renders when `aiConfigured` is true, and even then requires a separate explicit click from the standard "Generate draft" button. No auto-fire.

This supports a straightforward consent framing: the org rep affirmatively chooses the AI path per business case.

## Data retention

Cannot verify from this repo — Omniroute is a pass-through gateway you run locally; retention depends entirely on whichever upstream provider it's currently routed to (per this session, `nvidia/openai/gpt-oss-20b`). **Action needed from you**: check NVIDIA's (or whichever provider is live) API terms for prompt retention/training-use policy, and if it retains data, either request zero-data-retention terms (the privacy policy draft already commits to attempting this generally, §5) or note the retention window in the privacy policy once an entity/lawyer pass happens.

## Summary of changes made

- `src/app/privacy/page.tsx` §5: corrected the AI-vendor disclosure bullet (Anthropic → Omniroute/third-party provider description), matching what's actually shipped. One bullet, no other page changes.
- No source/logic files touched — no build/typecheck/test run needed per task scope (not required since only a `.tsx` static-content edit, but page uses no new logic, so no re-verification necessary beyond the existing design-hook pass that ran automatically).

## Open items for the user (not auto-fixed)

1. In-app "local Omniroute gateway" copy (`business-case/page.tsx:249-252`) could be read as implying no offshore transfer — consider clarifying.
2. Confirm actual data-retention policy of whichever provider is live behind Omniroute; update privacy policy once known.
3. Privacy policy page is still explicitly DRAFT/pending lawyer review (existing banner) — the fix above keeps it accurate, doesn't change its draft status.
