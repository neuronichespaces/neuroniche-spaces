// CAD-upgrade Gap 6 (revision clouds, 2026-08-10): panel-based creation, not a canvas
// click-to-draw tool — same scope choice store.ts's addRevisionCloud comment
// documents (no dedicated 2D draw tool for this pass). "Add" places a 2m x 2m cloud at
// the room centre; width/length/note are then editable inline. Self-contained, no
// props — same pattern as LayersPanel/BlocksPanel.
'use client';

import { useRoomLayoutStore } from '@/lib/spatial/store.ts';

export function RevisionCloudsPanel() {
  const revisionClouds = useRoomLayoutStore((s) => s.revisionClouds);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const addRevisionCloud = useRoomLayoutStore((s) => s.addRevisionCloud);
  const updateRevisionCloud = useRoomLayoutStore((s) => s.updateRevisionCloud);
  const removeRevisionCloud = useRoomLayoutStore((s) => s.removeRevisionCloud);

  function handleAdd() {
    addRevisionCloud({
      id: `revcloud-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      x: floorDims.widthM / 2,
      y: floorDims.lengthM / 2,
      widthM: 2,
      lengthM: 2,
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-slate-500">Revision clouds</h2>
        <button type="button" onClick={handleAdd} className="min-h-11 rounded border border-slate-300 px-2 text-xs hover:bg-slate-50">
          Add
        </button>
      </div>
      {revisionClouds.length > 0 && (
        <ul className="flex flex-col gap-1">
          {revisionClouds.map((cloud) => (
            <li key={cloud.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <input
                type="number"
                min={0.2}
                step={0.1}
                value={cloud.widthM}
                onChange={(e) => updateRevisionCloud(cloud.id, { widthM: Number(e.target.value) })}
                className="min-h-11 w-16 rounded border border-slate-300 px-1 text-xs"
                aria-label="Revision cloud width, metres"
              />
              <input
                type="number"
                min={0.2}
                step={0.1}
                value={cloud.lengthM}
                onChange={(e) => updateRevisionCloud(cloud.id, { lengthM: Number(e.target.value) })}
                className="min-h-11 w-16 rounded border border-slate-300 px-1 text-xs"
                aria-label="Revision cloud length, metres"
              />
              <input
                value={cloud.note ?? ''}
                onChange={(e) => updateRevisionCloud(cloud.id, { note: e.target.value })}
                placeholder='Note (e.g. "wall moved")'
                className="min-h-11 flex-1 rounded border border-slate-300 px-2 text-xs"
                aria-label="Revision cloud note"
              />
              <button
                type="button"
                onClick={() => removeRevisionCloud(cloud.id)}
                className="min-h-11 rounded px-2 text-xs text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
