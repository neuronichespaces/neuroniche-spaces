'use client';

// Placed objects rendered as labelled coloured boxes — explicitly acceptable
// per the Phase 3 brief; no real product models this phase.

import { Text } from '@react-three/drei';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import type { PlacedObject } from '@/lib/spatial/types.ts';

const DEFAULT_HEIGHT_M = 0.5;

function colourFor(id: string): string {
  // ponytail: deterministic hash-to-hue, not a curated palette — fine for MVP labelling.
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}, 55%, 60%)`;
}

function ObjectBox({ obj, violated, highDetail }: { obj: PlacedObject; violated: boolean; highDetail: boolean }) {
  const heightM = obj.customProperties.heightM ?? DEFAULT_HEIGHT_M;
  const rotationRad = (obj.rotationDeg * Math.PI) / 180;
  return (
    <group position={[obj.x, heightM / 2, obj.y]} rotation={[0, -rotationRad, 0]}>
      <mesh castShadow={highDetail} receiveShadow={highDetail}>
        <boxGeometry args={[obj.footprintM.w, heightM, obj.footprintM.l]} />
        <meshStandardMaterial
          color={violated ? '#e05252' : colourFor(obj.id)}
          roughness={highDetail ? 0.6 : 1}
          metalness={highDetail ? 0.1 : 0}
        />
      </mesh>
      <Text
        position={[0, heightM / 2 + 0.15, 0]}
        fontSize={0.14}
        color="#1a1a1a"
        anchorX="center"
        anchorY="bottom"
        rotation={[0, rotationRad, 0]}
      >
        {obj.productId}
      </Text>
    </group>
  );
}

export default function ObjectMesh3D({ highDetail = false }: { highDetail?: boolean }) {
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const clearanceViolations = useRoomLayoutStore((s) => s.clearanceViolations);
  return (
    <group>
      {placedObjects.map((obj) => (
        <ObjectBox key={obj.id} obj={obj} violated={clearanceViolations.has(obj.id)} highDetail={highDetail} />
      ))}
    </group>
  );
}
