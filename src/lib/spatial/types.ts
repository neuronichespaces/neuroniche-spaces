// Spatial Design Engine — shared types for 2D editor, 3D viewer, and the Zustand store.
// Mirrors supabase/migrations/0003_room_layouts.sql; all coordinates in metres.
//
// Unit note (milestone doc decision, 2026-08-05): the "Neuroinclusive CAD Platform"
// milestone brief specifies millimetres everywhere. This codebase has used metres
// throughout since Phase 2/3 (store.ts, clearance.ts, RoomEditor2D.tsx, the DB schema
// in 0003_room_layouts.sql) — rewriting the unit system is a breaking change across
// every spatial file for zero functional benefit, so metres stay. Anywhere this file
// says "M" suffix, that's the existing convention, not a milestone-doc deviation left
// unresolved.

import type { SensoryNeed } from '../planner/plan.ts';

export type Point = { x: number; y: number };

export type WallSegment = {
  id: string;
  start: Point;
  end: Point;
  thicknessM: number;
  /** CAD-upgrade Gap 4: same layerId convention as PlacedObject/Zone. */
  layerId?: string;
};

export type DoorPlacement = { wallId: string; offsetM: number; widthM: number };

export type PlacedObjectProps = {
  widthM?: number;
  depthM?: number;
  heightM?: number;
  brightness?: number; // 0-100, lights only
  colourTempK?: number; // lights only
  noiseLevelDb?: number; // sound-producing equipment only
};

// Sensory impact of an object, one entry per category it affects meaningfully.
// Reuses the app's single real sensory taxonomy (SensoryNeed's 5 categories —
// see src/lib/aspectss/score.ts and the DB CHECK constraint on sensory_profiles)
// rather than inventing a second, incompatible dimension set (noiseReduction/
// vestibularSupport/etc from the milestone brief). A prior session already tried
// a second taxonomy for this exact reason and had to revert it (commit 9169265) —
// same mistake, not repeating it.
// Sign convention: positive = the object produces/adds that stimulus (e.g. a
// speaker's noise: +4); negative = the object reduces/absorbs it (e.g. an
// acoustic panel's noise: -4). Magnitude 1-5, matching SensoryNeed.intensity's scale.
export type SensoryImpact = Partial<Record<SensoryNeed['category'], number>>;

export type AccessibilityProfile = {
  wheelchairAccessible?: boolean;
  /** Minimum clear approach/circulation space this object requires, beyond its own footprint. */
  minClearanceM?: number;
  /** True if this object/space must never be used without staff supervision (e.g. some regulation equipment). */
  requiresSupervision?: boolean;
};

export type PlacedObject = {
  id: string;
  productId: string;
  x: number;
  y: number;
  rotationDeg: number;
  clearanceRadiusM?: number; // from the product catalogue, not user-editable
  footprintM: { w: number; l: number };
  customProperties: PlacedObjectProps;
  /** Broad grouping for graph/constraint reasoning (e.g. "seating", "acoustic", "lighting"). Optional — absent means "uncategorised". */
  category?: string;
  sensoryProfile?: SensoryImpact;
  accessibilityProfile?: AccessibilityProfile;
  /** Selectable/inspectable but not movable/rotatable/resizable via gizmo, drag, or
   *  keyboard shortcuts. Absent/false = unlocked (default). */
  locked?: boolean;
  /** Not rendered and not pickable in either view. Absent/false = visible (default). */
  hidden?: boolean;
  /** CAD-upgrade Gap 4: which Layer this object belongs to. Absent = the seeded
   *  default layer (see store.ts's DEFAULT_LAYER_ID) — every object always has an
   *  effective layer, this field just distinguishes "never explicitly assigned" from
   *  "explicitly assigned to the default layer" for import/export fidelity. */
  layerId?: string;
};

// CAD-upgrade Gap 4 (Layers, visibility, locking, view states): a real layer entity,
// distinct from the per-object locked/hidden flags added earlier — an object can be
// individually locked/hidden AND belong to a locked/hidden layer; the effective state
// is the OR of both (see layers.ts's isEffectivelyLocked/isEffectivelyHidden). Scoped
// to placed objects only for now — walls/zones don't have a layerId field yet
// (documented gap, not an oversight; extend the same way if/when needed).
export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
};

export type FloorDims = { widthM: number; lengthM: number };

// Zone-first planning (milestone brief §4): a rectangular area of the room with a
// purpose. Rect, not polygon — matches how walls/objects are already modelled here
// (axis-aligned position + rotation), and every zone kind in the brief is naturally
// rectangular in practice (a "calm corner" is still a rectangle on the floor plan).
export type ZoneKind =
  | 'focus'
  | 'calm'
  | 'transition'
  | 'movement'
  | 'regulation'
  | 'collaboration'
  | 'storage'
  | 'breakout'
  | 'sensory_support'
  | 'reflection';

export type Zone = {
  id: string;
  kind: ZoneKind;
  label?: string;
  x: number; // centre, metres
  y: number;
  widthM: number;
  lengthM: number;
  rotationDeg: number;
  /** CAD-upgrade Gap 4: assigns this zone to a Layer (absent = default layer),
   *  same convention as PlacedObject.layerId — see layers.ts's isEffectivelyVisible. */
  layerId?: string;
};

// CAD-upgrade Gap 6 (Annotation, sections, elevations): a manual dimension is a real
// canonical model entity, not just rendered pixels — this project's foundation spec
// explicitly rules out "annotations that exist only as SVG pixels or Babylon render
// objects" (see docs/architecture/cad-gap-audit.md's Gap 6). `start`/`end` are the two
// points being measured between; `offsetM` is the perpendicular distance from that
// line to where the dimension line/label is actually drawn (standard architectural
// dimension-line convention — keeps the label from overlapping the measured geometry).
export type Dimension = {
  id: string;
  start: Point;
  end: Point;
  offsetM: number;
  /** Optional override — absent means "show the computed length" (the common case). */
  label?: string;
  /** CAD-upgrade Gap 4: same layerId convention as PlacedObject/Zone/WallSegment. */
  layerId?: string;
};
