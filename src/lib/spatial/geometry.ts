// Pure geometry helpers for the 2D room editor: grid snapping, door-cutout
// wall segments, and wall-flush object snapping. Framework-free so it can be
// unit tested with node:test like the rest of src/lib.

import type { Point, WallSegment, DoorPlacement, PlacedObject } from './types.ts';

export function snapToGrid(value: number, gridM: number): number {
  return Math.round(value / gridM) * gridM;
}

export function snapPointToGrid(p: Point, gridM: number): Point {
  return { x: snapToGrid(p.x, gridM), y: snapToGrid(p.y, gridM) };
}

// Clamp a point (in metres) to the floor rect [0, widthM] x [0, lengthM].
// Used when committing/drag-previewing walls so drawing outside the floor
// (the Stage has +80px padding for labels) can't produce out-of-bounds walls.
export function clampPointToBounds(p: Point, widthM: number, lengthM: number): Point {
  return {
    x: Math.max(0, Math.min(widthM, p.x)),
    y: Math.max(0, Math.min(lengthM, p.y)),
  };
}

export function wallLengthM(wall: WallSegment): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
}

// Point at arc-length `offsetM` along the wall, measured from wall.start.
// Works for any straight wall (axis-aligned or angled) — it's linear
// interpolation along the segment, not full polygon geometry.
export function pointOnWallAtOffset(wall: WallSegment, offsetM: number): Point {
  const len = wallLengthM(wall);
  if (len === 0) return wall.start;
  const t = offsetM / len;
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    y: wall.start.y + (wall.end.y - wall.start.y) * t,
  };
}

// Split a wall into the line segments that should actually be drawn once a
// door gap is cut out of it. Returns 2 segments (before/after the door), or
// the original single segment if there's no door on this wall.
export function wallSegmentsWithDoorGap(
  wall: WallSegment,
  door: DoorPlacement | undefined,
): { start: Point; end: Point }[] {
  if (!door) return [{ start: wall.start, end: wall.end }];
  const len = wallLengthM(wall);
  const gapStart = Math.max(0, Math.min(len, door.offsetM));
  const gapEnd = Math.max(0, Math.min(len, door.offsetM + door.widthM));
  const segments: { start: Point; end: Point }[] = [];
  if (gapStart > 0) segments.push({ start: wall.start, end: pointOnWallAtOffset(wall, gapStart) });
  if (gapEnd < len) segments.push({ start: pointOnWallAtOffset(wall, gapEnd), end: wall.end });
  return segments;
}

// Project point p onto segment a-b, clamped to the segment. Returns the
// closest point, the distance to it, and t (0-1 fraction along a-b).
export function projectPointToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { point, t, distance: Math.hypot(p.x - point.x, p.y - point.y) };
}

// If (x,y) is within thresholdM of any wall, snap it flush against that
// wall (offset outward from the wall centreline by half the wall thickness
// plus half the object's footprint depth, on whichever side the point
// already sits).
// ponytail: uses (w+l)/4 as an orientation-agnostic half-depth rather than
// rotating the true footprint rectangle against the wall normal — good
// enough for flush-against-wall placement at MVP; revisit if callers need
// exact rotated-footprint alignment.
export function snapObjectToNearestWall(
  x: number,
  y: number,
  footprintM: { w: number; l: number },
  walls: WallSegment[],
  thresholdM: number,
): Point {
  let best: { point: Point; distance: number } | null = null;
  for (const wall of walls) {
    const proj = projectPointToSegment({ x, y }, wall.start, wall.end);
    if (proj.distance <= thresholdM && (!best || proj.distance < best.distance)) {
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.hypot(dx, dy) || 1;
      // outward normal, oriented toward the original point
      let nx = -dy / len;
      let ny = dx / len;
      const side = (x - proj.point.x) * nx + (y - proj.point.y) * ny;
      if (side < 0) {
        nx = -nx;
        ny = -ny;
      }
      const halfDepth = (footprintM.w + footprintM.l) / 4 + wall.thicknessM / 2;
      best = {
        point: { x: proj.point.x + nx * halfDepth, y: proj.point.y + ny * halfDepth },
        distance: proj.distance,
      };
    }
  }
  return best ? best.point : { x, y };
}

export function snapObjectPosition(
  obj: Pick<PlacedObject, 'footprintM'>,
  x: number,
  y: number,
  walls: WallSegment[],
  gridM: number,
  wallSnapThresholdM: number,
): Point {
  const gridded = snapPointToGrid({ x, y }, gridM);
  return snapObjectToNearestWall(gridded.x, gridded.y, obj.footprintM, walls, wallSnapThresholdM);
}
