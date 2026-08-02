-- Reverts 0002_sensory_7dim.sql. Decision: the 7-dimension taxonomy
-- (vestibular/proprioception/tactile/auditory/visual/olfactory/gustatory)
-- was only ever applied to this table and one unused type file
-- (src/lib/planner/types-sensory.ts, deleted alongside this migration) —
-- the actual working app (costing engine, audit-to-costing bridge, planner)
-- never migrated off the original 5-category model. Reverting the schema
-- to match what's actually built, rather than finishing a half-done
-- migration that nothing depends on. No rows exist in production yet, so
-- no backfill needed (same as 0002's own note when it went the other way).

alter table sensory_profiles drop constraint sensory_profiles_category_check;
alter table sensory_profiles add constraint sensory_profiles_category_check
  check (category in ('movement', 'noise', 'light', 'touch', 'pressure'));
