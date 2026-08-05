'use client';

// Top-down 2D room editor. Reads/writes exclusively through useRoomLayoutStore
// so this view and the future Phase-3 3D viewer can never desync — all wall/
// object/door state lives in the store; the only local state here is
// transient UI (active tool, in-progress wall drag, save confirmation).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type Konva from 'konva';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import type { WallSegment, Zone, ZoneKind } from '@/lib/spatial/types.ts';
import { snapPointToGrid, projectPointToSegment, wallLengthM, clampPointToBounds } from '@/lib/spatial/geometry.ts';
import { buildGraphFromRoom } from '@/lib/spatial/graph.ts';
import { evaluateConstraints } from '@/lib/spatial/constraints.ts';
import { buildHeatmapGrid, type SensoryCategory } from '@/lib/spatial/heatmap.ts';
import { PERSONA_LIBRARY, evaluatePersonaForRoom } from '@/lib/spatial/persona.ts';
import WallLayer, { WallDimensionLabel } from './WallLayer.tsx';
import ObjectLayer from './ObjectLayer.tsx';
import ZoneLayer, { ZONE_KIND_LABELS } from './ZoneLayer.tsx';
import HeatmapOverlay from './HeatmapOverlay.tsx';
import ViolationsList from './ViolationsList.tsx';

const DEFAULT_GRID_SNAP_M = 0.1;
const DEFAULT_DOOR_WIDTH_M = 0.9;
const PX_PER_M = 60;
const WALL_THICKNESS_M = 0.1;
const ZONE_KINDS = Object.keys(ZONE_KIND_LABELS) as ZoneKind[];
const HEATMAP_CATEGORIES: (SensoryCategory | 'crowding')[] = ['movement', 'noise', 'light', 'touch', 'pressure', 'crowding'];
const HEATMAP_CATEGORY_LABELS: Record<SensoryCategory | 'crowding', string> = {
  movement: 'Movement',
  noise: 'Noise',
  light: 'Light',
  touch: 'Touch',
  pressure: 'Pressure',
  crowding: 'Crowding',
};

type Tool = 'select' | 'wall' | 'door' | 'zone';

type Props = {
  gridSnapM?: number;
  pxPerM?: number;
  onSave?: () => void;
};

