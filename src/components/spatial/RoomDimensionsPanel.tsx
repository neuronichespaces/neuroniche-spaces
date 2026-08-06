// Foundation 2 (numeric dimension editing): room width/length as typed text, not just
// drag-to-resize. Accepts "4200mm"/"420cm"/"4.2m"/"4.2" — parseLengthToMetres normalizes.
// Mirrors PropertiesPanel.tsx's "no local echo of store state beyond the input buffer"
// pattern: the input holds a draft string, the store holds the committed value.
'use client';

import { useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { parseLengthToMetres, formatMetres } from '@/lib/spatial/units.ts';

const MIN_ROOM_DIM_M = 1;
const MAX_ROOM_DIM_M = 50;

function DimensionField({ label, valueM, onCommit }: { label: string; valueM: number; onCommit: (m: number) => void }) {
  const [draft, setDraft] = useState(formatMetres(valueM));
  const [error, setError] = useState('');

  function commit() {
    const parsed = parseLengthToMetres(draft);
    if (parsed === null) {
      setError('Enter a number, e.g. 4.2m, 420cm, or 4200mm.');
      return;
    }
    if (parsed < MIN_ROOM_DIM_M || parsed > MAX_ROOM_DIM_M) {
      setError(`Must be between ${MIN_ROOM_DIM_M}m and ${MAX_ROOM_DIM_M}m.`);
      return;
    }
    setError('');
    onCommit(parsed);
    setDraft(formatMetres(parsed));
  }

  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            setDraft(formatMetres(valueM));
            setError('');
          }
        }}
        className={`min-h-11 w-28 rounded border px-2 ${error ? 'border-red-400' : 'border-gray-300'}`}
        aria-invalid={!!error}
      />
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

export function RoomDimensionsPanel() {
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const setFloorDims = useRoomLayoutStore((s) => s.setFloorDims);

  return (
    <div className="flex flex-wrap items-start gap-4 rounded border border-gray-200 bg-white p-3">
      <DimensionField
        label="Room width"
        valueM={floorDims.widthM}
        onCommit={(widthM) => setFloorDims({ ...floorDims, widthM })}
      />
      <DimensionField
        label="Room length"
        valueM={floorDims.lengthM}
        onCommit={(lengthM) => setFloorDims({ ...floorDims, lengthM })}
      />
    </div>
  );
}
