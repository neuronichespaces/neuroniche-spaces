// CAD-upgrade Gap 5 (Advanced selection, filtering, outliner, batch editing).
// A single tree view of every object/zone/wall/dimension, grouped by layer, with
// click-to-select. Shift-click on an OBJECT row toggles multi-select, which shows a
// batch-action bar (delete/lock/hide/isolate/reassign layer) — scoped to objects only
// for this pass: zones/walls/dimensions don't have batch mutators yet, and true
// cross-type multi-select would need every entity's store actions to accept an id
// array, a bigger change than this slice. Self-contained, no props — same pattern as
// LayersPanel/CommandHistoryPanel.
'use client';

import { useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { DEFAULT_LAYER_ID } from '@/lib/spatial/layers.ts';
import { ZONE_KIND_LABELS } from './ZoneLayer.tsx';
import { wallLengthM } from '@/lib/spatial/geometry.ts';
import { formatMetres } from '@/lib/spatial/units.ts';

type Row = { id: string; label: string; kind: 'object' | 'zone' | 'wall' | 'dimension'; layerId?: string };

export function OutlinerPanel() {
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const zones = useRoomLayoutStore((s) => s.zones);
  const walls = useRoomLayoutStore((s) => s.walls);
  const dimensions = useRoomLayoutStore((s) => s.dimensions);
  const layers = useRoomLayoutStore((s) => s.layers);
  const selectedObjectId = useRoomLayoutStore((s) => s.selectedObjectId);
  const selectedZoneId = useRoomLayoutStore((s) => s.selectedZoneId);
  const selectedWallId = useRoomLayoutStore((s) => s.selectedWallId);
  const selectedDimensionId = useRoomLayoutStore((s) => s.selectedDimensionId);
  const multiSelectedObjectIds = useRoomLayoutStore((s) => s.multiSelectedObjectIds);
  const isolatedObjectIds = useRoomLayoutStore((s) => s.isolatedObjectIds);
  const selectObject = useRoomLayoutStore((s) => s.selectObject);
  const selectZone = useRoomLayoutStore((s) => s.selectZone);
  const selectWall = useRoomLayoutStore((s) => s.selectWall);
  const selectDimension = useRoomLayoutStore((s) => s.selectDimension);
  const toggleObjectMultiSelect = useRoomLayoutStore((s) => s.toggleObjectMultiSelect);
  const clearObjectMultiSelect = useRoomLayoutStore((s) => s.clearObjectMultiSelect);
  const batchSetObjectLayer = useRoomLayoutStore((s) => s.batchSetObjectLayer);
  const batchRemoveObjects = useRoomLayoutStore((s) => s.batchRemoveObjects);
  const batchSetObjectsLocked = useRoomLayoutStore((s) => s.batchSetObjectsLocked);
  const batchSetObjectsHidden = useRoomLayoutStore((s) => s.batchSetObjectsHidden);
  const isolateObjects = useRoomLayoutStore((s) => s.isolateObjects);
  const unisolate = useRoomLayoutStore((s) => s.unisolate);
  const [batchLayerId, setBatchLayerId] = useState('');

  const rows: Row[] = [
    ...placedObjects.map((o): Row => ({ id: o.id, label: o.productId, kind: 'object', layerId: o.layerId })),
    ...zones.map((z): Row => ({ id: z.id, label: z.label || ZONE_KIND_LABELS[z.kind], kind: 'zone', layerId: z.layerId })),
    ...walls.map((w): Row => ({ id: w.id, label: `Wall (${formatMetres(wallLengthM(w))})`, kind: 'wall', layerId: w.layerId })),
    ...dimensions.map((d): Row => ({ id: d.id, label: d.label || 'Dimension', kind: 'dimension', layerId: d.layerId })),
  ];

  const selectedIdFor: Record<Row['kind'], string | null> = {
    object: selectedObjectId,
    zone: selectedZoneId,
    wall: selectedWallId,
    dimension: selectedDimensionId,
  };
  const selectFor: Record<Row['kind'], (id: string) => void> = {
    object: selectObject,
    zone: selectZone,
    wall: selectWall,
    dimension: selectDimension,
  };

  function handleRowClick(row: Row, e: React.MouseEvent) {
    if (row.kind === 'object' && e.shiftKey) {
      toggleObjectMultiSelect(row.id);
      return;
    }
    selectFor[row.kind](row.id);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-white p-2">
        <h2 className="text-xs font-medium text-slate-500">Outliner</h2>
        <p className="mt-1 text-sm text-slate-500">No objects, zones, walls, or dimensions yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-slate-500">Outliner</h2>
        {placedObjects.length > 0 && <span className="text-xs text-slate-400">Shift-click objects to multi-select</span>}
      </div>

      {multiSelectedObjectIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded bg-blue-50 p-2 text-sm">
          <span className="text-blue-700">{multiSelectedObjectIds.length} selected</span>
          <button
            type="button"
            onClick={() => isolateObjects(multiSelectedObjectIds)}
            className="min-h-11 rounded border border-blue-300 px-2 text-blue-700 hover:bg-blue-100"
          >
            Isolate
          </button>
          <button
            type="button"
            onClick={() => batchSetObjectsLocked(multiSelectedObjectIds, true)}
            className="min-h-11 rounded border border-blue-300 px-2 text-blue-700 hover:bg-blue-100"
          >
            Lock
          </button>
          <button
            type="button"
            onClick={() => batchSetObjectsHidden(multiSelectedObjectIds, true)}
            className="min-h-11 rounded border border-blue-300 px-2 text-blue-700 hover:bg-blue-100"
          >
            Hide
          </button>
          <select
            value={batchLayerId}
            onChange={(e) => {
              setBatchLayerId(e.target.value);
              if (e.target.value) batchSetObjectLayer(multiSelectedObjectIds, e.target.value);
            }}
            className="min-h-11 rounded border border-blue-300 px-2 text-blue-700"
          >
            <option value="">Move to layer…</option>
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => batchRemoveObjects(multiSelectedObjectIds)}
            className="min-h-11 rounded border border-red-300 px-2 text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={clearObjectMultiSelect}
            className="min-h-11 rounded px-2 text-slate-500 hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      )}

      {isolatedObjectIds !== null && (
        <div className="flex items-center justify-between rounded bg-amber-50 p-2 text-sm text-amber-700">
          <span>Isolating {isolatedObjectIds.length} object{isolatedObjectIds.length === 1 ? '' : 's'}</span>
          <button type="button" onClick={unisolate} className="min-h-11 rounded border border-amber-300 px-2 hover:bg-amber-100">
            Unisolate
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {layers.map((layer) => {
          const layerRows = rows.filter((r) => (r.layerId ?? DEFAULT_LAYER_ID) === layer.id);
          if (layerRows.length === 0) return null;
          return (
            <li key={layer.id}>
              <div className="text-xs font-medium text-slate-400">{layer.name}</div>
              <ul className="mt-1 flex flex-col gap-1">
                {layerRows.map((row) => {
                  const selected = selectedIdFor[row.kind] === row.id || multiSelectedObjectIds.includes(row.id);
                  return (
                    <li key={`${row.kind}-${row.id}`}>
                      <button
                        type="button"
                        onClick={(e) => handleRowClick(row, e)}
                        className={`min-h-11 w-full rounded px-2 text-left text-sm ${
                          selected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {row.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
