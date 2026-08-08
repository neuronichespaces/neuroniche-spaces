'use client';

import { useEffect, useRef } from 'react';
import { Circle, Group, Rect, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { PlacedObject, WallSegment, Zone, Layer } from '@/lib/spatial/types.ts';
import { computeBestSnap } from '@/lib/spatial/snapEngine.ts';
import { clearanceToNearestWall } from '@/lib/spatial/measurements.ts';
import { isEffectivelyVisible, isEffectivelyLocked } from '@/lib/spatial/layers.ts';

const MIN_DIM_M = 0.2;

type Props = {
  objects: PlacedObject[];
  walls: WallSegment[];
  zones: Zone[];
  /** CAD-upgrade Gap 4: layer visibility/lock applies on top of each object's own
   *  locked/hidden flags — see layers.ts's isEffectivelyVisible/isEffectivelyLocked. */
  layers: Layer[];
  violations: Set<string>;
  pxPerM: number;
  gridSnapM: number;
  selectedObjectId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, xM: number, yM: number) => void;
  onRotate: (id: string, rotationDeg: number) => void;
  onResize: (id: string, widthM: number, depthM: number) => void;
};

export default function ObjectLayer({
  objects,
  walls,
  zones,
  layers,
  violations,
  pxPerM,
  gridSnapM,
  selectedObjectId,
  onSelect,
  onMove,
  onRotate,
  onResize,
}: Props) {
  const groupRefs = useRef<Record<string, Konva.Group>>({});
  const transformerRef = useRef<Konva.Transformer>(null);

  // Attach the Transformer's handles to whichever object group is selected — Konva's
  // pattern (a single shared Transformer node re-targeted) rather than one per object.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const selected = selectedObjectId ? objects.find((o) => o.id === selectedObjectId) : null;
    const node = selected && !isEffectivelyLocked(selected, layers) && isEffectivelyVisible(selected, layers) ? groupRefs.current[selected.id] : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedObjectId, objects, layers]);

  const selectedObj = objects.find((o) => o.id === selectedObjectId) ?? null;
  const selectedClearance = selectedObj ? clearanceToNearestWall({ x: selectedObj.x, y: selectedObj.y }, walls) : null;

  return (
    <>
      {objects.filter((obj) => isEffectivelyVisible(obj, layers)).map((obj) => {
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
              ref={(node) => {
                if (node) groupRefs.current[obj.id] = node;
                else delete groupRefs.current[obj.id];
              }}
              x={obj.x * pxPerM}
              y={obj.y * pxPerM}
              rotation={obj.rotationDeg}
              draggable={!isEffectivelyLocked(obj, layers)}
              onClick={() => onSelect(obj.id)}
              onTap={() => onSelect(obj.id)}
              onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                const node = e.target;
                const rawXM = node.x() / pxPerM;
                const rawYM = node.y() / pxPerM;
                const best = computeBestSnap(
                  { x: rawXM, y: rawYM },
                  { gridM: gridSnapM, walls, zones, objects, footprintM: obj.footprintM, excludeObjectId: obj.id },
                );
                onMove(obj.id, best.point.x, best.point.y);
              }}
              onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
                const node = e.target as Konva.Group;
                onRotate(obj.id, Math.round(node.rotation()));
                // Konva's Transformer scales the node rather than resizing children live;
                // bake the scale into the stored footprint (metres) and reset scale to 1,
                // same pattern as the library's own resize-via-Transformer example.
                const newWidthM = Math.max(MIN_DIM_M, (obj.footprintM.w * node.scaleX()));
                const newDepthM = Math.max(MIN_DIM_M, (obj.footprintM.l * node.scaleY()));
                node.scaleX(1);
                node.scaleY(1);
                onResize(obj.id, newWidthM, newDepthM);
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
      <Transformer
        ref={transformerRef}
        rotateEnabled
        enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        boundBoxFunc={(oldBox, newBox) =>
          newBox.width < MIN_DIM_M * pxPerM || newBox.height < MIN_DIM_M * pxPerM ? oldBox : newBox
        }
      />
      {selectedObj && (
        <Text
          x={selectedObj.x * pxPerM - selectedObj.footprintM.w * pxPerM / 2}
          y={selectedObj.y * pxPerM + selectedObj.footprintM.l * pxPerM / 2 + 6}
          width={Math.max(selectedObj.footprintM.w * pxPerM, 120)}
          text={`${selectedObj.footprintM.w.toFixed(2)}m × ${selectedObj.footprintM.l.toFixed(2)}m${
            selectedClearance ? `  ·  ${selectedClearance.clearanceM.toFixed(2)}m to wall` : ''
          }`}
          fontSize={11}
          fill="#334155"
          listening={false}
        />
      )}
    </>
  );
}
