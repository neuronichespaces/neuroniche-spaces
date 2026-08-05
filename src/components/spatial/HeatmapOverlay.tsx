'use client';

// GIS-style floor overlay for heatmap.ts's grid (milestone brief §13). Canvas rects, not
// GPU textures/shaders — matches the CPU-heatmap scope decision already recorded in
// heatmap.ts and the milestone doc (no compute pipeline in this app, no room size that
// would need one). One coloured rect per grid cell; React/Konva batches this fine at the
// cell counts a 0.2m grid produces for a room this size.

import { Rect } from 'react-konva';
import type { HeatmapGrid } from '@/lib/spatial/heatmap.ts';
import type { SensoryCategory } from '@/lib/spatial/heatmap.ts';

// Same saturating curve as scoring.ts's stimulationPenalty — 0 (no field) to ~100 (heavily saturated).
function intensityToOpacity(value: number): number {
  return Math.min(0.55, (1 - Math.exp(-value / 4)) * 0.55);
}

export default function HeatmapOverlay({
  grid,
  category,
  pxPerM,
}: {
  grid: HeatmapGrid;
  category: SensoryCategory | 'crowding';
  pxPerM: number;
}) {
  const cellPx = grid.cellSizeM * pxPerM;
  return (
    <>
      {grid.cells.map((row, r) =>
        row.map((cell, c) => {
          const value = cell[category];
          if (value <= 0) return null;
          return (
            <Rect
              key={`${r}-${c}`}
              x={c * cellPx}
              y={r * cellPx}
              width={cellPx}
              height={cellPx}
              fill="#dc2626"
              opacity={intensityToOpacity(value)}
              listening={false}
            />
          );
        }),
      )}
    </>
  );
}
