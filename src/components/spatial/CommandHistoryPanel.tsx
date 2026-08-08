// Gap 7/8 groundwork (docs/architecture/cad-upgrade-plan.md): visible surface for the
// command id/description fields in store.ts's undo/redo history. Click-to-jump: each
// row calls jumpToCommand(id), which restores the state right before that command was
// applied (same semantics as undoing back to it) — the store action handles the
// multi-step past/future bookkeeping, this component just displays and dispatches.
'use client';

import { useRoomLayoutStore } from '@/lib/spatial/store.ts';

export function CommandHistoryPanel() {
  const past = useRoomLayoutStore((s) => s.past);
  const jumpToCommand = useRoomLayoutStore((s) => s.jumpToCommand);

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
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => jumpToCommand(entry.id)}
              className="w-full truncate rounded px-1 py-0.5 text-left hover:bg-slate-100"
              title={`Jump to right before "${entry.lastCommandDescription}"`}
            >
              {entry.lastCommandDescription}
            </button>
          </li>
        ))}
      </ol>
      {past.length > recent.length && <p className="mt-1 text-xs text-slate-400">+{past.length - recent.length} earlier</p>}
    </div>
  );
}
