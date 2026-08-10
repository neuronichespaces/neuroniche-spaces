// CAD-upgrade Gap 3 (Blocks, components, and template library): the block library —
// distinct from templates.ts's whole-room ScenarioTemplate picker. Self-contained, no
// props — same pattern as LayersPanel/OutlinerPanel. "Save as block" lives in
// OutlinerPanel's batch-action bar (it needs the current multi-selection); this panel
// is purely the library + insert side, plus click-to-place (arms store.ts's
// pendingBlockPlacement; RoomEditor2D.tsx's stage click handler does the actual
// insert) and nesting (one block placed inside another, see BlockDefinition.nestedBlocks).
'use client';

import { useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';

export function BlocksPanel() {
  const blocks = useRoomLayoutStore((s) => s.blocks);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const insertBlock = useRoomLayoutStore((s) => s.insertBlock);
  const removeBlock = useRoomLayoutStore((s) => s.removeBlock);
  const pendingBlockPlacement = useRoomLayoutStore((s) => s.pendingBlockPlacement);
  const armBlockPlacement = useRoomLayoutStore((s) => s.armBlockPlacement);
  const cancelBlockPlacement = useRoomLayoutStore((s) => s.cancelBlockPlacement);
  const nestBlock = useRoomLayoutStore((s) => s.nestBlock);
  const unnestBlock = useRoomLayoutStore((s) => s.unnestBlock);
  const [nestTargetId, setNestTargetId] = useState('');

  if (blocks.length === 0) return null;

  const pendingBlock = blocks.find((b) => b.id === pendingBlockPlacement);

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2">
      <h2 className="text-xs font-medium text-slate-500">Blocks</h2>
      {pendingBlock && (
        <div className="flex items-center justify-between rounded bg-blue-50 p-2 text-xs text-blue-700">
          <span>Click the 2D plan to place &quot;{pendingBlock.name}&quot;</span>
          <button type="button" onClick={cancelBlockPlacement} className="min-h-11 rounded px-2 hover:bg-blue-100">
            Cancel
          </button>
        </div>
      )}
      <ul className="flex flex-col gap-1">
        {blocks.map((block) => (
          <li key={block.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <span className="flex-1">
              {block.name} ({block.items.length} object{block.items.length === 1 ? '' : 's'}
              {block.nestedBlocks?.length ? `, ${block.nestedBlocks.length} nested block${block.nestedBlocks.length === 1 ? '' : 's'}` : ''})
              <span className="ml-1 text-xs text-slate-400">v{block.version}</span>
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
              onClick={() => armBlockPlacement(block.id)}
              aria-pressed={pendingBlockPlacement === block.id}
              className={`min-h-11 rounded border px-2 text-xs ${
                pendingBlockPlacement === block.id ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              Click to place
            </button>
            <button
              type="button"
              onClick={() => removeBlock(block.id)}
              className="min-h-11 rounded px-2 text-xs text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
            {block.nestedBlocks?.map((n) => {
              const child = blocks.find((b) => b.id === n.blockId);
              return (
                <span key={n.blockId} className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  ↳ {child?.name ?? n.blockId}
                  <button type="button" onClick={() => unnestBlock(block.id, n.blockId)} className="min-h-11 px-1 text-slate-400 hover:text-red-600">
                    ✕
                  </button>
                </span>
              );
            })}
          </li>
        ))}
      </ul>
      {blocks.length > 1 && (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500">Nest:</span>
          <select
            value={nestTargetId}
            onChange={(e) => setNestTargetId(e.target.value)}
            className="min-h-11 rounded border border-slate-300 px-1"
            aria-label="Block to nest into another"
          >
            <option value="">Choose a block…</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <span className="text-slate-500">into</span>
          <select
            className="min-h-11 rounded border border-slate-300 px-1"
            defaultValue=""
            aria-label="Parent block to nest into"
            onChange={(e) => {
              if (nestTargetId && e.target.value) nestBlock(e.target.value, nestTargetId, 0, 0);
              e.target.value = '';
              setNestTargetId('');
            }}
          >
            <option value="">Choose a block…</option>
            {blocks
              .filter((b) => b.id !== nestTargetId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  );
}
