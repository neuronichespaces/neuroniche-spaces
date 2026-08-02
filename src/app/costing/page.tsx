"use client";

// F4 costing engine + F6 compliance checker (BUILD-SPEC-v1 §4.2).
// One page: pick needs + budget -> three costed tiers; a separate compliance
// panel with the hard restrictive-practice gate (F6). Deterministic, no AI.

import { useMemo, useState } from "react";
import { CATALOGUE } from "@/lib/demoData";
import { buildTierCostings, type Tier } from "@/lib/costing/tiers";
import type { SensoryNeed } from "@/lib/planner/plan";
import { runComplianceCheck, type AuState, type ComplianceInput } from "@/lib/compliance/check";

const NEED_CATEGORIES: SensoryNeed["category"][] = ["movement", "noise", "light", "touch", "pressure"];
const TIER_LABEL: Record<Tier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };
const AU_STATES: AuState[] = ["WA", "VIC", "NSW", "QLD", "SA", "TAS", "ACT", "NT"];

export default function CostingPage() {
  const [budget, setBudget] = useState(2000);
  const [needs, setNeeds] = useState<Record<string, "seeks" | "avoids" | "neutral">>(
    Object.fromEntries(NEED_CATEGORIES.map((c) => [c, "neutral"])),
  );
  const [compliance, setCompliance] = useState<ComplianceInput>({
    state: "WA",
    lockableFromOutside: false,
    freeExitAttested: false,
    clearCirculation: false,
    fullSupervisionSightlines: false,
  });

  const activeNeeds: SensoryNeed[] = useMemo(
    () =>
      NEED_CATEGORIES.filter((c) => needs[c] !== "neutral").map((c) => ({
        category: c,
        preference: needs[c] as "seeks" | "avoids",
        intensity: 3,
      })),
    [needs],
  );

  const tiers = useMemo(
    () => buildTierCostings(activeNeeds, budget, CATALOGUE, { country: "Australia" }),
    [activeNeeds, budget],
  );

  const report = useMemo(() => runComplianceCheck(compliance), [compliance]);

  return (
    <main className="mx-auto max-w-3xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Costing and compliance</h1>
      <p>
        Set your budget and what the space needs to support. We build three
        options — a smaller start, a full fit-out, and an enhanced version —
        and check for the safety issues that matter most.
      </p>

      <section aria-labelledby="needs-h" className="flex flex-col gap-3">
        <h2 id="needs-h" className="text-lg font-semibold">
          1. What does the space need to support?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {NEED_CATEGORIES.map((c) => (
            <label key={c} className="flex items-center justify-between gap-3 a11y-target">
              <span className="capitalize">{c}</span>
              <select
                className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
                value={needs[c]}
                onChange={(e) =>
                  setNeeds((prev) => ({ ...prev, [c]: e.target.value as "seeks" | "avoids" | "neutral" }))
                }
              >
                <option value="neutral">Not a focus</option>
                <option value="seeks">Seeks more</option>
                <option value="avoids">Avoids / reduce</option>
              </select>
            </label>
          ))}
        </div>

        <label className="flex items-center justify-between gap-3 a11y-target">
          Budget (AUD)
          <input
            type="number"
            min={0}
            step={50}
            className="border rounded px-2 py-1 w-32 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
            value={budget}
            onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      </section>

      <section aria-labelledby="tiers-h" className="flex flex-col gap-3">
        <h2 id="tiers-h" className="text-lg font-semibold">
          2. Your three options
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.tier}
              className="rounded border border-[var(--a11y-border)] p-4 bg-[var(--a11y-surface)] flex flex-col gap-2"
            >
              <h3 className="font-semibold">{TIER_LABEL[t.tier]}</h3>
              <p className="text-sm">Budget for this option: ${t.budgetUsed.toFixed(0)}</p>
              <ul className="text-sm list-disc pl-5 flex flex-col gap-1">
                {t.lines.length === 0 && <li>No matching items within budget yet.</li>}
                {t.lines.map((l) => (
                  <li key={l.productId}>
                    {l.name} — ${l.price}
                    {l.fundingEligible ? " (funding eligible)" : ""}
                  </li>
                ))}
              </ul>
              <p className="text-sm border-t border-[var(--a11y-border)] pt-2">
                Items: ${t.subtotal.toFixed(0)} + {t.contingencyPct}% contingency ($
                {t.contingency.toFixed(0)}) = <strong>${t.total.toFixed(0)}</strong>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="compliance-h" className="flex flex-col gap-3">
        <h2 id="compliance-h" className="text-lg font-semibold">
          3. Compliance check
        </h2>
        <label className="flex items-center justify-between gap-3 a11y-target">
          State or territory
          <select
            className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
            value={compliance.state}
            onChange={(e) => setCompliance((prev) => ({ ...prev, state: e.target.value as AuState }))}
          >
            {AU_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {(
          [
            ["lockableFromOutside", "Can any door in this space lock from the outside, or hold a person in?"],
            ["freeExitAttested", "I attest that occupants can leave this space freely at any time"],
            ["clearCirculation", "There is at least 1 metre of clear path to the exit"],
            ["fullSupervisionSightlines", "Staff can see the whole space without blind spots"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 a11y-target">
            {label}
            <input
              type="checkbox"
              className="size-5"
              checked={compliance[key]}
              onChange={(e) => setCompliance((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
          </label>
        ))}

        <ul className="flex flex-col gap-2">
          {report.checks.map((c) => (
            <li
              key={c.id}
              role={c.result === "fail" ? "alert" : undefined}
              className={`rounded border p-3 text-sm ${
                c.result === "fail"
                  ? "border-[#8a4a4a]"
                  : c.result === "warning"
                    ? "border-[#8a7a4a]"
                    : "border-[var(--a11y-border)]"
              }`}
            >
              <strong>
                {c.label}: {c.result === "pass" ? "Pass" : c.result === "warning" ? "Check this" : "Fail"}
              </strong>
              <p>{c.detail}</p>
            </li>
          ))}
        </ul>

        <p className="text-sm border-t border-[var(--a11y-border)] pt-3">{report.stateGuidance}</p>

        {!report.exportAllowed && (
          <p role="alert" className="rounded border border-[#8a4a4a] p-3">
            This design cannot be exported until the items above are resolved.
          </p>
        )}
      </section>
    </main>
  );
}
