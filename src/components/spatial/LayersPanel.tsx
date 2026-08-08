// CAD-upgrade Gap 4: layer CRUD + visibility/lock toggles. Self-contained, no props —
// same pattern as WallDimensionsPanel/CommandHistoryPanel, reads/writes the store
// directly. The seeded default layer can be toggled but not deleted (there must
// always be somewhere for an unassigned object to effectively live).
'use client';

import { useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { DEFAULT_LAYER_ID } from '@/lib/spatial/layers.ts';

export function LayersPanel() {
  const layers = useRoomLayoutStore((s) => s.layers);
  const addLayer = useRoomLayoutStore((s) => s.addLayer);
  const updateLayer = useRoomLayoutStore((s) => s.updateLayer);
  const removeLayer = useRoomLayoutStore((s) => s.removeLayer);
  const [newLayerName, setNewLayerName] = useState('');

  function handleAdd() {
    const name = newLayerName.trim();
    if (!name) return;
    addLayer({ id: `layer-${Date.now()}-${Math.round(Math.random() * 1000)}`, name, visible: true, locked: false });
    setNewLayerName('');
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2">
      <h2 className="text-xs font-medium text-slate-500">Layers</h2>
      <ul className="flex flex-col gap-1">
        {layers.map((layer) => (
          <li key={layer.id} className="flex items-center gap-2 text-sm text-slate-700">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={(e) => updateLayer(layer.id, { visible: e.target.checked })}
                aria-label={`${layer.name} visible`}
              />
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={layer.locked}
                onChange={(e) => updateLayer(layer.id, { locked: e.target.checked })}
                aria-label={`${layer.name} locked`}
              />
              🔒
            </label>
            <input
              value={layer.name}
              onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
              className="min-h-11 flex-1 rounded border border-transparent px-1 hover:border-slate-300 focus:border-slate-300"
              aria-label={`Rename ${layer.name}`}
            />
            {layer.id !== DEFAULT_LAYER_ID && (
              <button
                type="button"
                onClick={() => removeLayer(layer.id)}
                className="min-h-11 rounded px-2 text-xs text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1">
        <input
          value={newLayerName}
          onChange={(e) => setNewLayerName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="New layer name"
          className="min-h-11 flex-1 rounded border border-gray-300 px-2 text-sm"
          aria-label="New layer name"
        />
        <button type="button" onClick={handleAdd} className="min-h-11 rounded border border-slate-300 px-2 text-sm text-slate-700">
          Add
        </button>
      </div>
    </div>
  );
}
