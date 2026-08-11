# Privacy/security review — 2026-08-11

Persona: `privacy-security-reviewer` (`.claude/agents/privacy-security-reviewer.md`), run inline per this session's confirmed workaround (Agent tool hard-errors on project subagent_type dispatch here). Review-only pass, no fixes applied — nothing found needed one.

## Scope reviewed

1. All 11 migrations in `supabase/migrations/*.sql` (0001–0011).
2. Phase 4 sector broadening: `git show e3eabc3` (`src/app/page.tsx`, `src/app/grants/page.tsx`, `supabase/seed_funding_au.sql`, `src/lib/demoData.ts`).
3. RLS policies added this session: `0004_memberships_and_rls.sql`, `0008_audit_businesscase_training_tables.sql`, `0009_room_settings.sql`, and `src/lib/supabase/rls.test.ts`.
4. `src/lib/businesscase/generate.ts`, `src/lib/aspectss/score.ts`, their Supabase persistence (`0008`).
5. `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` (hardening commit `b66f0f8`).
6. NDIS-adjacent scope per `docs/MARKET-SCOPE.md`.

## Findings: clean

- **No student-identifiable or per-individual fields anywhere.** `organisations`, `rooms`, `sensory_profiles`, `room_settings`, `audit_responses`, `business_cases` are all org/room-scoped aggregates. Only two tables carry a `user_id`: `organisation_memberships` (access control, not content) and `training_progress` (an individual's own "I read this module" record — not org-shared, not identifying beyond the auth user itself).
- **`sensory_profiles.category`/`preference` CHECK constraint intact and correctly the 5-category model** after the 0002→0007 round-trip (7-dimension taxonomy added then reverted). Current constraint (0007): `category in ('movement','noise','light','touch','pressure')`, `preference in ('seeks','avoids','neutral')`, `unique(room_id, category)` — one aggregate row per category per room, matches CLAUDE.md's hard requirement.
- **Phase 4 sector broadening (airport/council/university/NFP/government sectors, e3eabc3) adds no new identifying data.** The 3 new `funding_sources` rows only add `sectors` values to existing `eligibility_rules_json` shape (already generic per-string, no code change needed) — no new columns, no new tables, no org-identifying or individual-identifying fields introduced by broadening beyond schools.
- **RLS deny-by-default holds.** Every table created in a migration has `enable row level security` (verified by direct read; also mechanically enforced by `rls.test.ts`'s regex-based structural tests). All org-scoped tables (`organisations`, `rooms`, `sensory_profiles`, `room_layouts`, `placed_objects`, `room_settings`, `audit_responses`, `business_cases`) gate through `is_org_member(...)`. `training_progress` gates through `user_id = auth.uid()`.
- **No `using(true)` on any tenant table.** Only 3 tables use `using (true)`: `products`, `funding_sources`, `scenario_templates` — all deliberate world-readable catalogue/reference data (no org or individual data in any of them), matching the documented pattern in `0001_init.sql`. `rls.test.ts` has a dedicated test asserting this stays true and would fail if a `true` disjunct leaked into any non-catalogue policy.
- **`organisation_memberships` is not readable cross-org.** Its only policy is `using (user_id = auth.uid())` — a user sees only their own membership rows, never another user's, confirmed both by direct read of `0004` and by `rls.test.ts`'s dedicated test.
- **`organisations` has no direct INSERT path for `authenticated`** (`revoke insert on organisations from authenticated`, 0004) — org creation is forced through the SECURITY DEFINER RPC (`0005_create_organisation_rpc.sql`), preventing orphaned/inaccessible org rows. Confirmed by `rls.test.ts`.
- **Business case / audit data (`business_cases`, `audit_responses`)**: organisation-level free text (`sections_json`, per-question yes/partial/no answers) that could theoretically be identifying for a very small organisation (e.g. a small school's audit responses naming specific building features). This is a real but low-severity residual risk — flagging per instruction rather than deciding: RLS already restricts these to org members only, so the exposure surface is "another member of the same org, or a service-role/DB admin," not the public. **No action taken; this is a reasonable design tradeoff already covered by RLS, not a violation of the current no-PII rule** (no field is inherently identifying — the person is a purely academic/statistical inference, not stored data — and both tables carry the standard `is_org_member(organisation_id)` policy from `0008`).
- **`src/lib/supabase/client.ts` / `server.ts` hardening (`b66f0f8`)**: no secrets are printed or logged — the `console.warn` on missing env vars logs only a static message, never a key value. `server.ts` correctly documents (and its callers respect, per grep) that it must never be imported from a `"use client"` file, since it may hold `SUPABASE_SERVICE_ROLE_KEY`. No secret literals found committed in either file — both read from `process.env` only.
- **NDIS-adjacent scope**: no per-participant data collection has started. `docs/MARKET-SCOPE.md` names NDIS per-participant matching as a future direction only; grep across `src/lib` and `supabase/migrations` found no participant-level fields, tables, or matching logic — Phase 4 deliberately did not build this (matches this session's Phase 4 agent report). Advisory only, not a current violation: if/when NDIS per-participant matching is built, it will need its own APP 3/6 (collection/use) and consent-flow review before landing, since that would be the first time this app stores anything that identifies an individual rather than a room/org aggregate.

## Findings: risk items

None blocking. One advisory-only watch item, not a violation:

- **Watch item (not current risk):** if `business_cases.sections_json` or `audit_responses` free text ever gets an AI-drafted generator (the `aiGenerated: false` field in `src/lib/businesscase/generate.ts` signals this is anticipated), re-review at that point for whether an LLM call sends this org data to a third party (APP 8 cross-border disclosure) without clear purpose/consent framing — not an issue with the current deterministic, template-based generator, which does no network calls.

## Nothing flagged for a user decision

No gray-area finding required a user decision this pass — all findings were either clean or advisory-only (no action needed now, re-check trigger noted above).
