// CAD-upgrade: numeric zone inspector, prerequisite for extending layers/annotations
// to zones (docs/architecture/cad-gap-audit.md Gap 4's "walls/zones have no layerId
// yet" note — zones had no selection concept at all before this). Mirrors
// WallDimensionsPanel.tsx's exact pattern: draft string in local state, committed
// value in the store, never silently clamped.
'use client';

import { useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { parseLengthToMetres, formatMetres } from '@/lib/spatial/units.ts';
import { ZONE_KIND_LABELS } from './ZoneLayer.tsx';
import { DEFAULT_LAYER_ID } from '@/lib/spatial/layers.ts';
import type { ZoneKind } from '@/lib/spatial/types.ts';

const MIN_ZONE_DIM_M = 0.2;
const MAX_ZONE_DIM_M = 20;

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
        className={`min-h-11 w-24 rounded border px-2 ${error ? 'border-red-400' : 'border-gray-300'}`}
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
  if (parsed === null) return { ok: false, error: 'Enter a number, e.g. 2m, 200cm, or 2000mm.' };
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

export function ZonePropertiesPanel() {
  const selectedZoneId = useRoomLayoutStore((s) => s.selectedZoneId);
  const zones = useRoomLayoutStore((s) => s.zones);
  const layers = useRoomLayoutStore((s) => s.layers);
  const updateZoneGeometry = useRoomLayoutStore((s) => s.updateZoneGeometry);
  const removeZone = useRoomLayoutStore((s) => s.removeZone);
  const zone = selectedZoneId ? zones.find((z) => z.id === selectedZoneId) : null;

  if (!zone) return null;

  return (
    <div className="flex flex-col gap-3 rounded border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Selected zone</span>
        <button
          type="button"
          onClick={() => removeZone(zone.id)}
          className="min-h-11 rounded px-2 text-xs text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Kind
        <select
          value={zone.kind}
          onChange={(e) => updateZoneGeometry(zone.id, { kind: e.target.value as ZoneKind })}
          className="min-h-11 rounded border border-gray-300 px-2"
        >
          {(Object.keys(ZONE_KIND_LABELS) as ZoneKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {ZONE_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Label
        <input
          value={zone.label ?? ''}
          onChange={(e) => updateZoneGeometry(zone.id, { label: e.target.value })}
          placeholder={ZONE_KIND_LABELS[zone.kind]}
          className="min-h-11 rounded border border-gray-300 px-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Layer
        <select
          value={zone.layerId ?? DEFAULT_LAYER_ID}
          onChange={(e) => updateZoneGeometry(zone.id, { layerId: e.target.value })}
          className="min-h-11 rounded border border-gray-300 px-2"
        >
          {layers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-start gap-4">
        <NumericField
          label="Centre X"
          format={formatMetres}
          parse={(input) => parseLength(input, 0, MAX_ZONE_DIM_M)}
          valueM={zone.x}
          onCommit={(x) => updateZoneGeometry(zone.id, { x })}
        />
        <NumericField
          label="Centre Y"
          format={formatMetres}
          parse={(input) => parseLength(input, 0, MAX_ZONE_DIM_M)}
          valueM={zone.y}
          onCommit={(y) => updateZoneGeometry(zone.id, { y })}
        />
        <NumericField
          label="Width"
          format={formatMetres}
          parse={(input) => parseLength(input, MIN_ZONE_DIM_M, MAX_ZONE_DIM_M)}
          valueM={zone.widthM}
          onCommit={(widthM) => updateZoneGeometry(zone.id, { widthM })}
        />
        <NumericField
          label="Length"
          format={formatMetres}
          parse={(input) => parseLength(input, MIN_ZONE_DIM_M, MAX_ZONE_DIM_M)}
          valueM={zone.lengthM}
          onCommit={(lengthM) => updateZoneGeometry(zone.id, { lengthM })}
        />
        <NumericField
          label="Rotation"
          format={formatAngle}
          parse={parseAngle}
          valueM={zone.rotationDeg}
          onCommit={(rotationDeg) => updateZoneGeometry(zone.id, { rotationDeg })}
        />
      </div>
    </div>
  );
}
