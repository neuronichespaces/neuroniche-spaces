// CAD-upgrade Gap 5 (Advanced selection, filtering, outliner, batch editing).
// A single tree view of every object/zone/wall/dimension, grouped by layer, with
// click-to-select. Shift-click ADDS to that kind's multi-select array without
// clearing the other kinds' (2026-08-10: true cross-type multi-select — an object and
// a zone can be selected together, see store.ts's toggleObjectMultiSelect comment).
// Objects get the full batch bar (delete/lock/hide/isolate/reassign layer/save-as-
// block); zones/walls/dimensions get layer+delete only (no own locked/hidden fields).
// A text filter narrows the tree and can select every currently-filtered row in one
// click (Quick-Select-style). The whole cross-type selection can be saved/restored by
// name (selectionSets, store.ts). Leaders are excluded from multi-select — no batch
// mutators exist for them. Self-contained, no props — same pattern as LayersPanel.
'use client';

import { useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { DEFAULT_LAYER_ID } from '@/lib/spatial/layers.ts';
import { ZONE_KIND_LABELS } from './ZoneLayer.tsx';
import { wallLengthM } from '@/lib/spatial/geometry.ts';
import { formatMetres } from '@/lib/spatial/units.ts';

type MultiSelectKind = 'object' | 'zone' | 'wall' | 'dimension';
type Row = { id: string; label: string; kind: MultiSelectKind | 'leader'; layerId?: string };

export function OutlinerPanel() {
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const zones = useRoomLayoutStore((s) => s.zones);
  const walls = useRoomLayoutStore((s) => s.walls);
  const dimensions = useRoomLayoutStore((s) => s.dimensions);
  const leaders = useRoomLayoutStore((s) => s.leaders);
  const layers = useRoomLayoutStore((s) => s.layers);
  const selectedObjectId = useRoomLayoutStore((s) => s.selectedObjectId);
  const selectedZoneId = useRoomLayoutStore((s) => s.selectedZoneId);
  const selectedWallId = useRoomLayoutStore((s) => s.selectedWallId);
  const selectedDimensionId = useRoomLayoutStore((s) => s.selectedDimensionId);
  const selectedLeaderId = useRoomLayoutStore((s) => s.selectedLeaderId);
  const multiSelectedObjectIds = useRoomLayoutStore((s) => s.multiSelectedObjectIds);
  const multiSelectedZoneIds = useRoomLayoutStore((s) => s.multiSelectedZoneIds);
  const multiSelectedWallIds = useRoomLayoutStore((s) => s.multiSelectedWallIds);
  const multiSelectedDimensionIds = useRoomLayoutStore((s) => s.multiSelectedDimensionIds);
  const isolatedObjectIds = useRoomLayoutStore((s) => s.isolatedObjectIds);
  const selectObject = useRoomLayoutStore((s) => s.selectObject);
  const selectZone = useRoomLayoutStore((s) => s.selectZone);
  const selectWall = useRoomLayoutStore((s) => s.selectWall);
  const selectDimension = useRoomLayoutStore((s) => s.selectDimension);
  const selectLeader = useRoomLayoutStore((s) => s.selectLeader);
  const toggleObjectMultiSelect = useRoomLayoutStore((s) => s.toggleObjectMultiSelect);
  const clearObjectMultiSelect = useRoomLayoutStore((s) => s.clearObjectMultiSelect);
  const batchSetObjectLayer = useRoomLayoutStore((s) => s.batchSetObjectLayer);
  const batchRemoveObjects = useRoomLayoutStore((s) => s.batchRemoveObjects);
  const batchSetObjectsLocked = useRoomLayoutStore((s) => s.batchSetObjectsLocked);
  const batchSetObjectsHidden = useRoomLayoutStore((s) => s.batchSetObjectsHidden);
  const isolateObjects = useRoomLayoutStore((s) => s.isolateObjects);
  const unisolate = useRoomLayoutStore((s) => s.unisolate);
  const saveSelectionAsBlock = useRoomLayoutStore((s) => s.saveSelectionAsBlock);
  const toggleZoneMultiSelect = useRoomLayoutStore((s) => s.toggleZoneMultiSelect);
  const clearZoneMultiSelect = useRoomLayoutStore((s) => s.clearZoneMultiSelect);
  const batchSetZoneLayer = useRoomLayoutStore((s) => s.batchSetZoneLayer);
  const batchRemoveZones = useRoomLayoutStore((s) => s.batchRemoveZones);
  const toggleWallMultiSelect = useRoomLayoutStore((s) => s.toggleWallMultiSelect);
  const clearWallMultiSelect = useRoomLayoutStore((s) => s.clearWallMultiSelect);
  const batchSetWallLayer = useRoomLayoutStore((s) => s.batchSetWallLayer);
  const batchRemoveWalls = useRoomLayoutStore((s) => s.batchRemoveWalls);
  const toggleDimensionMultiSelect = useRoomLayoutStore((s) => s.toggleDimensionMultiSelect);
  const clearDimensionMultiSelect = useRoomLayoutStore((s) => s.clearDimensionMultiSelect);
  const batchSetDimensionLayer = useRoomLayoutStore((s) => s.batchSetDimensionLayer);
  const batchRemoveDimensions = useRoomLayoutStore((s) => s.batchRemoveDimensions);
  const selectionSets = useRoomLayoutStore((s) => s.selectionSets);
  const saveSelectionSet = useRoomLayoutStore((s) => s.saveSelectionSet);
  const restoreSelectionSet = useRoomLayoutStore((s) => s.restoreSelectionSet);
  const deleteSelectionSet = useRoomLayoutStore((s) => s.deleteSelectionSet);
  const [batchLayerId, setBatchLayerId] = useState('');
  const [filter, setFilter] = useState('');

  const multiSelectedIdsFor: Record<MultiSelectKind, string[]> = {
    object: multiSelectedObjectIds,
    zone: multiSelectedZoneIds,
    wall: multiSelectedWallIds,
    dimension: multiSelectedDimensionIds,
  };
  const toggleMultiSelectFor: Record<MultiSelectKind, (id: string) => void> = {
    object: toggleObjectMultiSelect,
    zone: toggleZoneMultiSelect,
    wall: toggleWallMultiSelect,
    dimension: toggleDimensionMultiSelect,
  };
  // Cross-type (2026-08-10): every kind's array can be non-empty at once now, so the
  // batch bar operates on whichever kinds actually have a selection, not just one.
  const nonObjectSelected: { kind: 'zone' | 'wall' | 'dimension'; ids: string[] }[] = (
    [
      ['zone', multiSelectedZoneIds],
      ['wall', multiSelectedWallIds],
      ['dimension', multiSelectedDimensionIds],
    ] as const
  )
    .filter(([, ids]) => ids.length > 0)
    .map(([kind, ids]) => ({ kind, ids }));
  const totalMultiSelected =
    multiSelectedObjectIds.length + multiSelectedZoneIds.length + multiSelectedWallIds.length + multiSelectedDimensionIds.length;

  const rows: Row[] = [
    ...placedObjects.map((o): Row => ({ id: o.id, label: o.productId, kind: 'object', layerId: o.layerId })),
    ...zones.map((z): Row => ({ id: z.id, label: z.label || ZONE_KIND_LABELS[z.kind], kind: 'zone', layerId: z.layerId })),
    ...walls.map((w): Row => ({ id: w.id, label: `Wall (${formatMetres(wallLengthM(w))})`, kind: 'wall', layerId: w.layerId })),
    ...dimensions.map((d): Row => ({ id: d.id, label: d.label || 'Dimension', kind: 'dimension', layerId: d.layerId })),
    ...leaders.map((l): Row => ({ id: l.id, label: l.text || 'Leader', kind: 'leader', layerId: l.layerId })),
  ];

  const selectedIdFor: Record<Row['kind'], string | null> = {
    object: selectedObjectId,
    zone: selectedZoneId,
    wall: selectedWallId,
    dimension: selectedDimensionId,
    leader: selectedLeaderId,
  };
  const selectFor: Record<Row['kind'], (id: string) => void> = {
    object: selectObject,
    zone: selectZone,
    wall: selectWall,
    dimension: selectDimension,
    leader: selectLeader,
  };

  function handleRowClick(row: Row, e: React.MouseEvent) {
    if (row.kind !== 'leader' && e.shiftKey) {
      toggleMultiSelectFor[row.kind](row.id);
      return;
    }
    selectFor[row.kind](row.id);
  }

  const filteredRows = filter.trim() ? rows.filter((r) => r.label.toLowerCase().includes(filter.trim().toLowerCase())) : rows;

  // Quick-Select-style filtering (CAD Gap 5, 2026-08-10): adds every filtered row not
  // already selected into its kind's multi-select array — additive, so refining the
  // filter and clicking again grows the selection rather than resetting it.
  function selectAllFiltered() {
    for (const row of filteredRows) {
      if (row.kind === 'leader') continue;
      if (!multiSelectedIdsFor[row.kind].includes(row.id)) toggleMultiSelectFor[row.kind](row.id);
    }
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
        {rows.length > 0 && <span className="text-xs text-slate-400">Shift-click to multi-select</span>}
      </div>

      <div className="flex items-center gap-1">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name…"
          className="min-h-11 flex-1 rounded border border-gray-300 px-2 text-sm"
          aria-label="Filter outliner rows"
        />
        {filter.trim() && (
          <button
            type="button"
            onClick={selectAllFiltered}
            disabled={filteredRows.every((r) => r.kind === 'leader')}
            className="min-h-11 rounded border border-slate-300 px-2 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Select all filtered
          </button>
        )}
      </div>

      {totalMultiSelected > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded bg-slate-50 p-1.5 text-xs text-slate-500">
          <span>{totalMultiSelected} total selected across kinds</span>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt('Selection set name?');
              if (name && name.trim()) saveSelectionSet(name.trim());
            }}
            className="min-h-11 rounded border border-slate-300 px-2 hover:bg-slate-100"
          >
            Save selection set
          </button>
        </div>
      )}

      {selectionSets.length > 0 && (
        <ul className="flex flex-col gap-1">
          {selectionSets.map((set) => (
            <li key={set.id} className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
              <span className="flex-1 truncate">{set.name}</span>
              <button
                type="button"
                onClick={() => restoreSelectionSet(set.id)}
                className="min-h-11 rounded px-2 text-blue-700 hover:bg-blue-50"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={() => deleteSelectionSet(set.id)}
                className="min-h-11 rounded px-2 text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {multiSelectedObjectIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded bg-blue-50 p-2 text-sm">
          <span className="text-blue-700">{multiSelectedObjectIds.length} object{multiSelectedObjectIds.length === 1 ? '' : 's'} selected</span>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt('Block name?');
              if (name && name.trim()) saveSelectionAsBlock(name.trim(), multiSelectedObjectIds);
            }}
            className="min-h-11 rounded border border-blue-300 px-2 text-blue-700 hover:bg-blue-100"
          >
            Save as block
          </button>
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

      {nonObjectSelected.map(({ kind, ids }) => {
        const batchSetLayer = kind === 'zone' ? batchSetZoneLayer : kind === 'wall' ? batchSetWallLayer : batchSetDimensionLayer;
        const batchRemove = kind === 'zone' ? batchRemoveZones : kind === 'wall' ? batchRemoveWalls : batchRemoveDimensions;
        const clear = kind === 'zone' ? clearZoneMultiSelect : kind === 'wall' ? clearWallMultiSelect : clearDimensionMultiSelect;
        return (
          <div key={kind} className="flex flex-wrap items-center gap-2 rounded bg-blue-50 p-2 text-sm">
            <span className="text-blue-700 capitalize">
              {ids.length} {kind}
              {ids.length === 1 ? '' : 's'} selected
            </span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) batchSetLayer(ids, e.target.value);
                e.target.value = '';
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
              onClick={() => batchRemove(ids)}
              className="min-h-11 rounded border border-red-300 px-2 text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
            <button type="button" onClick={clear} className="min-h-11 rounded px-2 text-slate-500 hover:bg-slate-100">
              Clear
            </button>
          </div>
        );
      })}

      {isolatedObjectIds !== null && (
        <div className="flex items-center justify-between rounded bg-amber-50 p-2 text-sm text-amber-700">
          <span>Isolating {isolatedObjectIds.length} object{isolatedObjectIds.length === 1 ? '' : 's'}</span>
          <button type="button" onClick={unisolate} className="min-h-11 rounded border border-amber-300 px-2 hover:bg-amber-100">
            Unisolate
          </button>
        </div>
      )}

      {filter.trim() && filteredRows.length === 0 && <p className="text-sm text-slate-400">No rows match &quot;{filter}&quot;.</p>}

      <ul className="flex flex-col gap-2">
        {layers.map((layer) => {
          const layerRows = filteredRows.filter((r) => (r.layerId ?? DEFAULT_LAYER_ID) === layer.id);
          if (layerRows.length === 0) return null;
          return (
            <li key={layer.id}>
              <div className="text-xs font-medium text-slate-400">{layer.name}</div>
              <ul className="mt-1 flex flex-col gap-1">
                {layerRows.map((row) => {
                  const selected = selectedIdFor[row.kind] === row.id || (row.kind !== 'leader' && multiSelectedIdsFor[row.kind].includes(row.id));
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
