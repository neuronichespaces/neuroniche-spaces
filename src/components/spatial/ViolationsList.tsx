'use client';

// Surfaces constraints.ts's engine output — the actual hard/soft constraint results
// (severity/reason/recommendation), not just the clearance red-highlight ObjectLayer
// already draws. That highlight stays (it's the fast visual cue); this is the detail.

import type { ConstraintViolation } from '@/lib/spatial/constraints.ts';

export default function ViolationsList({ violations }: { violations: ConstraintViolation[] }) {
  if (violations.length === 0) return null;
  const blockers = violations.filter((v) => v.severity === 'blocker');
  const warnings = violations.filter((v) => v.severity === 'warning');

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-300 bg-white p-3 text-sm">
      <h3 className="font-medium text-slate-900">
        {blockers.length > 0 ? `${blockers.length} issue${blockers.length === 1 ? '' : 's'} to fix` : 'Suggestions'}
      </h3>
      <ul className="flex flex-col gap-2">
        {[...blockers, ...warnings].map((v, i) => (
          <li
            key={`${v.ruleId}-${v.targetId}-${i}`}
            className={`rounded border p-2 ${v.severity === 'blocker' ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}
          >
            <p className="font-medium">{v.reason}</p>
            <p className="text-xs opacity-80">{v.recommendation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
