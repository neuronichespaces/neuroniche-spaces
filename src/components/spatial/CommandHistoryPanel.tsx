// Gap 7/8 groundwork (docs/architecture/cad-upgrade-plan.md): first visible use of the
// command id/description fields added to store.ts's undo/redo history — a read-only
// list, not an interactive jump-to-command audit log yet (that needs a store action
// this session didn't build: jumping more than one undo/redo step at a time). Purely
// derived from existing store state, no new mutations.
'use client';

import { useRoomLayoutStore } from '@/lib/spatial/store.ts';

export function CommandHistoryPanel() {
  const past = useRoomLayoutStore((s) => s.past);

  if (past.length === 0) {
    return <p className="text-xs text-slate-500">No changes yet this session.</p>;
  }

  // Most recent first — matches how undo history reads intuitively ("what would Undo
  // revert next" at the top).
  const recent = [...past].reverse().slice(0, 10);

  return (
    <div className="rounded border border-slate-200 bg-white p-2">
      <h2 className="mb-1 text-xs font-medium text-slate-500">Recent changes</h2>
      <ol className="flex flex-col gap-0.5 text-xs text-slate-700">
        {recent.map((entry) => (
          <li key={entry.id} className="truncate">
            {entry.lastCommandDescription}
          </li>
        ))}
      </ol>
      {past.length > recent.length && <p className="mt-1 text-xs text-slate-400">+{past.length - recent.length} earlier</p>}
    </div>
  );
}
