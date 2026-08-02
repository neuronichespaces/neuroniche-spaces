"use client";

// Phase 2 — real, tenant-scoped organisation data (first Supabase-backed
// feature, replacing localStorage as the multi-tenant model comes online).
// Create-org calls the create_organisation_with_owner RPC (0005 migration)
// so a partial failure can never leave an org with no owner.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/useAuth";
import { supabase } from "@/lib/supabase/client";

interface Organisation {
  id: string;
  name: string;
  country: string;
  state_or_province: string | null;
  sector: string | null;
}

export default function OrganisationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Australia");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrgs = useCallback(async () => {
    setLoadingOrgs(true);
    const { data, error } = await supabase
      .from("organisations")
      .select("id, name, country, state_or_province, sector")
      .order("created_at", { ascending: false });
    if (!error && data) setOrgs(data);
    setLoadingOrgs(false);
  }, []);

  useEffect(() => {
    if (user) loadOrgs();
    else setLoadingOrgs(false);
  }, [user, loadOrgs]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMessage("");
    const { error } = await supabase.rpc("create_organisation_with_owner", {
      org_name: name,
      org_country: country,
    });
    if (error) {
      setErrorMessage(error.message);
    } else {
      setName("");
      await loadOrgs();
    }
    setCreating(false);
  };

  if (authLoading) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl p-6 flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Your organisations</h1>
        <p className="text-sm">
          Sign in to create or view your organisations.
        </p>
        <Link
          href="/login"
          className="a11y-target self-start rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)] no-underline"
        >
          Sign in →
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Your organisations</h1>

      <section aria-labelledby="create-h" className="flex flex-col gap-3">
        <h2 id="create-h" className="text-lg font-semibold">
          Add an organisation
        </h2>
        <form onSubmit={onCreate} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 a11y-target">
            Organisation name
            <input
              required
              className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 a11y-target">
            Country
            <input
              required
              className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </label>
          {errorMessage && (
            <p role="alert" className="rounded border border-[#8a4a4a] p-3 text-sm">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="a11y-target self-start rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)] disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create organisation"}
          </button>
        </form>
      </section>

      <section aria-labelledby="list-h" className="flex flex-col gap-3">
        <h2 id="list-h" className="text-lg font-semibold">
          Existing organisations
        </h2>
        {loadingOrgs ? (
          <p className="text-sm">Loading…</p>
        ) : orgs.length === 0 ? (
          <p className="text-sm">No organisations yet — create one above.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {orgs.map((o) => (
              <li key={o.id} className="rounded border border-[var(--a11y-border)] p-3 bg-[var(--a11y-surface)]">
                <strong>{o.name}</strong> — {o.country}
                {o.state_or_province ? `, ${o.state_or_province}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
