// Parametric object anchors (milestone brief §5): center/front/back/left/right/corners,
// used by the snap engine (Phase 2) and graph/constraint queries (this phase).
// Derived, not stored — an object's anchors are fully determined by its x/y/rotationDeg/
// footprintM, so storing them separately would just be a second source of truth that can
// drift out of sync on every move/rotate. Rotation convention: standard counter-clockwise-
// positive rotation in the room's (x, y) plane, matching Math.cos/sin directly.

import type { PlacedObject, Point, Zone } from './types.ts';

export type AnchorName = 'center' | 'front' | 'back' | 'left' | 'right' | 'frontLeft' | 'frontRight' | 'backLeft' | 'backRight';

function rotate(dx: number, dy: number, rotationDeg: number): Point {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

/** Anchor points for a placed object, or a zone (treated as a footprint the same way). */
export function getAnchors(obj: { x: number; y: number; rotationDeg: number; footprintM: { w: number; l: number } }): Record<AnchorName, Point> {
  const halfW = obj.footprintM.w / 2;
  const halfL = obj.footprintM.l / 2;
  const local: Record<AnchorName, Point> = {
    center: { x: 0, y: 0 },
    front: { x: 0, y: -halfL },
    back: { x: 0, y: halfL },
    left: { x: -halfW, y: 0 },
    right: { x: halfW, y: 0 },
    frontLeft: { x: -halfW, y: -halfL },
    frontRight: { x: halfW, y: -halfL },
    backLeft: { x: -halfW, y: halfL },
    backRight: { x: halfW, y: halfL },
  };
  const out = {} as Record<AnchorName, Point>;
  for (const [name, p] of Object.entries(local) as [AnchorName, Point][]) {
    const r = rotate(p.x, p.y, obj.rotationDeg);
    out[name] = { x: obj.x + r.x, y: obj.y + r.y };
  }
  return out;
}

/** True if `point` falls within `footprint`'s rotated rectangle — used for zone containment. */
export function pointInFootprint(point: Point, footprint: { x: number; y: number; rotationDeg: number; footprintM: { w: number; l: number } }): boolean {
  // Inverse-rotate the point into the footprint's local frame, then a plain AABB check.
  const local = rotate(point.x - footprint.x, point.y - footprint.y, -footprint.rotationDeg);
  return Math.abs(local.x) <= footprint.footprintM.w / 2 && Math.abs(local.y) <= footprint.footprintM.l / 2;
}

export function objectFootprint(obj: PlacedObject) {
  return { x: obj.x, y: obj.y, rotationDeg: obj.rotationDeg, footprintM: obj.footprintM };
}

export function zoneFootprint(zone: Zone) {
  return { x: zone.x, y: zone.y, rotationDeg: zone.rotationDeg, footprintM: { w: zone.widthM, l: zone.lengthM } };
}
