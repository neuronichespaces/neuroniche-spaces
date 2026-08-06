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

interface Room {
  id: string;
  organisation_id: string;
  name: string;
  width_m: number;
  length_m: number;
}

export default function OrganisationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Australia");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [rooms, setRooms] = useState<Record<string, Room[]>>({});
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomWidth, setRoomWidth] = useState(4);
  const [roomLength, setRoomLength] = useState(4);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState("");

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

  const loadRooms = useCallback(async (organisationId: string) => {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, organisation_id, name, width_m, length_m")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setRooms((prev) => ({ ...prev, [organisationId]: data }));
    }
  }, []);

  const toggleExpand = (orgId: string) => {
    const next = expandedOrgId === orgId ? null : orgId;
    setExpandedOrgId(next);
    if (next && !rooms[next]) loadRooms(next);
  };

  const onCreateRoom = async (e: React.FormEvent, organisationId: string) => {
    e.preventDefault();
    setCreatingRoom(true);
    setRoomError("");
    const { error } = await supabase.from("rooms").insert({
      organisation_id: organisationId,
      name: roomName,
      width_m: roomWidth,
      length_m: roomLength,
    });
    if (error) {
      setRoomError(error.message);
    } else {
      setRoomName("");
      await loadRooms(organisationId);
    }
    setCreatingRoom(false);
  };

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
          <ul className="flex flex-col gap-3">
            {orgs.map((o) => {
              const expanded = expandedOrgId === o.id;
              const orgRooms = rooms[o.id] ?? [];
              return (
                <li key={o.id} className="rounded border border-[var(--a11y-border)] p-3 bg-[var(--a11y-surface)] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <strong>{o.name}</strong> — {o.country}
                      {o.state_or_province ? `, ${o.state_or_province}` : ""}
                    </span>
                    <Link
                      href={`/business-case?org=${o.id}`}
                      className="a11y-target rounded border border-[var(--a11y-border)] px-3 text-sm no-underline"
                    >
                      Business case →
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleExpand(o.id)}
                      aria-expanded={expanded}
                      className="a11y-target rounded border border-[var(--a11y-border)] px-3 text-sm"
                    >
                      {expanded ? "Hide rooms" : "Rooms"}
                    </button>
                  </div>

                  {expanded && (
                    <div className="flex flex-col gap-2 border-t border-[var(--a11y-border)] pt-2">
                      {orgRooms.length === 0 ? (
                        <p className="text-sm">No rooms yet for this organisation.</p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {orgRooms.map((r) => (
                            <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                              <span>
                                {r.name} — {r.width_m}m × {r.length_m}m
                              </span>
                              <Link
                                href={`/spatial?room=${r.id}`}
                                className="a11y-target rounded border border-[var(--a11y-border)] px-3 no-underline"
                              >
                                Design this room →
                              </Link>
                              <Link
                                href={`/audit?room=${r.id}`}
                                className="a11y-target rounded border border-[var(--a11y-border)] px-3 no-underline"
                              >
                                Audit this room →
                              </Link>
                              <Link
                                href={`/costing?room=${r.id}`}
                                className="a11y-target rounded border border-[var(--a11y-border)] px-3 no-underline"
                              >
                                Plan this room →
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}

                      <form
                        onSubmit={(e) => onCreateRoom(e, o.id)}
                        className="flex flex-wrap items-end gap-2 border-t border-[var(--a11y-border)] pt-2"
                      >
                        <label className="flex flex-col gap-1 text-sm">
                          Room name
                          <input
                            required
                            className="border rounded px-2 py-1 w-40 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          Width (m)
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            required
                            className="border rounded px-2 py-1 w-20 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
                            value={roomWidth}
                            onChange={(e) => setRoomWidth(Math.max(0.5, Number(e.target.value) || 0.5))}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          Length (m)
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            required
                            className="border rounded px-2 py-1 w-20 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
                            value={roomLength}
                            onChange={(e) => setRoomLength(Math.max(0.5, Number(e.target.value) || 0.5))}
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={creatingRoom}
                          className="a11y-target rounded border border-[var(--a11y-border)] px-3 bg-[var(--a11y-surface)] disabled:opacity-40 text-sm"
                        >
                          {creatingRoom ? "Adding…" : "Add room"}
                        </button>
                      </form>
                      {roomError && (
                        <p role="alert" className="rounded border border-[#8a4a4a] p-2 text-sm">
                          {roomError}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
