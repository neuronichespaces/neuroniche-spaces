// CAD-upgrade Gap 6 (section lines, 2026-08-10): panel-based creation, same scope
// choice as RevisionCloudsPanel — no canvas click-to-draw tool this pass. "Add" places
// a horizontal line across the room's mid-height; start/end are then editable inline.
// The generated section view itself renders in PrintableExport.tsx via
// sectionGeometry.ts's computeSectionProfile. Self-contained, no props.
'use client';

import { useRoomLayoutStore } from '@/lib/spatial/store.ts';

export function SectionLinesPanel() {
  const sectionLines = useRoomLayoutStore((s) => s.sectionLines);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const addSectionLine = useRoomLayoutStore((s) => s.addSectionLine);
  const updateSectionLine = useRoomLayoutStore((s) => s.updateSectionLine);
  const removeSectionLine = useRoomLayoutStore((s) => s.removeSectionLine);

  function handleAdd() {
    addSectionLine({
      id: `section-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      start: { x: 0, y: floorDims.lengthM / 2 },
      end: { x: floorDims.widthM, y: floorDims.lengthM / 2 },
      label: `Section ${sectionLines.length + 1}`,
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-slate-500">Section lines</h2>
        <button type="button" onClick={handleAdd} className="min-h-11 rounded border border-slate-300 px-2 text-xs hover:bg-slate-50">
          Add
        </button>
      </div>
      {sectionLines.length > 0 && (
        <ul className="flex flex-col gap-1">
          {sectionLines.map((line) => (
            <li key={line.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <input
                value={line.label ?? ''}
                onChange={(e) => updateSectionLine(line.id, { label: e.target.value })}
                placeholder="Label"
                className="min-h-11 w-28 rounded border border-slate-300 px-2 text-xs"
                aria-label="Section line label"
              />
              <span className="text-xs text-slate-400">
                ({line.start.x.toFixed(1)}, {line.start.y.toFixed(1)}) → ({line.end.x.toFixed(1)}, {line.end.y.toFixed(1)})
              </span>
              <button
                type="button"
                onClick={() => removeSectionLine(line.id)}
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
