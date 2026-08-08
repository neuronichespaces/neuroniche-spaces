// CAD-upgrade Milestone 1 (numeric wall inspector): length/angle/thickness as typed
// text, not just drag-to-resize. Mirrors RoomDimensionsPanel.tsx's exact pattern — draft
// string in local state, committed value in the store, never silently clamped (a
// rejected value shows a plain-language error and leaves the store untouched).
'use client';

import { useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { parseLengthToMetres, formatMetres } from '@/lib/spatial/units.ts';
import { wallLengthM, wallAngleDeg, pointAtAngleAndLength } from '@/lib/spatial/geometry.ts';

const MIN_WALL_LENGTH_M = 0.1;
const MAX_WALL_LENGTH_M = 30;
const MIN_WALL_THICKNESS_M = 0.02;
const MAX_WALL_THICKNESS_M = 1;

function NumericField({
  label,
  format,
  parse,
  valueM,
  onCommit,
}: {
  label: string;
  format: (m: number) => string;
  parse: (input: string) => { ok: true; value: number } | { ok: false; error: string };
  valueM: number;
  onCommit: (m: number) => void;
}) {
  const [draft, setDraft] = useState(format(valueM));
  const [error, setError] = useState('');

  function commit() {
    const result = parse(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    onCommit(result.value);
    setDraft(format(result.value));
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
            setDraft(format(valueM));
            setError('');
          }
        }}
        className={`min-h-11 w-28 rounded border px-2 ${error ? 'border-red-400' : 'border-gray-300'}`}
        aria-invalid={!!error}
      />
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

function parseLength(input: string, minM: number, maxM: number): { ok: true; value: number } | { ok: false; error: string } {
  const parsed = parseLengthToMetres(input);
  if (parsed === null) return { ok: false, error: 'Enter a number, e.g. 4.2m, 420cm, or 4200mm.' };
  if (parsed < minM || parsed > maxM) return { ok: false, error: `Must be between ${minM}m and ${maxM}m.` };
  return { ok: true, value: parsed };
}

function parseAngle(input: string): { ok: true; value: number } | { ok: false; error: string } {
  const value = Number(input.trim());
  if (!Number.isFinite(value)) return { ok: false, error: 'Enter a number of degrees, e.g. 0, 90, or 45.' };
  return { ok: true, value: ((value % 360) + 360) % 360 };
}

function formatAngle(deg: number): string {
  return `${deg.toFixed(0)}°`;
}

export function WallDimensionsPanel() {
  const selectedWallId = useRoomLayoutStore((s) => s.selectedWallId);
  const walls = useRoomLayoutStore((s) => s.walls);
  const updateWallGeometry = useRoomLayoutStore((s) => s.updateWallGeometry);
  const wall = selectedWallId ? walls.find((w) => w.id === selectedWallId) : null;

  if (!wall) return null;

  const lengthM = wallLengthM(wall);
  const angleDeg = wallAngleDeg(wall);

  return (
    <div className="flex flex-wrap items-start gap-4 rounded border border-gray-200 bg-white p-3">
      <span className="w-full text-xs font-medium text-gray-500">Selected wall</span>
      <NumericField
        label="Length"
        format={formatMetres}
        parse={(input) => parseLength(input, MIN_WALL_LENGTH_M, MAX_WALL_LENGTH_M)}
        valueM={lengthM}
        onCommit={(newLengthM) => updateWallGeometry(wall.id, { end: pointAtAngleAndLength(wall.start, angleDeg, newLengthM) })}
      />
      <NumericField
        label="Angle"
        format={formatAngle}
        parse={parseAngle}
        valueM={angleDeg}
        onCommit={(newAngleDeg) => updateWallGeometry(wall.id, { end: pointAtAngleAndLength(wall.start, newAngleDeg, lengthM) })}
      />
      <NumericField
        label="Thickness"
        format={formatMetres}
        parse={(input) => parseLength(input, MIN_WALL_THICKNESS_M, MAX_WALL_THICKNESS_M)}
        valueM={wall.thicknessM}
        onCommit={(thicknessM) => updateWallGeometry(wall.id, { thicknessM })}
      />
    </div>
  );
}