export default function RoomEditor2D({
  gridSnapM = DEFAULT_GRID_SNAP_M,
  pxPerM = PX_PER_M,
  onSave,
}: Props) {
  const walls = useRoomLayoutStore((s) => s.walls);
  const doors = useRoomLayoutStore((s) => s.doors);
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const zones = useRoomLayoutStore((s) => s.zones);
  const clearanceViolations = useRoomLayoutStore((s) => s.clearanceViolations);
  const selectedObjectId = useRoomLayoutStore((s) => s.selectedObjectId);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const addWall = useRoomLayoutStore((s) => s.addWall);
  const addDoor = useRoomLayoutStore((s) => s.addDoor);
  const addZone = useRoomLayoutStore((s) => s.addZone);
  const moveObject = useRoomLayoutStore((s) => s.moveObject);
  const selectObject = useRoomLayoutStore((s) => s.selectObject);

  const [tool, setTool] = useState<Tool>('select');
  const [draftWall, setDraftWall] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(
    null,
  );
  const [draftZone, setDraftZone] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(
    null,
  );
  const [nextZoneKind, setNextZoneKind] = useState<ZoneKind>('focus');
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [heatmapCategory, setHeatmapCategory] = useState<SensoryCategory | 'crowding' | 'none'>('none');
  const [personaId, setPersonaId] = useState<string>('none');

  // Engine layer (Phases 1/3/4): recomputed on every render from current store state —
  // fine at this app's object counts (see graph.ts's own note on full-vs-localized
  // recompute), and far simpler than threading incremental updates through this component.
  const roomState = { floorDims, walls, doors, zones, placedObjects };
  const violations = useMemo(() => {
    const graph = buildGraphFromRoom(roomState);
    return evaluateConstraints(roomState, graph);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorDims, walls, doors, zones, placedObjects]);
  const heatmapGrid = useMemo(() => {
    return heatmapCategory === 'none' ? null : buildHeatmapGrid(roomState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapCategory, floorDims, placedObjects]);
  const selectedPersona = PERSONA_LIBRARY.find((p) => p.id === personaId) ?? null;
  const personaScores = useMemo(() => {
    if (!selectedPersona) return undefined;
    const grid = buildHeatmapGrid(roomState);
    const report = evaluatePersonaForRoom(selectedPersona, zones, grid);
    return Object.fromEntries(report.zoneScores.map((z) => [z.zone.id, z.suitability]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersona, zones, placedObjects]);

  const stageRef = useRef<Konva.Stage>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);

  const stageWidth = floorDims.widthM * pxPerM + 80;
  const stageHeight = floorDims.lengthM * pxPerM + 80;

  // Keyboard alternative to pointer-only wall/object interaction: arrow keys nudge
  // the selected object (Shift = bigger step), Tab cycles selection through objects.
  // Scoped to keydown events inside the editor root so it doesn't hijack page-level Tab.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (placedObjects.length === 0) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = placedObjects.findIndex((o) => o.id === selectedObjectId);
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + placedObjects.length) % placedObjects.length
          : (currentIndex + 1) % placedObjects.length;
        selectObject(placedObjects[nextIndex].id);
        return;
      }

      if (!selectedObjectId) return;
      const obj = placedObjects.find((o) => o.id === selectedObjectId);
      if (!obj) return;

      const step = e.shiftKey ? gridSnapM * 10 : gridSnapM;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;

      e.preventDefault();
      moveObject(obj.id, obj.x + dx, obj.y + dy);
    }

    const root = editorRootRef.current;
    root?.addEventListener('keydown', onKeyDown);
    return () => root?.removeEventListener('keydown', onKeyDown);
  }, [placedObjects, selectedObjectId, gridSnapM, moveObject, selectObject]);

  function pointerMetres(): { x: number; y: number } | null {
    const stage = stageRef.current;
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / pxPerM, y: pos.y / pxPerM };
  }

  function handleStageDown() {
    if (tool !== 'wall' && tool !== 'zone') return;
    const p = pointerMetres();
    if (!p) return;
    const snapped = clampPointToBounds(snapPointToGrid(p, gridSnapM), floorDims.widthM, floorDims.lengthM);
    if (tool === 'wall') setDraftWall({ start: snapped, current: snapped });
    else setDraftZone({ start: snapped, current: snapped });
  }

  function handleStageMove() {
    const p = pointerMetres();
    if (!p) return;
    const clamped = clampPointToBounds(snapPointToGrid(p, gridSnapM), floorDims.widthM, floorDims.lengthM);
    if (tool === 'wall' && draftWall) setDraftWall({ ...draftWall, current: clamped });
    else if (tool === 'zone' && draftZone) setDraftZone({ ...draftZone, current: clamped });
  }

  function handleStageUp() {
    if (tool === 'wall' && draftWall) {
      const { start, current } = draftWall;
      setDraftWall(null);
      if (start.x === current.x && start.y === current.y) return; // zero-length, ignore
      const wall: WallSegment = {
        id: `wall-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        start,
        end: current,
        thicknessM: WALL_THICKNESS_M,
      };
      addWall(wall);
      return;
    }
    if (tool === 'zone' && draftZone) {
      const { start, current } = draftZone;
      setDraftZone(null);
      const widthM = Math.abs(current.x - start.x);
      const lengthM = Math.abs(current.y - start.y);
      if (widthM < 0.2 || lengthM < 0.2) return; // too small to be a usable zone, ignore
      const zone: Zone = {
        id: `zone-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        kind: nextZoneKind,
        x: (start.x + current.x) / 2,
        y: (start.y + current.y) / 2,
        widthM,
        lengthM,
        rotationDeg: 0,
      };
      addZone(zone);
    }
  }

  function handleWallClick(wall: WallSegment, xM: number, yM: number) {
    const proj = projectPointToSegment({ x: xM, y: yM }, wall.start, wall.end);
    const len = wallLengthM(wall);
    // clamp door fully inside the wall
    const offsetM = Math.max(0, Math.min(len - DEFAULT_DOOR_WIDTH_M, proj.t * len - DEFAULT_DOOR_WIDTH_M / 2));
    addDoor({ wallId: wall.id, offsetM, widthM: Math.min(DEFAULT_DOOR_WIDTH_M, len) });
  }

  function handleSaveClick() {
    if (clearanceViolations.size > 0 && !confirmingSave) {
      setConfirmingSave(true);
      return;
    }
    setConfirmingSave(false);
    onSave?.();
  }

  return (
    <div ref={editorRootRef} tabIndex={0} className="flex flex-col gap-2 focus:outline-none">
      <div className="flex flex-wrap items-center gap-2">
        {(['select', 'wall', 'door', 'zone'] as Tool[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTool(t);
              setDraftWall(null);
              setDraftZone(null);
            }}
            className={`min-h-11 min-w-11 rounded border px-3 py-2 text-sm capitalize ${
              tool === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
        {tool === 'zone' && (
          <select
            value={nextZoneKind}
            onChange={(e) => setNextZoneKind(e.target.value as ZoneKind)}
            className="min-h-11 rounded border border-slate-300 px-2 text-sm"
            aria-label="Zone type to draw"
          >
            {ZONE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {ZONE_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-slate-500">
          {tool === 'wall' && 'Click and drag to draw a wall.'}
          {tool === 'door' && 'Click a wall to place a 0.9m door.'}
          {tool === 'zone' && 'Pick a zone type, then click and drag to draw it.'}
          {tool === 'select' && 'Drag objects to reposition them, or press Tab to select one and use the arrow keys to move it.'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1">
          Heatmap
          <select
            value={heatmapCategory}
            onChange={(e) => setHeatmapCategory(e.target.value as SensoryCategory | 'crowding' | 'none')}
            className="min-h-11 rounded border border-slate-300 px-2"
          >
            <option value="none">Off</option>
            {HEATMAP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {HEATMAP_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Persona view
          <select
            value={personaId}
            onChange={(e) => setPersonaId(e.target.value)}
            className="min-h-11 rounded border border-slate-300 px-2"
          >
            <option value="none">Off</option>
            {PERSONA_LIBRARY.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        onMouseDown={handleStageDown}
        onMouseMove={handleStageMove}
        onMouseUp={handleStageUp}
        onTouchStart={handleStageDown}
        onTouchMove={handleStageMove}
        onTouchEnd={handleStageUp}
        className="rounded border border-slate-300 bg-white"
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={floorDims.widthM * pxPerM}
            height={floorDims.lengthM * pxPerM}
            fill="#f8fafc"
            listening={false}
          />
        </Layer>
        {heatmapGrid && (
          <Layer>
            <HeatmapOverlay grid={heatmapGrid} category={heatmapCategory as SensoryCategory | 'crowding'} pxPerM={pxPerM} />
          </Layer>
        )}
        <Layer>
          <ZoneLayer zones={zones} pxPerM={pxPerM} personaScores={personaScores} />
          {draftZone && (
            <Rect
              x={Math.min(draftZone.start.x, draftZone.current.x) * pxPerM}
              y={Math.min(draftZone.start.y, draftZone.current.y) * pxPerM}
              width={Math.abs(draftZone.current.x - draftZone.start.x) * pxPerM}
              height={Math.abs(draftZone.current.y - draftZone.start.y) * pxPerM}
              fill="rgba(59,130,246,0.15)"
              stroke="#2563eb"
              dash={[6, 4]}
              listening={false}
            />
          )}
        </Layer>
        <Layer>
          <WallLayer walls={walls} doors={doors} pxPerM={pxPerM} doorTool={tool === 'door'} onWallClick={handleWallClick} />
          {draftWall && (
            <>
              <WallLayer
                walls={[{ id: 'draft', start: draftWall.start, end: draftWall.current, thicknessM: WALL_THICKNESS_M }]}
                doors={[]}
                pxPerM={pxPerM}
                doorTool={false}
                onWallClick={() => {}}
              />
              <WallDimensionLabel start={draftWall.start} end={draftWall.current} pxPerM={pxPerM} />
            </>
          )}
        </Layer>
        <Layer>
          <ObjectLayer
            objects={placedObjects}
            walls={walls}
            zones={zones}
            violations={clearanceViolations}
            pxPerM={pxPerM}
            gridSnapM={gridSnapM}
            selectedObjectId={selectedObjectId}
            onSelect={selectObject}
            onMove={moveObject}
          />
        </Layer>
      </Stage>

      <ViolationsList violations={violations} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSaveClick}
          className="min-h-11 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          {confirmingSave ? 'Save anyway' : 'Save'}
        </button>
        {confirmingSave && (
          <button
            type="button"
            onClick={() => setConfirmingSave(false)}
            className="min-h-11 rounded border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
