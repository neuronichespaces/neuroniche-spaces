'use client';

// Spatial Design Engine — integration shell (Phase 7). Composes the pieces
// built in Phases 1-6 around the shared useRoomLayoutStore: template picker,
// 2D editor, 3D viewer, properties panel, export panel. This is the "wire it
// together" step — none of the individual components talk to each other
// directly, they all read/write the one store.

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { SCENARIO_TEMPLATES } from '@/lib/spatial/templates.ts';
import { TemplatePicker } from '@/components/spatial/TemplatePicker.tsx';
import RoomEditor2D from '@/components/spatial/RoomEditor2D.tsx';
import { PropertiesPanel } from '@/components/spatial/PropertiesPanel.tsx';
import { ExportPanel } from '@/components/spatial/ExportPanel.tsx';
import { CATALOGUE } from '@/lib/demoData.ts';

// Code-split: three.js/@react-three/fiber/drei only ship once needed, not in the
// initial /spatial bundle. ExportPanel (rendered unconditionally in the header) also
// imports RoomViewer3D for its off-screen snapshot capture, so it gets the same
// dynamic-import treatment below — otherwise it would silently pull three.js back
// into the initial load regardless of this change.
const RoomViewer3D = dynamic(() => import('@/components/spatial/RoomViewer3D.tsx'), {
  ssr: false,
  loading: () => <div className="flex h-[500px] w-full items-center justify-center text-sm text-slate-500">Loading 3D view…</div>,
});

export default function SpatialDesignEnginePage() {
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [presentationView, setPresentationView] = useState(false);
  const [roomName, setRoomName] = useState('New sensory room');
  // Defaults to the OS `prefers-reduced-motion` setting on mount, then stays
  // user-controlled — covers people whose OS setting isn't on but who still
  // want it off in walk mode / orbit controls.
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const walls = useRoomLayoutStore((s) => s.walls);
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const zones = useRoomLayoutStore((s) => s.zones);
  const hasLoadedInitialData = useRoomLayoutStore((s) => s.hasLoadedInitialData);
  const selectedObjectId = useRoomLayoutStore((s) => s.selectedObjectId);
  const loadLayout = useRoomLayoutStore((s) => s.loadLayout);
  const hydrateFromLocalStorage = useRoomLayoutStore((s) => s.hydrateFromLocalStorage);
  const saveToLocalStorage = useRoomLayoutStore((s) => s.saveToLocalStorage);
  const undo = useRoomLayoutStore((s) => s.undo);
  const redo = useRoomLayoutStore((s) => s.redo);
  const canUndo = useRoomLayoutStore((s) => s.canUndo);
  const canRedo = useRoomLayoutStore((s) => s.canRedo);

  // Load any autosaved layout once on mount (localStorage), then keep this
  // tab in sync with other tabs via BroadcastChannel (wired inside the store).
  useEffect(() => {
    hydrateFromLocalStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // B3: only default floorDims from the template on first-ever load (no prior
  // template/localStorage/user edit). Once a room has real dims, keep them —
  // TemplatePicker's mismatch flag (computed against actualDims) is what warns
  // the user before they click, instead of us silently overwriting their room size.
  function applyTemplate(template: (typeof SCENARIO_TEMPLATES)[number]) {
    loadLayout({
      walls: template.defaultWalls,
      doors: template.defaultDoors,
      floorDims: hasLoadedInitialData
        ? floorDims
        : { widthM: template.targetWidthM.max, lengthM: template.targetLengthM.max },
      placedObjects: template.defaultObjects,
      zones: hasLoadedInitialData ? zones : [],
    });
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Spatial Design Engine</h1>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
            aria-label="Room name"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className="min-h-11 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className="min-h-11 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Redo
          </button>
        </div>
        <ExportPanel roomName={roomName} catalogue={CATALOGUE} />
      </header>

      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-700">Start from a template</h2>
        <TemplatePicker templates={SCENARIO_TEMPLATES} actualDims={floorDims} onSelect={applyTemplate} />
      </section>

      {!hasLoadedInitialData && walls.length === 0 && placedObjects.length === 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Start from a template above, or draw your first wall using the wall tool below.
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {(['2d', '3d'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`min-h-11 rounded border px-3 py-2 text-sm uppercase ${
                view === v ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'
              }`}
            >
              {v} view
            </button>
          ))}
          {view === '3d' && (
            <button
              type="button"
              onClick={() => setPresentationView((p) => !p)}
              aria-pressed={presentationView}
              className={`min-h-11 rounded border px-3 py-2 text-sm ${
                presentationView ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'
              }`}
            >
              Presentation view
            </button>
          )}
          {view === '3d' && (
            <label className="flex min-h-11 items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
                className="h-4 w-4"
              />
              Reduce motion
            </label>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            {view === '2d' ? (
              <RoomEditor2D onSave={saveToLocalStorage} />
            ) : (
              <div className="h-[500px] w-full overflow-hidden rounded border border-slate-300">
                <RoomViewer3D highDetail={presentationView} reducedMotion={reduceMotion} />
              </div>
            )}
          </div>
          {selectedObjectId && (
            <div className="w-full lg:w-72">
              <PropertiesPanel />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
