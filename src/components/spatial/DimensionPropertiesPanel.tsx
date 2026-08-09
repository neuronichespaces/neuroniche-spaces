// CAD-upgrade Gap 4: minimal dimension inspector — dimensions have no other editable
// geometry (start/end are set by the click-click draw tool, not typed), so this is
// just the Layer assignment dropdown other entity panels have, plus Delete for parity
// with the Delete-key shortcut RoomEditor2D already wires up for a selected dimension.
'use client';

import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { DEFAULT_LAYER_ID } from '@/lib/spatial/layers.ts';

export function DimensionPropertiesPanel() {
  const selectedDimensionId = useRoomLayoutStore((s) => s.selectedDimensionId);
  const dimensions = useRoomLayoutStore((s) => s.dimensions);
  const layers = useRoomLayoutStore((s) => s.layers);
  const updateDimension = useRoomLayoutStore((s) => s.updateDimension);
  const removeDimension = useRoomLayoutStore((s) => s.removeDimension);
  const dimension = selectedDimensionId ? dimensions.find((d) => d.id === selectedDimensionId) : null;

  if (!dimension) return null;

  return (
    <div className="flex flex-col gap-3 rounded border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Selected dimension</span>
        <button
          type="button"
          onClick={() => removeDimension(dimension.id)}
          className="min-h-11 rounded px-2 text-xs text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Layer
        <select
          value={dimension.layerId ?? DEFAULT_LAYER_ID}
          onChange={(e) => updateDimension(dimension.id, { layerId: e.target.value })}
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
