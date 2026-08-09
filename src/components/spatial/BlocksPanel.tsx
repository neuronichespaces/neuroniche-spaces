// CAD-upgrade Gap 3 (Blocks, components, and template library): the block library —
// distinct from templates.ts's whole-room ScenarioTemplate picker. Self-contained, no
// props — same pattern as LayersPanel/OutlinerPanel. "Save as block" lives in
// OutlinerPanel's batch-action bar (it needs the current multi-selection); this panel
// is purely the library + insert side.
'use client';

import { useRoomLayoutStore } from '@/lib/spatial/store.ts';

export function BlocksPanel() {
  const blocks = useRoomLayoutStore((s) => s.blocks);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const insertBlock = useRoomLayoutStore((s) => s.insertBlock);
  const removeBlock = useRoomLayoutStore((s) => s.removeBlock);

  if (blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2">
      <h2 className="text-xs font-medium text-slate-500">Blocks</h2>
      <ul className="flex flex-col gap-1">
        {blocks.map((block) => (
          <li key={block.id} className="flex items-center gap-2 text-sm text-slate-700">
            <span className="flex-1">
              {block.name} ({block.items.length} object{block.items.length === 1 ? '' : 's'})
            </span>
            <button
              type="button"
              onClick={() => insertBlock(block.id, floorDims.widthM / 2, floorDims.lengthM / 2)}
              className="min-h-11 rounded border border-slate-300 px-2 text-xs hover:bg-slate-50"
            >
              Insert at centre
            </button>
            <button
              type="button"
              onClick={() => removeBlock(block.id)}
              className="min-h-11 rounded px-2 text-xs text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
