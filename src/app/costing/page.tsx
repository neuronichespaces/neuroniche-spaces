"use client";

// F4 costing engine + F6 compliance checker (BUILD-SPEC-v1 §4.2).
// One page: pick needs + budget -> three costed tiers; a separate compliance
// panel with the hard restrictive-practice gate (F6). Deterministic, no AI.

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CATALOGUE } from "@/lib/demoData";
import { buildTierCostings, type Tier } from "@/lib/costing/tiers";
import type { SensoryNeed } from "@/lib/planner/plan";
import { runComplianceCheck, type AuState, type ComplianceInput } from "@/lib/compliance/check";
import { scoreAudit, type Answers } from "@/lib/aspectss/score";
import { deriveNeedsFromAudit } from "@/lib/aspectss/toNeeds";

const NEED_CATEGORIES: SensoryNeed["category"][] = ["movement", "noise", "light", "touch", "pressure"];
const TIER_LABEL: Record<Tier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };
const AU_STATES: AuState[] = ["WA", "VIC", "NSW", "QLD", "SA", "TAS", "ACT", "NT"];
const AUDIT_STORAGE_KEY = "neuroniche-audit-answers";
const COSTING_STORAGE_KEY = "neuroniche-costing-state";

interface SavedCostingState {
  budget: number;
  needs: Record<string, "seeks" | "avoids" | "neutral">;
  compliance: ComplianceInput;
}

function loadSavedCosting(): SavedCostingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COSTING_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const p = parsed as Partial<SavedCostingState>;
    const validBudget = typeof p.budget === "number" && Number.isFinite(p.budget) && p.budget > 0;
    const validNeeds = typeof p.needs === "object" && p.needs !== null && !Array.isArray(p.needs);
    const validCompliance = typeof p.compliance === "object" && p.compliance !== null && !Array.isArray(p.compliance);
    if (!validBudget || !validNeeds || !validCompliance) return null;
    return p as SavedCostingState;
  } catch {
    return null;
  }
}

function loadAuditResult() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return scoreAudit(parsed as Answers);
  } catch {
    return null;
  }
}

export default function CostingPage() {
  return (
    <Suspense fallback={null}>
      <CostingPageInner />
    </Suspense>
  );
}

function CostingPageInner() {
  const searchParams = useSearchParams();
  const budgetFromUrl = Number(searchParams.get("budget"));

  const [budget, setBudget] = useState(Number.isFinite(budgetFromUrl) && budgetFromUrl > 0 ? budgetFromUrl : 2000);
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
  const [loaded, setLoaded] = useState(false);
  const auditResult = useMemo(loadAuditResult, []);

  // Load saved costing state once on mount — URL budget (from a grant link)
  // takes priority over a saved budget, since it's a fresher, more specific signal.
  useEffect(() => {
    const saved = loadSavedCosting();
    if (saved) {
      setNeeds(saved.needs);
      setCompliance(saved.compliance);
      if (!(Number.isFinite(budgetFromUrl) && budgetFromUrl > 0)) setBudget(saved.budget);
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally load-once on mount
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(COSTING_STORAGE_KEY, JSON.stringify({ budget, needs, compliance }));
    } catch {
      // storage unavailable — state still works for this session
    }
  }, [budget, needs, compliance, loaded]);

  const applyAuditNeeds = () => {
    if (!auditResult) return;
    const derived = deriveNeedsFromAudit(auditResult);
    setNeeds((prev) => ({ ...prev, ...derived }));
  };

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
        {auditResult && (
          <button
            type="button"
            onClick={applyAuditNeeds}
            className="a11y-target self-start rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)] text-sm"
          >
            Continue from your audit — pre-fill from what it found
          </button>
        )}
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
        {report.exportAllowed && (
          <Link
            href="/business-case"
            className="a11y-target self-start rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)] text-sm no-underline"
          >
            Continue to business case →
          </Link>
        )}
      </section>
    </main>
  );
}
