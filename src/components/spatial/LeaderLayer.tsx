// Gap 6 (leaders/callouts): renders the canonical Leader entities (see types.ts) — a
// line from the anchor point to the label point, with the free text drawn at the
// label point. Purely a view over store data, same "no render-only annotations" rule
// as DimensionLayer.tsx.
'use client';

import { Fragment } from 'react';
import { Circle, Line, Text } from 'react-konva';
import type { Leader, Layer as LayerEntity } from '@/lib/spatial/types.ts';
import { isEffectivelyVisible } from '@/lib/spatial/layers.ts';

type Props = {
  leaders: Leader[];
  pxPerM: number;
  selectedLeaderId?: string;
  onSelect?: (id: string) => void;
  layers?: LayerEntity[];
};

export default function LeaderLayer({ leaders, pxPerM, selectedLeaderId, onSelect, layers }: Props) {
  const visibleLeaders = layers ? leaders.filter((l) => isEffectivelyVisible(l, layers)) : leaders;
  return (
    <>
      {visibleLeaders.map((leader) => {
        const selected = leader.id === selectedLeaderId;
        const stroke = selected ? '#2563eb' : '#0f172a';
        const ax = leader.anchor.x * pxPerM;
        const ay = leader.anchor.y * pxPerM;
        const lx = leader.labelPoint.x * pxPerM;
        const ly = leader.labelPoint.y * pxPerM;
        return (
          <Fragment key={leader.id}>
            <Circle x={ax} y={ay} radius={3} fill={stroke} listening={false} />
            <Line
              points={[ax, ay, lx, ly]}
              stroke={stroke}
              strokeWidth={selected ? 2 : 1}
              hitStrokeWidth={12}
              onClick={() => onSelect?.(leader.id)}
              listening={!!onSelect}
            />
            <Text
              x={lx + 4}
              y={ly - 8}
              text={leader.text}
              fontSize={12}
              fill="#0f172a"
              padding={2}
              onClick={() => onSelect?.(leader.id)}
              listening={!!onSelect}
            />
          </Fragment>
        );
      })}
    </>
  );
}
