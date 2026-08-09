// CAD-upgrade Gap 7: review comments/markups. Form-based add (typed coordinates) —
// no click-to-place canvas tool yet, same stated scope cut BlocksPanel.tsx already
// has for block insertion (always lands at a fixed point, not a picked one). Self-
// contained, no props, same pattern as LayersPanel/OutlinerPanel.
'use client';

import { useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';

export function CommentsPanel() {
  const comments = useRoomLayoutStore((s) => s.comments);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const addComment = useRoomLayoutStore((s) => s.addComment);
  const resolveComment = useRoomLayoutStore((s) => s.resolveComment);
  const removeComment = useRoomLayoutStore((s) => s.removeComment);
  const [draft, setDraft] = useState('');

  function handleAdd() {
    const text = draft.trim();
    if (!text) return;
    addComment(floorDims.widthM / 2, floorDims.lengthM / 2, text);
    setDraft('');
  }

  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2">
      <h2 className="text-xs font-medium text-slate-500">Comments</h2>
      <div className="flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a review comment (pinned at room centre)"
          className="min-h-11 flex-1 rounded border border-gray-300 px-2 text-sm"
        />
        <button type="button" onClick={handleAdd} className="min-h-11 rounded border border-slate-300 px-2 text-sm text-slate-700">
          Add
        </button>
      </div>
      {open.length > 0 && (
        <ul className="flex flex-col gap-1">
          {open.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="flex-1">{c.text}</span>
              <button
                type="button"
                onClick={() => resolveComment(c.id, true)}
                className="min-h-11 rounded border border-slate-300 px-2 text-xs hover:bg-slate-50"
              >
                Resolve
              </button>
              <button
                type="button"
                onClick={() => removeComment(c.id)}
                className="min-h-11 rounded px-2 text-xs text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {resolved.length > 0 && (
        <details className="text-xs text-slate-400">
          <summary>{resolved.length} resolved</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {resolved.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-slate-500 line-through">
                <span className="flex-1">{c.text}</span>
                <button
                  type="button"
                  onClick={() => resolveComment(c.id, false)}
                  className="min-h-11 rounded border border-slate-300 px-2 text-xs no-underline hover:bg-slate-50"
                >
                  Reopen
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
