-- Phase 2 — memberships + tenant-scoped RLS policies (BUILD-SPEC-v1 §6, §9).
-- Every org-scoped table was enabled-but-policy-less in 0001/0003 (locked
-- shut, the safe default). This migration adds the membership table and the
-- policies that open access — scoped strictly to auth.uid()'s memberships,
-- never broader.

create table organisation_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references organisations(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (user_id, organisation_id)
);

alter table organisation_memberships enable row level security;

-- A user can see their own membership rows (needed so the app can list
-- "which orgs am I in"), never anyone else's.
create policy "read own memberships" on organisation_memberships
  for select to authenticated
  using (user_id = auth.uid());

-- Helper: is auth.uid() a member of the given organisation?
-- security definer + fixed search_path so this can't be tricked by a
-- search_path hijack, and so it bypasses organisations' own RLS internally
-- (it must, or it would recurse into the policy that calls it).
create or replace function is_org_member(org_id uuid) returns boolean as $$
  select exists (
    select 1 from organisation_memberships
    where organisation_id = org_id and user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

-- Organisations: a member can read/update their own org; creating an org
-- is open to any authenticated user (they become its first owner via a
-- membership row inserted in the same transaction by the app).
create policy "read own organisation" on organisations
  for select to authenticated
  using (is_org_member(id));
create policy "update own organisation" on organisations
  for update to authenticated
  using (is_org_member(id));
-- Deliberately no INSERT policy here: creating an org must go through
-- create_organisation_with_owner (0005 migration), which is SECURITY
-- DEFINER (bypasses RLS as the definer) and creates the membership row in
-- the same call. A direct .insert() from an authenticated client is
-- rejected outright rather than allowed to create an orphaned,
-- never-again-visible org row.
revoke insert on organisations from authenticated;

-- Rooms: fully scoped to membership of the parent organisation.
create policy "manage own rooms" on rooms
  for all to authenticated
  using (is_org_member(organisation_id))
  with check (is_org_member(organisation_id));

-- Sensory profiles: scoped via the room's organisation.
create policy "manage own sensory profiles" on sensory_profiles
  for all to authenticated
  using (is_org_member((select organisation_id from rooms where rooms.id = room_id)))
  with check (is_org_member((select organisation_id from rooms where rooms.id = room_id)));

-- Room layouts + placed objects: scoped via room -> organisation.
create policy "manage own room layouts" on room_layouts
  for all to authenticated
  using (is_org_member((select organisation_id from rooms where rooms.id = room_id)))
  with check (is_org_member((select organisation_id from rooms where rooms.id = room_id)));

create policy "manage own placed objects" on placed_objects
  for all to authenticated
  using (
    is_org_member((
      select r.organisation_id from rooms r
      join room_layouts rl on rl.room_id = r.id
      where rl.id = room_layout_id
    ))
  )
  with check (
    is_org_member((
      select r.organisation_id from rooms r
      join room_layouts rl on rl.room_id = r.id
      where rl.id = room_layout_id
    ))
  );

create index idx_memberships_user on organisation_memberships(user_id);
create index idx_memberships_org on organisation_memberships(organisation_id);
