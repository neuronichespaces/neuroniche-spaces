'use client';

// Procedural 3D room shell: walls (with real door-gap cutouts, reusing the
// same geometry helper as the 2D editor), floor, and an optional translucent
// ceiling. Reads straight from the store — no local copies.

import { useMemo } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { wallLengthM, wallSegmentsWithDoorGap } from '@/lib/spatial/geometry.ts';
import type { WallSegment } from '@/lib/spatial/types.ts';

const DEFAULT_WALL_HEIGHT_M = 2.4;

function WallMesh({
  seg,
  thicknessM,
  heightM,
  highDetail,
}: {
  seg: { start: { x: number; y: number }; end: { x: number; y: number } };
  thicknessM: number;
  heightM: number;
  highDetail: boolean;
}) {
  const length = Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y);
  if (length <= 0) return null;
  const midX = (seg.start.x + seg.end.x) / 2;
  const midZ = (seg.start.y + seg.end.y) / 2;
  const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
  return (
    <mesh position={[midX, heightM / 2, midZ]} rotation={[0, -angle, 0]} castShadow={highDetail} receiveShadow={highDetail}>
      <boxGeometry args={[length, heightM, thicknessM]} />
      <meshStandardMaterial color="#d8d2c4" roughness={highDetail ? 0.85 : 1} metalness={highDetail ? 0.05 : 0} />
    </mesh>
  );
}

export default function RoomGeometry3D({
  wallHeightM = DEFAULT_WALL_HEIGHT_M,
  highDetail = false,
}: {
  wallHeightM?: number;
  /** Presentation/PDF-snapshot mode: shadow-casting walls + tuned material roughness. */
  highDetail?: boolean;
}) {
  const walls = useRoomLayoutStore((s) => s.walls);
  const doors = useRoomLayoutStore((s) => s.doors);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);

  const wallSegments = useMemo(() => {
    const out: { wall: WallSegment; seg: { start: { x: number; y: number }; end: { x: number; y: number } } }[] = [];
    for (const wall of walls) {
      const door = doors.find((d) => d.wallId === wall.id);
      for (const seg of wallSegmentsWithDoorGap(wall, door)) {
        out.push({ wall, seg });
      }
    }
    return out;
  }, [walls, doors]);

  return (
    <group>
      <mesh position={[floorDims.widthM / 2, 0, floorDims.lengthM / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={highDetail}>
        <planeGeometry args={[floorDims.widthM, floorDims.lengthM]} />
        <meshStandardMaterial color="#f2ede1" roughness={highDetail ? 0.9 : 1} />
      </mesh>
      {/* ponytail: no opaque ceiling — would block the default orbit view of the interior */}
      <mesh position={[floorDims.widthM / 2, wallHeightM, floorDims.lengthM / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorDims.widthM, floorDims.lengthM]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.08} side={2} />
      </mesh>
      {wallSegments.map(({ wall, seg }, i) => (
        <WallMesh key={`${wall.id}-${i}`} seg={seg} thicknessM={wall.thicknessM} heightM={wallHeightM} highDetail={highDetail} />
      ))}
    </group>
  );
}

export { wallLengthM };
