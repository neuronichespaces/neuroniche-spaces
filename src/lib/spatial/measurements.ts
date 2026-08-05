// Measurement tool (milestone brief §"Measure distances"/"Measure clearances"): pure
// functions the 2D/3D UI can call to display live distance/clearance readouts.

import type { Point, WallSegment } from './types.ts';
import { nearestWall } from './spatialIndex.ts';

export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Clear distance from `point` to the nearest wall's surface (centreline distance minus half its thickness). */
export function clearanceToNearestWall(point: Point, walls: WallSegment[]): { wall: WallSegment; clearanceM: number } | null {
  const near = nearestWall(point, walls);
  if (!near) return null;
  return { wall: near.wall, clearanceM: Math.max(0, near.distanceM - near.wall.thicknessM / 2) };
}
