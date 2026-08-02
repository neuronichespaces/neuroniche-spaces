"use client";

// F2 — Grant finder (BUILD-SPEC-v1 §4.2). Deadlines shown as plain dates +
// days remaining, never countdown/urgency styling (calm-UX rule). Every
// grant shows its verification date; stale (>30 days) records get a warning.

import { useMemo, useState } from "react";
import Link from "next/link";
import { FUNDING } from "@/lib/demoData";
import {
  matchFunding,
  isStale,
  daysUntilDeadline,
  type FundingMatch,
  type Organisation,
} from "@/lib/funding/match";

const STATES: Organisation["state_or_province"][] = ["WA", "VIC", "NSW", "QLD", "SA", "TAS", "ACT", "NT"];
const SECTORS = ["government", "catholic", "independent"];

function GrantCard({ m }: { m: FundingMatch }) {
  const days = daysUntilDeadline(m.deadline);
  const stale = isStale(m.last_verified_at);
  return (
    <li className="rounded border border-[var(--a11y-border)] p-4 bg-[var(--a11y-surface)] flex flex-col gap-2">
      <h3 className="font-semibold">{m.display_name}</h3>
      {m.estimated_amount != null && (
        <p className="text-sm">
          Estimated amount: ${m.estimated_amount.toLocaleString()} (typical range — not guaranteed)
          {" — "}
          <Link href={`/costing?budget=${m.estimated_amount}`} className="underline">
            use this budget in costing
          </Link>
        </p>
      )}
      {m.deadline ? (
        <p className="text-sm">
          Deadline: {m.deadline}
          {days != null && days >= 0 && ` (${days} day${days === 1 ? "" : "s"} from today)`}
          {days != null && days < 0 && " (this round has likely closed — check the source)"}
        </p>
      ) : (
        <p className="text-sm">No fixed deadline listed.</p>
      )}
      {m.eligibility_notes && <p className="text-sm">{m.eligibility_notes}</p>}
      <p className="text-sm">
        <a className="underline" href={m.source_url}>
          Official source
        </a>
        {" — "}
        {m.last_verified_at ? `checked ${m.last_verified_at}` : "verification date not on file"}
        {stale && (
          <span className="ml-2 rounded border border-[#8a7a4a] px-2 py-0.5">
            Check this is still current
          </span>
        )}
      </p>
    </li>
  );
}

function Group({ title, items }: { title: string; items: FundingMatch[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="flex flex-col gap-3">
        {items.map((m) => (
          <GrantCard key={m.funding_source_id} m={m} />
        ))}
      </ul>
    </section>
  );
}

export default function GrantsPage() {
  const [org, setOrg] = useState<Organisation>({
    country: "Australia",
    state_or_province: "WA",
    sector: "government",
    nccd_tier: null,
    postcode: null,
  });

  const result = useMemo(() => matchFunding(org, FUNDING), [org]);
  const total = result.recurring.length + result.one_off.length + result.corporate.length;

  return (
    <main className="mx-auto max-w-3xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Grant finder</h1>
      <p>
        Every amount and deadline shown here comes from a public source, is
        shown with its source and the date we last checked it, and is never
        guaranteed. This tool is for Australian organisations only.
      </p>

      <section aria-labelledby="org-h" className="flex flex-col gap-3">
        <h2 id="org-h" className="text-lg font-semibold">
          Your organisation
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 a11y-target">
            State or territory
            <select
              className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
              value={org.state_or_province ?? ""}
              onChange={(e) => setOrg((o) => ({ ...o, state_or_province: e.target.value || null }))}
            >
              {STATES.map((s) => (
                <option key={s} value={s ?? ""}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 a11y-target">
            Sector
            <select
              className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
              value={org.sector ?? ""}
              onChange={(e) => setOrg((o) => ({ ...o, sector: e.target.value || null }))}
            >
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <p aria-live="polite" className="text-sm">
        {total === 0
          ? "No matching funding found for these details yet."
          : `${total} matching funding source${total === 1 ? "" : "s"} found.`}
      </p>

      <Group title="Recurring funding" items={result.recurring} />
      <Group title="One-off grants" items={result.one_off} />
      <Group title="Corporate / philanthropic" items={result.corporate} />
    </main>
  );
}
