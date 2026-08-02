-- New tables for three features that had no schema yet: the ASPECTSS
-- audit, the business case, and training progress. Schema only in this
-- migration — the UI wiring (moving /audit, /business-case, /training off
-- localStorage) is separate follow-up work, same pattern as
-- sensory_profiles/rooms did for /costing.

-- Audit: one row per question per room (question ids come from
-- src/lib/aspectss/score.ts's QUESTIONS array — ac1, ac2, sq1, etc.).
-- Room-scoped like sensory_profiles, since an audit is about a specific
-- physical space, same as the sensory needs are.
create table audit_responses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  question_id text not null,
  answer text not null check (answer in ('yes', 'partial', 'no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, question_id)
);

-- Business case: organisation-scoped, not room-scoped — it draws together
-- audit + costing + grants context for the whole organisation's funding
-- application, not one specific room. Mirrors the BusinessCase type in
-- src/lib/businesscase/generate.ts (sections/status/reviewedBy/reviewedAt).
create table business_cases (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  sections_json jsonb not null default '[]', -- [{heading, body, citedIds: []}]
  status text not null default 'draft_pending_review' check (status in ('draft_pending_review', 'approved')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Training progress: per-user, not per-organisation — "I've read this
-- section" is an individual's own record, not something colleagues share
-- or need to see each other's. Mirrors src/lib/training/course.ts's
-- CourseProgress (a set of completed module ids).
create table training_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, module_id)
);

do $$
declare t text;
begin
  foreach t in array array['audit_responses', 'business_cases']
  loop
    execute format('create trigger %I_updated_at before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

alter table audit_responses enable row level security;
alter table business_cases enable row level security;
alter table training_progress enable row level security;

-- Audit responses: scoped via room -> organisation, same pattern as
-- sensory_profiles' policy in 0004.
create policy "manage own audit responses" on audit_responses
  for all to authenticated
  using (is_org_member((select organisation_id from rooms where rooms.id = room_id)))
  with check (is_org_member((select organisation_id from rooms where rooms.id = room_id)));

-- Business cases: scoped directly via organisation membership, same
-- pattern as rooms' policy in 0004.
create policy "manage own business cases" on business_cases
  for all to authenticated
  using (is_org_member(organisation_id))
  with check (is_org_member(organisation_id));

-- Training progress: a user's own rows only, never another user's, even
-- within the same organisation — this is individual reading progress, not
-- org-shared data.
create policy "manage own training progress" on training_progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index idx_audit_responses_room on audit_responses(room_id);
create index idx_business_cases_org on business_cases(organisation_id);
create index idx_training_progress_user on training_progress(user_id);
