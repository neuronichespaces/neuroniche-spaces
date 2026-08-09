-- CAD-upgrade Gap 7 (Collaboration, versioning, review, audit) — scenario versioning.
-- room_layouts already technically permits multiple rows per room_id, but the app
-- code (persistence.ts) always upserts the single earliest row: there is no real
-- "multiple named scenarios" concept in use today, despite the schema nominally
-- allowing it. This migration adds the two columns that make it real: a name so a
-- user can tell scenarios apart, and a status for the draft/in-review/approved/
-- superseded review workflow the gap-audit calls out as missing.

alter table room_layouts add column name text not null default 'Untitled scenario';
alter table room_layouts add column status text not null default 'draft'
  check (status in ('draft', 'in_review', 'approved', 'superseded'));

comment on column room_layouts.name is 'User-facing scenario name — distinguishes multiple layouts saved for the same room.';
comment on column room_layouts.status is 'Review workflow state: draft -> in_review -> approved, or superseded when replaced by a newer approved scenario.';
