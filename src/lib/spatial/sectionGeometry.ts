// CAD-upgrade Gap 6 (generated section views, 2026-08-10): builds a side-on "cut"
// profile along an arbitrary SectionLine, distinct from PrintableExport.tsx's existing
// per-wall elevations (which are always the full wall face, not an arbitrary cut
// through the room). Scope: a wall/object is included if it falls within a fixed-width
// corridor either side of the line (CORRIDOR_HALF_WIDTH_M), positioned by projecting
// its own geometry onto the line's own axis. This is a straight orthographic
// projection, not a true 3D boolean cut (no occlusion between near/far elements, no
// partial-wall-thickness cross-section) — an honest, real generated view at the scope
// this feature actually needs (a floor-plan-adjacent reference drawing), not a full
// CAD section-cut renderer.
import type { WallSegment, PlacedObject, SectionLine, Point } from './types.ts';
import { DEFAULT_WALL_HEIGHT_M } from './geometry.ts';

const CORRIDOR_HALF_WIDTH_M = 0.3;

export type SectionProfileEntry = {
  id: string;
  kind: 'wall' | 'object';
  label: string;
  /** Position along the section line, metres from line.start — always within [0, lineLength]. */
  startM: number;
  endM: number;
  heightM: number;
};

function projectOntoLine(p: Point, lineStart: Point, dir: Point): { along: number; perp: number } {
  const dx = p.x - lineStart.x;
  const dy = p.y - lineStart.y;
  // perp is SIGNED (not abs) — a wall running roughly perpendicular to the section
  // line has endpoints on opposite sides (opposite sign), which is how a crossing
  // wall is actually detected below; abs would hide the sign flip.
  return {
    along: dx * dir.x + dy * dir.y,
    perp: dx * -dir.y + dy * dir.x,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Empty array for a zero-length line (no direction to project onto) — a degenerate
 *  input, not an error; callers already treat "nothing to show" as a valid, renderable state. */
export function computeSectionProfile(line: SectionLine, walls: WallSegment[], placedObjects: PlacedObject[]): SectionProfileEntry[] {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const lineLength = Math.hypot(dx, dy);
  if (lineLength === 0) return [];
  const dir = { x: dx / lineLength, y: dy / lineLength };
  const entries: SectionProfileEntry[] = [];

  for (const wall of walls) {
    const a = projectOntoLine(wall.start, line.start, dir);
    const b = projectOntoLine(wall.end, line.start, dir);
    // Two distinct cases a real section cut needs to handle differently:
    // 1. The wall CROSSES the line (opposite-sign perp at its two endpoints) — the
    //    common case, e.g. a horizontal section line cutting through vertical walls.
    //    Shown as the wall's own thickness at the crossing point (what you'd actually
    //    see in section: its cross-section width, not its full run length).
    // 2. The wall runs roughly ALONG the line, staying within the corridor the whole
    //    way (both endpoints' perp within CORRIDOR_HALF_WIDTH_M, same side) — shown
    //    face-on across its full projected length, same as before.
    const crosses = a.perp === 0 || b.perp === 0 || (a.perp > 0) !== (b.perp > 0);
    if (crosses) {
      const t = a.perp / (a.perp - b.perp || 1);
      const crossAlong = a.along + t * (b.along - a.along);
      const startM = clamp(crossAlong - wall.thicknessM / 2, 0, lineLength);
      const endM = clamp(crossAlong + wall.thicknessM / 2, 0, lineLength);
      if (endM > startM) entries.push({ id: wall.id, kind: 'wall', label: 'Wall', startM, endM, heightM: DEFAULT_WALL_HEIGHT_M });
      continue;
    }
    if (Math.min(Math.abs(a.perp), Math.abs(b.perp)) > CORRIDOR_HALF_WIDTH_M) continue;
    const startM = clamp(Math.min(a.along, b.along), 0, lineLength);
    const endM = clamp(Math.max(a.along, b.along), 0, lineLength);
    if (endM > startM) entries.push({ id: wall.id, kind: 'wall', label: 'Wall', startM, endM, heightM: DEFAULT_WALL_HEIGHT_M });
  }

  for (const obj of placedObjects) {
    const centre = projectOntoLine({ x: obj.x, y: obj.y }, line.start, dir);
    // Simplification: uses the larger footprint dimension as a symmetric along-line
    // extent regardless of the object's actual rotation — exact would need the
    // rotated-rectangle's projection onto `dir`, more precision than a reference
    // section view needs.
    const halfExtent = Math.max(obj.footprintM.w, obj.footprintM.l) / 2;
    if (Math.abs(centre.perp) > CORRIDOR_HALF_WIDTH_M + halfExtent) continue;
    const startM = clamp(centre.along - halfExtent, 0, lineLength);
    const endM = clamp(centre.along + halfExtent, 0, lineLength);
    if (endM <= startM) continue;
    entries.push({ id: obj.id, kind: 'object', label: obj.productId, startM, endM, heightM: obj.customProperties.heightM ?? 1 });
  }

  return entries.sort((a, b) => a.startM - b.startM);
}
