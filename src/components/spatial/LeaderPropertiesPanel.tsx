// CAD-upgrade Gap 6: leader/callout inspector — text is the one thing that makes
// sense to edit here (position comes from the click-click draw tool, not typed).
// Layer dropdown + Delete mirror DimensionPropertiesPanel.tsx's pattern.
'use client';

import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { DEFAULT_LAYER_ID } from '@/lib/spatial/layers.ts';

export function LeaderPropertiesPanel() {
  const selectedLeaderId = useRoomLayoutStore((s) => s.selectedLeaderId);
  const leaders = useRoomLayoutStore((s) => s.leaders);
  const layers = useRoomLayoutStore((s) => s.layers);
  const updateLeader = useRoomLayoutStore((s) => s.updateLeader);
  const removeLeader = useRoomLayoutStore((s) => s.removeLeader);
  const leader = selectedLeaderId ? leaders.find((l) => l.id === selectedLeaderId) : null;

  if (!leader) return null;

  return (
    <div className="flex flex-col gap-3 rounded border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Selected leader</span>
        <button
          type="button"
          onClick={() => removeLeader(leader.id)}
          className="min-h-11 rounded px-2 text-xs text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Text
        <input
          value={leader.text}
          onChange={(e) => updateLeader(leader.id, { text: e.target.value })}
          className="min-h-11 rounded border border-gray-300 px-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Layer
        <select
          value={leader.layerId ?? DEFAULT_LAYER_ID}
          onChange={(e) => updateLeader(leader.id, { layerId: e.target.value })}
          className="min-h-11 rounded border border-gray-300 px-2"
        >
          {layers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
