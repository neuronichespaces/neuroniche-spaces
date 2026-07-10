# Phase 1 Schema Design — decisions of record (2026-07-10)

Migration: `supabase/migrations/0001_init.sql`

## Shape
organisations 1→many rooms 1→many sensory_profiles (one row per sensory
category per room, enforced by a unique constraint). `products` and
`funding_sources` are standalone catalogues matched to rooms at query
time — no foreign keys, so editing a grant or product never touches
saved rooms.

## Why it goes global without schema changes
- `country` / `state_or_province` are plain text on organisations,
  products, and funding_sources. A UK funding engine = new rows with
  `country = 'United Kingdom'`, zero migrations.
- AU-only `nccd_tier` is nullable; non-AU orgs leave it empty.
- `eligibility_rules_json` (jsonb) holds per-body rules because every
  funding body differs; rigid columns would need a migration per grant.
- `available_countries` on products defaults to `["*"]` (worldwide).

## Hard constraints enforced in the database itself
- **No diagnosis labels:** `sensory_profiles.category` CHECK allows only
  movement/noise/light/touch/pressure; `preference` only
  seeks/avoids/neutral. A diagnosis physically cannot be stored.
- **Citations:** `funding_sources.source_url` is NOT NULL.
- **Privacy:** RLS enabled on every table from day one; org-scoped
  tables have no policies yet, meaning locked shut until the auth phase
  adds membership policies. Catalogues are read-only to signed-in users.

## Decisions
- Room dimensions are three numeric columns (width_m/length_m/height_m),
  not JSON — they're queried and validated individually.
- `updated_at` maintained by a shared trigger, not app code.
- No billing/Stripe tables yet — that's a later phase (flat-fee only,
  per hard constraints).
