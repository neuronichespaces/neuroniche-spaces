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

export type WallSegment = { id: string; start: Point; end: Point; thicknessM: number };

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
};
