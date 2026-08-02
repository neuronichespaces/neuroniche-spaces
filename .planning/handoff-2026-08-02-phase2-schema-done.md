# Handoff — Phase 2 schema/RLS/auth complete, data migration next (2026-08-02, ~21:10 Perth)

## Fully done and live-verified on the real Supabase project
- All 7 migrations applied in order (0001 through 0007) on project
  `qwjduwissppgcmniyiiv` (Sydney/ap-southeast-2).
- Taxonomy decision resolved: **5-category sensory model**
  (movement/noise/light/touch/pressure) is the real one — the 7-dimension
  expansion (vestibular/proprioception/etc.) was found to be a half-finished
  migration from an earlier session (only the DB schema + one unused type
  file were changed, the actual app never followed). Reverted via 0007,
  deleted the orphaned `src/lib/planner/types-sensory.ts`.
- Multi-tenant RLS policies live: `organisations`, `rooms`,
  `sensory_profiles`, `room_layouts`, `placed_objects` all correctly
  scoped to `organisation_memberships` via `is_org_member()`.
- **A live security bug was found and fixed during verification**, not
  just in code review: `create_organisation_with_owner`'s RPC could be
  called anonymously (Supabase auto-grants EXECUTE to `anon` on new
  functions, separately from the PUBLIC grant that was revoked). Confirmed
  via a live curl call before the fix (reached a NOT NULL constraint
  instead of being denied), and confirmed again after 0006 was applied
  (now correctly returns 401 permission denied). This is exactly why
  live verification matters, not just static review.
- Magic-link email auth working (`/login`).
- `/organisations` — create/list orgs against real data, works end to end.

## What's NOT done — the real next piece of work
**Wiring the app's actual features to this backend instead of
localStorage.** This is a bigger job than it sounds and deserves a full
session with fresh quota, not a rushed tail-end:

1. **Decide the room/org UX first.** Before any page can save to
   `sensory_profiles`/`room_layouts`, the app needs some way for a signed-in
   user to select "which organisation, which room am I working on" —
   this doesn't exist yet. `/organisations` only creates/lists orgs, it
   doesn't create rooms within them. Recommend: add a room
   create/select step to `/organisations` (or a new `/rooms` page) before
   touching any of the four features below.
2. **`/costing`** — maps most directly to `rooms` + `sensory_profiles`
   (the `needs` state is already the same 5-category shape as the table).
   Natural first candidate to migrate.
3. **`/audit`** — has NO matching table in the schema at all. The
   ASPECTSS 7-criteria audit answers (acoustics, spatial_sequencing,
   escape, compartmentalization, transition_spaces, sensory_zoning,
   safety) don't fit `sensory_profiles`' category/preference shape. A new
   table (e.g. `audit_responses`) would need its own migration before this
   can move off localStorage.
4. **`/business-case`** and **`/training`** — no schema exists for these
   yet either (business case sections, training progress). Same story:
   new tables needed, designed and migrated before wiring.
5. **Keep the localStorage fallback working for signed-out/demo use** in
   every case — don't rip it out, layer real persistence on top only when
   a user is signed in with an active room selected.

## Why stopping here, not pushing further tonight
Quota was projected to run out within the hour when this note was written.
Data-migration work like this touches real user-data plumbing across
4 features — starting it now risked leaving something half-wired if the
session cut off mid-task. Better to stop at a clean, fully-verified
checkpoint (schema+RLS+auth all confirmed live and correct) than rush.

## Repo state
Branch: `main`, commit `9169265` at time of writing. Everything described
above is committed and pushed. `.env.local` (gitignored) has the working
Supabase URL + publishable key already — no new setup needed to continue.
