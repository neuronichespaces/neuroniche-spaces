// Spatial queries (milestone brief §9). Flat-array + distance filter, not RBush/BVH —
// milestone doc decision: this app's room sizes (≤25 objects per store.ts's own MVP
// comment) are far below where a real spatial index pays for itself. Upgrade path: swap
// these function bodies for an RBush-backed implementation without changing call sites,
// if a room ever needs it.

import type { PlacedObject, WallSegment, Point } from './types.ts';

function distPointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function nearestWall(point: Point, walls: WallSegment[]): { wall: WallSegment; distanceM: number } | null {
  let best: { wall: WallSegment; distanceM: number } | null = null;
  for (const wall of walls) {
    const d = distPointToSegment(point, wall.start, wall.end);
    if (!best || d < best.distanceM) best = { wall, distanceM: d };
  }
  return best;
}

export function nearestObject(
  point: Point,
  objects: PlacedObject[],
  excludeId?: string,
): { object: PlacedObject; distanceM: number } | null {
  let best: { object: PlacedObject; distanceM: number } | null = null;
  for (const obj of objects) {
    if (obj.id === excludeId) continue;
    const d = Math.hypot(point.x - obj.x, point.y - obj.y);
    if (!best || d < best.distanceM) best = { object: obj, distanceM: d };
  }
  return best;
}

export function objectsWithinRadius(point: Point, objects: PlacedObject[], radiusM: number, excludeId?: string): PlacedObject[] {
  return objects.filter((o) => o.id !== excludeId && Math.hypot(point.x - o.x, point.y - o.y) <= radiusM);
}

export function wallsWithinRadius(point: Point, walls: WallSegment[], radiusM: number): WallSegment[] {
  return walls.filter((w) => distPointToSegment(point, w.start, w.end) <= radiusM);
}
