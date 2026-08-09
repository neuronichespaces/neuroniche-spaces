// CAD-upgrade Gap 7: read-only view over the persisted audit log (store.ts's
// auditLog — separate from CommandHistoryPanel's undo/redo `past`/`future`, which are
// in-memory and get rewound by undo). This is a record of what happened, not what's
// currently applied — never shrinks on undo. Self-contained, no props.
'use client';

import { useRoomLayoutStore } from '@/lib/spatial/store.ts';

export function AuditLogPanel() {
  const auditLog = useRoomLayoutStore((s) => s.auditLog);

  if (auditLog.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 rounded border border-slate-200 bg-white p-2">
      <h2 className="text-xs font-medium text-slate-500">Audit log ({auditLog.length})</h2>
      <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto text-xs text-slate-600">
        {[...auditLog].reverse().map((entry) => (
          <li key={entry.id} className="flex justify-between gap-2">
            <span>{entry.description}</span>
            <span className="shrink-0 text-slate-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
