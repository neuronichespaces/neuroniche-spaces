// Neuroinclusive rule engine (milestone brief §12): turns the heatmap grid into the
// brief's named scores. Scoped to the 3 scores that map cleanly onto data this app
// actually has (the 5-category sensory grid + zone kind) — Accessibility Score already
// exists as constraints.ts's violation list, and Movement/Cognitive-Load Score need the
// movement/visibility graphs (Phase 2 UI + Phase 4 persona work) to mean anything real,
// so they're not faked here with arbitrary numbers.
// ponytail: linear 0-100 heuristic, not a validated psychometric model — this is a
// planning aid, not a clinical instrument (matches the ASPECTSS audit's own framing in
// src/lib/aspectss/score.ts: "guidance, not a certification").

import type { HeatCell, HeatmapGrid, SensoryCategory } from './heatmap.ts';
import { sampleGrid } from './heatmap.ts';
import type { Zone, ZoneKind } from './types.ts';

export type ZoneScore = {
  zoneId: string;
  calmScore: number; // 0-100, higher = calmer (low noise/light/movement stimulation)
  focusScore: number; // 0-100, higher = better supports sustained attention
  regulationScore: number; // 0-100, higher = better supports sensory self-regulation
};

// What each zone kind is "for", in terms of the 5-category field it should keep low.
// Not every category is meaningful for every kind — omitted categories aren't penalised.
const ZONE_SUPPRESS_TARGETS: Partial<Record<ZoneKind, SensoryCategory[]>> = {
  calm: ['noise', 'light', 'movement'],
  focus: ['noise', 'movement'],
  regulation: ['noise', 'light'],
  sensory_support: ['noise', 'light'],
  reflection: ['noise', 'movement'],
};

// Higher field value = more stimulation present = worse for a suppress-target category.
// Field values from heatmap.ts are unbounded (sum of intensity/distance²), so this maps
// them onto 0-100 via a saturating curve rather than a hard cap that clips silently.
function stimulationPenalty(fieldValue: number): number {
  return 100 * (1 - Math.exp(-fieldValue / 4));
}

function averageFieldOverZone(grid: HeatmapGrid, zone: Zone, field: keyof HeatCell): number {
  const halfW = zone.widthM / 2;
  const halfL = zone.lengthM / 2;
  const samples: number[] = [];
  const step = grid.cellSizeM;
  for (let x = zone.x - halfW; x <= zone.x + halfW; x += step) {
    for (let y = zone.y - halfL; y <= zone.y + halfL; y += step) {
      samples.push(sampleGrid(grid, { x, y })[field]);
    }
  }
  if (samples.length === 0) samples.push(sampleGrid(grid, { x: zone.x, y: zone.y })[field]);
  return samples.reduce((a, b) => a + b, 0) / samples.length;
}

export function scoreZone(zone: Zone, grid: HeatmapGrid): ZoneScore {
  const targets = ZONE_SUPPRESS_TARGETS[zone.kind] ?? ['noise', 'light', 'movement'];
  const penalties = targets.map((category) => stimulationPenalty(averageFieldOverZone(grid, zone, category)));
  const avgPenalty = penalties.reduce((a, b) => a + b, 0) / penalties.length;

  const calmScore = Math.round(100 - avgPenalty);
  // Focus additionally penalises crowding (distraction from other people/objects nearby).
  const crowding = averageFieldOverZone(grid, zone, 'crowding');
  const focusScore = Math.round(Math.max(0, calmScore - crowding * 5));
  // Regulation cares about touch/pressure support (weighted blankets, compression seating
  // etc. are typically *positive* sensoryProfile values in that category, which push the
  // field up — for regulation-support equipment that's wanted, not stimulation to suppress).
  const regulationSupport = averageFieldOverZone(grid, zone, 'pressure');
  const regulationScore = Math.round(Math.min(100, calmScore * 0.6 + Math.min(regulationSupport, 40)));

  return { zoneId: zone.id, calmScore, focusScore, regulationScore };
}

export function scoreAllZones(zones: Zone[], grid: HeatmapGrid): ZoneScore[] {
  return zones.map((zone) => scoreZone(zone, grid));
}
