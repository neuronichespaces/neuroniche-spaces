// Runtime guard for RoomLayout data crossing an untrusted boundary (localStorage,
// BroadcastChannel, future project-file import). Domain-only — no React/Babylon imports.
import type { WallSegment, DoorPlacement, PlacedObject, FloorDims, Zone, Dimension, Layer, Leader, RevisionCloud, SectionLine } from './types.ts';
import { defaultLayers } from './layers.ts';

export type RoomLayout = {
  walls: WallSegment[];
  doors: DoorPlacement[];
  floorDims: FloorDims;
  placedObjects: PlacedObject[];
  zones: Zone[];
  dimensions: Dimension[];
  layers: Layer[];
  leaders: Leader[];
  revisionClouds: RevisionCloud[];
  sectionLines: SectionLine[];
};

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return typeof v === 'object' && v !== null ? (v as UnknownRecord) : null;
}

function isPoint(v: unknown): v is { x: number; y: number } {
  const p = asRecord(v);
  return p !== null && typeof p.x === 'number' && typeof p.y === 'number';
}

function isWall(v: unknown): v is WallSegment {
  const w = asRecord(v);
  return w !== null && typeof w.id === 'string' && isPoint(w.start) && isPoint(w.end) && typeof w.thicknessM === 'number';
}

function isDoor(v: unknown): v is DoorPlacement {
  const d = asRecord(v);
  return d !== null && typeof d.wallId === 'string' && typeof d.offsetM === 'number' && typeof d.widthM === 'number';
}

function isPlacedObject(v: unknown): v is PlacedObject {
  const o = asRecord(v);
  if (o === null) return false;
  const footprintM = asRecord(o.footprintM);
  const customProperties = asRecord(o.customProperties);
  return (
    typeof o.id === 'string' &&
    typeof o.productId === 'string' &&
    typeof o.x === 'number' &&
    typeof o.y === 'number' &&
    typeof o.rotationDeg === 'number' &&
    footprintM !== null &&
    typeof footprintM.w === 'number' &&
    typeof footprintM.l === 'number' &&
    customProperties !== null
  );
}

function isZone(v: unknown): v is Zone {
  const z = asRecord(v);
  return (
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
  const f = asRecord(v);
  return f !== null && typeof f.widthM === 'number' && typeof f.lengthM === 'number';
}

function isDimension(v: unknown): v is Dimension {
  const d = asRecord(v);
  return (
    d !== null &&
    typeof d.id === 'string' &&
    isPoint(d.start) &&
    isPoint(d.end) &&
    typeof d.offsetM === 'number' &&
    (d.label === undefined || typeof d.label === 'string')
  );
}

function isLeader(v: unknown): v is Leader {
  const l = asRecord(v);
  return l !== null && typeof l.id === 'string' && isPoint(l.anchor) && isPoint(l.labelPoint) && typeof l.text === 'string';
}

function isRevisionCloud(v: unknown): v is RevisionCloud {
  const r = asRecord(v);
  return (
    r !== null &&
    typeof r.id === 'string' &&
    typeof r.x === 'number' &&
    typeof r.y === 'number' &&
    typeof r.widthM === 'number' &&
    typeof r.lengthM === 'number' &&
    (r.note === undefined || typeof r.note === 'string')
  );
}

function isSectionLine(v: unknown): v is SectionLine {
  const s = asRecord(v);
  return s !== null && typeof s.id === 'string' && isPoint(s.start) && isPoint(s.end) && (s.label === undefined || typeof s.label === 'string');
}

function isLayer(v: unknown): v is Layer {
  const l = asRecord(v);
  return l !== null && typeof l.id === 'string' && typeof l.name === 'string' && typeof l.visible === 'boolean' && typeof l.locked === 'boolean';
}

/** Returns a validated RoomLayout, or null if the shape can't be trusted. Never throws. */
export function validateRoomLayout(raw: unknown): RoomLayout | null {
  const r = asRecord(raw);
  if (r === null) return null;
  if (!Array.isArray(r.walls) || !r.walls.every(isWall)) return null;
  if (!Array.isArray(r.doors) || !r.doors.every(isDoor)) return null;
  if (!isFloorDims(r.floorDims)) return null;
  if (!Array.isArray(r.placedObjects) || !r.placedObjects.every(isPlacedObject)) return null;
  // zones/dimensions are later additions — old payloads may omit them; default rather
  // than reject.
  const zones = r.zones === undefined ? [] : r.zones;
  if (!Array.isArray(zones) || !zones.every(isZone)) return null;
  const dimensions = r.dimensions === undefined ? [] : r.dimensions;
  if (!Array.isArray(dimensions) || !dimensions.every(isDimension)) return null;
  const layers = r.layers === undefined ? defaultLayers() : r.layers;
  if (!Array.isArray(layers) || !layers.every(isLayer)) return null;
  const leaders = r.leaders === undefined ? [] : r.leaders;
  if (!Array.isArray(leaders) || !leaders.every(isLeader)) return null;
  const revisionClouds = r.revisionClouds === undefined ? [] : r.revisionClouds;
  if (!Array.isArray(revisionClouds) || !revisionClouds.every(isRevisionCloud)) return null;
  const sectionLines = r.sectionLines === undefined ? [] : r.sectionLines;
  if (!Array.isArray(sectionLines) || !sectionLines.every(isSectionLine)) return null;
  return {
    walls: r.walls as WallSegment[],
    doors: r.doors as DoorPlacement[],
    floorDims: r.floorDims,
    placedObjects: r.placedObjects as PlacedObject[],
    zones,
    dimensions,
    layers,
    leaders,
    revisionClouds,
    sectionLines,
  };
}
