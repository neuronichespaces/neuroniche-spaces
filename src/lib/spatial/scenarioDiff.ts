// CAD-upgrade Gap 7 (Collaboration, versioning, review, audit): scenario diffing.
// Pure comparison between two layouts' placed objects, walls, and zones — the piece
// that turns "two scenarios exist" into "here's what changed between them." Counts
// added/removed/moved rather than a full deep-diff (a moved object's every numeric
// field changing isn't interesting on its own — whether it moved at all is).
import type { PlacedObject, WallSegment, Zone } from './types.ts';

export type EntityDiff = { added: number; removed: number; changed: number; unchanged: number };

export type ScenarioDiff = {
  objects: EntityDiff;
  walls: EntityDiff;
  zones: EntityDiff;
};

function diffById<T extends { id: string }>(before: T[], after: T[], isChanged: (a: T, b: T) => boolean): EntityDiff {
  const beforeById = new Map(before.map((e) => [e.id, e]));
  const afterById = new Map(after.map((e) => [e.id, e]));
  let changed = 0;
  let unchanged = 0;
  for (const [id, b] of beforeById) {
    const a = afterById.get(id);
    if (!a) continue; // counted in removed below
    if (isChanged(b, a)) changed++;
    else unchanged++;
  }
  const added = after.filter((e) => !beforeById.has(e.id)).length;
  const removed = before.filter((e) => !afterById.has(e.id)).length;
  return { added, removed, changed, unchanged };
}

export function diffScenarios(
  before: { placedObjects: PlacedObject[]; walls: WallSegment[]; zones: Zone[] },
  after: { placedObjects: PlacedObject[]; walls: WallSegment[]; zones: Zone[] },
): ScenarioDiff {
  return {
    objects: diffById(before.placedObjects, after.placedObjects, (a, b) => a.x !== b.x || a.y !== b.y || a.rotationDeg !== b.rotationDeg),
    walls: diffById(
      before.walls,
      after.walls,
      (a, b) => a.start.x !== b.start.x || a.start.y !== b.start.y || a.end.x !== b.end.x || a.end.y !== b.end.y,
    ),
    zones: diffById(before.zones, after.zones, (a, b) => a.x !== b.x || a.y !== b.y || a.widthM !== b.widthM || a.lengthM !== b.lengthM),
  };
}
