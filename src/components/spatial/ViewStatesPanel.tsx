// CAD-upgrade Gap 4: named view-state save/restore UI. Self-contained except for the
// camera bridge, which the store can't hold itself (no renderer access) — see
// RoomViewer3D's CameraApi/onCameraApiReady. Only useful while the 3D view is mounted
// (page.tsx passes `null` otherwise, same as the camera API itself only existing then).
'use client';

import { useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import type { CameraApi } from './RoomViewer3D.tsx';

export function ViewStatesPanel({ cameraApi }: { cameraApi: CameraApi | null }) {
  const viewStates = useRoomLayoutStore((s) => s.viewStates);
  const saveViewState = useRoomLayoutStore((s) => s.saveViewState);
  const deleteViewState = useRoomLayoutStore((s) => s.deleteViewState);
  const restoreViewState = useRoomLayoutStore((s) => s.restoreViewState);
  const [newName, setNewName] = useState('');

  function handleSave() {
    const name = newName.trim();
    if (!name || !cameraApi) return;
    saveViewState(name, cameraApi.getSnapshot());
    setNewName('');
  }

  function handleRestore(id: string) {
    const state = restoreViewState(id);
    if (state) cameraApi?.applySnapshot(state);
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2">
      <h2 className="text-xs font-medium text-slate-500">Saved views</h2>
      <ul className="flex flex-col gap-1">
        {viewStates.map((v) => (
          <li key={v.id} className="flex items-center gap-2 text-sm text-slate-700">
            <span className="flex-1 truncate">{v.name}</span>
            <button
              type="button"
              onClick={() => handleRestore(v.id)}
              disabled={!cameraApi}
              className="min-h-11 rounded px-2 text-xs text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={() => deleteViewState(v.id)}
              className="min-h-11 rounded px-2 text-xs text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </li>
        ))}
        {viewStates.length === 0 && <li className="text-xs text-slate-400">No saved views yet.</li>}
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
          placeholder={cameraApi ? 'Save current view as…' : 'Switch to 3D view to save'}
          disabled={!cameraApi}
          className="min-h-11 flex-1 rounded border border-gray-300 px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="New view name"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!cameraApi}
          className="min-h-11 rounded border border-slate-300 px-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
