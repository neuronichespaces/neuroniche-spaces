-- Room settings: budget + F6 compliance-check answers. Both were left
-- localStorage-only when /costing was first wired to sensory_profiles
-- (see .planning handoff 2026-08-02) because no table existed for them.
-- One row per room, same room-scoped RLS pattern as sensory_profiles (0004).

create table room_settings (
  room_id uuid primary key references rooms(id) on delete cascade,
  budget numeric not null default 0 check (budget >= 0),
  state text not null default 'WA' check (state in ('WA', 'VIC', 'NSW', 'QLD', 'SA', 'TAS', 'ACT', 'NT')),
  lockable_from_outside boolean not null default false,
  free_exit_attested boolean not null default false,
  clear_circulation boolean not null default false,
  full_supervision_sightlines boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger room_settings_updated_at before update on room_settings
  for each row execute function set_updated_at();

alter table room_settings enable row level security;

create policy "manage own room settings" on room_settings
  for all to authenticated
  using (is_org_member((select organisation_id from rooms where rooms.id = room_id)))
  with check (is_org_member((select organisation_id from rooms where rooms.id = room_id)));
