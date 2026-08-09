// Gap 6 (manual dimension annotations): renders the canonical Dimension entities
// (see types.ts) — extension lines from the measured points out to the offset
// dimension line, the dimension line itself, and a length label. Purely a view over
// store data; the model entity (not this rendering) is what makes it a real
// annotation, per the foundation spec's "no render-only annotations" rule.
'use client';

import { Fragment } from 'react';
import { Line, Text } from 'react-konva';
import type { Dimension, Layer as LayerEntity } from '@/lib/spatial/types.ts';
import { offsetLine } from '@/lib/spatial/geometry.ts';
import { formatMetres } from '@/lib/spatial/units.ts';
import { isEffectivelyVisible } from '@/lib/spatial/layers.ts';

type Props = {
  dimensions: Dimension[];
  pxPerM: number;
  selectedDimensionId?: string;
  onSelect?: (id: string) => void;
  /** CAD-upgrade Gap 4: layer visibility applies to dimensions too. Optional so
   *  callers that don't care about layers can omit it. */
  layers?: LayerEntity[];
};

export default function DimensionLayer({ dimensions, pxPerM, selectedDimensionId, onSelect, layers }: Props) {
  const visibleDimensions = layers ? dimensions.filter((dim) => isEffectivelyVisible(dim, layers)) : dimensions;
  return (
    <>
      {visibleDimensions.map((dim) => {
        const lengthM = Math.hypot(dim.end.x - dim.start.x, dim.end.y - dim.start.y);
        const line = offsetLine(dim.start, dim.end, dim.offsetM);
        const selected = dim.id === selectedDimensionId;
        const stroke = selected ? '#2563eb' : '#0f172a';
        const midX = ((line.start.x + line.end.x) / 2) * pxPerM;
        const midY = ((line.start.y + line.end.y) / 2) * pxPerM;
        return (
          <Fragment key={dim.id}>
            <Line
              points={[dim.start.x * pxPerM, dim.start.y * pxPerM, line.start.x * pxPerM, line.start.y * pxPerM]}
              stroke={stroke}
              strokeWidth={1}
              listening={false}
            />
            <Line
              points={[dim.end.x * pxPerM, dim.end.y * pxPerM, line.end.x * pxPerM, line.end.y * pxPerM]}
              stroke={stroke}
              strokeWidth={1}
              listening={false}
            />
            <Line
              points={[line.start.x * pxPerM, line.start.y * pxPerM, line.end.x * pxPerM, line.end.y * pxPerM]}
              stroke={stroke}
              strokeWidth={selected ? 2 : 1.5}
              hitStrokeWidth={12}
              onClick={() => onSelect?.(dim.id)}
              listening={!!onSelect}
            />
            <Text x={midX + 4} y={midY - 14} text={dim.label ?? formatMetres(lengthM)} fontSize={12} fill="#0f172a" listening={false} />
          </Fragment>
        );
      })}
    </>
  );
}
