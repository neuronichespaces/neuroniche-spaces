// Dynamic snap engine (milestone brief §10): weighted-scoring candidate selection,
// not first-match. Extends geometry.ts's existing single-best-guess snap (grid, then
// wall-flush) into multiple scored candidates — grid/wall/corner/object-alignment/zone —
// with the highest score applied. geometry.ts's functions stay as-is and are reused here
// rather than duplicated (wallLengthM, projectPointToSegment, snapObjectToNearestWall).

import type { Point, WallSegment, Zone, PlacedObject } from './types.ts';
import { snapPointToGrid, snapObjectToNearestWall } from './geometry.ts';
import { pointInFootprint, zoneFootprint } from './anchors.ts';

export type SnapCandidateType = 'grid' | 'wall' | 'corner' | 'objectAlign' | 'zone';

export type SnapCandidate = {
  type: SnapCandidateType;
  point: Point;
  score: number;
};

export type SnapContext = {
  gridM: number;
  walls: WallSegment[];
  zones: Zone[];
  objects: PlacedObject[];
  footprintM: { w: number; l: number };
  excludeObjectId?: string;
};

const WALL_SNAP_THRESHOLD_M = 0.3;
const CORNER_SNAP_THRESHOLD_M = 0.25;
const ALIGN_THRESHOLD_M = 0.15;
const ZONE_PULL_THRESHOLD_M = 0.2;

// Weights, per the brief's "score = distanceWeight + alignmentWeight + constraintScore +
// neuroScore" formula. Kept as named constants (not magic numbers) so a future tuning
// pass has one place to adjust behaviour without hunting through the scoring logic.
const W = {
  distanceBase: 100, // candidates start here and lose points with distance from the raw point
  cornerBonus: 20, // corners are more useful anchors than a mid-wall flush point
  alignBonus: 15, // aligning with another object's edge (visual tidiness)
  zoneBonus: 10, // landing inside a zone is mildly preferred (zone-first planning, brief §4)
};

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function scoreByDistance(raw: Point, candidate: Point, bonus = 0): number {
  return W.distanceBase - distance(raw, candidate) * 40 + bonus;
}

function gridCandidate(raw: Point, ctx: SnapContext): SnapCandidate {
  const point = snapPointToGrid(raw, ctx.gridM);
  return { type: 'grid', point, score: scoreByDistance(raw, point) };
}

function wallCandidates(raw: Point, ctx: SnapContext): SnapCandidate[] {
  const out: SnapCandidate[] = [];
  const flush = snapObjectToNearestWall(raw.x, raw.y, ctx.footprintM, ctx.walls, WALL_SNAP_THRESHOLD_M);
  if (flush.x !== raw.x || flush.y !== raw.y) {
    out.push({ type: 'wall', point: flush, score: scoreByDistance(raw, flush) });
  }
  for (const wall of ctx.walls) {
    for (const corner of [wall.start, wall.end]) {
      if (distance(raw, corner) <= CORNER_SNAP_THRESHOLD_M) {
        out.push({ type: 'corner', point: corner, score: scoreByDistance(raw, corner, W.cornerBonus) });
      }
    }
  }
  return out;
}

// Align with the nearest other object's centre on whichever axis is closer — a cheap
// stand-in for full edge-to-edge alignment (brief's "Desk edge aligns with Cabinet edge"),
// sufficient for MVP object counts; revisit with true anchor-to-anchor matching (anchors.ts)
// if users need edge, not centre, alignment.
function objectAlignCandidates(raw: Point, ctx: SnapContext): SnapCandidate[] {
  const out: SnapCandidate[] = [];
  for (const obj of ctx.objects) {
    if (obj.id === ctx.excludeObjectId) continue;
    if (Math.abs(obj.x - raw.x) <= ALIGN_THRESHOLD_M) {
      const point = { x: obj.x, y: raw.y };
      out.push({ type: 'objectAlign', point, score: scoreByDistance(raw, point, W.alignBonus) });
    }
    if (Math.abs(obj.y - raw.y) <= ALIGN_THRESHOLD_M) {
      const point = { x: raw.x, y: obj.y };
      out.push({ type: 'objectAlign', point, score: scoreByDistance(raw, point, W.alignBonus) });
    }
  }
  return out;
}

// Pull gently toward a zone's centre when already close to/inside it — zone-first
// planning means placement inside the intended zone should feel slightly "sticky".
function zoneCandidates(raw: Point, ctx: SnapContext): SnapCandidate[] {
  const out: SnapCandidate[] = [];
  for (const zone of ctx.zones) {
    const inside = pointInFootprint(raw, zoneFootprint(zone));
    const centreDist = distance(raw, { x: zone.x, y: zone.y });
    if (inside || centreDist <= ZONE_PULL_THRESHOLD_M) {
      out.push({ type: 'zone', point: raw, score: scoreByDistance(raw, raw, W.zoneBonus) });
    }
  }
  return out;
}

/** Evaluates every candidate type and returns the highest-scoring one — brief §10's
 *  "always choose highest-score candidate", not first-match. */
export function computeBestSnap(raw: Point, ctx: SnapContext): SnapCandidate {
  const candidates: SnapCandidate[] = [
    gridCandidate(raw, ctx),
    ...wallCandidates(raw, ctx),
    ...objectAlignCandidates(raw, ctx),
    ...zoneCandidates(raw, ctx),
  ];
  return candidates.reduce((best, c) => (c.score > best.score ? c : best));
}
