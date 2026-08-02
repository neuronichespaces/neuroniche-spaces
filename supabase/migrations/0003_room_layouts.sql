-- Spatial Design Engine — Phase 1 schema
-- Extends rooms/products/funding_sources from 0001_init.sql; no changes to those tables
-- except products.clearance_radius_m (object-type property, not a placement property).

create table room_layouts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  wall_geometry_json jsonb not null default '[]',   -- [{id, start:{x,y}, end:{x,y}, thickness_m}]
  door_positions_json jsonb not null default '[]',  -- [{wall_id, offset_m, width_m}]
  floor_width_m numeric(5,2) not null check (floor_width_m > 0),
  floor_length_m numeric(5,2) not null check (floor_length_m > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table placed_objects (
  id uuid primary key default gen_random_uuid(),
  room_layout_id uuid not null references room_layouts(id) on delete cascade,
  product_id uuid not null references products(id),
  position_x numeric(6,2) not null default 0,
  position_y numeric(6,2) not null default 0,
  rotation_deg numeric(5,1) not null default 0,
  custom_properties_json jsonb not null default '{}', -- {width_m?, depth_m?, height_m?, brightness?, colour_temp_k?, noise_level_db?}
  clearance_violated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table scenario_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_wall_geometry_json jsonb not null default '[]',
  default_placed_objects_json jsonb not null default '[]',
  target_width_min_m numeric(5,2),
  target_width_max_m numeric(5,2),
  target_length_min_m numeric(5,2),
  target_length_max_m numeric(5,2),
  budget_range_min numeric(10,2),
  budget_range_max numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clearance is a property of the object type (e.g. swing needs swing-radius
-- clearance), not the placement — lives on products, nullable (most items need none).
alter table products add column clearance_radius_m numeric(4,2) check (clearance_radius_m >= 0);

do $$
declare t text;
begin
  foreach t in array array['room_layouts','placed_objects','scenario_templates']
  loop
    execute format('create trigger %I_updated_at before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- Locked shut until auth phase adds membership policies, same pattern as rooms/sensory_profiles.
alter table room_layouts enable row level security;
alter table placed_objects enable row level security;
-- Catalogue-style table: readable by any signed-in user, written only by service role.
alter table scenario_templates enable row level security;
create policy "read templates" on scenario_templates for select to authenticated using (true);

create index idx_room_layouts_room on room_layouts(room_id);
create index idx_placed_objects_layout on placed_objects(room_layout_id);
create index idx_placed_objects_product on placed_objects(product_id);
