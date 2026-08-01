-- Migrate sensory_profiles from the 5-category taxonomy to the 7-dimension
-- taxonomy already live in src/lib/planner/types-sensory.ts. No rows exist
-- in production yet (DB unapplied), so no backfill needed.

alter table sensory_profiles drop constraint sensory_profiles_category_check;
alter table sensory_profiles add constraint sensory_profiles_category_check
  check (category in ('vestibular', 'proprioception', 'tactile', 'auditory', 'visual', 'olfactory', 'gustatory'));

-- preference column already named 'preference' with seeks/avoids/neutral — unchanged.
