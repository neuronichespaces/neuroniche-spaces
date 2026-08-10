'use client';

import { Line, Text } from 'react-konva';
import type { WallSegment, DoorPlacement, Layer as LayerEntity } from '@/lib/spatial/types.ts';
import { wallSegmentsWithDoorGap } from '@/lib/spatial/geometry.ts';
import { isEffectivelyVisible, layerFor } from '@/lib/spatial/layers.ts';

type Props = {
  walls: WallSegment[];
  doors: DoorPlacement[];
  pxPerM: number;
  doorTool: boolean;
  onWallClick: (wall: WallSegment, xM: number, yM: number) => void;
  /** Id of the currently-selected wall, for the numeric wall inspector (CAD-upgrade
   *  Milestone 1) — visually distinguished the same way ObjectLayer marks a selected
   *  object. Undefined/omitted on non-interactive instances (e.g. the in-progress
   *  draft-wall preview), which also disables selection clicks entirely. */
  selectedWallId?: string;
  /** Fires on click when doorTool is off — separate from onWallClick (door placement)
   *  so the two click intents can never be confused. Omit to disable selection clicks
   *  (used for the draft-wall preview instance). */
  onWallSelect?: (wallId: string) => void;
  /** CAD-upgrade Gap 4: layer visibility applies to walls too — optional so the
   *  draft-wall preview instance (which passes no layers) renders unconditionally. */
  layers?: LayerEntity[];
};

export default function WallLayer({ walls, doors, pxPerM, doorTool, onWallClick, selectedWallId, onWallSelect, layers }: Props) {
  const visibleWalls = layers ? walls.filter((wall) => isEffectivelyVisible(wall, layers)) : walls;
  return (
    <>
      {visibleWalls.map((wall) => {
        const door = doors.find((d) => d.wallId === wall.id);
        const segments = wallSegmentsWithDoorGap(wall, door);
        const selected = wall.id === selectedWallId;
        const layerColor = layers ? layerFor(wall, layers)?.color : undefined;
        return segments.map((seg, i) => (
          <Line
            key={`${wall.id}-${i}`}
            points={[seg.start.x * pxPerM, seg.start.y * pxPerM, seg.end.x * pxPerM, seg.end.y * pxPerM]}
            stroke={selected ? '#2563eb' : (layerColor ?? '#334155')}
            strokeWidth={Math.max(2, wall.thicknessM * pxPerM) + (selected ? 2 : 0)}
            lineCap="square"
            hitStrokeWidth={16}
            onClick={(e) => {
              if (doorTool) {
                const stage = e.target.getStage();
                const pos = stage?.getPointerPosition();
                if (!pos) return;
                onWallClick(wall, pos.x / pxPerM, pos.y / pxPerM);
                return;
              }
              onWallSelect?.(wall.id);
            }}
            listening={doorTool || !!onWallSelect}
          />
        ));
      })}
    </>
  );
}

export function WallDimensionLabel({
  start,
  end,
  pxPerM,
}: {
  start: { x: number; y: number };
  end: { x: number; y: number };
  pxPerM: number;
}) {
  const lenM = Math.hypot(end.x - start.x, end.y - start.y);
  const midX = ((start.x + end.x) / 2) * pxPerM;
  const midY = ((start.y + end.y) / 2) * pxPerM;
  return (
    <Text
      x={midX + 6}
      y={midY - 14}
      text={`${lenM.toFixed(1)}m`}
      fontSize={13}
      fill="#0f172a"
      listening={false}
    />
  );
}
