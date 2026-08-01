'use client';

import { Line, Text } from 'react-konva';
import type { WallSegment, DoorPlacement } from '@/lib/spatial/types.ts';
import { wallSegmentsWithDoorGap } from '@/lib/spatial/geometry.ts';

type Props = {
  walls: WallSegment[];
  doors: DoorPlacement[];
  pxPerM: number;
  doorTool: boolean;
  onWallClick: (wall: WallSegment, xM: number, yM: number) => void;
};

export default function WallLayer({ walls, doors, pxPerM, doorTool, onWallClick }: Props) {
  return (
    <>
      {walls.map((wall) => {
        const door = doors.find((d) => d.wallId === wall.id);
        const segments = wallSegmentsWithDoorGap(wall, door);
        return segments.map((seg, i) => (
          <Line
            key={`${wall.id}-${i}`}
            points={[seg.start.x * pxPerM, seg.start.y * pxPerM, seg.end.x * pxPerM, seg.end.y * pxPerM]}
            stroke="#334155"
            strokeWidth={Math.max(2, wall.thicknessM * pxPerM)}
            lineCap="square"
            hitStrokeWidth={16}
            onClick={(e) => {
              if (!doorTool) return;
              const stage = e.target.getStage();
              const pos = stage?.getPointerPosition();
              if (!pos) return;
              onWallClick(wall, pos.x / pxPerM, pos.y / pxPerM);
            }}
            listening={doorTool}
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
