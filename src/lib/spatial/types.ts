// Spatial Design Engine — shared types for 2D editor, 3D viewer, and the Zustand store.
// Mirrors supabase/migrations/0003_room_layouts.sql; all coordinates in metres.

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

export type PlacedObject = {
  id: string;
  productId: string;
  x: number;
  y: number;
  rotationDeg: number;
  clearanceRadiusM?: number; // from the product catalogue, not user-editable
  footprintM: { w: number; l: number };
  customProperties: PlacedObjectProps;
};

export type FloorDims = { widthM: number; lengthM: number };
