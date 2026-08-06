-- Wires /spatial to Supabase for real (Phase 6 scoping finding, 2026-08-06): the app has
-- saved room_layouts/placed_objects locally only since 0003 — nothing ever wrote to these
-- tables. Two gaps found while wiring it:
--
-- 1. zones (types.ts's Zone, added in the CAD milestone's Phase 1) has no column anywhere —
--    room_layouts predates it. Adding zones_json, same jsonb-array pattern as the existing
--    wall_geometry_json/door_positions_json columns.
--
-- 2. placed_objects.product_id is a uuid FK to products.id, but the spatial editor's
--    PlacedObject.productId is a human slug ('bean-bag-large', see sensoryLibrary.ts) with
--    no matching products row at all — inserting a placed object would fail its FK today.
--    Adding products.slug (text, unique, nullable — existing demoData.ts-style products don't
--    have one) and seeding the 13 real productIds templates.ts actually places, so saves can
--    resolve slug -> uuid before insert.

alter table room_layouts add column zones_json jsonb not null default '[]';

alter table products add column slug text unique;

insert into products (name, category, sensory_tags, price, funding_eligible, available_countries, slug) values
  ('Bean Bag (large)', 'regulation-calming', '[]', 120, false, '["*"]', 'bean-bag-large'),
  ('Dimmable Floor Lamp', 'lighting', '[]', 90, false, '["*"]', 'dimmable-floor-lamp'),
  ('Weighted Lap Pad', 'regulation-calming', '[]', 60, false, '["*"]', 'weighted-lap-pad'),
  ('Indoor Swing Frame', 'movement-vestibular', '[]', 850, true, '["*"]', 'indoor-swing-frame'),
  ('Crash Mat', 'movement-vestibular', '[]', 340, true, '["*"]', 'crash-mat'),
  ('Low Balance Beam', 'movement-vestibular', '[]', 210, true, '["*"]', 'balance-beam-low'),
  ('Sensory Shelf Unit', 'furniture', '[]', 280, false, '["*"]', 'sensory-shelf-unit'),
  ('Noise Reducing Panel', 'acoustic-treatment', '[]', 190, true, '["*"]', 'noise-reducing-panel'),
  ('Flexible Seating Cube', 'furniture', '[]', 75, false, '["*"]', 'flexible-seating-cube'),
  ('Fidget Tool Bin', 'regulation-calming', '[]', 45, false, '["*"]', 'fidget-tool-bin'),
  ('Bubble Tube Column', 'lighting', '[]', 620, true, '["*"]', 'bubble-tube-column'),
  ('Calm Scenes Projector', 'lighting', '[]', 310, true, '["*"]', 'projector-calm-scenes'),
  ('Tactile Wall Panel Set', 'tactile-proprioceptive', '[]', 160, true, '["*"]', 'tactile-wall-panel-set')
on conflict (slug) do nothing;
