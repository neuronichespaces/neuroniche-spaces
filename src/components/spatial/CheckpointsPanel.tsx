// ND enhancement (2026-08-11): named, browsable version-history checkpoints — a
// deliberate "save point" UI distinct from CommandHistoryPanel's automatic, unnamed
// undo/redo log (which is in-memory only and capped). Same list/save/restore/delete
// shape as ViewStatesPanel, but for the whole layout, not just the camera.
'use client';

import { useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';

export function CheckpointsPanel() {
  const checkpoints = useRoomLayoutStore((s) => s.checkpoints);
  const saveCheckpoint = useRoomLayoutStore((s) => s.saveCheckpoint);
  const restoreCheckpoint = useRoomLayoutStore((s) => s.restoreCheckpoint);
  const deleteCheckpoint = useRoomLayoutStore((s) => s.deleteCheckpoint);
  const [newName, setNewName] = useState('');

  function handleSave() {
    const name = newName.trim();
    if (!name) return;
    saveCheckpoint(name);
    setNewName('');
  }

  // Most recent first, matching CommandHistoryPanel's ordering convention.
  const sorted = [...checkpoints].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2">
      <h2 className="text-xs font-medium text-slate-500">Checkpoints</h2>
      <ul className="flex flex-col gap-1">
        {sorted.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
            <span className="flex-1 truncate" title={new Date(c.timestamp).toLocaleString()}>
              {c.name}
            </span>
            <button
              type="button"
              onClick={() => restoreCheckpoint(c.id)}
              className="min-h-11 rounded px-2 text-xs text-blue-700 hover:bg-blue-50"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={() => deleteCheckpoint(c.id)}
              className="min-h-11 rounded px-2 text-xs text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </li>
        ))}
        {checkpoints.length === 0 && <li className="text-xs text-slate-400">No checkpoints saved yet.</li>}
      </ul>
      <div className="flex items-center gap-1">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder="Save current layout as…"
          className="min-h-11 flex-1 rounded border border-gray-300 px-2 text-sm"
          aria-label="New checkpoint name"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!newName.trim()}
          className="min-h-11 rounded border border-slate-300 px-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
