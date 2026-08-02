// Clearance-violation detection — pure, framework-free (used by both 2D editor
// warnings and the pre-save "unresolved violations" gate).
// ponytail: circle-vs-circle and circle-vs-segment distance checks, not full
// polygon intersection — fine for the coarse warning UI this feeds.

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

export function computeClearanceViolations(
  objects: PlacedObject[],
  walls: WallSegment[],
): Set<string> {
  const violated = new Set<string>();

  for (const obj of objects) {
    const r = obj.clearanceRadiusM;
    if (!r) continue;

    for (const wall of walls) {
      if (distPointToSegment({ x: obj.x, y: obj.y }, wall.start, wall.end) < r + wall.thicknessM / 2) {
        violated.add(obj.id);
      }
    }

    for (const other of objects) {
      if (other.id === obj.id) continue;
      const otherR = other.clearanceRadiusM ?? 0;
      const dist = Math.hypot(obj.x - other.x, obj.y - other.y);
      if (dist < r + otherR) violated.add(obj.id);
    }
  }

  return violated;
}
