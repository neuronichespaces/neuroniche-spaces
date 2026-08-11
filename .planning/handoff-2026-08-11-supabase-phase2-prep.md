# Handoff — 2026-08-11 — Supabase Phase 2 prep (memberships/RLS already existed; filled the gaps)

## Plain-language summary for Stefan

Short version: **most of this was already built** in an earlier session (2 Aug
and since) — you already have a live Supabase project in Sydney, the
memberships/security table, and login already work in the app. What I added
today is the missing safety net around it: tests that check the security
rules are correct, a server-side connection file for later, and a fix so the
app won't crash if the connection settings ever go missing. Nothing about
your app's behaviour changed for you today.

### What you need to do

Nothing right now. Your `.env.local` (the file with your real Supabase
address + key) already exists on this machine from the 2 Aug session and
still works — confirmed by today's tests and a clean `npm run build`.

If you ever set this app up on a **new** computer, or the `.env.local` file
goes missing, here's what to do:
1. Open Supabase dashboard → your project → Settings → API.
2. Create a file named exactly `.env.local` in the project's top folder
   (same folder as `package.json`) — I did not create this file myself,
   on purpose, so nothing with your real keys gets written by me.
3. Put these two lines in it, with your real values after the `=`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   (Supabase now calls this the "publishable key" — it's the same thing
   older docs call the "anon key". It's safe to put in browser code; it is
   NOT the "service_role" key, which must never go in this file or anywhere
   with `NEXT_PUBLIC_` in front of it.)
4. Save, then restart `npm run dev`.

I also could not edit `.env.example` (the template file with blank var
names, safe to commit) — the tool I use to edit files is deliberately
blocked from touching any `.env*` file, even to add blank placeholders. If
you want the two blank lines above added to `.env.example` for future
reference, you (or a future session) will need to add them by hand; it's a
template with no real values, so there's no secret risk either way.

`.env.local` is confirmed still listed in `.gitignore` (line 38: `.env*`),
so it can never be accidentally committed.

## What was already done (found, not built today)

- Live Supabase project, Sydney region, connected — `.planning/handoff-2026-08-02-phase2-connection.md`.
- `supabase/migrations/0004_memberships_and_rls.sql` — `organisation_memberships`
  table + `is_org_member()` security-definer helper + tenant-scoped RLS
  policies on organisations, rooms, sensory_profiles, room_layouts,
  placed_objects.
- Later migrations (0008, 0009) extended the same pattern to
  audit_responses, business_cases, training_progress, room_settings.
- `src/lib/supabase/client.ts` — browser client, already wired into
  audit/business-case/costing/organisations/training pages and
  `src/lib/spatial/persistence.ts`.
- `src/lib/supabase/useAuth.ts` — magic-link auth hook, `src/app/login/page.tsx`.
- `@supabase/supabase-js` already a dependency.

## What I built today

1. **`src/lib/supabase/rls.test.ts`** (new) — 5 tests, no live DB needed.
   Parses every file in `supabase/migrations/*.sql` and asserts: every
   `create table` has a matching `enable row level security`; every
   non-catalogue table has a policy referencing `is_org_member(...)` or
   `auth.uid()`, never a bare `using (true)`; the three catalogue tables
   (products, funding_sources, scenario_templates) are read-only via
   `using (true)` and nothing else; `organisation_memberships` is scoped to
   `user_id = auth.uid()`; `organisations` has no direct INSERT policy for
   `authenticated` (must go through the security-definer
   `create_organisation_with_owner` RPC from 0005, so a stray `.insert()`
   can't create an orphaned org). All 5 pass against the current 11
   migrations.
2. **`src/lib/supabase/client.ts`** (edited) — was throwing at import time
   if env vars were missing, which would crash every page that imports it
   the moment `.env.local` doesn't exist (e.g. a fresh clone). Now degrades
   gracefully: warns once via `console.warn`, falls back to a placeholder
   URL/key so real Supabase calls fail as an ordinary network error the
   page's existing error handling already deals with, instead of a
   white-screen import crash. Added `isSupabaseConfigured` export for future
   callers that want to check before calling.
3. **`src/lib/supabase/server.ts`** (new) — server-side client for future
   route handlers/server actions. Nothing in the app calls this yet
   (everything today is client-side); it exists as the drop-in for when
   something needs it, following the same graceful-degradation pattern.
   Prefers `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS — server-only, never
   `NEXT_PUBLIC_`) and falls back to the publishable key.
4. Ran `.claude/agents/privacy-security-reviewer.md`'s persona as an
   adversarial review of the RLS policies + new tests (see below).

## Personas used

- **privacy-security-reviewer** (adversarial review of RLS policies +
  isolation tests) — this repo's `.claude/agents/README.md` standard-chain
  table has no DB-specific chain, so I'm stating that explicitly per this
  session's instructions; privacy-security-reviewer was chosen because this
  is auth/RLS/tenant-isolation work over organisation data, its listed
  remit exactly.
- Findings, condensed: `is_org_member()` PASS (search_path pinned, no RLS
  recursion — it queries `organisation_memberships`, which has its own
  simple `user_id = auth.uid()` policy, not `is_org_member` itself).
  `training_progress`'s `user_id = auth.uid()` policy PASS (not forgeable —
  `auth.uid()` comes from the server-verified JWT, not anything the client
  sends). Placeholder-URL fallback in `client.ts`/`server.ts` PASS (won't
  resolve; even if it did, deny-by-default RLS still blocks it). Sensory
  data model PASS against current APPs (room-level, non-diagnostic, no
  individual to link to) — **advisory**: if NDIS per-participant funding
  data is added later (per `docs/MARKET-SCOPE.md`), that would need a
  second, participant-level access-control axis on top of today's
  org-membership-only model, not a substitute for it.
  One real **FLAG in my test**, fixed same session: the bare-`using(true)`
  check only matched the *entire* clause equal to `true`, so a
  hypothetical `using (true or is_org_member(...))` policy would have
  passed both checks while still leaking every row. Tightened the regex to
  also catch `true` as an OR'd disjunct; all 5 tests still pass against the
  current migrations.

## Verification (2026-08-11)

- `npx tsc --noEmit` — only the 4 known pre-existing errors in
  `src/lib/export/report.test.ts` (missing `reviewedBy`/`reviewedAt` on test
  fixtures), unrelated, not touched.
- `npm run build` — exit 0, all 26 routes build clean.
- `node --test "src/lib/**/*.test.ts"` — 226/226 pass (221 prior + 5 new
  `rls.test.ts`), 0 fail.
- `npm run lint` — 13 errors / 8 warnings, matching the known-acceptable
  13-15 baseline; none introduced by today's files.
- `git status` — no `.env.local` present, nothing secret-looking staged.
  `.env.example` is mid-edit from a parallel Stripe-scaffold agent this
  session (Stripe-only content) — I did not touch it (blocked anyway, see
  above) and left it alone per the "do not touch Stripe/billing files"
  instruction.
- `.gitignore` line 38 (`.env*`) confirmed still covers `.env.local`.

## What's genuinely next (not done today, out of scope)

- Nothing DB/RLS-related is blocking. The 2026-08-02 handoff's remaining
  item — a full screen-reader/keyboard-only walkthrough of the spatial
  designer (§11.5) — is unrelated to this session and still open per the
  2026-08-11 costing handoff.
- If a server component/route handler ever needs `server.ts`, wire it in
  then; don't add `@supabase/ssr` cookie-bridging speculatively before
  something actually needs session-aware server rendering.
