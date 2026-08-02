# Handoff — Phase 2 Supabase: connection done, schema/auth/RLS next (2026-08-02, ~18:27 Perth)

## What's done
- Supabase project created by the user: region **Sydney (ap-southeast-2)**,
  confirmed correct for AU data-residency (spec §10.3).
- `.env.local` created (gitignored, confirmed never committed) with:
  - `NEXT_PUBLIC_SUPABASE_URL=https://qwjduwissppgcmniyiiv.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...` (the new-format
    Supabase key, equivalent to the legacy `anon` key — safe for the browser)
- `@supabase/supabase-js` installed (0 vulnerabilities).
- `src/lib/supabase/client.ts` — browser client, throws a clear error if env
  vars are missing rather than failing silently.
- **Connection verified live**, not just "should work": queried a
  nonexistent table and got back PostgREST's `PGRST205 "Could not find the
  table"` — proves the URL + key authenticate correctly against the real
  project (a wrong/expired key would instead 401 on the apikey check itself,
  which is what we ruled out first).
- Tests 93/93, build green — nothing broken by the new dependency.

## What's deliberately NOT done yet
Stopped here rather than rushing schema + auth + RLS in a quota-constrained
tail end of a long, expensive session (~$110 this session already). This is
the security-sensitive part of Phase 2 and deserves a careful pass, not a
rushed one.

## Next session: the actual Phase 2 build
1. **Schema.** `supabase/migrations/0001_init.sql` already defines the
   target schema (see `docs/SCHEMA-DESIGN.md` for rationale). Apply it via
   the Supabase SQL editor or CLI migration push. Also check
   `supabase/migrations/0002_sensory_7dim.sql` and `0003_room_layouts.sql`
   — both already exist in this repo from earlier sessions, written but
   never applied to a live project until now.
2. **Row-level security.** Every table needs deny-by-default RLS policies
   (spec §9, §6) before any real user data touches it. Write pgTAP or
   equivalent cross-tenant isolation tests — spec explicitly calls this out
   as a launch blocker, not optional hardening.
3. **Auth.** Spec §9.3 recommends passkeys. Supabase Auth supports this;
   needs a signup/login UI and session handling wired into
   `A11yProvider`/root layout.
4. **Data migration.** Once schema + RLS + auth exist, migrate each
   localStorage-based feature to real tenant-scoped tables one at a time:
   audit answers, costing state, business case, training progress, co-design
   survey responses. Each migration should keep the localStorage fallback
   working for signed-out/demo use, per this app's existing "works without
   an account" pattern — don't rip that out, extend it.
5. **CI.** `.github/workflows/ci.yml` already greps for RLS-disabled
   migration patterns — once real migrations exist, confirm this gate
   actually catches a deliberately-broken test migration before trusting it
   in production.

## Repo state
- Branch: `main` (this session's Phase 2 connection work is next to commit)
- All prior work (PDF export, flow stitching, room templates verified
  already complete) is merged and pushed.
- `.env.local` exists locally only — whoever continues this needs the same
  two values (URL + publishable key) to run the app locally; they're not
  secret enough to need special handling beyond the existing gitignore, but
  should still be shared privately (e.g. password manager), not pasted in a
  public channel.
