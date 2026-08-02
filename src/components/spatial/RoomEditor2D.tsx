'use client';

// Top-down 2D room editor. Reads/writes exclusively through useRoomLayoutStore
// so this view and the future Phase-3 3D viewer can never desync — all wall/
// object/door state lives in the store; the only local state here is
// transient UI (active tool, in-progress wall drag, save confirmation).

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type Konva from 'konva';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import type { WallSegment } from '@/lib/spatial/types.ts';
import { snapPointToGrid, projectPointToSegment, wallLengthM, clampPointToBounds } from '@/lib/spatial/geometry.ts';
import WallLayer, { WallDimensionLabel } from './WallLayer.tsx';
import ObjectLayer from './ObjectLayer.tsx';

const DEFAULT_GRID_SNAP_M = 0.1;
const DEFAULT_WALL_SNAP_THRESHOLD_M = 0.15;
const DEFAULT_DOOR_WIDTH_M = 0.9;
const PX_PER_M = 60;
const WALL_THICKNESS_M = 0.1;

type Tool = 'select' | 'wall' | 'door';

type Props = {
  gridSnapM?: number;
  wallSnapThresholdM?: number;
  pxPerM?: number;
  onSave?: () => void;
};

export default function RoomEditor2D({
  gridSnapM = DEFAULT_GRID_SNAP_M,
  wallSnapThresholdM = DEFAULT_WALL_SNAP_THRESHOLD_M,
  pxPerM = PX_PER_M,
  onSave,
}: Props) {
  const walls = useRoomLayoutStore((s) => s.walls);
  const doors = useRoomLayoutStore((s) => s.doors);
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const clearanceViolations = useRoomLayoutStore((s) => s.clearanceViolations);
  const selectedObjectId = useRoomLayoutStore((s) => s.selectedObjectId);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const addWall = useRoomLayoutStore((s) => s.addWall);
  const addDoor = useRoomLayoutStore((s) => s.addDoor);
  const moveObject = useRoomLayoutStore((s) => s.moveObject);
  const selectObject = useRoomLayoutStore((s) => s.selectObject);

  const [tool, setTool] = useState<Tool>('select');
  const [draftWall, setDraftWall] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(
    null,
  );
  const [confirmingSave, setConfirmingSave] = useState(false);

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
    if (tool !== 'wall') return;
    const p = pointerMetres();
    if (!p) return;
    const snapped = clampPointToBounds(snapPointToGrid(p, gridSnapM), floorDims.widthM, floorDims.lengthM);
    setDraftWall({ start: snapped, current: snapped });
  }

  function handleStageMove() {
    if (tool !== 'wall' || !draftWall) return;
    const p = pointerMetres();
    if (!p) return;
    const clamped = clampPointToBounds(snapPointToGrid(p, gridSnapM), floorDims.widthM, floorDims.lengthM);
    setDraftWall({ ...draftWall, current: clamped });
  }

  function handleStageUp() {
    if (tool !== 'wall' || !draftWall) return;
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
        {(['select', 'wall', 'door'] as Tool[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTool(t);
              setDraftWall(null);
            }}
            className={`min-h-11 min-w-11 rounded border px-3 py-2 text-sm capitalize ${
              tool === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
        <span className="text-xs text-slate-500">
          {tool === 'wall' && 'Click and drag to draw a wall.'}
          {tool === 'door' && 'Click a wall to place a 0.9m door.'}
          {tool === 'select' && 'Drag objects to reposition them, or press Tab to select one and use the arrow keys to move it.'}
        </span>
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
            violations={clearanceViolations}
            pxPerM={pxPerM}
            gridSnapM={gridSnapM}
            wallSnapThresholdM={wallSnapThresholdM}
            selectedObjectId={selectedObjectId}
            onSelect={selectObject}
            onMove={moveObject}
          />
        </Layer>
      </Stage>

      <div className="flex items-center gap-2">
        {clearanceViolations.size > 0 && (
          <span className="text-xs text-red-600">
            {clearanceViolations.size} object{clearanceViolations.size === 1 ? '' : 's'} need{clearanceViolations.size === 1 ? 's' : ''} more
            space around {clearanceViolations.size === 1 ? 'it' : 'them'}.
          </span>
        )}
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
