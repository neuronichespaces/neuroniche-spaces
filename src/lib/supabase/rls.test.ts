// Isolation tests, Phase 2 (BUILD-SPEC-v1 §6, §9.4). No live Supabase project
// exists yet, so this can't be a real cross-tenant integration test — instead
// it parses every migration's SQL and asserts the *structural* invariant that
// makes tenant isolation possible at all: every table that stores
// organisation-owned data has RLS enabled AND at least one policy gated
// through organisation_memberships (via is_org_member(...)) or auth.uid(),
// never a bare `using (true)` outside the known read-only catalogue tables.
//
// ponytail: regex over the SQL text, not a real parser — this repo's
// migrations are hand-written and consistent (one `create table`/`alter
// table`/`create policy` per statement, lowercase keywords), so regex is
// enough to catch the real regression this guards against: a new tenant
// table added without RLS, or with RLS enabled but no policy (silently
// "works" in dev because service-role/no-RLS testing hides it, then locks
// out real users, or worse, a `using (true)` policy that leaks every row).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "..", "supabase", "migrations");

function loadAllMigrationsSql(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.ok(files.length > 0, "expected at least one migration file");
  return files.map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8")).join("\n");
}

// Catalogue tables are deliberately world-readable to any signed-in user
// (global reference data, not organisation-owned) — see CLAUDE.md and
// 0001_init.sql's own comment on this pattern.
const CATALOGUE_TABLES = new Set(["products", "funding_sources", "scenario_templates"]);

function extractCreatedTables(sql: string): string[] {
  const matches = [...sql.matchAll(/create table\s+(?:if not exists\s+)?(\w+)/gi)];
  return matches.map((m) => m[1]);
}

function extractRlsEnabledTables(sql: string): Set<string> {
  const matches = [...sql.matchAll(/alter table\s+(\w+)\s+enable row level security/gi)];
  return new Set(matches.map((m) => m[1]));
}

// One entry per `create policy "..." on <table> ... using (<expr>)`
function extractPolicies(sql: string): { table: string; using: string }[] {
  const matches = [
    ...sql.matchAll(/create policy\s+"[^"]+"\s+on\s+(\w+)[\s\S]*?using\s*\(([\s\S]*?)\)\s*(?:with check|;)/gi),
  ];
  return matches.map((m) => ({ table: m[1], using: m[2].trim() }));
}

test("every table created in a migration has RLS enabled", () => {
  const sql = loadAllMigrationsSql();
  const tables = extractCreatedTables(sql);
  const rlsEnabled = extractRlsEnabledTables(sql);
  const missing = tables.filter((t) => !rlsEnabled.has(t));
  assert.deepEqual(missing, [], `tables missing "enable row level security": ${missing.join(", ")}`);
});

test("every non-catalogue table has a tenant-scoped policy (is_org_member or auth.uid), not just using(true)", () => {
  const sql = loadAllMigrationsSql();
  const tables = extractCreatedTables(sql).filter((t) => !CATALOGUE_TABLES.has(t));
  const policies = extractPolicies(sql);

  for (const table of tables) {
    const tablePolicies = policies.filter((p) => p.table === table);
    assert.ok(tablePolicies.length > 0, `table "${table}" has RLS enabled but no policy at all — locked shut, not tenant-scoped`);

    const isTenantScoped = tablePolicies.some(
      (p) => /is_org_member\s*\(/i.test(p.using) || /auth\.uid\s*\(\s*\)/i.test(p.using),
    );
    assert.ok(
      isTenantScoped,
      `table "${table}"'s policy does not reference is_org_member(...) or auth.uid() — ` +
        `using: ${tablePolicies.map((p) => p.using).join(" | ")}`,
    );

    // Catches both a bare `using (true)` and `true` ORed in as a disjunct
    // (e.g. `using (true or is_org_member(...))`) — the latter still passes
    // the is_org_member regex above while leaking every row, since `true OR
    // anything` is always true.
    const hasBareTrue = tablePolicies.some(
      (p) => /^true$/i.test(p.using) || /(^|\bor\s+)true(\s+or\b|$)/i.test(p.using),
    );
    assert.ok(!hasBareTrue, `table "${table}" has a "true" disjunct in its policy — that leaks every row to every signed-in user`);
  }
});

test("catalogue tables (products, funding_sources, scenario_templates) are read-only via using(true), never writable by authenticated", () => {
  const sql = loadAllMigrationsSql();
  const policies = extractPolicies(sql);

  for (const table of CATALOGUE_TABLES) {
    const tablePolicies = policies.filter((p) => p.table === table);
    assert.ok(tablePolicies.length > 0, `catalogue table "${table}" has no read policy`);
    assert.ok(
      tablePolicies.every((p) => /^true$/i.test(p.using)),
      `catalogue table "${table}" has a non-"using (true)" policy — check it's still read-only`,
    );
  }
});

test("organisation_memberships itself is RLS-scoped to the requesting user, never readable across users", () => {
  const sql = loadAllMigrationsSql();
  const policies = extractPolicies(sql).filter((p) => p.table === "organisation_memberships");
  assert.ok(policies.length > 0, "organisation_memberships has no policy at all");
  assert.ok(
    policies.every((p) => /user_id\s*=\s*auth\.uid\s*\(\s*\)/i.test(p.using)),
    "organisation_memberships must be scoped to user_id = auth.uid(), found: " +
      policies.map((p) => p.using).join(" | "),
  );
});

test("organisations has no bare INSERT policy for authenticated (must go through the security-definer RPC)", () => {
  const sql = loadAllMigrationsSql();
  // 0004's comment documents this: insert is revoked from authenticated and
  // org creation instead goes through create_organisation_with_owner (0005).
  assert.match(sql, /revoke insert on organisations from authenticated/i);
});
