'use client';

import { Circle, Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { PlacedObject, WallSegment } from '@/lib/spatial/types.ts';
import { snapObjectPosition } from '@/lib/spatial/geometry.ts';

type Props = {
  objects: PlacedObject[];
  walls: WallSegment[];
  violations: Set<string>;
  pxPerM: number;
  gridSnapM: number;
  wallSnapThresholdM: number;
  selectedObjectId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, xM: number, yM: number) => void;
};

export default function ObjectLayer({
  objects,
  walls,
  violations,
  pxPerM,
  gridSnapM,
  wallSnapThresholdM,
  selectedObjectId,
  onSelect,
  onMove,
}: Props) {
  return (
    <>
      {objects.map((obj) => {
        const violated = violations.has(obj.id);
        const wPx = obj.footprintM.w * pxPerM;
        const lPx = obj.footprintM.l * pxPerM;
        return (
          <Group key={obj.id}>
            {obj.clearanceRadiusM != null && (
              <Circle
                x={obj.x * pxPerM}
                y={obj.y * pxPerM}
                radius={obj.clearanceRadiusM * pxPerM}
                fill={violated ? 'rgba(220,38,38,0.15)' : 'rgba(59,130,246,0.12)'}
                stroke={violated ? '#dc2626' : '#3b82f6'}
                strokeWidth={1}
                listening={false}
              />
            )}
            <Group
              x={obj.x * pxPerM}
              y={obj.y * pxPerM}
              rotation={obj.rotationDeg}
              draggable
              onClick={() => onSelect(obj.id)}
              onTap={() => onSelect(obj.id)}
              onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                const node = e.target;
                const rawXM = node.x() / pxPerM;
                const rawYM = node.y() / pxPerM;
                const snapped = snapObjectPosition(obj, rawXM, rawYM, walls, gridSnapM, wallSnapThresholdM);
                onMove(obj.id, snapped.x, snapped.y);
              }}
            >
              <Rect
                x={-wPx / 2}
                y={-lPx / 2}
                width={wPx}
                height={lPx}
                fill={violated ? '#fee2e2' : '#e2e8f0'}
                stroke={violated ? '#dc2626' : selectedObjectId === obj.id ? '#2563eb' : '#64748b'}
                strokeWidth={selectedObjectId === obj.id ? 2 : 1}
                cornerRadius={2}
              />
              <Text
                text={obj.productId}
                x={-wPx / 2}
                y={-8}
                width={wPx}
                align="center"
                fontSize={11}
                fill="#0f172a"
                listening={false}
              />
              {violated && (
                <Text
                  text="⚠"
                  x={-wPx / 2}
                  y={-lPx / 2 - 16}
                  width={wPx}
                  align="center"
                  fontSize={14}
                  fill="#dc2626"
                  listening={false}
                />
              )}
            </Group>
          </Group>
        );
      })}
    </>
  );
}
