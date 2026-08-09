// CAD-upgrade Gap 7: the UI that turns persistence.ts's scenario functions
// (listScenarios/saveScenarioAs/loadScenarioById/setScenarioStatus) and
// scenarioDiff.ts's diffScenarios into something a user can actually use — save the
// current layout as a new named scenario, list saved scenarios with their review
// status, load one, change its status, and diff two scenarios against each other.
// Only rendered when roomId is present (same DB-gated pattern as page.tsx's other
// Supabase-backed UI) — scenarios are meaningless without a room to attach them to.
'use client';

import { useEffect, useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import {
  listScenarios,
  saveScenarioAs,
  loadScenarioById,
  setScenarioStatus,
  type ScenarioSummary,
} from '@/lib/spatial/persistence.ts';
import { diffScenarios, type ScenarioDiff } from '@/lib/spatial/scenarioDiff.ts';

const STATUS_LABELS: Record<ScenarioSummary['status'], string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  superseded: 'Superseded',
};

export function ScenariosPanel({ roomId }: { roomId: string }) {
  const walls = useRoomLayoutStore((s) => s.walls);
  const doors = useRoomLayoutStore((s) => s.doors);
  const zones = useRoomLayoutStore((s) => s.zones);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const loadLayout = useRoomLayoutStore((s) => s.loadLayout);

  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [error, setError] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [diffIds, setDiffIds] = useState<{ a: string; b: string } | null>(null);
  const [diffResult, setDiffResult] = useState<ScenarioDiff | null>(null);

  async function refresh() {
    try {
      setScenarios(await listScenarios(roomId));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function handleSaveAsNew() {
    const name = nameDraft.trim();
    if (!name) return;
    try {
      await saveScenarioAs(roomId, name, { walls, doors, floorDims, placedObjects, zones });
      setNameDraft('');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleLoad(id: string) {
    try {
      const layout = await loadScenarioById(id);
      if (layout) loadLayout(layout);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleStatusChange(id: string, status: ScenarioSummary['status']) {
    try {
      await setScenarioStatus(id, status);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDiff(aId: string, bId: string) {
    try {
      const [a, b] = await Promise.all([loadScenarioById(aId), loadScenarioById(bId)]);
      if (!a || !b) return;
      setDiffIds({ a: aId, b: bId });
      setDiffResult(diffScenarios(a, b));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2">
      <h2 className="text-xs font-medium text-slate-500">Scenarios</h2>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="flex items-center gap-1">
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="Save current layout as…"
          className="min-h-11 flex-1 rounded border border-gray-300 px-2 text-sm"
        />
        <button type="button" onClick={handleSaveAsNew} className="min-h-11 rounded border border-slate-300 px-2 text-sm text-slate-700">
          Save as new
        </button>
      </div>
      {scenarios.length === 0 ? (
        <p className="text-sm text-slate-500">No saved scenarios yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {scenarios.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <span className="flex-1">{s.name}</span>
              <select
                value={s.status}
                onChange={(e) => handleStatusChange(s.id, e.target.value as ScenarioSummary['status'])}
                className="min-h-11 rounded border border-gray-300 px-1 text-xs"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => handleLoad(s.id)} className="min-h-11 rounded border border-slate-300 px-2 text-xs hover:bg-slate-50">
                Load
              </button>
            </li>
          ))}
        </ul>
      )}
      {scenarios.length >= 2 && (
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2 text-xs">
          <span className="text-slate-500">Compare:</span>
          <select id="diff-a" className="min-h-11 rounded border border-gray-300 px-1" defaultValue={scenarios[1]?.id}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="text-slate-400">vs</span>
          <select id="diff-b" className="min-h-11 rounded border border-gray-300 px-1" defaultValue={scenarios[0]?.id}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const a = (document.getElementById('diff-a') as HTMLSelectElement)?.value;
              const b = (document.getElementById('diff-b') as HTMLSelectElement)?.value;
              if (a && b) handleDiff(a, b);
            }}
            className="min-h-11 rounded border border-slate-300 px-2 hover:bg-slate-50"
          >
            Diff
          </button>
        </div>
      )}
      {diffResult && diffIds && (
        <div className="rounded bg-slate-50 p-2 text-xs text-slate-700">
          <p className="font-medium">
            {scenarios.find((s) => s.id === diffIds.a)?.name} → {scenarios.find((s) => s.id === diffIds.b)?.name}
          </p>
          {(['objects', 'walls', 'zones'] as const).map((kind) => (
            <p key={kind}>
              {kind}: +{diffResult[kind].added} / -{diffResult[kind].removed} / ~{diffResult[kind].changed} changed (
              {diffResult[kind].unchanged} unchanged)
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
