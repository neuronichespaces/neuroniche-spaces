-- Fixes a live-verified bug: an anonymous (unauthenticated) request could
-- call create_organisation_with_owner directly. Supabase's project-wide
-- default privileges grant EXECUTE on every new public-schema function to
-- both `anon` and `authenticated` automatically — revoking only from
-- PUBLIC (0005 migration) does not remove that separate, direct grant to
-- `anon`. Confirmed live: an anon curl call reached the NOT NULL
-- constraint on organisation_memberships.user_id instead of being denied
-- at the permission-check stage, proving EXECUTE was still granted.
revoke execute on function create_organisation_with_owner from anon;
revoke execute on function create_organisation_with_owner from public;
grant execute on function create_organisation_with_owner to authenticated;
