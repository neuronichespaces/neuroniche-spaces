-- Atomic "create org + owner membership" as a single RPC, so a client-side
-- two-step insert (create org, then create membership) can't leave an
-- orphaned organisation with no owner if the second insert fails.

create or replace function create_organisation_with_owner(
  org_name text,
  org_country text,
  org_state_or_province text default null,
  org_sector text default null,
  org_postcode text default null
) returns uuid as $$
declare
  new_org_id uuid;
begin
  insert into organisations (name, country, state_or_province, sector, postcode)
  values (org_name, org_country, org_state_or_province, org_sector, org_postcode)
  returning id into new_org_id;

  insert into organisation_memberships (user_id, organisation_id, role)
  values (auth.uid(), new_org_id, 'owner');

  return new_org_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Only a signed-in user may call this. Two separate grants can let anon
-- execute a new function: the implicit EXECUTE-to-PUBLIC grant Postgres
-- applies on creation, AND (confirmed live on this project) Supabase's
-- project-wide default privileges, which grant EXECUTE directly to `anon`
-- on every new public-schema function regardless of the PUBLIC grant.
-- Revoke both explicitly rather than relying on the membership table's
-- not-null constraint to fail the call closed (that constraint is a
-- backstop, not the actual access control).
revoke execute on function create_organisation_with_owner from anon;
revoke execute on function create_organisation_with_owner from public;
grant execute on function create_organisation_with_owner to authenticated;
