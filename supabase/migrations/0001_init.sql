-- NeuroNiche Spaces — Phase 1 schema
-- Global-ready: country/state are plain text so non-AU funding engines
-- need only new rows, never schema changes.

create extension if not exists "pgcrypto";

create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  state_or_province text,
  sector text, -- e.g. government / catholic / independent (AU) or local equivalents
  nccd_tier text check (nccd_tier in ('supplementary', 'substantial', 'extensive')), -- nullable, AU-only
  postcode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  width_m numeric(5,2) not null check (width_m > 0),
  length_m numeric(5,2) not null check (length_m > 0),
  height_m numeric(5,2) check (height_m > 0),
  existing_equipment_json jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Non-diagnostic by construction: the CHECK constraints make it impossible
-- to store a diagnosis label — only these five sensory categories exist.
create table sensory_profiles (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  category text not null check (category in ('movement', 'noise', 'light', 'touch', 'pressure')),
  preference text not null check (preference in ('seeks', 'avoids', 'neutral')),
  intensity smallint not null default 3 check (intensity between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, category) -- one aggregate row per category per room
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  sensory_tags jsonb not null default '[]', -- e.g. ["movement:seeks","noise:avoids"]
  price numeric(10,2) not null check (price >= 0),
  funding_eligible boolean not null default false,
  available_countries jsonb not null default '["*"]', -- ["*"] = worldwide
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table funding_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('recurring', 'one_off', 'corporate')),
  country text not null,
  state_or_province text, -- null = nationwide
  amount_range_min numeric(12,2),
  amount_range_max numeric(12,2),
  eligibility_rules_json jsonb not null default '{}', -- sector/tier/postcode rules, varies per body
  deadline_date date, -- null for recurring funding
  source_url text not null, -- constraint: every displayed amount must cite an official source
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at honest on every edit
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['organisations','rooms','sensory_profiles','products','funding_sources']
  loop
    execute format('create trigger %I_updated_at before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- Row Level Security: on for all tables from day one.
-- Org-scoped tables: RLS-on with no policy = locked shut, the safe default
-- until the auth phase adds membership policies.
alter table organisations enable row level security;
alter table rooms enable row level security;
alter table sensory_profiles enable row level security;
-- Catalogue tables: readable by any signed-in user, written only by service role.
alter table products enable row level security;
alter table funding_sources enable row level security;
create policy "read products" on products for select to authenticated using (true);
create policy "read funding" on funding_sources for select to authenticated using (true);

-- Matching queries filter by these constantly
create index idx_rooms_org on rooms(organisation_id);
create index idx_profiles_room on sensory_profiles(room_id);
create index idx_funding_geo on funding_sources(country, state_or_province);
create index idx_products_tags on products using gin(sensory_tags);
