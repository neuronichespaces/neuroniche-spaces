// CAD-upgrade Gap 5 (Advanced selection... outliner): first slice — a single tree
// view of every object/zone/wall/dimension, grouped by layer, with click-to-select.
// No multi-select/batch-edit/isolate yet (that's the rest of Gap 5, "missing
// entirely" until this), but this is the load-bearing piece: today the only way to
// find a specific entity is to spot it on canvas. Self-contained, no props — same
// pattern as LayersPanel/CommandHistoryPanel.
'use client';

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
  const selectObject = useRoomLayoutStore((s) => s.selectObject);
  const selectZone = useRoomLayoutStore((s) => s.selectZone);
  const selectWall = useRoomLayoutStore((s) => s.selectWall);
  const selectDimension = useRoomLayoutStore((s) => s.selectDimension);

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
      <h2 className="text-xs font-medium text-slate-500">Outliner</h2>
      <ul className="flex flex-col gap-2">
        {layers.map((layer) => {
          const layerRows = rows.filter((r) => (r.layerId ?? DEFAULT_LAYER_ID) === layer.id);
          if (layerRows.length === 0) return null;
          return (
            <li key={layer.id}>
              <div className="text-xs font-medium text-slate-400">{layer.name}</div>
              <ul className="mt-1 flex flex-col gap-1">
                {layerRows.map((row) => {
                  const selected = selectedIdFor[row.kind] === row.id;
                  return (
                    <li key={`${row.kind}-${row.id}`}>
                      <button
                        type="button"
                        onClick={() => selectFor[row.kind](row.id)}
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
