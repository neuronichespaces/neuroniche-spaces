'use client';

// NeuroNiche Spaces — planner (Phase 3) + application assistant (Phase 4).
// Demo data lives inline until Supabase is wired; funding rows mirror
// supabase/seed_funding_au.sql (researched, cited, pending review).

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { matchFunding, topMatch, type Organisation } from '@/lib/funding/match.ts';
import { suggestProducts, layoutRoom, totalCost, type SensoryNeed } from '@/lib/planner/plan.ts';
import { buildChecklist, deadlineInfo, planToCsv } from '@/lib/assistant.ts';
import { CATALOGUE, FUNDING } from '@/lib/demoData.ts';

const COUNTRIES = ['Australia', 'New Zealand', 'United Kingdom', 'United States', 'Canada', 'Other'];
const AU_STATES = ['WA', 'SA', 'VIC', 'NSW', 'QLD', 'TAS', 'NT', 'ACT'];
const CATEGORIES = ['movement', 'noise', 'light', 'touch', 'pressure'] as const;

const inputCls = 'min-h-11 rounded border border-zinc-300 px-3 py-2 text-zinc-900 bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-600';
const labelCls = 'flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200';

export default function Home() {
  const [org, setOrg] = useState<Organisation & { name: string }>({
    name: '', country: 'Australia', state_or_province: 'WA', sector: 'government', nccd_tier: null, postcode: '',
  });
  const [room, setRoom] = useState({ name: 'Sensory space', width_m: 4, length_m: 5 });
  const [needs, setNeeds] = useState<SensoryNeed[]>(
    CATEGORIES.map((category) => ({ category, preference: 'neutral' as const, intensity: 3 })),
  );
  const [manualBudget, setManualBudget] = useState(1000);
  const [budgetOverridden, setBudgetOverridden] = useState(false);

  const isAU = org.country === 'Australia';
  const funding = useMemo(() => matchFunding(org, FUNDING), [org]);
  const top = topMatch(funding);
  const autoBudget = isAU && top?.estimated_amount != null && !budgetOverridden;
  const budget = autoBudget ? top!.estimated_amount! : manualBudget;

  const items = useMemo(
    () => suggestProducts(needs, budget, CATALOGUE, { country: org.country, fundingEligibleOnly: isAU && !!top }),
    [needs, budget, org.country, isAU, top],
  );
  const placements = useMemo(() => layoutRoom(room, items), [room, items]);

  function setNeed(i: number, patch: Partial<SensoryNeed>) {
    setNeeds((n) => n.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  function exportCsv() {
    const blob = new Blob([planToCsv(room, items)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${room.name.replace(/\W+/g, '-')}-plan.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const scale = 60; // px per metre in the diagram

  return (
    <main className="mx-auto max-w-4xl p-6 flex flex-col gap-8 text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">NeuroNiche Spaces</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Plan a sensory space for your organisation. Sensory preferences are general planning categories, not assessments.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href="/login"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Sign in →
          </Link>
          <Link
            href="/organisations"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Your organisations →
          </Link>
          <Link
            href="/spatial"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Open room designer (2D/3D) →
          </Link>
          <Link
            href="/audit"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Start a sensory space audit →
          </Link>
          <Link
            href="/costing"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Costing and compliance →
          </Link>
          <Link
            href="/grants"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Find grants →
          </Link>
          <Link
            href="/resources"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Templates and evidence →
          </Link>
          <Link
            href="/business-case"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Business case and co-design →
          </Link>
          <Link
            href="/catalogue"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Equipment catalogue →
          </Link>
          <Link
            href="/training"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Workplace inclusion training →
          </Link>
        </div>
      </header>

      <section aria-labelledby="org-h" className="flex flex-col gap-3">
        <h2 id="org-h" className="text-lg font-semibold">1. Your organisation</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelCls}>Organisation name
            <input className={inputCls} value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
          </label>
          <label className={labelCls}>Country
            <select className={inputCls} value={org.country} onChange={(e) => setOrg({ ...org, country: e.target.value, nccd_tier: null })}>
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className={labelCls}>State / province
            {isAU ? (
              <select className={inputCls} value={org.state_or_province ?? ''} onChange={(e) => setOrg({ ...org, state_or_province: e.target.value })}>
                {AU_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            ) : (
              <input className={inputCls} value={org.state_or_province ?? ''} onChange={(e) => setOrg({ ...org, state_or_province: e.target.value })} />
            )}
          </label>
          <label className={labelCls}>Postcode
            <input className={inputCls} value={org.postcode ?? ''} onChange={(e) => setOrg({ ...org, postcode: e.target.value })} />
          </label>
          {isAU && (
            <>
              <label className={labelCls}>Sector
                <select className={inputCls} value={org.sector ?? ''} onChange={(e) => setOrg({ ...org, sector: e.target.value })}>
                  <option value="government">Government (school)</option>
                  <option value="catholic">Catholic (school)</option>
                  <option value="independent">Independent (school)</option>
                  <option value="university">University</option>
                  <option value="airport">Airport</option>
                  <option value="council">Council / local government</option>
                  <option value="nfp">Not-for-profit / community org</option>
                </select>
              </label>
              <label className={labelCls}>NCCD adjustment level in use (optional)
                <select className={inputCls} value={org.nccd_tier ?? ''} onChange={(e) => setOrg({ ...org, nccd_tier: (e.target.value || null) as Organisation['nccd_tier'] })}>
                  <option value="">Not sure / not applicable</option>
                  <option value="supplementary">Supplementary</option>
                  <option value="substantial">Substantial</option>
                  <option value="extensive">Extensive</option>
                </select>
              </label>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="room-h" className="flex flex-col gap-3">
        <h2 id="room-h" className="text-lg font-semibold">2. The room</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelCls}>Room name
            <input className={inputCls} value={room.name} onChange={(e) => setRoom({ ...room, name: e.target.value })} />
          </label>
          <label className={labelCls}>Width (m)
            <input type="number" min={1} step={0.5} className={inputCls} value={room.width_m} onChange={(e) => setRoom({ ...room, width_m: Number(e.target.value) })} />
          </label>
          <label className={labelCls}>Length (m)
            <input type="number" min={1} step={0.5} className={inputCls} value={room.length_m} onChange={(e) => setRoom({ ...room, length_m: Number(e.target.value) })} />
          </label>
        </div>
      </section>

      <section aria-labelledby="needs-h" className="flex flex-col gap-3">
        <h2 id="needs-h" className="text-lg font-semibold">3. Sensory preferences (aggregate, non-diagnostic)</h2>
        <div className="flex flex-col gap-2">
          {needs.map((n, i) => (
            <div key={n.category} className="grid gap-3 sm:grid-cols-3 items-end">
              <span className="capitalize text-sm font-medium pt-2">{n.category}</span>
              <label className={labelCls}>Preference
                <select className={inputCls} value={n.preference} onChange={(e) => setNeed(i, { preference: e.target.value as SensoryNeed['preference'] })}>
                  <option value="neutral">Neutral</option>
                  <option value="seeks">Seeks more</option>
                  <option value="avoids">Prefers less</option>
                </select>
              </label>
              <label className={labelCls}>Priority: {n.intensity}
                <input type="range" min={1} max={5} className="min-h-11" value={n.intensity} onChange={(e) => setNeed(i, { intensity: Number(e.target.value) })} />
              </label>
            </div>
          ))}
        </div>
      </section>

      {isAU && (funding.recurring.length + funding.one_off.length + funding.corporate.length > 0) && (
        <section aria-labelledby="fund-h" className="flex flex-col gap-3 rounded-lg border border-zinc-300 dark:border-zinc-600 p-4">
          <h2 id="fund-h" className="text-lg font-semibold">Funding matches (Australia)</h2>
          {([['Recurring funding', funding.recurring], ['One-off grants', funding.one_off], ['Corporate & community programs', funding.corporate]] as const)
            .filter(([, list]) => list.length > 0)
            .map(([title, list]) => (
              <div key={title}>
                <h3 className="font-medium">{title}</h3>
                <ul className="flex flex-col gap-2 mt-1">
                  {list.map((m) => {
                    const dl = deadlineInfo(m.deadline);
                    return (
                      <li key={m.funding_source_id} className="text-sm">
                        <span className="font-medium">{m.display_name}</span>
                        {m.estimated_amount != null && <> — indicative amount ${m.estimated_amount.toLocaleString()}</>}
                        {dl && <> — closes {dl.date} ({dl.daysRemaining} days remaining)</>}
                        {m.eligibility_notes && <p className="text-zinc-600 dark:text-zinc-400">{m.eligibility_notes}</p>}
                        <a className="underline" href={m.source_url} target="_blank" rel="noreferrer">Official source</a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Amounts and eligibility are indicative only, not guaranteed, and subject to the administering body&apos;s rules. Always confirm against the official source.</p>
        </section>
      )}

      <section aria-labelledby="budget-h" className="flex flex-col gap-3">
        <h2 id="budget-h" className="text-lg font-semibold">4. Budget</h2>
        {autoBudget ? (
          <p className="text-sm">
            Using indicative amount from <span className="font-medium">{top!.display_name}</span>: ${top!.estimated_amount!.toLocaleString()}{' '}
            <button className="underline min-h-11 px-2" onClick={() => { setBudgetOverridden(true); setManualBudget(top!.estimated_amount!); }}>
              Enter my own budget instead
            </button>
          </p>
        ) : (
          <label className={labelCls}>Budget ({isAU ? 'AUD' : 'your currency'})
            <input type="number" min={0} step={50} className={inputCls} value={manualBudget} onChange={(e) => setManualBudget(Number(e.target.value))} />
          </label>
        )}
      </section>

      <section aria-labelledby="plan-h" className="flex flex-col gap-3">
        <h2 id="plan-h" className="text-lg font-semibold">5. Suggested plan</h2>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Set at least one preference to &ldquo;seeks&rdquo; or &ldquo;prefers less&rdquo; to see suggestions within budget.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1 text-sm">
              {items.map((i) => (
                <li key={i.product.id} className="flex justify-between gap-4">
                  <span>{i.product.name}</span>
                  <span>${i.product.price.toFixed(2)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-4 font-semibold border-t border-zinc-300 dark:border-zinc-600 pt-1">
                <span>Total</span><span>${totalCost(items).toFixed(2)} of ${budget.toLocaleString()}</span>
              </li>
            </ul>

            <h3 className="font-medium mt-2">Layout sketch (top-down, {room.width_m}m × {room.length_m}m)</h3>
            <svg role="img" aria-label={`Room layout sketch with ${placements.length} placed items`}
              width={room.width_m * scale} height={room.length_m * scale}
              className="border border-zinc-400 dark:border-zinc-500 rounded bg-zinc-50 dark:bg-zinc-900 max-w-full h-auto">
              {placements.map((p) => (
                <g key={p.product.id}>
                  <rect x={p.x * scale} y={p.y * scale} width={p.w * scale} height={p.l * scale}
                    className="fill-teal-200 stroke-teal-700 dark:fill-teal-800 dark:stroke-teal-300" />
                  <text x={(p.x + p.w / 2) * scale} y={(p.y + p.l / 2) * scale}
                    textAnchor="middle" dominantBaseline="middle" fontSize="9"
                    className="fill-zinc-900 dark:fill-zinc-100">
                    {p.product.name.split(' ').slice(0, 2).join(' ')}
                  </text>
                </g>
              ))}
            </svg>
            {placements.length < items.length && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{items.length - placements.length} smaller item(s) not drawn — they don&apos;t need floor space or the room is full.</p>
            )}
            <button onClick={exportCsv} className="min-h-11 self-start rounded bg-teal-700 px-4 py-2 text-white hover:bg-teal-800">
              Export plan as CSV
            </button>
          </>
        )}
      </section>

      {isAU && top && items.length > 0 && (
        <section aria-labelledby="apply-h" className="flex flex-col gap-3">
          <h2 id="apply-h" className="text-lg font-semibold">6. Application assistant</h2>
          {[...funding.recurring, ...funding.one_off, ...funding.corporate].map((m) => (
            <details key={m.funding_source_id} className="rounded border border-zinc-300 dark:border-zinc-600 p-3">
              <summary className="min-h-11 cursor-pointer font-medium">{m.display_name}</summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {buildChecklist(org, room, items, m).map((c) => (
                  <li key={c.label}>
                    <span className={c.done ? '' : 'font-medium'}>{c.done ? '✓' : '○'} {c.label}</span>
                    {c.prefilled && <span className="text-zinc-600 dark:text-zinc-400"> — {c.prefilled}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Email reminders coming soon.</p>
            </details>
          ))}
        </section>
      )}

      <footer className="text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-3">
        NeuroNiche Spaces is a planning and budgeting tool. It does not provide assessments, therapy, or guarantees of funding.
      </footer>
    </main>
  );
}
