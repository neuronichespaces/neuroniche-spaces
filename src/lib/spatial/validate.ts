// Runtime guard for RoomLayout data crossing an untrusted boundary (localStorage,
// BroadcastChannel, future project-file import). Domain-only — no React/Babylon imports.
import type { WallSegment, DoorPlacement, PlacedObject, FloorDims, Zone } from './types.ts';

export type RoomLayout = { walls: WallSegment[]; doors: DoorPlacement[]; floorDims: FloorDims; placedObjects: PlacedObject[]; zones: Zone[] };

function isPoint(v: unknown): v is { x: number; y: number } {
  return typeof v === 'object' && v !== null && typeof (v as any).x === 'number' && typeof (v as any).y === 'number';
}

function isWall(v: unknown): v is WallSegment {
  const w = v as any;
  return typeof w === 'object' && w !== null && typeof w.id === 'string' && isPoint(w.start) && isPoint(w.end) && typeof w.thicknessM === 'number';
}

function isDoor(v: unknown): v is DoorPlacement {
  const d = v as any;
  return typeof d === 'object' && d !== null && typeof d.wallId === 'string' && typeof d.offsetM === 'number' && typeof d.widthM === 'number';
}

function isPlacedObject(v: unknown): v is PlacedObject {
  const o = v as any;
  return (
    typeof o === 'object' &&
    o !== null &&
    typeof o.id === 'string' &&
    typeof o.productId === 'string' &&
    typeof o.x === 'number' &&
    typeof o.y === 'number' &&
    typeof o.rotationDeg === 'number' &&
    typeof o.footprintM === 'object' &&
    o.footprintM !== null &&
    typeof o.footprintM.w === 'number' &&
    typeof o.footprintM.l === 'number' &&
    typeof o.customProperties === 'object' &&
    o.customProperties !== null
  );
}

function isZone(v: unknown): v is Zone {
  const z = v as any;
  return (
    typeof z === 'object' &&
    z !== null &&
    typeof z.id === 'string' &&
    typeof z.kind === 'string' &&
    typeof z.x === 'number' &&
    typeof z.y === 'number' &&
    typeof z.widthM === 'number' &&
    typeof z.lengthM === 'number' &&
    typeof z.rotationDeg === 'number'
  );
}

function isFloorDims(v: unknown): v is FloorDims {
  const f = v as any;
  return typeof f === 'object' && f !== null && typeof f.widthM === 'number' && typeof f.lengthM === 'number';
}

/** Returns a validated RoomLayout, or null if the shape can't be trusted. Never throws. */
export function validateRoomLayout(raw: unknown): RoomLayout | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as any;
  if (!Array.isArray(r.walls) || !r.walls.every(isWall)) return null;
  if (!Array.isArray(r.doors) || !r.doors.every(isDoor)) return null;
  if (!isFloorDims(r.floorDims)) return null;
  if (!Array.isArray(r.placedObjects) || !r.placedObjects.every(isPlacedObject)) return null;
  // zones is a later addition — old payloads may omit it; default rather than reject.
  const zones = r.zones === undefined ? [] : r.zones;
  if (!Array.isArray(zones) || !zones.every(isZone)) return null;
  return { walls: r.walls, doors: r.doors, floorDims: r.floorDims, placedObjects: r.placedObjects, zones };
}
